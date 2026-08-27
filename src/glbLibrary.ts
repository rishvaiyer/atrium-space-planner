import type { CatalogItem } from './types'
import { registerGlbItem, unregisterGlbItem } from './catalog'
import { uid } from './geometry'
import { measureGlb } from './glbMeasure'

const DB = 'atrium-glb'
const STORE = 'files'
const LIST_KEY = 'atrium-glb-index'

export type GlbSource = 'file' | 'polyfork' | 'photo'

export interface GlbEntry {
  id: string
  name: string
  source: GlbSource
  glbUrl: string
  w: number
  d: number
  h: number
  thumb?: string
  polyforkId?: string
  /** Set on photo-generated models: what the classifier decided and how it was built. */
  photoKind?: string
  photoMode?: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export function listGlb(): GlbEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY) || '[]') as GlbEntry[]
  } catch {
    return []
  }
}

function saveList(entries: GlbEntry[]) {
  localStorage.setItem(LIST_KEY, JSON.stringify(entries))
  for (const e of entries) registerFromEntry(e)
}

/** Photo models of seats should behave like seats in the avatar and cost passes. */
const PHOTO_SEATS: Record<string, Partial<CatalogItem>> = {
  chair: { isSeat: true, seats: 1, sitHeight: 0.45, use: 'sit', costGroup: 'seating' },
  stool: { isSeat: true, seats: 1, sitHeight: 0.7, use: 'sit', costGroup: 'seating' },
  sofa: { isSeat: true, seats: 3, sitHeight: 0.42, use: 'sit', costGroup: 'seating' },
  bed: { isSeat: false, seats: 0, sitHeight: 0.5, use: 'sleep' },
  table: { costGroup: 'tables' },
  desk: { costGroup: 'tables' },
  lamp: { costGroup: 'lighting' },
}

export function registerFromEntry(e: GlbEntry) {
  const seat = e.photoKind ? PHOTO_SEATS[e.photoKind] : undefined
  const item: CatalogItem & { glbUrl: string } = {
    id: e.id,
    name: e.name,
    sku: e.source === 'photo' ? 'PHOTO' : 'GLB',
    category: 'home',
    costGroup: 'other',
    price: 0,
    w: e.w,
    d: e.d,
    h: e.h,
    plan: 'rect',
    blocksCirculation: true,
    isSeat: false,
    seats: 0,
    tags: e.photoKind ? ['glb', e.source, e.photoKind] : ['glb', e.source],
    glbUrl: e.glbUrl,
  }
  if (seat) Object.assign(item, seat)
  registerGlbItem(item)
}

export async function hydrateGlbLibrary() {
  const entries = listGlb()
  const next: GlbEntry[] = []
  for (const e of entries) {
    if (e.source !== 'polyfork') {
      try {
        const buf = await idbGet(e.id)
        if (buf) {
          const url = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))
          next.push({ ...e, glbUrl: url })
          continue
        }
      } catch {
        /* skip missing blob */
      }
    }
    next.push(e)
  }
  saveList(next)
  return next
}

function idbGet(id: string): Promise<ArrayBuffer | undefined> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id)
        req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined)
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbPut(id: string, buf: ArrayBuffer) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(buf, id)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
  )
}

function idbDel(id: string) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function importGlbFiles(files: File[]) {
  const entries = listGlb()
  for (const file of files) {
    if (!/\.(glb|gltf)$/i.test(file.name)) continue
    const id = `glb:${uid()}`
    const buf = await file.arrayBuffer()
    await idbPut(id, buf)
    const url = URL.createObjectURL(new Blob([buf], { type: file.type || 'model/gltf-binary' }))
    let w = 1.2
    let d = 1.2
    let h = 1.2
    let thumb: string | undefined
    try {
      const measured = await measureGlb(url)
      w = measured.w
      d = measured.d
      h = measured.h
      thumb = measured.thumb
    } catch {
      /* keep defaults */
    }
    entries.push({
      id,
      name: file.name.replace(/\.(glb|gltf)$/i, ''),
      source: 'file',
      glbUrl: url,
      w,
      d,
      h,
      thumb,
    })
  }
  saveList(entries)
  return listGlb()
}

