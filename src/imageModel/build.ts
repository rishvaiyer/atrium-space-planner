/**
 * Mesh builders for the Photo to 3D generator.
 *
 * Two strategies share one entry point:
 *  - `solid` fits a parametric piece of furniture to the measured photo, so it
 *    reads correctly from every angle and has a real footprint.
 *  - `cutout` extrudes the traced silhouette, which works for anything the
 *    classifier does not recognise.
 * Both take their colours, and where it helps their surface texture, from the
 * photo itself.
 */
import {
  BoxGeometry,
  BufferAttribute,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import type { FurnitureKind } from './classify'
import type { Silhouette } from './segment'
import { PROFILE_BANDS } from './segment'

export type BuildMode = 'solid' | 'cutout'

export interface BuildInput {
  sil: Silhouette
  kind: FurnitureKind
  w: number
  d: number
  h: number
}

const B = PROFILE_BANDS

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

function surface(color: string, roughness = 0.62, metalness = 0.05) {
  return new MeshStandardMaterial({ color: new Color(color), roughness, metalness })
}

function darken(color: string, amount: number) {
  const c = new Color(color)
  c.multiplyScalar(1 - amount)
  return `#${c.getHexString()}`
}

/**
 * A texture cut from the photo. `v0`/`v1` are fractions down the subject, so a
 * sofa back can wear the sofa back and the seat can wear the seat.
 */
function photoTexture(sil: Silhouette, v0: number, v1: number, backing: string) {
  const src = sil.cutout
  const sy = Math.floor(Math.max(0, Math.min(1, v0)) * src.height)
  const sh = Math.max(2, Math.floor(Math.max(0, Math.min(1, v1)) * src.height) - sy)
  const scale = Math.min(1, 512 / Math.max(src.width, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(4, Math.round(src.width * scale))
  canvas.height = Math.max(4, Math.round(sh * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = backing
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(src, 0, sy, src.width, sh, 0, 0, canvas.width, canvas.height)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

function photoSurface(sil: Silhouette, v0: number, v1: number, roughness = 0.72) {
  const backing = sil.bandColor(v0, v1)
  const mat = surface(backing, roughness, 0.02)
  const tex = photoTexture(sil, v0, v1, backing)
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  return mat
}

/* ------------------------------------------------------------------ */
/* silhouette readings                                                 */
/* ------------------------------------------------------------------ */

function bandMean(profile: Float32Array, from: number, to: number) {
  let sum = 0
  let n = 0
  for (let i = Math.max(0, Math.floor(from)); i < Math.min(profile.length, Math.ceil(to)); i++) {
    sum += profile[i]
    n++
  }
  return n ? sum / n : 0
}

/** Fraction from the top where the outline steps outwards (back meets seat). */
function seatSplit(sil: Silhouette, lo = 0.3, hi = 0.8, fallback = 0.55) {
  let best = -1
  let bestAt = fallback
  for (let i = Math.floor(B * lo); i < Math.floor(B * hi); i++) {
    const before = bandMean(sil.widthProfile, i - B * 0.12, i)
    const after = bandMean(sil.widthProfile, i, i + B * 0.12)
    const step = after - before
    if (step > best) {
      best = step
      bestAt = i / B
    }
  }
  return best > 0.08 ? bestAt : fallback
}

/** How much of the height at the bottom is open leg space. */
function legFraction(sil: Silhouette, fallback = 0.4) {
  let bands = 0
  for (let i = B - 1; i >= Math.floor(B * 0.3); i--) {
    if (sil.runs[i] >= 2 && sil.widthProfile[i] < 0.82) bands++
    else break
  }
  const f = bands / B
  return f > 0.04 ? Math.min(0.72, f) : fallback
}

/** 1 means a single pedestal column, otherwise corner legs. */
function legCount(sil: Silhouette) {
  let best = 0
  for (let i = Math.floor(B * 0.82); i < B; i++) best = Math.max(best, sil.runs[i])
  return best <= 1 ? 1 : 4
}

/** Wider at the sides than the middle at seat level means arms. */
function hasArms(sil: Silhouette, split: number) {
  const shoulder = bandMean(sil.widthProfile, B * split - B * 0.06, B * split + B * 0.02)
  const back = bandMean(sil.widthProfile, B * 0.12, B * split - B * 0.08)
  return shoulder > back * 1.12
}

/* ------------------------------------------------------------------ */
/* primitives                                                          */
/* ------------------------------------------------------------------ */

function box(w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number) {
  const mesh = new Mesh(new BoxGeometry(Math.max(w, 0.004), Math.max(h, 0.004), Math.max(d, 0.004)), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function post(r: number, h: number, mat: MeshStandardMaterial, x: number, y: number, z: number, segments = 12) {
  const mesh = new Mesh(new CylinderGeometry(r, r, Math.max(h, 0.004), segments), mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  return mesh
}

function cornerLegs(
  group: Group,
  w: number,
  d: number,
  legH: number,
  mat: MeshStandardMaterial,
  round: boolean,
  thickness: number,
) {
  const ix = w / 2 - thickness / 2 - w * 0.035
  const iz = d / 2 - thickness / 2 - d * 0.035
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      group.add(
        round
          ? post(thickness / 2, legH, mat, sx * ix, legH / 2, sz * iz)
          : box(thickness, legH, thickness, mat, sx * ix, legH / 2, sz * iz),
      )
    }
  }
}

function pedestal(group: Group, w: number, d: number, legH: number, mat: MeshStandardMaterial) {
  const r = Math.min(w, d) * 0.09
  group.add(post(r, legH, mat, 0, legH / 2, 0))
  const footR = Math.min(w, d) * 0.34
  const foot = new Mesh(new CylinderGeometry(footR, footR, Math.max(0.02, legH * 0.05), 24), mat)
  foot.position.y = Math.max(0.01, legH * 0.025)
  group.add(foot)
}

/* ------------------------------------------------------------------ */
/* parametric builders                                                 */
/* ------------------------------------------------------------------ */

function buildChair({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const split = seatSplit(sil, 0.3, 0.72, 0.52)
  const seatY = Math.max(0.28, Math.min(h * 0.78, h * (1 - split)))
  const frame = surface(darken(sil.bandColor(0.85, 1), 0.12), 0.5, 0.18)
  const seatMat = photoSurface(sil, split, Math.min(1, split + 0.18))
  const backMat = photoSurface(sil, 0.02, split)

  const legH = seatY - h * 0.045
  if (legCount(sil) === 1) pedestal(g, w, d, legH, frame)
  else cornerLegs(g, w, d, legH, frame, sil.symmetry > 0.86, Math.min(w, d) * 0.09)

  g.add(box(w * 0.98, h * 0.055, d * 0.98, seatMat, 0, seatY - h * 0.0275, 0))

  const backH = h - seatY
  if (backH > h * 0.14) {
    const backThick = Math.max(0.03, d * 0.09)
    g.add(box(w * 0.94, backH * 0.94, backThick, backMat, 0, seatY + backH * 0.47, -d / 2 + backThick / 2))
  }
  if (hasArms(sil, split) && backH > h * 0.16) {
    const armH = backH * 0.42
    const armThick = Math.max(0.035, w * 0.07)
    for (const sx of [-1, 1]) {
      g.add(box(armThick, armH * 0.22, d * 0.82, frame, (sx * (w - armThick)) / 2, seatY + armH, 0))
      g.add(box(armThick * 0.7, armH, armThick * 0.9, frame, (sx * (w - armThick)) / 2, seatY + armH / 2, d * 0.28))
    }
  }
  return g
}

function buildStool({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const round = sil.symmetry > 0.82
  const frame = surface(darken(sil.bandColor(0.7, 1), 0.1), 0.45, 0.25)
  const seatMat = photoSurface(sil, 0, 0.35)
  const seatT = Math.max(0.035, h * 0.075)
  const legH = h - seatT
  if (legCount(sil) === 1) pedestal(g, w, d, legH, frame)
  else {
    cornerLegs(g, w, d, legH, frame, round, Math.min(w, d) * 0.085)
    const ringY = legH * 0.32
    for (const sz of [-1, 1]) {
      g.add(box(w * 0.78, Math.max(0.018, h * 0.022), Math.max(0.018, d * 0.05), frame, 0, ringY, (sz * d) / 2.6))
    }
  }
  if (round) {
    const seat = new Mesh(new CylinderGeometry(w / 2, w / 2, seatT, 28), seatMat)
    seat.position.y = h - seatT / 2
    g.add(seat)
  } else {
    g.add(box(w, seatT, d, seatMat, 0, h - seatT / 2, 0))
  }
  return g
}

function buildSofa({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const split = seatSplit(sil, 0.35, 0.75, 0.55)
  const seatY = Math.max(0.3, Math.min(h * 0.72, h * (1 - split)))
  const bodyMat = photoSurface(sil, split * 0.6, 1, 0.85)
  const backMat = photoSurface(sil, 0.02, split, 0.85)
  const footMat = surface(darken(sil.bandColor(0.9, 1), 0.25), 0.45, 0.2)

  const footH = Math.min(0.14, h * 0.16)
  cornerLegs(g, w * 0.86, d * 0.8, footH, footMat, true, Math.min(w, d) * 0.05)

  const armW = Math.min(w * 0.16, 0.26)
  const baseH = seatY - footH
  g.add(box(w, baseH, d, bodyMat, 0, footH + baseH / 2, 0))

  const backH = h - seatY
  const backThick = Math.max(0.1, d * 0.26)
  g.add(box(w, backH, backThick, backMat, 0, seatY + backH / 2, -d / 2 + backThick / 2))
  for (const sx of [-1, 1]) {
    g.add(box(armW, backH * 0.72, d, bodyMat, (sx * (w - armW)) / 2, seatY + backH * 0.36, 0))
  }

  // Cushions, one per estimated seat.
  const inner = w - armW * 2
  const seats = Math.max(1, Math.round(inner / 0.62))
  const cw = (inner / seats) * 0.94
  const cushionMat = photoSurface(sil, split, Math.min(1, split + 0.22), 0.9)
  for (let i = 0; i < seats; i++) {
    const cx = -inner / 2 + (i + 0.5) * (inner / seats)
    g.add(box(cw, Math.max(0.07, h * 0.12), d - backThick - d * 0.08, cushionMat, cx, seatY + h * 0.055, backThick / 2))
  }
  return g
}

function buildTable({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const round = sil.symmetry > 0.88 && Math.abs(w - d) / Math.max(w, d) < 0.2
  const topMat = photoSurface(sil, 0, Math.max(0.12, 1 - legFraction(sil)), 0.4)
  const frame = surface(darken(sil.bandColor(0.75, 1), 0.12), 0.5, 0.15)
  const topT = Math.max(0.03, h * 0.055)
  const legH = h - topT
  if (legCount(sil) === 1) pedestal(g, w, d, legH, frame)
  else {
    cornerLegs(g, w, d, legH, frame, round, Math.min(w, d) * 0.075)
    const apronH = Math.max(0.03, h * 0.06)
    const apronY = legH - apronH * 0.9
    g.add(box(w * 0.86, apronH, Math.max(0.02, d * 0.04), frame, 0, apronY, -d * 0.42))
    g.add(box(w * 0.86, apronH, Math.max(0.02, d * 0.04), frame, 0, apronY, d * 0.42))
  }
  if (round) {
    const top = new Mesh(new CylinderGeometry(w / 2, w / 2, topT, 40), topMat)
    top.position.y = h - topT / 2
    g.add(top)
  } else {
    g.add(box(w, topT, d, topMat, 0, h - topT / 2, 0))
  }
  return g
}

function buildDesk({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const topMat = photoSurface(sil, 0, 0.2, 0.45)
  const frame = surface(darken(sil.bandColor(0.6, 1), 0.15), 0.5, 0.2)
  const topT = Math.max(0.03, h * 0.05)
  const legH = h - topT
  g.add(box(w, topT, d, topMat, 0, h - topT / 2, 0))
  const panel = Math.max(0.03, w * 0.035)
  for (const sx of [-1, 1]) {
    g.add(box(panel, legH, d * 0.9, frame, (sx * (w - panel)) / 2, legH / 2, 0))
  }
  g.add(box(w * 0.9, Math.max(0.12, h * 0.2), Math.max(0.02, d * 0.035), frame, 0, legH * 0.72, -d * 0.44))
  return g
}

function buildBed({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const frame = surface(darken(sil.bandColor(0.7, 1), 0.15), 0.55, 0.1)
  const linen = photoSurface(sil, 0, 0.6, 0.92)
  const footH = Math.max(0.08, h * 0.18)
  cornerLegs(g, w * 0.94, d * 0.94, footH, frame, false, Math.min(w, d) * 0.05)
  const baseH = Math.max(0.08, h * 0.22)
  g.add(box(w, baseH, d, frame, 0, footH + baseH / 2, 0))
  const mattressH = Math.max(0.14, h * 0.4)
  g.add(box(w * 0.98, mattressH, d * 0.98, linen, 0, footH + baseH + mattressH / 2, 0))
  const headH = Math.max(0.3, h * 0.95)
  g.add(box(w, headH, Math.max(0.05, d * 0.04), frame, 0, headH / 2, -d / 2))
  // Pillows at the head end.
  const pillow = surface('#f3efe8', 0.95, 0)
  for (const sx of w > 1.1 ? [-1, 1] : [0]) {
    g.add(box(w * 0.38, Math.max(0.08, h * 0.16), d * 0.16, pillow, sx * w * 0.22, footH + baseH + mattressH + h * 0.06, -d * 0.36))
  }
  return g
}

function buildShelf({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const body = photoSurface(sil, 0, 1, 0.62)
  const panel = Math.max(0.02, w * 0.035)
  g.add(box(panel, h, d, body, -(w - panel) / 2, h / 2, 0))
  g.add(box(panel, h, d, body, (w - panel) / 2, h / 2, 0))
  g.add(box(w, panel, Math.max(0.01, d * 0.06), body, 0, h / 2, -d / 2 + d * 0.03))
  const shelves = Math.max(2, Math.min(7, Math.round(h / 0.36)))
  for (let i = 0; i <= shelves; i++) {
    const y = (i / shelves) * (h - panel) + panel / 2
    g.add(box(w - panel * 2, panel, d * 0.96, body, 0, y, 0))
  }
  return g
}

function buildCabinet({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const body = surface(darken(sil.bandColor(0, 1), 0.05), 0.6, 0.06)
  const face = photoSurface(sil, 0, 1, 0.55)
  const handle = surface('#8d9299', 0.35, 0.75)
  const kick = Math.max(0.04, h * 0.06)
  g.add(box(w * 0.94, kick, d * 0.9, surface(darken(sil.bandColor(0.9, 1), 0.35), 0.7), 0, kick / 2, 0))
  const bodyH = h - kick
  g.add(box(w, bodyH, d, body, 0, kick + bodyH / 2, 0))
  const doors = w > 0.7 ? 2 : 1
  const gap = Math.max(0.006, w * 0.012)
  const dw = (w - gap * (doors + 1)) / doors
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + gap * (i + 1) + dw * (i + 0.5)
    g.add(box(dw, bodyH - gap * 2, Math.max(0.012, d * 0.05), face, cx, kick + bodyH / 2, d / 2))
    g.add(post(Math.max(0.007, w * 0.012), bodyH * 0.28, handle, cx + (doors === 1 ? dw * 0.36 : (i ? -dw * 0.38 : dw * 0.38)), kick + bodyH * 0.6, d / 2 + d * 0.04))
  }
  return g
}

function buildLamp({ sil, w, h }: BuildInput) {
  const g = new Group()
  const shadeColor = sil.bandColor(0, 0.3)
  const shade = new MeshStandardMaterial({
    color: new Color(shadeColor),
    roughness: 0.85,
    emissive: new Color(shadeColor),
    emissiveIntensity: 0.35,
    side: DoubleSide,
  })
  const metal = surface(darken(sil.bandColor(0.75, 1), 0.2), 0.32, 0.72)
  const baseR = Math.max(0.06, w * 0.36)
  const baseH = Math.max(0.02, h * 0.02)
  const base = new Mesh(new CylinderGeometry(baseR, baseR * 1.06, baseH, 28), metal)
  base.position.y = baseH / 2
  g.add(base)
  const shadeH = Math.max(0.12, h * 0.24)
  const stemH = h - shadeH - baseH
  g.add(post(Math.max(0.008, w * 0.045), stemH, metal, 0, baseH + stemH / 2, 0))
  const topR = w * 0.34
  const botR = w * 0.5
  const cone = new Mesh(new CylinderGeometry(topR, botR, shadeH, 32, 1, true), shade)
  cone.position.y = baseH + stemH + shadeH / 2
  g.add(cone)
  return g
}

function buildRug({ sil, w, d, h }: BuildInput) {
  const g = new Group()
  const backing = sil.bandColor(0, 1)
  const mat = surface(backing, 0.98, 0)
  const tex = photoTexture(sil, 0, 1, backing)
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  const t = Math.max(0.008, h)
  const slab = box(w, t, d, mat, 0, t / 2, 0)
  g.add(slab)
  return g
}

function buildPlant({ sil, w, h }: BuildInput) {
  const g = new Group()
  const potColor = sil.bandColor(0.74, 1)
  const leafColor = sil.bandColor(0, 0.6)
  const pot = surface(potColor, 0.8, 0.03)
  const leaf = surface(leafColor, 0.7, 0)
  const potH = Math.max(0.1, h * 0.26)
  const potR = Math.max(0.07, w * 0.34)
  const potMesh = new Mesh(new ConeGeometry(potR, potH, 24, 1, true), pot)
  potMesh.rotation.x = Math.PI
  potMesh.position.y = potH / 2
  g.add(potMesh)
  const soil = new Mesh(new CylinderGeometry(potR * 0.94, potR * 0.94, 0.02, 24), surface('#3a2f26', 1, 0))
  soil.position.y = potH - 0.01
  g.add(soil)
  const canopyH = h - potH
  g.add(post(Math.max(0.008, w * 0.03), canopyH * 0.55, surface(darken(leafColor, 0.35), 0.85), 0, potH + canopyH * 0.275, 0))
  const blobs = 5
  for (let i = 0; i < blobs; i++) {
    const t = i / (blobs - 1)
    const r = w * (0.3 - t * 0.12)
    const sphere = new Mesh(new SphereGeometry(Math.max(0.04, r), 16, 12), leaf)
    const angle = i * 2.399
    sphere.position.set(Math.cos(angle) * w * 0.16, potH + canopyH * (0.5 + t * 0.45), Math.sin(angle) * w * 0.16)
    sphere.scale.y = 0.78
    g.add(sphere)
  }
  return g
}

/* ------------------------------------------------------------------ */
/* silhouette extrusion                                                */
/* ------------------------------------------------------------------ */

/**
 * Merge the mask into vertical strips of run-length rectangles, then extrude.
 * Gaps in the photo (between chair legs, through a shelf) survive as real
 * holes, and UVs are planar so the photo lands on the front and back faces.
 */
function buildExtruded({ sil, w, d, h }: BuildInput) {
  const CELLS = 116
  const bw = sil.bbox.x1 - sil.bbox.x0 + 1
  const bh = sil.bbox.y1 - sil.bbox.y0 + 1
  const cols = Math.max(12, Math.min(CELLS, Math.round(CELLS * Math.min(1, bw / bh))))
  const rows = Math.max(12, Math.min(CELLS, Math.round(CELLS * Math.min(1, bh / bw))))
  const cell = new Uint8Array(cols * rows)
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      // Majority vote over the source pixels covering this cell. Offsets stay
      // relative to the bbox and only shift into mask space at lookup time.
      const px0 = Math.floor((rx / cols) * bw)
      const px1 = Math.max(px0 + 1, Math.floor(((rx + 1) / cols) * bw))
      const py0 = Math.floor((ry / rows) * bh)
      const py1 = Math.max(py0 + 1, Math.floor(((ry + 1) / rows) * bh))
      let on = 0
      let total = 0
      for (let y = py0; y < py1; y++) {
        for (let x = px0; x < px1; x++) {
          total++
          if (sil.mask[(sil.bbox.y0 + y) * sil.mw + (sil.bbox.x0 + x)]) on++
        }
      }
      cell[ry * cols + rx] = total && on / total >= 0.45 ? 1 : 0
    }
  }

  // Greedy rectangles: extend each run downwards while the next row matches.
  const used = new Uint8Array(cell.length)
  const rects: { x: number; y: number; w: number; h: number }[] = []
  for (let ry = 0; ry < rows; ry++) {
    let rx = 0
    while (rx < cols) {
      if (!cell[ry * cols + rx] || used[ry * cols + rx]) {
        rx++
        continue
      }
      let end = rx
      while (end + 1 < cols && cell[ry * cols + end + 1] && !used[ry * cols + end + 1]) end++
      let height = 1
      outer: while (ry + height < rows) {
        for (let x = rx; x <= end; x++) {
          const i = (ry + height) * cols + x
          if (!cell[i] || used[i]) break outer
        }
        height++
      }
      for (let y = ry; y < ry + height; y++) for (let x = rx; x <= end; x++) used[y * cols + x] = 1
      rects.push({ x: rx, y: ry, w: end - rx + 1, h: height })
      rx = end + 1
    }
  }

  const cw = w / cols
  const ch = h / rows
  const parts: BufferGeometry[] = []
  for (const r of rects) {
    const geo = new BoxGeometry(r.w * cw, r.h * ch, d)
    geo.translate(-w / 2 + (r.x + r.w / 2) * cw, h - (r.y + r.h / 2) * ch, 0)
    parts.push(geo)
  }
  const merged = parts.length ? mergeGeometries(parts, false) : null
  for (const p of parts) p.dispose()
  const g = new Group()
  if (!merged) return g

  // Planar UVs across the whole piece so the photo reads on the flat faces.
  const pos = merged.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w
    uv[i * 2 + 1] = pos.getY(i) / h
  }
  merged.setAttribute('uv', new BufferAttribute(uv, 2))
  merged.computeVertexNormals()

  const backing = sil.bandColor(0, 1)
  const mat = surface(backing, 0.7, 0.04)
  const tex = photoTexture(sil, 0, 1, backing)
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  const mesh = new Mesh(merged, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
  return g
}

/* ------------------------------------------------------------------ */

const SOLID_BUILDERS: Partial<Record<FurnitureKind, (input: BuildInput) => Group>> = {
  chair: buildChair,
  stool: buildStool,
  sofa: buildSofa,
  table: buildTable,
  desk: buildDesk,
  bed: buildBed,
  shelf: buildShelf,
  cabinet: buildCabinet,
  lamp: buildLamp,
  rug: buildRug,
  plant: buildPlant,
}

export function buildModel(input: BuildInput, mode: BuildMode): Group {
  if (mode === 'solid') {
    const builder = SOLID_BUILDERS[input.kind]
    if (builder) return builder(input)
  }
  return buildExtruded(input)
}

export function disposeGroup(group: Group) {
  group.traverse((obj) => {
    const mesh = obj as Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const std = m as MeshStandardMaterial
      std?.map?.dispose()
      std?.dispose()
    }
  })
}
