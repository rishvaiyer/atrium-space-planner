/**
 * Client-side photo analysis for the Photo to 3D generator.
 *
 * Everything here runs in the browser with no service calls: load an image,
 * separate the subject from its background, then measure the silhouette into
 * the handful of numbers the mesh builders actually need (proportions, where
 * the seat step is, how many legs, what colour each band of the object is).
 */

const WORK_MAX = 512
const BANDS = 64

export interface Bbox {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface Silhouette {
  /** Working resolution of the mask. */
  mw: number
  mh: number
  /** 1 where the subject is, 0 for background. Row-major, mw * mh. */
  mask: Uint8Array
  /** Subject bounds inside the mask. */
  bbox: Bbox
  /** Width of the subject in each of BANDS horizontal bands, 0..1 of bbox width. */
  widthProfile: Float32Array
  /** Separate horizontal spans in each band (2 = a gap between two legs). */
  runs: Uint8Array
  /** Fraction of the bbox the subject fills. */
  fill: number
  /** Left/right mirror agreement, 0..1. */
  symmetry: number
  /** True when a background was actually detected and removed. */
  segmented: boolean
  /** Cutout of the subject, cropped to bbox, transparent background. */
  cutout: HTMLCanvasElement
  /** Dominant subject colours, most common first. */
  palette: string[]
  /** Mean subject colour of a normalised vertical slice, v measured from the top. */
  bandColor: (v0: number, v1: number) => string
}

export type ImageSource = File | Blob | string

/** Load a File, Blob, data URL, or http(s) URL into an ImageBitmap. */
export async function loadImageSource(src: ImageSource): Promise<ImageBitmap> {
  if (typeof src !== 'string') return createImageBitmap(src)
  const url = src.trim()
  if (!url) throw new Error('Enter an image URL first.')
  let res: Response
  try {
    res = await fetch(url, { mode: 'cors', credentials: 'omit' })
  } catch {
    throw new Error(
      'That image URL could not be read from the browser. The host blocks cross-origin reads (CORS). Save the image and use Upload instead.',
    )
  }
  if (!res.ok) throw new Error(`Image URL returned ${res.status}.`)
  const blob = await res.blob()
  if (!/^image\//.test(blob.type) && !/\.(png|jpe?g|webp|gif|avif|bmp)(\?|#|$)/i.test(url)) {
    throw new Error('That URL is not an image. Link straight to the .jpg, .png, or .webp file.')
  }
  return createImageBitmap(blob)
}

function toWorkCanvas(bitmap: ImageBitmap) {
  const scale = Math.min(1, WORK_MAX / Math.max(bitmap.width, bitmap.height))
  const mw = Math.max(8, Math.round(bitmap.width * scale))
  const mh = Math.max(8, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = mw
  canvas.height = mh
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('This browser blocked 2D canvas access, so the image cannot be analysed.')
  ctx.drawImage(bitmap, 0, 0, mw, mh)
  return { canvas, ctx, mw, mh }
}

function dist2(data: Uint8ClampedArray, a: number, r: number, g: number, b: number) {
  const dr = data[a] - r
  const dg = data[a + 1] - g
  const db = data[a + 2] - b
  return dr * dr + dg * dg + db * db
}

/**
 * Flood the background inwards from every border pixel. Region growing keeps
 * gradient backdrops (the usual product-photo sweep) while a looser global
 * check against the median border colour catches pixels the walk skipped.
 */
function floodBackground(data: Uint8ClampedArray, mw: number, mh: number) {
  const border: number[] = []
  for (let x = 0; x < mw; x++) {
    border.push(x, (mh - 1) * mw + x)
  }
  for (let y = 1; y < mh - 1; y++) {
    border.push(y * mw, y * mw + mw - 1)
  }
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []
  for (const p of border) {
    reds.push(data[p * 4])
    greens.push(data[p * 4 + 1])
    blues.push(data[p * 4 + 2])
  }
  const median = (list: number[]) => {
    const sorted = [...list].sort((a, b) => a - b)
    return sorted[sorted.length >> 1]
  }
  const br = median(reds)
  const bg = median(greens)
  const bb = median(blues)

  // Spread of the border tells us whether the backdrop is flat or busy.
  let spread = 0
  for (const p of border) spread += Math.sqrt(dist2(data, p * 4, br, bg, bb))
  spread /= border.length
  const localTol = 30 * 30
  const globalTol = Math.max(26, Math.min(72, 26 + spread * 1.35)) ** 2

  const isBg = new Uint8Array(mw * mh)
  const queue = new Int32Array(mw * mh)
  let head = 0
  let tail = 0
  for (const p of border) {
    if (isBg[p]) continue
    if (dist2(data, p * 4, br, bg, bb) > globalTol * 2.4) continue
    isBg[p] = 1
    queue[tail++] = p
  }
  while (head < tail) {
    const p = queue[head++]
    const px = p % mw
    const py = (p / mw) | 0
    const pr = data[p * 4]
    const pg = data[p * 4 + 1]
    const pb = data[p * 4 + 2]
    for (let k = 0; k < 4; k++) {
      const nx = px + (k === 0 ? -1 : k === 1 ? 1 : 0)
      const ny = py + (k === 2 ? -1 : k === 3 ? 1 : 0)
      if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue
      const n = ny * mw + nx
      if (isBg[n]) continue
      const a = n * 4
      if (data[a + 3] < 24) {
        isBg[n] = 1
        queue[tail++] = n
        continue
      }
      if (dist2(data, a, pr, pg, pb) > localTol) continue
      if (dist2(data, a, br, bg, bb) > globalTol) continue
      isBg[n] = 1
      queue[tail++] = n
    }
  }
  return isBg
}

/** Opening then closing on a 4-neighbourhood: drops specks, seals pinholes. */
function cleanMask(mask: Uint8Array, mw: number, mh: number) {
  const neighbours = (src: Uint8Array, i: number, x: number, y: number) => {
    let n = 0
    if (x > 0 && src[i - 1]) n++
    if (x < mw - 1 && src[i + 1]) n++
    if (y > 0 && src[i - mw]) n++
    if (y < mh - 1 && src[i + mw]) n++
    return n
  }
  const erode = (src: Uint8Array) => {
    const out = new Uint8Array(src.length)
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const i = y * mw + x
        out[i] = src[i] && neighbours(src, i, x, y) >= 3 ? 1 : 0
      }
    }
    return out
  }
  const dilate = (src: Uint8Array) => {
    const out = new Uint8Array(src.length)
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const i = y * mw + x
        out[i] = src[i] || neighbours(src, i, x, y) >= 2 ? 1 : 0
      }
    }
    return out
  }
  return erode(dilate(dilate(erode(mask))))
}

