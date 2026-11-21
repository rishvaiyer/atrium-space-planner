import test from 'node:test'
import assert from 'node:assert/strict'
import { furnitureCsv, furnitureSchedule, unitPriceFor } from '../src/pricing'
import { analyzeLayout } from '../src/compliance'
import { openBoard } from '../src/board'
import { boxRoom, insertWall, reshapeBox, roomResizeIssue } from '../src/walls'

const chair = { id: 'seat', catalogId: 'cafe-chair', x: 1.5, z: 2, rotation: 0 }
const room = boxRoom(6, 5, 3, [{ id: 'exit', wallId: 's', offset: 2.5, width: 1, swing: 'left' }])
const analyze = (patch = {}) =>
  analyzeLayout({
    room,
    items: [chair],
    tier: 'premium',
    floor: 'concrete',
    cap: 4000,
    jurisdiction: 'IBC',
    worldId: 'earth',
    ...patch,
  })

test('real quotes take priority over price tiers, including explicitly free items', () => {
  assert.equal(unitPriceFor({ ...chair, unitPrice: 123.45 }, 'premium'), 123.45)
  assert.equal(unitPriceFor({ ...chair, unitPrice: 0 }, 'premium'), 0)
  assert.equal(unitPriceFor(chair, 'premium'), 230.4)
})

test('estimate, schedule and CSV use the same quoted prices and allowances', () => {
  const items = [
    { ...chair, unitPrice: 123.45, quoteReference: 'Vendor, "May quote"' },
    { ...chair, id: 'second', x: 3, unitPrice: 123.45, quoteReference: 'Vendor, "May quote"' },
  ]
  const result = analyze({ items, costSettings: { setupAllowance: 100, contingencyPct: 10 } })
  assert.equal(result.schedule[0].total, 246.9)
  assert.equal(result.total, 2163.59) // (246.90 + 30 square metres at $54 + $100) × 1.10
  assert.equal(furnitureSchedule(items, 'premium')[0].unit, 123.45)
  assert.match(furnitureCsv(items, 'premium'), /"246.9"/)
  assert.match(furnitureCsv(items, 'premium'), /Vendor, ""May quote""/)
})

test('interior partition doors do not count as exits', () => {
  const interior = boxRoom(6, 5, 3)
  interior.walls.push({ id: 'partition', ax: 3, az: 0, bx: 3, bz: 5 })
  interior.doors.push({ id: 'inside', wallId: 'partition', offset: 2, width: 1, swing: 'left' })
  const result = analyze({ room: interior })
  assert.equal(result.checks.find((check) => check.id === 'egress')?.ok, false)
})

test('a blocked door cannot borrow a walkable cell across an obstruction', () => {
  const obstacle = { id: 'block', catalogId: 'espresso-bar', x: 3, z: 0.2, rotation: 0, w: 5.5, d: 1 }
  const result = analyze({ items: [chair, obstacle] })
  assert.equal(result.checks.find((check) => check.id === 'egress')?.ok, false)
  assert.equal(result.aisleMinM, null)
})

test('a thin obstruction between the inward goal and door still blocks the route', () => {
  const obstacle = { id: 'thin-block', catalogId: 'espresso-bar', x: 3, z: 0.1, rotation: 0, w: 5.5, d: 0.1 }
  const result = analyze({ items: [chair, obstacle] })
  assert.equal(result.checks.find((check) => check.id === 'egress')?.ok, false)
})

test('a zero flooring quote keeps existing flooring out of the estimate', () => {
  const result = analyze({ costSettings: { setupAllowance: 0, contingencyPct: 0, floorRate: 0 } })
  assert.equal(result.total, 230.4)
})

test('a clear room with a wide exterior doorway finds a route', () => {
  const openRoom = boxRoom(6, 5, 3, [
    { id: 'wide-exit', wallId: 's', offset: 2.3, width: 1.4, swing: 'left' },
  ])
  const result = analyze({ room: openRoom })
  assert.equal(result.checks.find((check) => check.id === 'egress')?.ok, true)
  assert.equal(result.aisleOk, true)
})

test('resizing split exterior walls updates bounds without leaving old wall segments', () => {
  const split = insertWall(boxRoom(6, 5, 3), 3, 0, 3, 5).room
  const resized = reshapeBox(split, 4, 7)
  assert.equal(resized.width, 4)
  assert.equal(resized.depth, 7)
  assert.equal(resized.walls.length, split.walls.length)
  assert.ok(resized.walls.every((w) => Math.max(w.ax, w.bx) <= 4 && Math.max(w.az, w.bz) <= 7))
})

test('custom room wall IDs resize and keep physical door widths', () => {
  const custom = boxRoom(6, 5, 3, [
    { id: 'exit', wallId: 'south-custom', offset: 2.5, width: 1, swing: 'left' },
  ])
  custom.walls = custom.walls.map((wall) => ({
    ...wall,
    id: wall.id === 's' ? 'south-custom' : `custom-${wall.id}`,
  }))
  const resized = reshapeBox(custom, 12, 10)
  assert.equal(resized.width, 12)
  assert.equal(resized.depth, 10)
  assert.equal(resized.doors[0].width, 1)
  assert.equal(resized.doors[0].offset, 5.5)
})

test('a resize cannot leave a door wider than its wall', () => {
  const original = boxRoom(6, 5, 3, [{ id: 'wide', wallId: 's', offset: 2, width: 1.4, swing: 'left' }])
  assert.match(roomResizeIssue(original, 1, 5) ?? '', /wider than its wall/)
  assert.equal(reshapeBox(original, 1, 5), original)
})


test('client boards escape imported finish values and quote references', async () => {
  const attack = '\"><script>window.boardInjected=true</script>'
  const items = [{ ...chair, finish: attack, quoteReference: attack, unitPrice: 20 }]
  const originalCreate = URL.createObjectURL
  const originalWindow = globalThis.window
  let rendered: Blob | undefined
  URL.createObjectURL = (value) => {
    rendered = value as Blob
    return 'blob:client-board-test'
  }
  globalThis.window = { open: () => null } as unknown as Window & typeof globalThis
  try {
    openBoard({ name: 'Reviewed plan', occupancyGroup: 'Café', room, items, analysis: analyze({ items }) })
    const html = await rendered!.text()
    assert.ok(!html.includes('<script>window.boardInjected'))
    assert.ok(html.includes('&quot;&gt;&lt;script&gt;window.boardInjected'))
  } finally {
    URL.createObjectURL = originalCreate
    globalThis.window = originalWindow
  }
})
