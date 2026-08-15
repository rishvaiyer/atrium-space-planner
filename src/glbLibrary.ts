import type { CatalogItem } from './types'
import { registerGlbItem, unregisterGlbItem } from './catalog'
import { uid } from './geometry'

const DB = 'atrium-glb'
const STORE = 'files'
const LIST_KEY = 'atrium-glb-index'

export interface GlbEntry {
  id: string
  name: string
  source: 'file' | 'polyfork'
  glbUrl: string
  w: number
  d: number
  h: number
  thumb?: string
  polyforkId?: string
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

export function registerFromEntry(e: GlbEntry) {
  const item: CatalogItem & { glbUrl: string } = {
    id: e.id,
    name: e.name,
    sku: 'GLB',
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
    tags: ['glb', e.source],
    glbUrl: e.glbUrl,
  }
  registerGlbItem(item)
}

export async function hydrateGlbLibrary() {
  const entries = listGlb()
  const next: GlbEntry[] = []
  for (const e of entries) {
    if (e.source === 'file') {
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

export async function importGlbFiles(files: File[]) {
  const entries = listGlb()
  for (const file of files) {
    if (!/\.(glb|gltf)$/i.test(file.name)) continue
    const id = `glb:${uid()}`
    const buf = await file.arrayBuffer()
    await idbPut(id, buf)
    const url = URL.createObjectURL(new Blob([buf], { type: file.type || 'model/gltf-binary' }))
    entries.push({
      id,
      name: file.name.replace(/\.(glb|gltf)$/i, ''),
      source: 'file',
      glbUrl: url,
      w: 1.2,
      d: 1.2,
      h: 1.2,
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

export function removeGlb(id: string) {
  unregisterGlbItem(id)
  saveList(listGlb().filter((e) => e.id !== id))
}
