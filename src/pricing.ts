import { catalogItem } from './catalog'
import type { BudgetTier, PlacedItem } from './types'

export const TIER_MULT: Record<BudgetTier, number> = { budget: 0.9, standard: 1, premium: 1.28 }
export interface CostSettings {
  setupAllowance: number
  contingencyPct: number
  floorRate?: number
}
export const DEFAULT_COST_SETTINGS: CostSettings = { setupAllowance: 0, contingencyPct: 0 }
export const moneyAmount = (value: number) => Math.round(value * 100) / 100

export function unitPriceFor(item: PlacedItem, tier: BudgetTier) {
  if (item.unitPrice != null && Number.isFinite(item.unitPrice) && item.unitPrice >= 0)
    return moneyAmount(item.unitPrice)
  return moneyAmount(catalogItem(item.catalogId).price * TIER_MULT[tier])
}

export function furnitureSchedule(items: PlacedItem[], tier: BudgetTier) {
  const groups = new Map<
    string,
    {
      sku: string
      name: string
      quantity: number
      unit: number
      total: number
      basis: string
      reference: string
    }
  >()
  for (const item of items) {
    const definition = catalogItem(item.catalogId)
    const unit = unitPriceFor(item, tier)
    const basis =
      item.unitPrice != null
        ? 'Your price'
        : /^(glb:|pf:)/.test(item.catalogId) && definition.price === 0
          ? 'Price needed'
          : 'Catalog allowance'
    const reference = item.quoteReference ?? ''
    const key = JSON.stringify([item.catalogId, unit, basis, reference])
    const row = groups.get(key) ?? {
      sku: definition.sku,
      name: definition.name,
      quantity: 0,
      unit,
      total: 0,
      basis,
      reference,
    }
    row.quantity += 1
    row.total = moneyAmount(row.quantity * unit)
    groups.set(key, row)
  }
  return [...groups.values()]
}

export function furnitureCsv(items: PlacedItem[], tier: BudgetTier) {
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[=+@\-\t\r]/.test(text) ? "'" + text : text
    return '"' + safe.replaceAll('"', '""') + '"'
  }
  return [
    ['SKU', 'Item', 'Quantity', 'Unit USD', 'Subtotal USD', 'Price basis', 'Quote reference'],
    ...furnitureSchedule(items, tier).map((row) => [
      row.sku,
      row.name,
      row.quantity,
      row.unit,
      row.total,
      row.basis,
      row.reference,
    ]),
  ]
    .map((row) => row.map(cell).join(','))
    .join('\r\n')
}
