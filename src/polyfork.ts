export interface PolyforkAsset {
  id: string
  title: string
  free: boolean
  thumbnail?: string
  size_m?: { x: number; y: number; z: number }
  download?: { glb?: string; auth?: string }
}

const KEY = 'atrium-polyfork-key'

export function polyforkKey() {
  return localStorage.getItem(KEY) || ''
}

export function setPolyforkKey(key: string) {
  if (key) localStorage.setItem(KEY, key)
  else localStorage.removeItem(KEY)
}

export async function searchPolyfork(q: string): Promise<PolyforkAsset[]> {
  const params = new URLSearchParams({ class: 'prop', per_page: '24', sort: 'latest' })
  if (q.trim()) params.set('q', q.trim())
  const headers: HeadersInit = {}
  const key = polyforkKey()
  if (key) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`https://polyfork.dev/api/assets?${params}`, { headers })
  if (!res.ok) throw new Error(`Polyfork ${res.status}`)
  const data = (await res.json()) as { assets?: PolyforkAsset[] }
  return data.assets ?? []
}

export function glbUrlFor(asset: PolyforkAsset) {
  return asset.download?.glb || `https://polyfork.dev/cdn/${asset.id}.glb`
}
