import type { Silhouette } from './segment'
import { PROFILE_BANDS } from './segment'
import { readCap } from './topview'

export type FurnitureKind =
  | 'chair'
  | 'poker'
  | 'round'
  | 'stool'
  | 'sofa'
  | 'table'
  | 'desk'
  | 'bed'
  | 'shelf'
  | 'cabinet'
  | 'lamp'
  | 'rug'
  | 'plant'
  | 'generic'

export const KIND_LABEL: Record<FurnitureKind, string> = {
  chair: 'Chair',
  poker: 'Poker / gaming table',
  round: 'Round object (revolved)',
  stool: 'Stool',
  sofa: 'Sofa / bench',
  table: 'Table',
  desk: 'Desk',
  bed: 'Bed',
  shelf: 'Shelving',
  cabinet: 'Cabinet',
  lamp: 'Lamp',
  rug: 'Rug',
  plant: 'Plant',
  generic: 'Freeform (photo cutout)',
}

/** Real-world defaults, metres. Anchor says which axis the photo aspect scales from. */
export interface KindSpec {
  w: number
  d: number
  h: number
  anchor: 'height' | 'width'
  /** Depth as a multiple of the fitted width when the photo cannot show depth. */
  depthRatio: number
  minH: number
  maxH: number
  isSeat: boolean
  seats: number
  sitHeight?: number
}

export const KIND_SPEC: Record<FurnitureKind, KindSpec> = {
  round: { w: 0.3, d: 0.3, h: 0.3, anchor: 'height', depthRatio: 1, minH: 0.02, maxH: 2.4, isSeat: false, seats: 0 },
  poker: { w: 1.45, d: 1.45, h: 0.78, anchor: 'width', depthRatio: 1, minH: 0.6, maxH: 0.95, isSeat: false, seats: 0 },
  chair: { w: 0.5, d: 0.55, h: 0.86, anchor: 'height', depthRatio: 1.1, minH: 0.6, maxH: 1.3, isSeat: true, seats: 1, sitHeight: 0.45 },
  stool: { w: 0.4, d: 0.4, h: 0.75, anchor: 'height', depthRatio: 1, minH: 0.4, maxH: 1.1, isSeat: true, seats: 1, sitHeight: 0.7 },
  sofa: { w: 2, d: 0.9, h: 0.82, anchor: 'width', depthRatio: 0.46, minH: 0.6, maxH: 1.1, isSeat: true, seats: 3, sitHeight: 0.42 },
  table: { w: 1.2, d: 0.9, h: 0.75, anchor: 'width', depthRatio: 0.8, minH: 0.35, maxH: 1.15, isSeat: false, seats: 0 },
  desk: { w: 1.4, d: 0.7, h: 0.74, anchor: 'width', depthRatio: 0.5, minH: 0.6, maxH: 1.2, isSeat: false, seats: 0 },
  bed: { w: 1.5, d: 2, h: 0.6, anchor: 'width', depthRatio: 1.35, minH: 0.3, maxH: 1.4, isSeat: true, seats: 0, sitHeight: 0.5 },
  shelf: { w: 0.9, d: 0.35, h: 1.8, anchor: 'height', depthRatio: 0.4, minH: 0.6, maxH: 2.6, isSeat: false, seats: 0 },
  cabinet: { w: 0.9, d: 0.5, h: 1.1, anchor: 'height', depthRatio: 0.55, minH: 0.4, maxH: 2.4, isSeat: false, seats: 0 },
  lamp: { w: 0.4, d: 0.4, h: 1.5, anchor: 'height', depthRatio: 1, minH: 0.25, maxH: 2.1, isSeat: false, seats: 0 },
  rug: { w: 2, d: 1.4, h: 0.02, anchor: 'width', depthRatio: 0.7, minH: 0.01, maxH: 0.06, isSeat: false, seats: 0 },
  plant: { w: 0.6, d: 0.6, h: 1.2, anchor: 'height', depthRatio: 1, minH: 0.2, maxH: 2.4, isSeat: false, seats: 0 },
  generic: { w: 0.8, d: 0.6, h: 0.8, anchor: 'height', depthRatio: 0.75, minH: 0.05, maxH: 3, isSeat: false, seats: 0 },
}