/** Keep the main blob plus any sizeable companions (a lamp shade above a base). */
function keepMainComponents(mask: Uint8Array, mw: number, mh: number) {
  const label = new Int32Array(mask.length).fill(-1)
  const sizes: number[] = []
  const queue = new Int32Array(mask.length)
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start] >= 0) continue
    const id = sizes.length
    let head = 0
    let tail = 0
    label[start] = id
    queue[tail++] = start
    let size = 0
    while (head < tail) {
      const p = queue[head++]
      size++
      const px = p % mw
      const py = (p / mw) | 0
      for (let k = 0; k < 4; k++) {
        const nx = px + (k === 0 ? -1 : k === 1 ? 1 : 0)
        const ny = py + (k === 2 ? -1 : k === 3 ? 1 : 0)
        if (nx < 0 || ny < 0 || nx >= mw || ny >= mh) continue
        const n = ny * mw + nx
        if (!mask[n] || label[n] >= 0) continue
        label[n] = id
        queue[tail++] = n
      }
    }
    sizes.push(size)
  }
  if (!sizes.length) return mask
  const biggest = Math.max(...sizes)
  const floor = Math.max(24, biggest * 0.04)
  const out = new Uint8Array(mask.length)
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && sizes[label[i]] >= floor) out[i] = 1
  }
  return out
}

