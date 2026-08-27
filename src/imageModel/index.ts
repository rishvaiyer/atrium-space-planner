/**
 * Photo to 3D: turn an uploaded image or an image URL into a placeable model.
 *
 * The whole pipeline is local to the browser. Nothing is uploaded, and there is
 * no generative model behind it: the photo is segmented, measured, and then
 * either fitted to a parametric piece of furniture or extruded from its own
 * outline. See `HONEST_NOTE` for how that is described in the UI.
 */
import type { Group } from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

import { buildModel, disposeGroup, type BuildMode, type Finish } from './build'
import { classify, fitDimensions, type FurnitureKind, type Guess } from './classify'
import { analyzeImage, loadImageSource, type ImageSource, type Silhouette } from './segment'
import { readCap, type CapReading } from './topview'

export { KIND_LABEL, KIND_SPEC, type FurnitureKind } from './classify'
export type { BuildMode, Finish } from './build'

export const HONEST_NOTE =
  'Runs entirely in your browser: the photo is cut out, measured, and rebuilt as geometry with a clean material mixed from its own colours. It is a planning stand-in matched to the shape and colours of your photo, not a scan of the real object.'

export interface Analysis {
  sil: Silhouette
  guess: Guess
  /** What the top of the photo turned out to be: a surface seen from above, or not. */
  cap: CapReading
  kind: FurnitureKind
  /** Data URL of the cutout, for the preview strip. */
  preview: string
  name: string
}

/** Derive a usable name from a filename or URL. */
export function nameFromSource(src: ImageSource, fallback = 'Photo model') {
  const raw = typeof src === 'string' ? decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() ?? '') : ((src as File).name ?? '')
  const stem = raw.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
  if (!stem) return fallback
  return stem.slice(0, 48).replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Step one: read the image and report what we think it is. */
export async function analyzeSource(src: ImageSource, hintText?: string): Promise<Analysis> {
  const bitmap = await loadImageSource(src)
  let sil: Silhouette
  try {
    sil = analyzeImage(bitmap)
  } finally {
    bitmap.close()
  }
  const name = nameFromSource(src)
  const hint = hintText?.trim() || (typeof src === 'string' ? src : (src as File).name ?? '')
  const guess = classify(sil, hint)
  return {
    sil,
    guess,
    cap: readCap(sil),
    kind: guess.kind,
    preview: sil.cutout.toDataURL('image/png'),
    name,
  }
}

export interface GenerateOptions {
  kind: FurnitureKind
  mode: BuildMode
  /** How surfaces are made: rebuilt clean from the photo's colours, or the photo itself. */
  finish: Finish
  /** Metres. Overrides the fitted height and rescales width with it. */
  height?: number
  /** Metres. Overrides the guessed depth, which a single photo cannot show. */
  depth?: number
}

export interface GeneratedModel {
  glb: ArrayBuffer
  w: number
  d: number
  h: number
  kind: FurnitureKind
  mode: BuildMode
  finish: Finish
}

/** Step two: build the mesh and serialise it to a GLB the app already knows how to place. */
export async function generateModel(analysis: Analysis, opts: GenerateOptions): Promise<GeneratedModel> {
  const fitted = fitDimensions(analysis.sil, opts.kind, opts.height)
  const w = fitted.w
  const h = fitted.h
  const d = opts.depth && opts.depth > 0 ? opts.depth : fitted.d
  const mode: BuildMode = opts.mode

  let group: Group | null = null
  try {
    group = buildModel({ sil: analysis.sil, kind: opts.kind, w, d, h, finish: opts.finish }, mode)
    const glb = await exportGlb(group)
    return { glb, w, d, h, kind: opts.kind, mode, finish: opts.finish }
  } finally {
    if (group) disposeGroup(group)
  }
}

function exportGlb(group: Group): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      group,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result)
        else reject(new Error('The exporter returned JSON instead of a binary GLB.'))
      },
      (err) => reject(err instanceof Error ? err : new Error('GLB export failed.')),
      { binary: true },
    )
  })
}