/** Kinds whose top is a flat surface, so an elevated photo shows their footprint. */
export const TOP_SURFACE_KINDS: FurnitureKind[] = ['table', 'desk', 'poker']

const KEYWORDS: [FurnitureKind, RegExp][] = [
  ['poker', /\b(poker|casino|blackjack|baccarat|roulette|card ?table|gaming ?table|game ?table)\b/],
  ['stool', /\b(stool|ottoman|pouf|pouffe|footrest)\b/],
  ['sofa', /\b(sofa|couch|settee|loveseat|chaise|banquette|bench|davenport)\b/],
  ['chair', /\b(chair|armchair|recliner|seat|throne|highchair)\b/],
  ['desk', /\b(desk|workstation|writing table|bureau)\b/],
  ['table', /\b(table|coffee ?table|dining|nightstand|side ?table|console)\b/],
  ['bed', /\b(bed|mattress|bunk|daybed|futon|crib|cot)\b/],
  ['shelf', /\b(shelf|shelves|shelving|bookcase|bookshelf|etagere|rack)\b/],
  ['cabinet', /\b(cabinet|dresser|wardrobe|drawer|drawers|credenza|sideboard|cupboard|locker|armoire|chest)\b/],
  ['lamp', /\b(lamp|light|sconce|pendant|chandelier|torchiere|luminaire)\b/],
  ['rug', /\b(rug|carpet|mat|runner|kilim)\b/],
  ['plant', /\b(plant|planter|palm|fern|ficus|monstera|tree|succulent|greenery)\b/],
  ['round', /\b(apple|orange|fruit|ball|globe|sphere|vase|urn|bowl|pot|jar|bottle|balloon|egg|pumpkin)\b/],
]

export interface Guess {
  kind: FurnitureKind
  confidence: number
  reason: string
}

/** A word in the filename or URL beats any silhouette guess. */
export function kindFromText(text: string): FurnitureKind | null {
  const needle = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ')} `
  for (const [kind, re] of KEYWORDS) if (re.test(needle)) return kind
  return null
}

/** Band bounds arrive as fractions of PROFILE_BANDS, so they must be snapped to real indices. */
function mean(profile: Float32Array, from: number, to: number) {
  const lo = Math.max(0, Math.floor(from))
  const hi = Math.min(profile.length, Math.max(lo + 1, Math.ceil(to)))
  let sum = 0
  for (let i = lo; i < hi; i++) sum += profile[i]
  return sum / (hi - lo)
}

function maxRuns(runs: Uint8Array, from: number, to: number) {
  const lo = Math.max(0, Math.floor(from))
  const hi = Math.min(runs.length, Math.max(lo + 1, Math.ceil(to)))
  let best = 0
  for (let i = lo; i < hi; i++) best = Math.max(best, runs[i])
  return best
}

/**
 * Silhouette heuristics. These are proportion rules, not a trained model, so
 * the UI always shows the guess and lets the user override it.
 *
 * The useful first split is how the piece meets the floor: open legs, or a
 * solid mass. Almost everything else follows from that plus how far up the
 * silhouette the wide part reaches.
 */
