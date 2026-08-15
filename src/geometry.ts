import type { PlacedItem } from './types'
import { catalogItem } from './catalog'

export function snapTo(value: number, snap: number): number {
  if (snap <= 0) return value
  return Math.round(value / snap) * snap
}

export function rotatedExtents(w: number, d: number, rotation: number): { w: number; d: number } {
  const c = Math.abs(Math.cos(rotation))
  const s = Math.abs(Math.sin(rotation))
  return { w: w * c + d * s, d: w * s + d * c }
}

export function itemAabb(item: PlacedItem) {
  const def = catalogItem(item.catalogId)
  const { w, d } = rotatedExtents(def.w, def.d, item.rotation)
  return {
    minX: item.x - w / 2,
    maxX: item.x + w / 2,
    minZ: item.z - d / 2,
    maxZ: item.z + d / 2,
    w,
    d,
  }
}

export function formatMm(meters: number): string {
  const mm = Math.round(meters * 1000)
  return mm.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}
