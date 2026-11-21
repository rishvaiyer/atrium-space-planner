import { formatMm, formatMoney, itemDims } from './geometry'
import type { Analysis } from './compliance'
import type { PlacedItem, Room } from './types'
import { pointOnWall, wallById } from './walls'

export function openBoard(options: {
  name: string
  occupancyGroup: string
  room: Room
  items: PlacedItem[]
  analysis: Analysis
}) {
  const { name, occupancyGroup, room, items, analysis } = options
  const ox = room.originX - 0.8
  const oz = room.originZ - 0.8
  const w = room.width + 1.6
  const d = room.depth + 1.6
  const spaces = room.spaces ?? []
  const spaceSvg = spaces
    .map(
      (sp, i) =>
        `<polygon points="${sp.polygon.map((p) => `${p.x},${p.z}`).join(' ')}" fill="${i % 2 ? '#dbeafe' : '#f1f5f9'}" stroke="none" opacity="0.85" />`,
    )
    .join('')
  const wallSvg = room.walls
    .map(
      (wall) =>
        `<line x1="${wall.ax}" y1="${wall.az}" x2="${wall.bx}" y2="${wall.bz}" stroke="#111" stroke-width="0.18" />`,
    )
    .join('')
  const doorSvg = room.doors
    .map((door) => {
      const wall = wallById(room, door.wallId)
      if (!wall) return ''
      const a = pointOnWall(wall, door.offset)
      const b = pointOnWall(wall, door.offset + door.width)
      return `<line x1="${a.x}" y1="${a.z}" x2="${b.x}" y2="${b.z}" stroke="#fff" stroke-width="0.2" />`
    })
    .join('')
  const itemSvg = items
    .map((it) => {
      try {
        const { w, d } = itemDims(it)
        return `<rect x="${it.x - w / 2}" y="${it.z - d / 2}" width="${w}" height="${d}" fill="${escapeHtml(it.finish ?? '#78846a')}" opacity="0.45" transform="rotate(${(it.rotation * 180) / Math.PI} ${it.x} ${it.z})" />`
      } catch {
        return ''
      }
    })
    .join('')
  const labels = spaces
    .map((sp) => {
      const c = sp.polygon.reduce((a, p) => ({ x: a.x + p.x, z: a.z + p.z }), { x: 0, z: 0 })
      const n = sp.polygon.length || 1
      return `<text x="${c.x / n}" y="${c.z / n}" text-anchor="middle" font-size="0.32" fill="#334155">${escapeHtml(sp.name)}</text>`
    })
    .join('')
  const roomRows = analysis.spaces
    .map(
      (sp) => `<tr><td>${escapeHtml(sp.name)}</td><td>${sp.area.toFixed(1)} m²</td><td>${sp.seats}</td></tr>`,
    )
    .join('')
  const checks = analysis.checks
    .map(
      (c) =>
        `<li class="${c.ok ? 'ok' : 'bad'}"><strong>${escapeHtml(c.label)}</strong> ${escapeHtml(c.detail)}</li>`,
    )
    .join('')
  const furnitureRows = analysis.schedule
    .map(
      (row) =>
        `<tr><td>${escapeHtml(row.name)}</td><td>${row.quantity}</td><td>${formatMoney(row.unit)}</td><td>${formatMoney(row.total)}</td><td>${escapeHtml(row.basis)}${row.reference ? ' · ' + escapeHtml(row.reference) : ''}</td></tr>`,
    )
    .join('')
  const costRows = analysis.lines
    .map((line) => `<tr><td>${escapeHtml(line.label)}</td><td>${formatMoney(line.amount)}</td></tr>`)
    .join('')
  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(name)} — ATRIUM</title>
<style>
  body { font-family: 'IBM Plex Sans', system-ui, sans-serif; color: #293a2d; background: #fffefa; margin: 40px; max-width: 1200px; }
  .brand { font-size: 22px; letter-spacing: -.04em; border-bottom: 1px solid #d7dccf; padding-bottom: 16px; margin-bottom: 24px; }
  .sheet-note { color: #62695e; font-size: 12px; line-height: 1.6; }
  h1 { font-size: 36px; letter-spacing: -.04em; font-weight: 500; margin: 0 0 4px; }
  .meta { color: #62695e; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 28px; }
  svg { width: 100%; height: auto; background: #f3f0e7; border: 1px solid #d7dccf; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { border-bottom: 1px solid #d7dccf; padding: 6px 4px; text-align: left; }
  .hero { font-size: 28px; margin: 8px 0; }
  .ok { color: #15803d; } .bad { color: #b91c1c; }
  ul { padding-left: 16px; }
  @media (max-width: 720px) {
    body { margin: 16px; }
    .grid { grid-template-columns: 1fr; }
    button { min-height: 44px; padding: 10px 14px; }
  }
  @media print { button { display: none; } body { margin: 16px; } }
</style></head>
<body>
  <div class="brand">atrium <button style="float:right" onclick="window.print()">Print / save PDF</button></div>
  <h1>${escapeHtml(name)}</h1>
  <div class="meta">${escapeHtml(occupancyGroup)} · ${room.width.toFixed(2)} × ${room.depth.toFixed(2)} m · ${formatMm(room.wallHeight)} mm high</div>
  <div class="grid">
    <div>
      <svg viewBox="${ox} ${oz} ${w} ${d}">${spaceSvg}${wallSvg}${doorSvg}${itemSvg}${labels}</svg>
    </div>
    <div>
      <div>Estimated project cost</div>
      <div class="hero">${formatMoney(analysis.total)}</div>
      <div class="meta">Cap ${formatMoney(analysis.cap)} · ${analysis.budgetOk ? 'within cap' : 'over cap'}</div>
      <h3>Rooms</h3>
      <table><thead><tr><th>Name</th><th>Area</th><th>Seats</th></tr></thead><tbody>${roomRows}</tbody></table>
      <h3>Layout review</h3>
      <ul>${checks}</ul>
    </div>
  </div>
  <h2>Estimate breakdown</h2><table><tbody>${costRows}<tr><th>Total estimate</th><th>${formatMoney(analysis.total)}</th></tr></tbody></table>
  <h2>Furniture schedule</h2>
  <table><thead><tr><th>Item</th><th>Quantity</th><th>Unit price</th><th>Subtotal</th><th>Price source</th></tr></thead><tbody>${furnitureRows}</tbody></table>
  <p class="sheet-note">The project estimate includes finish and budget allowances. Catalog prices are planning estimates. Confirm supplier quotes and local building requirements before work begins.</p>
</body></html>`
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!,
  )
}