export function classify(sil: Silhouette, hint = ''): Guess {
  const fromText = kindFromText(hint)
  if (fromText) return { kind: fromText, confidence: 0.95, reason: `matched "${hint.trim()}"` }

  const bw = sil.bbox.x1 - sil.bbox.x0 + 1
  const bh = sil.bbox.y1 - sil.bbox.y0 + 1
  const aspect = bh / bw
  const wide = bw / bh
  const B = PROFILE_BANDS
  const p = sil.widthProfile
  const top = mean(p, 0, B * 0.12)
  /** How much of the upper half is wide: a chair back, not just a table top. */
  const tallUpper = mean(p, B * 0.1, B * 0.5)
  const waist = mean(p, B * 0.3, B * 0.8)
  /** The last few percent of height, which is what actually touches the floor. */
  const foot = mean(p, B * 0.94, B)
  const footRuns = maxRuns(sil.runs, B * 0.94, B)
  const midRuns = maxRuns(sil.runs, B * 0.4, B * 0.75)

  if (aspect < 0.22 && sil.fill > 0.65) return { kind: 'rug', confidence: 0.8, reason: 'flat and very wide' }

  if (aspect > 1.3 && top > 0.7 && waist < 0.34 && footRuns <= 1) {
    return { kind: 'lamp', confidence: 0.7, reason: 'wide shade on a single thin stem' }
  }

  // A wide top over a much narrower body is a surface seen from above, not a
  // tall panel. Without this, every table shot from standing height reads as a
  // chair back.
  const cap = readCap(sil)
  if (cap.isElevated) {
    return wide > 1.85
      ? { kind: 'desk', confidence: 0.6, reason: 'wide top surface seen from above' }
      : { kind: 'table', confidence: 0.7, reason: 'top surface seen from above, on a narrow base' }
  }

  if (foot < 0.62 && footRuns >= 2) {
    if (tallUpper >= 0.55) {
      return wide > 1.6
        ? { kind: 'sofa', confidence: 0.58, reason: 'wide upholstered mass standing on feet' }
        : { kind: 'chair', confidence: 0.68, reason: 'back panel above a seat on legs' }
    }
    if (aspect > 1.15) return { kind: 'stool', confidence: 0.6, reason: 'small seat on tall legs, no back' }
    if (wide > 2.6) return { kind: 'bed', confidence: 0.5, reason: 'very long and low on legs' }
    return wide > 1.85
      ? { kind: 'desk', confidence: 0.58, reason: 'long thin top on open legs' }
      : { kind: 'table', confidence: 0.65, reason: 'thin top on open legs' }
  }

  if (aspect > 1.25 && foot > 0.8 && waist > 0.28) {
    return midRuns >= 2 || sil.fill < 0.82
      ? { kind: 'shelf', confidence: 0.58, reason: 'tall case with open bays' }
      : { kind: 'cabinet', confidence: 0.6, reason: 'tall solid block standing on the floor' }
  }

  // Rounded on every side and tapering at both ends: something to revolve,
  // not a box. Without this an apple lands in the cabinet fallback.
  if (isRevolvable(sil)) {
    return { kind: 'round', confidence: 0.62, reason: 'rounded and symmetric, so the outline can be revolved' }
  }

  if (aspect > 1.05 && waist < 0.5 && foot > waist) {
    return { kind: 'plant', confidence: 0.45, reason: 'broad top, narrow stem, wider base' }
  }

  if (wide > 1.4 && sil.fill > 0.5) {
    if (aspect < 0.32) return { kind: 'bed', confidence: 0.45, reason: 'very low and very wide' }
    if (tallUpper < 0.6) return { kind: 'table', confidence: 0.45, reason: 'wide and low over a solid base' }
    return { kind: 'sofa', confidence: 0.55, reason: 'low, wide, and solid' }
  }

  if (sil.fill > 0.6 && aspect > 0.7) {
    return { kind: 'cabinet', confidence: 0.4, reason: 'solid box standing on the floor' }
  }

  return { kind: 'generic', confidence: 0.25, reason: 'no clear furniture proportion, extruding the outline' }
}

/**
 * Is this a solid of revolution?
 *
 * Both ends have to taper well inside the widest slice, the outline has to be
 * a single smooth swell rather than a series of steps, and the two halves have
 * to mirror. A cabinet fails the taper test, a shelf fails the smoothness
 * test, and anything asymmetric fails the mirror test.
 */