export function addPolyforkAsset(asset: {
  id: string
  title: string
  glbUrl: string
  w: number
  d: number
  h: number
  thumb?: string
}) {
  const entries = listGlb()
  const id = `pf:${asset.id}`
  if (entries.some((e) => e.id === id)) {
    registerFromEntry(entries.find((e) => e.id === id)!)
    return listGlb()
  }
  entries.push({
    id,
    name: asset.title,
    source: 'polyfork',
    glbUrl: asset.glbUrl,
    w: asset.w,
    d: asset.d,
    h: asset.h,
    thumb: asset.thumb,
    polyforkId: asset.id,
  })
  saveList(entries)
  return listGlb()
}

/** Store a GLB produced in the browser (Photo to 3D) and expose it as a catalog item. */
export async function addPhotoGlb(model: {
  name: string
  glb: ArrayBuffer
  w: number
  d: number
  h: number
  kind: string
  mode: string
}) {
  const id = `glb:${uid()}`
  await idbPut(id, model.glb)
  const url = URL.createObjectURL(new Blob([model.glb], { type: 'model/gltf-binary' }))
  let thumb: string | undefined
  try {
    thumb = (await measureGlb(url)).thumb
  } catch {
    /* the list falls back to a generic glyph */
  }
  const entry: GlbEntry = {
    id,
    name: model.name.trim() || 'Photo model',
    source: 'photo',
    glbUrl: url,
    w: model.w,
    d: model.d,
    h: model.h,
    thumb,
    photoKind: model.kind,
    photoMode: model.mode,
  }
  saveList([...listGlb(), entry])
  return entry
}

export function removeGlb(id: string) {
  unregisterGlbItem(id)
  const entry = listGlb().find((e) => e.id === id)
  if (entry && entry.source !== 'polyfork') void idbDel(id).catch(() => undefined)
  saveList(listGlb().filter((e) => e.id !== id))
}

const MAX_EMBED = 2_500_000
const MAX_TOTAL = 12_000_000

export interface PortableGlb {
  id: string
  name: string
  source: GlbSource
  w: number
  d: number
  h: number
  thumb?: string
  polyforkId?: string
  url?: string
  data?: string
  omitted?: boolean
  photoKind?: string
  photoMode?: string
}

function bufToB64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf)
  let bin = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    bin += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(bin)
}

function b64ToBuf(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

export async function exportPortableGlbs(usedIds: string[]): Promise<PortableGlb[]> {
  const wanted = new Set(usedIds.filter((id) => id.startsWith('glb:') || id.startsWith('pf:')))
  const out: PortableGlb[] = []
  let total = 0
  for (const e of listGlb()) {
    if (!wanted.has(e.id)) continue
    const rec: PortableGlb = {
      id: e.id,
      name: e.name,
      source: e.source,
      w: e.w,
      d: e.d,
      h: e.h,
      thumb: e.thumb,
      polyforkId: e.polyforkId,
      photoKind: e.photoKind,
      photoMode: e.photoMode,
    }
    if (e.source === 'polyfork') {
      rec.url = e.glbUrl.startsWith('blob:')
        ? `https://polyfork.dev/cdn/${e.polyforkId}.glb`
        : e.glbUrl
      out.push(rec)
      continue
    }
    const buf = await idbGet(e.id)
    if (!buf || buf.byteLength > MAX_EMBED || total + buf.byteLength > MAX_TOTAL) {
      rec.omitted = true
      out.push(rec)
      continue
    }
    rec.data = bufToB64(buf)
    total += buf.byteLength
    out.push(rec)
  }
  return out
}

export async function importPortableGlbs(assets: PortableGlb[]) {
  const entries = listGlb()
  for (const a of assets) {
    if (a.data) {
      const buf = b64ToBuf(a.data)
      await idbPut(a.id, buf)
      const url = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }))
      const next: GlbEntry = {
        id: a.id,
        name: a.name,
        source: a.source,
        glbUrl: url,
        w: a.w,
        d: a.d,
        h: a.h,
        thumb: a.thumb,
        polyforkId: a.polyforkId,
        photoKind: a.photoKind,
        photoMode: a.photoMode,
      }
      const i = entries.findIndex((e) => e.id === a.id)
      if (i >= 0) entries[i] = next
      else entries.push(next)
      continue
    }
    if (a.url) {
      const next: GlbEntry = {
        id: a.id,
        name: a.name,
        source: a.source,
        glbUrl: a.url,
        w: a.w,
        d: a.d,
        h: a.h,
        thumb: a.thumb,
        polyforkId: a.polyforkId,
        photoKind: a.photoKind,
        photoMode: a.photoMode,
      }
      const i = entries.findIndex((e) => e.id === a.id)
      if (i >= 0) entries[i] = next
      else entries.push(next)
    }
  }
  saveList(entries)
}
