/**
 * Reading a photo taken from above.
 *
 * Almost no furniture is photographed as a flat front elevation. A table shot
 * from a normal standing height shows its top as an ellipse, which a naive
 * front-elevation reading mistakes for a tall wide panel (a chair back).
 *
 * This module finds that foreshortened top, recovers the camera tilt from how
 * squashed it is, and reconstructs the real plan outline of the top. The plan
 * outline is the part a space planner actually needs: it is the footprint.
 */
import type { Silhouette } from './segment'
import { PROFILE_BANDS } from './segment'

const B = PROFILE_BANDS

export interface CapReading {
  /** A wide top cap sits over a much narrower body: a top seen from above. */
  isElevated: boolean
  /** Fraction from the top where the widest band sits. */
  peakAt: number
  /** Width of the widest band, 0..1 of the bbox. */
  peakW: number
  /** Fraction of the height the top occupies before the body starts. */
  capEnd: number
  /**
   * Squash of the top: the ellipse height over its width. 1 is straight down,
   * near 0 is eye level. Used to unforeshorten the top texture.
   */
  sinTilt: number
  /** Narrowest band of the body below the top, 0..1 of the bbox. */
  stemMin: number
  /** One central column rather than separate legs. */
  pedestal: boolean
  /** Width of the base flare at the floor, 0..1 of the bbox, or 0 for none. */
  baseW: number
}

function smoothed(profile: Float32Array) {
  const out = new Float32Array(profile.length)
  for (let i = 0; i < profile.length; i++) {
    const a = profile[Math.max(0, i - 1)]
    const b = profile[i]
    const c = profile[Math.min(profile.length - 1, i + 1)]
    out[i] = (a + b + c) / 3
  }
  return out
}

export function readCap(sil: Silhouette): CapReading {
  const p = smoothed(sil.widthProfile)
  const bw = sil.bbox.x1 - sil.bbox.x0 + 1
  const bh = sil.bbox.y1 - sil.bbox.y0 + 1
  const aspect = bh / bw

  let peak = 0
  let peakIdx = 0
  for (let i = 0; i < B; i++) {
    if (p[i] > peak) {
      peak = p[i]
      peakIdx = i
    }
  }

  // The top ends where the outline has dropped to half its widest.
  let capIdx = B - 1
  for (let i = peakIdx; i < B; i++) {
    if (p[i] < peak * 0.5) {
      capIdx = i
      break
    }
  }

  let stemMin = 1
  for (let i = capIdx; i < Math.floor(B * 0.86); i++) stemMin = Math.min(stemMin, p[i])

  // Count how much of the body is genuinely split into separate legs. A single
  // ornamented base can show two runs for a band or two without being legs.
  let splitBands = 0
  let bodyBands = 0
  for (let i = capIdx + 1; i < Math.floor(B * 0.82); i++) {
    bodyBands++
    if (sil.runs[i] >= 2) splitBands++
  }

  let baseW = 0
  for (let i = Math.floor(B * 0.86); i < B; i++) baseW = Math.max(baseW, p[i])

  const peakAt = peakIdx / B
  const capEnd = capIdx / B
  const capHeightPx = capEnd * bh
  const capWidthPx = Math.max(1, peak * bw)

  const isElevated =
    peakAt < 0.42 &&
    capEnd > 0.06 &&
    capEnd < 0.55 &&
    stemMin < peak * 0.45 &&
    aspect < 1.25

  return {
    isElevated,
    peakAt,
    peakW: peak,
    capEnd,
    sinTilt: Math.min(0.95, Math.max(0.08, capHeightPx / capWidthPx)),
    stemMin,
    pedestal: !bodyBands || splitBands / bodyBands < 0.35,
    baseW: baseW > stemMin * 1.35 ? baseW : 0,
  }
}

/**
 * The plan outline of the top, reconstructed from the foreshortened ellipse.
 *
 * Each row of the cap is one slice of depth, so the width profile through the
 * cap traces the real outline once the vertical axis is stretched back out.
 * A circular top comes back circular, a racetrack comes back a racetrack.
 * Returns half-widths from the back edge to the front edge as a fraction of the
 * top's own width, so the widest slice is 0.5.
 */
export function topOutline(sil: Silhouette, cap: CapReading, samples = 72): number[] {
  const rows = sil.rowAxial
  const bh = rows.length
  const last = Math.max(2, Math.round(cap.capEnd * bh))
  // Average over a window so the outline is a smooth curve, not a staircase.
  const window = Math.max(1, Math.round(last / samples))
  const peak = Math.max(0.02, cap.peakW)
  const out: number[] = []
  for (let i = 0; i < samples; i++) {
    const centre = (i / (samples - 1)) * (last - 1)
    let sum = 0
    let n = 0
    for (let k = -window; k <= window; k++) {
      const r = Math.round(centre + k)
      if (r < 0 || r >= last || r >= bh) continue
      sum += rows[r]
      n++
    }
    out.push(n ? sum / n / 2 / peak : 0)
  }
  out[0] = Math.min(out[0], out[1] ?? out[0])
  out[out.length - 1] = Math.min(out[out.length - 1], out[out.length - 2] ?? 0)
  return out
}