function hex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function buildPalette(data: Uint8ClampedArray, mask: Uint8Array) {
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>()
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue
    const a = i * 4
    const r = data[a]
    const g = data[a + 1]
    const b = data[a + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bin = bins.get(key)
    if (bin) {
      bin.n++
      bin.r += r
      bin.g += g
      bin.b += b
    } else {
      bins.set(key, { n: 1, r, g, b })
    }
  }
  return [...bins.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map((bin) => hex(bin.r / bin.n, bin.g / bin.n, bin.b / bin.n))
}

export function analyzeImage(bitmap: ImageBitmap): Silhouette {
  const { canvas, ctx, mw, mh } = toWorkCanvas(bitmap)
  const image = ctx.getImageData(0, 0, mw, mh)
  const data = image.data

  // A PNG that already carries a cutout is the best signal available.
  let transparent = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] < 24) transparent++
  const alphaCutout = transparent > mw * mh * 0.02

  let mask: Uint8Array = new Uint8Array(mw * mh)
  if (alphaCutout) {
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 110 ? 1 : 0
  } else {
    const isBg = floodBackground(data, mw, mh)
    for (let i = 0; i < mask.length; i++) mask[i] = isBg[i] ? 0 : 1
  }
  mask = keepMainComponents(cleanMask(mask, mw, mh), mw, mh)

  let count = 0
  for (let i = 0; i < mask.length; i++) count += mask[i]
  const coverage = count / mask.length
  let segmented = true
  if (coverage < 0.02 || coverage > 0.985) {
    // Nothing convincing was separated: treat the whole frame as the subject.
    segmented = false
    mask.fill(1)
    count = mask.length
  }

  let x0 = mw
  let y0 = mh
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      if (!mask[y * mw + x]) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  const bbox: Bbox = { x0, y0, x1, y1 }
  const bw = Math.max(1, x1 - x0 + 1)
  const bh = Math.max(1, y1 - y0 + 1)

  const widthProfile = new Float32Array(BANDS)
  const runs = new Uint8Array(BANDS)
  const gapFloor = Math.max(2, Math.round(bw * 0.035))
  for (let b = 0; b < BANDS; b++) {
    const ya = y0 + Math.floor((b / BANDS) * bh)
    const yb = Math.max(ya + 1, y0 + Math.floor(((b + 1) / BANDS) * bh))
    let widest = 0
    let bestRuns = 0
    for (let y = ya; y < yb && y <= y1; y++) {
      let filled = 0
      let spans = 0
      let gap = 0
      let inRun = false
      for (let x = x0; x <= x1; x++) {
        if (mask[y * mw + x]) {
          if (!inRun) {
            if (!spans || gap >= gapFloor) spans++
            inRun = true
          }
          gap = 0
          filled++
        } else if (inRun) {
          inRun = false
          gap = 1
        } else {
          gap++
        }
      }
      if (filled > widest) widest = filled
      if (spans > bestRuns) bestRuns = spans
    }
    widthProfile[b] = widest / bw
    runs[b] = Math.min(255, bestRuns)
  }

  let mirrored = 0
  let mirrorTotal = 0
  for (let y = y0; y <= y1; y += 2) {
    for (let x = x0; x <= x1; x += 2) {
      const flipped = x1 - (x - x0)
      mirrorTotal++
      if (mask[y * mw + x] === mask[y * mw + flipped]) mirrored++
    }
  }

  const cutout = document.createElement('canvas')
  cutout.width = bw
  cutout.height = bh
  const cctx = cutout.getContext('2d')
  if (cctx) {
    const crop = cctx.createImageData(bw, bh)
    for (let y = 0; y < bh; y++) {
      for (let x = 0; x < bw; x++) {
        const src = ((y0 + y) * mw + (x0 + x)) * 4
        const dst = (y * bw + x) * 4
        crop.data[dst] = data[src]
        crop.data[dst + 1] = data[src + 1]
        crop.data[dst + 2] = data[src + 2]
        crop.data[dst + 3] = mask[(y0 + y) * mw + (x0 + x)] ? 255 : 0
      }
    }
    cctx.putImageData(crop, 0, 0)
  }

  const palette = buildPalette(data, mask)

  const bandColor = (v0: number, v1: number) => {
    const ya = y0 + Math.floor(Math.max(0, Math.min(1, v0)) * (bh - 1))
    const yb = y0 + Math.ceil(Math.max(0, Math.min(1, v1)) * (bh - 1))
    let r = 0
    let g = 0
    let b = 0
    let n = 0
    for (let y = ya; y <= yb && y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!mask[y * mw + x]) continue
        const a = (y * mw + x) * 4
        r += data[a]
        g += data[a + 1]
        b += data[a + 2]
        n++
      }
    }
    if (!n) return palette[0] ?? '#9a938c'
    return hex(r / n, g / n, b / n)
  }

  canvas.width = 0
  canvas.height = 0

  return {
    mw,
    mh,
    mask,
    bbox,
    widthProfile,
    runs,
    fill: count / (bw * bh),
    symmetry: mirrorTotal ? mirrored / mirrorTotal : 0,
    segmented,
    cutout,
    palette,
    bandColor,
  }
}

export const PROFILE_BANDS = BANDS
