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
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Path,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import type { FurnitureKind } from './classify'
import type { BandStats, Silhouette } from './segment'
import { PROFILE_BANDS, shade } from './segment'
import { readCap, topOutline, type CapReading } from './topview'

export type BuildMode = 'solid' | 'cutout'

export interface BuildInput {
  sil: Silhouette
  kind: FurnitureKind
  w: number
  d: number
  h: number
  finish: Finish
}

const B = PROFILE_BANDS

/* ------------------------------------------------------------------ */
/* materials                                                           */
/* ------------------------------------------------------------------ */

/**
 * How a surface is finished.
 *
 * `clean` reads the colour and character out of the photo and rebuilds the
 * surface as a clean, high resolution material: real colour ramp, real
 * roughness, a little grain. `photo` pastes the photo crop itself, which keeps
 * printed detail (a poker felt, a patterned rug) at the cost of looking like a
 * photo stretched over a box.
 */
export type Finish = 'clean' | 'photo'

type Role = 'body' | 'top' | 'frame' | 'seat' | 'shade' | 'felt'

interface FinishSpec {
  roughness: number
  metalness: number
  grain: 'none' | 'speckle' | 'grain' | 'weave'
  sheen: number
}

function surface(color: string, roughness = 0.62, metalness = 0.05) {
  return new MeshStandardMaterial({ color: new Color(color), roughness, metalness })
}

function darken(color: string, amount: number) {
  return shade(color, -amount)
}

/** Decide what a surface is made of from how the photo behaves, not from labels. */
function readFinish(st: BandStats, role: Role): FinishSpec {
  if (role === 'felt') return { roughness: 0.95, metalness: 0, grain: 'weave', sheen: 0 }
  if (role === 'frame') {
    const metal = st.sat < 0.22 && st.contrast > 0.3
    return metal
      ? { roughness: 0.32, metalness: 0.75, grain: 'none', sheen: 0.25 }
      : { roughness: 0.5, metalness: 0.04, grain: 'grain', sheen: 0.08 }
  }
  // Strong small highlights on a saturated surface: something polished.
  if (st.highlight > 0.035 && st.sat > 0.24) {
    return { roughness: 0.16, metalness: 0.02, grain: 'speckle', sheen: 0.45 }
  }
  if (st.warm > 0.45 && st.sat > 0.15) {
    return { roughness: 0.48, metalness: 0.03, grain: 'grain', sheen: 0.12 }
  }
  if (st.sat < 0.3 && st.contrast < 0.4) {
    return { roughness: 0.92, metalness: 0, grain: 'weave', sheen: 0 }
  }
  if (st.sat < 0.2 && st.contrast > 0.45) {
    return { roughness: 0.3, metalness: 0.7, grain: 'none', sheen: 0.3 }
  }
  return { roughness: 0.6, metalness: 0.03, grain: 'weave', sheen: 0.08 }
}

const TEX = 512

/**
 * Rebuild the surface at full resolution from the photo's own colour ramp.
 *
 * The vertical gradient is sampled from the real image, so an apple keeps its
 * green shoulder over a red body, but it is drawn as a smooth ramp rather than
 * scaled-up pixels. Grain and sheen are added procedurally.
 */