function isRevolvable(sil: Silhouette) {
  const p = sil.axialProfile
  const B = PROFILE_BANDS
  let peak = 0
  let peakIdx = 0
  for (let i = 0; i < B; i++) {
    if (p[i] > peak) {
      peak = p[i]
      peakIdx = i
    }
  }
  if (peak <= 0.05) return false
  // Too much of the subject hanging off the axis and it is not one revolved body.
  if (sil.asymFrac > 0.3) return false

  const span = sil.axialBottom - sil.axialTop
  if (span < 0.25) return false
  const bw = sil.bbox.x1 - sil.bbox.x0 + 1
  const bh = sil.bbox.y1 - sil.bbox.y0 + 1
  const aspect = (span * bh) / (peak * bw)
  if (aspect < 0.45 || aspect > 2.6) return false

  const lo = Math.floor(sil.axialTop * B)
  const hi = Math.max(lo + 3, Math.ceil(sil.axialBottom * B))
  // Both ends have to taper: a cabinet is as wide at the floor as in the middle.
  const endTaper = Math.max(mean(p, lo, lo + Math.max(1, (hi - lo) * 0.06)), mean(p, hi - Math.max(1, (hi - lo) * 0.06), hi))
  if (endTaper > peak * 0.8) return false
  if (peakIdx < lo + (hi - lo) * 0.1 || peakIdx > hi - (hi - lo) * 0.1) return false

  // One smooth swell, not a stack of steps.
  let breaks = 0
  for (let i = lo + 1; i < hi; i++) {
    const delta = p[i] - p[i - 1]
    if (i <= peakIdx && delta < -0.06) breaks++
    if (i > peakIdx && delta > 0.06) breaks++
  }
  return breaks <= 3
}

/**
 * Turn photo proportions plus a kind into real metres.
 *
 * For a top surface photographed from above the bbox ratio is meaningless: it
 * mixes the object's height with the foreshortened depth of its top. Those get
 * their footprint from the reconstructed plan and their height from the
 * standard for the kind, which the user can override. A photo cannot measure
 * height reliably through perspective, but a table is a table height.
 */
export function fitDimensions(sil: Silhouette, kind: FurnitureKind, heightOverride?: number) {
  const spec = KIND_SPEC[kind]
  const bw = sil.bbox.x1 - sil.bbox.x0 + 1
  const bh = sil.bbox.y1 - sil.bbox.y0 + 1
  const ratio = bw / bh

  if (kind === 'round') {
    const p = sil.axialProfile
    let peak = 0
    for (let i = 0; i < p.length; i++) peak = Math.max(peak, p[i])
    const span = Math.max(0.05, sil.axialBottom - sil.axialTop)
    const bodyRatio = (peak * bw) / (span * bh)
    const h = clamp(heightOverride || spec.h, spec.minH, spec.maxH)
    const w = clamp(h * bodyRatio, 0.01, 4)
    return { w: round(w), d: round(w), h: round(h) }
  }

  if (TOP_SURFACE_KINDS.includes(kind)) {
    const cap = readCap(sil)
    if (cap.isElevated) {
      const w = round(spec.w * cap.peakW)
      const d = round(w * (kind === 'desk' ? 0.55 : 1))
      return { w, d, h: round(clamp(heightOverride || spec.h, spec.minH, spec.maxH)) }
    }
  }

  let h: number
  let w: number
  if (heightOverride && heightOverride > 0) {
    h = heightOverride
    w = h * ratio
  } else if (spec.anchor === 'height') {
    h = spec.h
    w = h * ratio
  } else {
    w = spec.w
    h = w / ratio
  }
  h = clamp(h, spec.minH, spec.maxH)
  w = clamp(h * ratio, spec.w * 0.35, spec.w * 3.2)
  const d = clamp(w * spec.depthRatio, spec.d * 0.4, spec.d * 2.6)
  return { w: round(w), d: round(d), h: round(h) }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function round(v: number) {
  return Math.round(v * 1000) / 1000
}