function synthTexture(sil: Silhouette, v0: number, v1: number, spec: FinishSpec, flat = false) {
  const canvas = document.createElement('canvas')
  canvas.width = TEX
  canvas.height = TEX
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const st = sil.bandStats(v0, v1)
  if (flat) {
    // A tabletop is one material seen face on: a colour ramp across it would
    // read as dirt, not as form.
    ctx.fillStyle = st.hex
    ctx.fillRect(0, 0, TEX, TEX)
  } else {
    const stops = 7
    const grad = ctx.createLinearGradient(0, 0, 0, TEX)
    for (let i = 0; i < stops; i++) {
      const t = i / (stops - 1)
      const a = v0 + (v1 - v0) * Math.max(0, t - 0.5 / (stops - 1))
      const b = v0 + (v1 - v0) * Math.min(1, t + 0.5 / (stops - 1))
      grad.addColorStop(t, sil.bandStats(a, b).hex)
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, TEX, TEX)
  }

  // A soft specular sweep down one side reads as a curved, polished surface
  // once the lathe or slab wraps the texture around.
  if (spec.sheen > 0 && !flat) {
    const sweep = ctx.createLinearGradient(0, 0, TEX, 0)
    sweep.addColorStop(0, 'rgba(255,255,255,0)')
    sweep.addColorStop(0.22, `rgba(255,255,255,${spec.sheen * 0.5})`)
    sweep.addColorStop(0.42, 'rgba(255,255,255,0)')
    sweep.addColorStop(0.78, `rgba(0,0,0,${spec.sheen * 0.16})`)
    sweep.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sweep
    ctx.fillRect(0, 0, TEX, TEX)
  }

  ctx.save()
  if (spec.grain === 'speckle') {
    // Pale flecks, the lenticels on fruit or the fleck in a stone finish.
    ctx.fillStyle = st.lightHex
    ctx.globalAlpha = 0.5
    for (let i = 0; i < 900; i++) {
      const x = pseudo(i * 2.17) * TEX
      const y = pseudo(i * 3.71 + 11) * TEX
      const r = 0.7 + pseudo(i * 5.13 + 3) * 1.5
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (spec.grain === 'grain') {
    // Long, low contrast streaks along the length of the piece.
    ctx.globalAlpha = 0.14
    for (let i = 0; i < 150; i++) {
      const y = pseudo(i * 1.93) * TEX
      ctx.strokeStyle = pseudo(i * 4.4 + 7) > 0.5 ? st.lightHex : st.darkHex
      ctx.lineWidth = 0.6 + pseudo(i * 2.7 + 5) * 2.2
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(TEX * 0.3, y + (pseudo(i * 6.1) - 0.5) * 14, TEX * 0.7, y + (pseudo(i * 7.3) - 0.5) * 14, TEX, y)
      ctx.stroke()
    }
  } else if (spec.grain === 'weave') {
    // Fine crosshatch: fabric, felt, plaster.
    ctx.globalAlpha = flat ? 0.05 : 0.08
    ctx.strokeStyle = st.darkHex
    ctx.lineWidth = 1
    for (let i = 0; i < TEX; i += 3) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, TEX)
      ctx.stroke()
    }
    ctx.strokeStyle = st.lightHex
    for (let i = 1; i < TEX; i += 3) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(TEX, i)
      ctx.stroke()
    }
  }
  ctx.restore()

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** Deterministic value noise: the same photo must always build the same model. */
function pseudo(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

/**
 * A texture cut from the photo itself. `v0`/`v1` are fractions down the
 * subject, so a sofa back wears the sofa back and the seat wears the seat.
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

/** The surface for one vertical slice of the subject, in the chosen finish. */
function slice(sil: Silhouette, finish: Finish, v0: number, v1: number, role: Role = 'body') {
  const st = sil.bandStats(v0, v1)
  const spec = readFinish(st, role)
  const mat = new MeshStandardMaterial({
    color: new Color(st.hex),
    roughness: spec.roughness,
    metalness: spec.metalness,
  })
  const flat = role === 'felt' || role === 'top'
  const tex = finish === 'photo' ? photoTexture(sil, v0, v1, st.hex) : synthTexture(sil, v0, v1, spec, flat)
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  return mat
}

/** A plain, untextured surface in the colour of one slice: legs, frames, feet. */
function plain(sil: Silhouette, v0: number, v1: number, role: Role = 'frame') {
  const st = sil.bandStats(v0, v1)
  const spec = readFinish(st, role)
  return surface(st.hex, spec.roughness, spec.metalness)
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
/* tops seen from above                                                */
/* ------------------------------------------------------------------ */

/**
 * The top of the photo, stretched back out to its true plan proportions.
 *
 * A round table photographed from standing height shows its top as a squashed
 * ellipse. Scaling that crop back to the real depth/width ratio turns it into
 * the top surface as seen from directly overhead, which is exactly what should
 * be painted onto the tabletop.
 */
function capTexture(sil: Silhouette, cap: CapReading, w: number, d: number, backing: string) {
  const src = sil.cutout
  const srcH = Math.max(2, Math.round(cap.capEnd * src.height))
  const width = Math.max(96, Math.min(768, src.width))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.max(24, Math.round((width * d) / Math.max(0.01, w)))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = backing
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(src, 0, 0, src.width, srcH, 0, 0, canvas.width, canvas.height)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** The reconstructed plan outline as a closed 2D shape, back edge to front. */
function planShape(outline: number[], w: number, d: number, scale = 1) {
  const shape = new Shape()
  const pt = (i: number, sign: number) => {
    const u = i / (outline.length - 1)
    return [sign * outline[i] * w * scale, (0.5 - u) * d * scale] as const
  }
  let started = false
  for (let i = 0; i < outline.length; i++) {
    const [x, y] = pt(i, 1)
    if (!started) {
      shape.moveTo(x, y)
      started = true
    } else shape.lineTo(x, y)
  }
  for (let i = outline.length - 1; i >= 0; i--) {
    const [x, y] = pt(i, -1)
    shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

/** Same outline as a hole, for a rail ring. */
function planHole(outline: number[], w: number, d: number, scale: number) {
  const path = new Path()
  const pt = (i: number, sign: number) => {
    const u = i / (outline.length - 1)
    return [sign * outline[i] * w * scale, (0.5 - u) * d * scale] as const
  }
  const [x0, y0] = pt(0, 1)
  path.moveTo(x0, y0)
  for (let i = 1; i < outline.length; i++) {
    const [x, y] = pt(i, 1)
    path.lineTo(x, y)
  }
  for (let i = outline.length - 1; i >= 0; i--) {
    const [x, y] = pt(i, -1)
    path.lineTo(x, y)
  }
  path.closePath()
  return path
}

/** Extrude a plan shape upwards and give the top face planar UVs over w x d. */
function planSlab(shape: Shape, thickness: number, w: number, d: number, top: MeshStandardMaterial, edge: MeshStandardMaterial) {
  const geo = new ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.22,
    bevelSize: thickness * 0.18,
    bevelSegments: 2,
    curveSegments: 8,
  })
  geo.rotateX(-Math.PI / 2)
  const pos = geo.getAttribute('position')
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = (pos.getX(i) + w / 2) / w
    // The photo runs back to front down the image, so v counts back from +z.
    uv[i * 2 + 1] = (d / 2 - pos.getZ(i)) / d
  }
  geo.setAttribute('uv', new BufferAttribute(uv, 2))
  geo.computeVertexNormals()
  const mesh = new Mesh(geo, [top, edge])
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
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

function buildChair({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const split = seatSplit(sil, 0.3, 0.72, 0.52)
  const seatY = Math.max(0.28, Math.min(h * 0.78, h * (1 - split)))
  const frame = plain(sil, 0.85, 1)
  const seatMat = slice(sil, finish, split, Math.min(1, split + 0.18), 'seat')
  const backMat = slice(sil, finish, 0.02, split, 'body')

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

function buildStool({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const round = sil.symmetry > 0.82
  const frame = plain(sil, 0.7, 1)
  const seatMat = slice(sil, finish, 0, 0.35, 'seat')
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
    const seat = new Mesh(new CylinderGeometry(w / 2, w / 2, seatT, 40), seatMat)
    seat.position.y = h - seatT / 2
    g.add(seat)
  } else {
    g.add(box(w, seatT, d, seatMat, 0, h - seatT / 2, 0))
  }
  return g
}

function buildSofa({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const split = seatSplit(sil, 0.35, 0.75, 0.55)
  const seatY = Math.max(0.3, Math.min(h * 0.72, h * (1 - split)))
  const bodyMat = slice(sil, finish, split * 0.6, 1, 'body')
  const backMat = slice(sil, finish, 0.02, split, 'body')
  const footMat = plain(sil, 0.92, 1)

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

  const inner = w - armW * 2
  const seats = Math.max(1, Math.round(inner / 0.62))
  const cw = (inner / seats) * 0.94
  const cushionMat = slice(sil, finish, split, Math.min(1, split + 0.22), 'seat')
  for (let i = 0; i < seats; i++) {
    const cx = -inner / 2 + (i + 0.5) * (inner / seats)
    g.add(box(cw, Math.max(0.07, h * 0.12), d - backThick - d * 0.08, cushionMat, cx, seatY + h * 0.055, backThick / 2))
  }
  return g
}

/* --- tables ------------------------------------------------------- */

/**
 * A table whose top the camera looked down on. The plan outline comes back out
 * of the foreshortened ellipse, so a round table is round and a racetrack is a
 * racetrack, and the footprint is real.
 */
function buildElevatedTable(input: BuildInput, cap: CapReading, rail: boolean) {
  const { sil, w, d, h, finish } = input
  const g = new Group()
  const outline = topOutline(sil, cap)
  const topT = Math.max(0.035, h * 0.075)

  // The middle of the top is the surface; its outer edge is the rim or rail.
  const feltFrom = rail ? cap.capEnd * 0.42 : cap.capEnd * 0.2
  const feltTo = rail ? cap.capEnd * 0.62 : cap.capEnd * 0.75
  const topMat =
    finish === 'photo' && !rail
      ? topPhotoMat(sil, cap, w, d)
      : slice(sil, finish, feltFrom, feltTo, rail ? 'felt' : 'top')
  const edgeMat = plain(sil, 0, Math.max(0.04, cap.capEnd * 0.22), 'frame')

  const slab = planSlab(planShape(outline, w, d), topT, w, d, topMat, edgeMat)
  slab.position.y = h - topT
  g.add(slab)

  if (rail) {
    const railT = Math.max(0.045, h * 0.085)
    const railShape = planShape(outline, w, d)
    railShape.holes.push(planHole(outline, w, d, 0.76))
    const railMat = plain(sil, 0, Math.max(0.05, cap.capEnd * 0.22), 'frame')
    const ring = planSlab(railShape, railT, w, d, railMat, railMat)
    ring.position.y = h - topT * 0.1
    g.add(ring)
  }

  const legH = h - topT
  const frame = plain(sil, Math.min(0.95, cap.capEnd + 0.05), 0.9)
  if (cap.pedestal) {
    const r = Math.max(0.045, (cap.stemMin / Math.max(0.02, cap.peakW)) * w * 0.5)
    const col = new Mesh(new CylinderGeometry(r, r * 1.06, legH, 28), frame)
    col.position.y = legH / 2
    g.add(col)
    if (cap.baseW > 0) {
      const br = Math.max(r * 1.3, (cap.baseW / Math.max(0.02, cap.peakW)) * w * 0.5)
      const plinthH = Math.max(0.03, h * 0.075)
      const plinth = new Mesh(new CylinderGeometry(br * 0.86, br, plinthH, 28), plain(sil, 0.9, 1))
      plinth.position.y = plinthH / 2
      g.add(plinth)
    }
  } else {
    const inset = Math.max(0.03, (cap.stemMin / Math.max(0.02, cap.peakW)) * w * 0.35)
    cornerLegs(g, w * 0.86, d * 0.86, legH, frame, sil.symmetry > 0.9, Math.max(0.04, inset))
  }
  return g
}

/** The top of the photo, unforeshortened, painted onto the top face. */
function topPhotoMat(sil: Silhouette, cap: CapReading, w: number, d: number) {
  const st = sil.bandStats(0, cap.capEnd)
  const mat = surface(st.hex, 0.45, 0.03)
  const tex = capTexture(sil, cap, w, d, st.hex)
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  return mat
}

function buildTable(input: BuildInput) {
  const cap = readCap(input.sil)
  if (cap.isElevated) return buildElevatedTable(input, cap, false)

  const { sil, w, d, h, finish } = input
  const g = new Group()
  const round = sil.symmetry > 0.88 && Math.abs(w - d) / Math.max(w, d) < 0.2
  const topMat = slice(sil, finish, 0, Math.max(0.12, 1 - legFraction(sil)), 'top')
  const frame = plain(sil, 0.75, 1)
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
    const top = new Mesh(new CylinderGeometry(w / 2, w / 2, topT, 48), topMat)
    top.position.y = h - topT / 2
    g.add(top)
  } else {
    g.add(box(w, topT, d, topMat, 0, h - topT / 2, 0))
  }
  return g
}

/** A poker or gaming table: the same recovered top, plus a padded rail. */
function buildPoker(input: BuildInput) {
  const cap = readCap(input.sil)
  if (cap.isElevated) return buildElevatedTable(input, cap, true)
  const g = buildTable({ ...input, kind: 'table' })
  return g
}

function buildDesk({ sil, w, d, h, finish }: BuildInput) {
  const cap = readCap(sil)
  if (cap.isElevated) return buildElevatedTable({ sil, kind: 'desk', w, d, h, finish }, cap, false)
  const g = new Group()
  const topMat = slice(sil, finish, 0, 0.2, 'top')
  const frame = plain(sil, 0.6, 1)
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

/* --- everything else ---------------------------------------------- */

function buildBed({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const frame = plain(sil, 0.7, 1)
  const linen = slice(sil, finish, 0, 0.6, 'body')
  const footH = Math.max(0.08, h * 0.18)
  cornerLegs(g, w * 0.94, d * 0.94, footH, frame, false, Math.min(w, d) * 0.05)
  const baseH = Math.max(0.08, h * 0.22)
  g.add(box(w, baseH, d, frame, 0, footH + baseH / 2, 0))
  const mattressH = Math.max(0.14, h * 0.4)
  g.add(box(w * 0.98, mattressH, d * 0.98, linen, 0, footH + baseH + mattressH / 2, 0))
  const headH = Math.max(0.3, h * 0.95)
  g.add(box(w, headH, Math.max(0.05, d * 0.04), frame, 0, headH / 2, -d / 2))
  const pillow = surface('#f3efe8', 0.95, 0)
  for (const sx of w > 1.1 ? [-1, 1] : [0]) {
    g.add(box(w * 0.38, Math.max(0.08, h * 0.16), d * 0.16, pillow, sx * w * 0.22, footH + baseH + mattressH + h * 0.06, -d * 0.36))
  }
  return g
}

function buildShelf({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const body = slice(sil, finish, 0, 1, 'body')
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

function buildCabinet({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const body = plain(sil, 0, 1, 'body')
  const face = slice(sil, finish, 0, 1, 'body')
  const handle = surface('#8d9299', 0.35, 0.75)
  const kick = Math.max(0.04, h * 0.06)
  g.add(box(w * 0.94, kick, d * 0.9, plain(sil, 0.92, 1), 0, kick / 2, 0))
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
  const shadeSt = sil.bandStats(0, 0.3)
  const shade = new MeshStandardMaterial({
    color: new Color(shadeSt.hex),
    roughness: 0.85,
    emissive: new Color(shadeSt.hex),
    emissiveIntensity: 0.35,
    side: DoubleSide,
  })
  const metal = plain(sil, 0.75, 1)
  const baseR = Math.max(0.06, w * 0.36)
  const baseH = Math.max(0.02, h * 0.02)
  const base = new Mesh(new CylinderGeometry(baseR, baseR * 1.06, baseH, 32), metal)
  base.position.y = baseH / 2
  g.add(base)
  const shadeH = Math.max(0.12, h * 0.24)
  const stemH = h - shadeH - baseH
  g.add(post(Math.max(0.008, w * 0.045), stemH, metal, 0, baseH + stemH / 2, 0))
  const cone = new Mesh(new CylinderGeometry(w * 0.34, w * 0.5, shadeH, 40, 1, true), shade)
  cone.position.y = baseH + stemH + shadeH / 2
  g.add(cone)
  return g
}

function buildRug({ sil, w, d, h, finish }: BuildInput) {
  const g = new Group()
  const st = sil.bandStats(0, 1)
  const mat = surface(st.hex, 0.98, 0)
  // A rug is printed detail, so the photo itself is the honest source here.
  const tex = finish === 'photo' ? photoTexture(sil, 0, 1, st.hex) : synthTexture(sil, 0, 1, readFinish(st, 'felt'))
  if (tex) {
    mat.map = tex
    mat.color = new Color('#ffffff')
  }
  const t = Math.max(0.008, h)
  g.add(box(w, t, d, mat, 0, t / 2, 0))
  return g
}

function buildPlant({ sil, w, h }: BuildInput) {
  const g = new Group()
  const potSt = sil.bandStats(0.74, 1)
  const leafSt = sil.bandStats(0, 0.6)
  const pot = surface(potSt.hex, 0.8, 0.03)
  const leaf = surface(leafSt.hex, 0.62, 0)
  const potH = Math.max(0.1, h * 0.26)
  const potR = Math.max(0.07, w * 0.34)
  const potMesh = new Mesh(new ConeGeometry(potR, potH, 32, 1, true), pot)
  potMesh.rotation.x = Math.PI
  potMesh.position.y = potH / 2
  g.add(potMesh)
  const soil = new Mesh(new CylinderGeometry(potR * 0.94, potR * 0.94, 0.02, 32), surface('#3a2f26', 1, 0))
  soil.position.y = potH - 0.01
  g.add(soil)
  const canopyH = h - potH
  g.add(post(Math.max(0.008, w * 0.03), canopyH * 0.55, surface(darken(leafSt.hex, 0.35), 0.85), 0, potH + canopyH * 0.275, 0))
  const blobs = 5
  for (let i = 0; i < blobs; i++) {
    const t = i / (blobs - 1)
    const r = w * (0.3 - t * 0.12)
    const sphere = new Mesh(new SphereGeometry(Math.max(0.04, r), 20, 14), leaf)
    const angle = i * 2.399
    sphere.position.set(Math.cos(angle) * w * 0.16, potH + canopyH * (0.5 + t * 0.45), Math.sin(angle) * w * 0.16)
    sphere.scale.y = 0.78
    g.add(sphere)
  }
  return g
}

/**
 * A solid of revolution: apples, vases, bowls, balls, urns, drum stools.
 *
 * Radially symmetric objects are the one case where a single photo really does
 * contain the whole shape, because every angle looks the same. Spinning the
 * silhouette around its own axis recovers the true form rather than guessing
 * at it, so this is the highest fidelity path in the whole generator.
 */
function buildRevolved({ sil, w, h, finish }: BuildInput) {
  const g = new Group()
  const rows = sil.rowAxial
  const bh = rows.length
  const first = Math.floor(sil.axialTop * bh)
  const lastRow = Math.min(bh - 1, Math.ceil(sil.axialBottom * bh) - 1)
  const span = lastRow - first
  if (span < 4) return g

  let peak = 0
  for (let i = first; i <= lastRow; i++) peak = Math.max(peak, rows[i])
  if (peak <= 0) return g

  const N = 128
  const smoothWindow = Math.max(1, Math.round(span * 0.02))
  const radiusAt = (t: number) => {
    const centre = first + t * span
    let sum = 0
    let n = 0
    for (let k = -smoothWindow; k <= smoothWindow; k++) {
      const r = Math.round(centre + k)
      if (r < first || r > lastRow) continue
      sum += rows[r]
      n++
    }
    return n ? (sum / n / peak) * (w / 2) : 0
  }

  const points: Vector2[] = []
  for (let i = 0; i <= N; i++) {
    const t = i / N
    let r = radiusAt(t)
    // Round the very ends into the axis so the solid closes cleanly instead of
    // finishing on a flat disc.
    // The top of a photographed object is usually a stem, a lid, or a neck, so
    // it wants a longer, softer taper than the base it sits on.
    const topRun = 0.085
    const baseRun = 0.03
    if (t < topRun) r *= 0.35 + 0.65 * Math.sin((t / topRun) * (Math.PI / 2))
    if (1 - t < baseRun) r *= Math.sin(((1 - t) / baseRun) * (Math.PI / 2))
    points.push(new Vector2(Math.max(0.0005, r), h * (1 - t)))
  }
  points.reverse()

  const geo = new LatheGeometry(points, 96)
  geo.computeVertexNormals()
  const mat = slice(sil, finish, sil.axialTop, sil.axialBottom, 'body')
  const mesh = new Mesh(geo, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
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
function buildExtruded({ sil, w, d, h, finish }: BuildInput) {
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

  const mat = slice(sil, finish, 0, 1, 'body')
  const mesh = new Mesh(merged, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  g.add(mesh)
  return g
}

/* ------------------------------------------------------------------ */

const SOLID_BUILDERS: Partial<Record<FurnitureKind, (input: BuildInput) => Group>> = {
  chair: buildChair,
  poker: buildPoker,
  round: buildRevolved,
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
