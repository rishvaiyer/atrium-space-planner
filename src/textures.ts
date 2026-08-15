import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'

const cache = new Map<string, CanvasTexture>()

function makeTexture(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeatX = 4,
  repeatY = 4,
): CanvasTexture {
  const hit = cache.get(key)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context missing')
  draw(ctx, size)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 8
  cache.set(key, texture)
  return texture
}

export function woodTexture(tint = '#8a5a32'): CanvasTexture {
  return makeTexture(`wood-${tint}`, 512, (ctx, size) => {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * size
      ctx.strokeStyle = `rgba(40, 22, 10, ${0.08 + Math.random() * 0.18})`
      ctx.lineWidth = 1 + Math.random() * 2.4
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(
        size * 0.3,
        y + (Math.random() - 0.5) * 18,
        size * 0.7,
        y + (Math.random() - 0.5) * 18,
        size,
        y + (Math.random() - 0.5) * 8,
      )
      ctx.stroke()
    }
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255, 220, 170, ${0.03 + Math.random() * 0.04})`
      ctx.fillRect(0, Math.random() * size, size, 6)
    }
  }, 2, 2)
}

export function oakFloorTexture(): CanvasTexture {
  return makeTexture('oak-floor', 512, (ctx, size) => {
    const plank = 42
    for (let y = 0; y < size; y += plank) {
      const base = 38 + ((y / plank) % 3) * 6
      ctx.fillStyle = `hsl(32, 38%, ${base}%)`
      ctx.fillRect(0, y, size, plank - 1)
      ctx.fillStyle = 'rgba(40, 24, 10, 0.35)'
      ctx.fillRect(0, y + plank - 1, size, 1)
      for (let x = 0; x < size; x += 160 + ((y / plank) % 2) * 40) {
        ctx.fillRect(x, y, 1, plank)
      }
      for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = `rgba(30, 16, 6, ${0.06 + Math.random() * 0.08})`
        ctx.beginPath()
        const yy = y + 8 + Math.random() * (plank - 16)
        ctx.moveTo(0, yy)
        ctx.lineTo(size, yy + (Math.random() - 0.5) * 4)
        ctx.stroke()
      }
    }
  }, 6, 6)
}

export function terrazzoTexture(): CanvasTexture {
  return makeTexture('terrazzo', 512, (ctx, size) => {
    ctx.fillStyle = '#d9d2c5'
    ctx.fillRect(0, 0, size, size)
    const chips = ['#8a8680', '#c4b7a4', '#6e7a72', '#e8e0d4', '#b5523a', '#2f3a38']
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = chips[i % chips.length]
      ctx.globalAlpha = 0.55 + Math.random() * 0.4
      ctx.beginPath()
      ctx.ellipse(
        Math.random() * size,
        Math.random() * size,
        2 + Math.random() * 7,
        1.5 + Math.random() * 5,
        Math.random() * Math.PI,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }, 3, 3)
}

export function concreteTexture(): CanvasTexture {
  return makeTexture('concrete', 512, (ctx, size) => {
    ctx.fillStyle = '#9a9894'
    ctx.fillRect(0, 0, size, size)
    const img = ctx.getImageData(0, 0, size, size)
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 28
      img.data[i] = img.data[i] + n
      img.data[i + 1] = img.data[i + 1] + n
      img.data[i + 2] = img.data[i + 2] + n
    }
    ctx.putImageData(img, 0, 0)
  }, 2, 2)
}

export function tileTexture(): CanvasTexture {
  return makeTexture('tile', 512, (ctx, size) => {
    ctx.fillStyle = '#d8d2c8'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#c0b8ac'
    ctx.lineWidth = 4
    const step = 64
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size)
      ctx.stroke()
    }
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }
  }, 8, 8)
}

export function plasterTexture(): CanvasTexture {
  return makeTexture('plaster', 256, (ctx, size) => {
    ctx.fillStyle = '#efe6d6'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(180, 160, 130, ${Math.random() * 0.07})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 8, 8)
    }
  }, 2, 2)
}

export function marbleTexture(): CanvasTexture {
  return makeTexture('marble', 512, (ctx, size) => {
    ctx.fillStyle = '#ece7de'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(140, 130, 118, ${0.15 + Math.random() * 0.25})`
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      ctx.moveTo(Math.random() * size, 0)
      ctx.bezierCurveTo(
        Math.random() * size,
        size * 0.4,
        Math.random() * size,
        size * 0.7,
        Math.random() * size,
        size,
      )
      ctx.stroke()
    }
  }, 1, 1)
}

export function planetTexture(id: string): CanvasTexture {
  return makeTexture(`planet-${id}`, 512, (ctx, size) => {
    if (id === 'mars') {
      ctx.fillStyle = '#8a3b28'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 80; i++) {
        ctx.fillStyle = `rgba(40, 16, 10, ${0.08 + Math.random() * 0.18})`
        ctx.beginPath()
        ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 40, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(210, 170, 120, 0.25)'
      ctx.fillRect(0, size * 0.42, size, 18)
      return
    }
    if (id === 'moon') {
      ctx.fillStyle = '#9aa0a8'
      ctx.fillRect(0, 0, size, size)
      for (let i = 0; i < 70; i++) {
        ctx.fillStyle = `rgba(40, 42, 48, ${0.12 + Math.random() * 0.3})`
        ctx.beginPath()
        ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 28, 0, Math.PI * 2)
        ctx.fill()
      }
      return
    }
    if (id === 'titan') {
      ctx.fillStyle = '#6a5a40'
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = 'rgba(40, 70, 90, 0.35)'
      ctx.fillRect(0, size * 0.55, size, size * 0.45)
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(200, 170, 110, ${0.08 + Math.random() * 0.12})`
        ctx.fillRect(0, Math.random() * size, size, 6)
      }
      return
    }
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.ellipse(size * 0.35, size * 0.45, 90, 50, 0.4, 0, Math.PI * 2)
    ctx.fill()
  }, 1, 1)
}

export function walnutFloorTexture(): CanvasTexture {
  return makeTexture('walnut-floor', 512, (ctx, size) => {
    const plank = 36
    for (let y = 0; y < size; y += plank) {
      ctx.fillStyle = `hsl(24, 28%, ${22 + ((y / plank) % 4) * 4}%)`
      ctx.fillRect(0, y, size, plank - 1)
      ctx.fillStyle = 'rgba(10, 6, 4, 0.5)'
      ctx.fillRect(0, y + plank - 1, size, 1)
    }
  }, 5, 5)
}

export function herringboneTexture(): CanvasTexture {
  return makeTexture('herringbone', 512, (ctx, size) => {
    ctx.fillStyle = '#8a6238'
    ctx.fillRect(0, 0, size, size)
    const w = 90
    const h = 28
    for (let row = -2; row < 22; row++) {
      for (let col = -2; col < 10; col++) {
        const x = col * w + (row % 2) * (w / 2)
        const y = row * (h - 4)
        ctx.fillStyle = row % 2 ? '#7a5530' : '#9a7044'
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(row % 2 ? 0.55 : -0.55)
        ctx.fillRect(0, 0, w - 4, h - 6)
        ctx.restore()
      }
    }
  }, 2, 2)
}

export function carpetTexture(): CanvasTexture {
  return makeTexture('carpet', 512, (ctx, size) => {
    ctx.fillStyle = '#5c4a3e'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 8000; i++) {
      ctx.fillStyle = `rgba(255, 240, 220, ${Math.random() * 0.08})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
    }
  }, 3, 3)
}

export function slateTexture(): CanvasTexture {
  return makeTexture('slate', 512, (ctx, size) => {
    ctx.fillStyle = '#4a5058'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(20, 22, 26, ${0.12 + Math.random() * 0.2})`
      ctx.beginPath()
      ctx.moveTo(0, Math.random() * size)
      ctx.lineTo(size, Math.random() * size)
      ctx.stroke()
    }
  }, 2, 2)
}

export function checkerTexture(): CanvasTexture {
  return makeTexture('checker', 512, (ctx, size) => {
    const step = 64
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        ctx.fillStyle = ((x + y) / step) % 2 === 0 ? '#e8e4dc' : '#2a2c30'
        ctx.fillRect(x, y, step, step)
      }
    }
  }, 4, 4)
}

export function brickTexture(): CanvasTexture {
  return makeTexture('brick', 512, (ctx, size) => {
    ctx.fillStyle = '#6a3a32'
    ctx.fillRect(0, 0, size, size)
    const bw = 86
    const bh = 36
    for (let row = 0; row < 20; row++) {
      const ox = row % 2 ? bw / 2 : 0
      for (let col = -1; col < 8; col++) {
        ctx.fillStyle = `hsl(12, 32%, ${28 + ((row + col) % 5) * 4}%)`
        ctx.fillRect(col * bw + ox + 2, row * bh + 2, bw - 6, bh - 6)
      }
    }
  }, 2, 2)
}

export function paintWallTexture(): CanvasTexture {
  return makeTexture('paint-wall', 256, (ctx, size) => {
    ctx.fillStyle = '#f2eee6'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(180, 170, 150, ${Math.random() * 0.05})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 12, 12)
    }
  }, 1, 1)
}

export function woodWallTexture(): CanvasTexture {
  return woodTexture('#6b4428')
}

export function floorTexture(
  kind:
    | 'oak'
    | 'walnut'
    | 'herringbone'
    | 'terrazzo'
    | 'marble'
    | 'concrete'
    | 'tile'
    | 'slate'
    | 'carpet'
    | 'checker',
): CanvasTexture {
  switch (kind) {
    case 'oak':
      return oakFloorTexture()
    case 'walnut':
      return walnutFloorTexture()
    case 'herringbone':
      return herringboneTexture()
    case 'terrazzo':
      return terrazzoTexture()
    case 'marble':
      return marbleTexture()
    case 'concrete':
      return concreteTexture()
    case 'tile':
      return tileTexture()
    case 'slate':
      return slateTexture()
    case 'carpet':
      return carpetTexture()
    case 'checker':
      return checkerTexture()
  }
}

export function wallTexture(kind: 'plaster' | 'paint' | 'brick' | 'wood' | 'concrete' | 'tile'): CanvasTexture {
  switch (kind) {
    case 'plaster':
      return plasterTexture()
    case 'paint':
      return paintWallTexture()
    case 'brick':
      return brickTexture()
    case 'wood':
      return woodWallTexture()
    case 'concrete':
      return concreteTexture()
    case 'tile':
      return tileTexture()
  }
}

export function surfaceMap(kind: string): CanvasTexture | null {
  return itemSurface(kind)?.map ?? null
}

export type TextureGroup = 'wood' | 'stone' | 'tile' | 'metal' | 'fabric' | 'leather' | 'other'

export interface ItemTexture {
  id: string
  name: string
  group: TextureGroup
}

export const ITEM_TEXTURES: ItemTexture[] = [
  { id: 'oak', name: 'Oak', group: 'wood' },
  { id: 'walnut', name: 'Walnut', group: 'wood' },
  { id: 'white-oak', name: 'White oak', group: 'wood' },
  { id: 'maple', name: 'Maple', group: 'wood' },
  { id: 'pine', name: 'Pine', group: 'wood' },
  { id: 'teak', name: 'Teak', group: 'wood' },
  { id: 'ebony', name: 'Ebony', group: 'wood' },
  { id: 'rosewood', name: 'Rosewood', group: 'wood' },
  { id: 'herringbone', name: 'Herringbone', group: 'wood' },
  { id: 'bamboo', name: 'Bamboo', group: 'wood' },
  { id: 'marble', name: 'Marble', group: 'stone' },
  { id: 'black-marble', name: 'Black marble', group: 'stone' },
  { id: 'granite', name: 'Granite', group: 'stone' },
  { id: 'limestone', name: 'Limestone', group: 'stone' },
  { id: 'travertine', name: 'Travertine', group: 'stone' },
  { id: 'terrazzo', name: 'Terrazzo', group: 'stone' },
  { id: 'slate', name: 'Slate', group: 'stone' },
  { id: 'concrete', name: 'Concrete', group: 'stone' },
  { id: 'tile', name: 'Ceramic tile', group: 'tile' },
  { id: 'subway', name: 'Subway tile', group: 'tile' },
  { id: 'hex-tile', name: 'Hex tile', group: 'tile' },
  { id: 'mosaic', name: 'Mosaic', group: 'tile' },
  { id: 'checker', name: 'Checker', group: 'tile' },
  { id: 'brushed-steel', name: 'Brushed steel', group: 'metal' },
  { id: 'chrome', name: 'Chrome', group: 'metal' },
  { id: 'brass', name: 'Brass', group: 'metal' },
  { id: 'copper', name: 'Copper', group: 'metal' },
  { id: 'gold', name: 'Gold', group: 'metal' },
  { id: 'black-metal', name: 'Black metal', group: 'metal' },
  { id: 'rust', name: 'Rust', group: 'metal' },
  { id: 'linen', name: 'Linen', group: 'fabric' },
  { id: 'velvet', name: 'Velvet', group: 'fabric' },
  { id: 'boucle', name: 'Bouclé', group: 'fabric' },
  { id: 'wool', name: 'Wool', group: 'fabric' },
  { id: 'canvas', name: 'Canvas', group: 'fabric' },
  { id: 'denim', name: 'Denim', group: 'fabric' },
  { id: 'felt', name: 'Felt', group: 'fabric' },
  { id: 'carpet', name: 'Carpet', group: 'fabric' },
  { id: 'leather', name: 'Leather', group: 'leather' },
  { id: 'saddle', name: 'Saddle', group: 'leather' },
  { id: 'white-leather', name: 'White leather', group: 'leather' },
  { id: 'suede', name: 'Suede', group: 'leather' },
  { id: 'plaster', name: 'Plaster', group: 'other' },
  { id: 'paint', name: 'Paint', group: 'other' },
  { id: 'brick', name: 'Brick', group: 'other' },
  { id: 'wood', name: 'Wood panel', group: 'other' },
  { id: 'lacquer', name: 'Piano lacquer', group: 'other' },
  { id: 'plastic', name: 'Plastic', group: 'other' },
  { id: 'cork', name: 'Cork', group: 'other' },
  { id: 'rattan', name: 'Rattan', group: 'other' },
  { id: 'carbon', name: 'Carbon', group: 'other' },
]

export interface SurfaceSpec {
  map: CanvasTexture
  roughness: number
  metalness: number
  bumpScale?: number
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number) {
  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount
    img.data[i] = img.data[i] + n
    img.data[i + 1] = img.data[i + 1] + n
    img.data[i + 2] = img.data[i + 2] + n
  }
  ctx.putImageData(img, 0, 0)
}

function metalStreaks(tint: string, key: string) {
  return makeTexture(key, 512, (ctx, size) => {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.04 + Math.random() * 0.08})`
      ctx.lineWidth = 1
      const y = Math.random() * size
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y + (Math.random() - 0.5) * 6)
      ctx.stroke()
    }
    grain(ctx, size, 18)
  }, 2, 2)
}

function fabricNoise(tint: string, key: string, flecks: number) {
  return makeTexture(key, 512, (ctx, size) => {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < flecks; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
    }
    grain(ctx, size, 22)
  }, 3, 3)
}

function hideLeather(tint: string, key: string) {
  return makeTexture(key, 512, (ctx, size) => {
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.06})`
      ctx.beginPath()
      ctx.ellipse(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.2, 0.8 + Math.random() * 1.6, Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    grain(ctx, size, 14)
  }, 2, 2)
}

function mapleTexture() {
  return woodTexture('#c4a574')
}
function pineTexture() {
  return woodTexture('#c9b07a')
}
function teakTexture() {
  return woodTexture('#8a5a28')
}
function ebonyTexture() {
  return woodTexture('#1c1612')
}
function rosewoodTexture() {
  return woodTexture('#5c2418')
}
function whiteOakTexture() {
  return woodTexture('#d2c2a4')
}

function bambooTexture() {
  return makeTexture('bamboo', 512, (ctx, size) => {
    ctx.fillStyle = '#c4b06a'
    ctx.fillRect(0, 0, size, size)
    const w = 36
    for (let x = 0; x < size; x += w) {
      ctx.fillStyle = `hsl(42, 38%, ${52 + ((x / w) % 3) * 6}%)`
      ctx.fillRect(x, 0, w - 2, size)
      ctx.fillStyle = 'rgba(80, 50, 20, 0.25)'
      ctx.fillRect(x + w - 2, 0, 2, size)
      for (let y = 40; y < size; y += 90) {
        ctx.fillRect(x, y, w, 4)
      }
    }
  }, 3, 3)
}

function blackMarbleTexture() {
  return makeTexture('black-marble', 512, (ctx, size) => {
    ctx.fillStyle = '#1a1c1e'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 16; i++) {
      ctx.strokeStyle = `rgba(220, 220, 210, ${0.12 + Math.random() * 0.25})`
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      ctx.moveTo(Math.random() * size, 0)
      ctx.bezierCurveTo(Math.random() * size, size * 0.4, Math.random() * size, size * 0.7, Math.random() * size, size)
      ctx.stroke()
    }
  }, 1, 1)
}

function graniteTexture() {
  return makeTexture('granite', 512, (ctx, size) => {
    ctx.fillStyle = '#6a6864'
    ctx.fillRect(0, 0, size, size)
    const chips = ['#3a3a38', '#c4c0b8', '#8a8680', '#2a2a28', '#d8d4cc']
    for (let i = 0; i < 2200; i++) {
      ctx.fillStyle = chips[i % chips.length]
      ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1 + Math.random() * 3)
    }
  }, 2, 2)
}

function limestoneTexture() {
  return makeTexture('limestone', 512, (ctx, size) => {
    ctx.fillStyle = '#d8d0c0'
    ctx.fillRect(0, 0, size, size)
    grain(ctx, size, 24)
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = 'rgba(160, 148, 128, 0.2)'
      ctx.beginPath()
      ctx.moveTo(0, Math.random() * size)
      ctx.lineTo(size, Math.random() * size)
      ctx.stroke()
    }
  }, 2, 2)
}

function travertineTexture() {
  return makeTexture('travertine', 512, (ctx, size) => {
    ctx.fillStyle = '#dccbb0'
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 18) {
      ctx.fillStyle = `hsla(36, 28%, ${68 + (y % 54) / 8}%, 0.5)`
      ctx.fillRect(0, y, size, 10)
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = 'rgba(120, 90, 50, 0.12)'
      ctx.beginPath()
      ctx.ellipse(Math.random() * size, Math.random() * size, 4 + Math.random() * 10, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }, 2, 2)
}

function subwayTexture() {
  return makeTexture('subway', 512, (ctx, size) => {
    ctx.fillStyle = '#d8dce0'
    ctx.fillRect(0, 0, size, size)
    const bw = 128
    const bh = 48
    ctx.strokeStyle = '#b8bcc0'
    ctx.lineWidth = 5
    for (let row = 0; row < 14; row++) {
      const ox = row % 2 ? bw / 2 : 0
      for (let col = -1; col < 6; col++) {
        ctx.strokeRect(col * bw + ox + 3, row * bh + 3, bw - 8, bh - 8)
        ctx.fillStyle = row % 3 ? '#eceff2' : '#e2e6ea'
        ctx.fillRect(col * bw + ox + 6, row * bh + 6, bw - 14, bh - 14)
      }
    }
  }, 3, 3)
}

function hexTileTexture() {
  return makeTexture('hex-tile', 512, (ctx, size) => {
    ctx.fillStyle = '#cfd5d2'
    ctx.fillRect(0, 0, size, size)
    const r = 28
    ctx.strokeStyle = '#9aa29e'
    ctx.lineWidth = 2
    for (let row = 0; row < 16; row++) {
      for (let col = 0; col < 14; col++) {
        const x = col * r * 1.75 + (row % 2 ? r * 0.87 : 0)
        const y = row * r * 1.5
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i
          const px = x + r * Math.cos(a)
          const py = y + r * Math.sin(a)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fillStyle = (row + col) % 2 ? '#d8ddd8' : '#c4ccc8'
        ctx.fill()
        ctx.stroke()
      }
    }
  }, 2, 2)
}

function mosaicTexture() {
  return makeTexture('mosaic', 512, (ctx, size) => {
    const step = 16
    const cols = ['#c4b7a4', '#8a9a92', '#d8d0c4', '#6e7a72', '#e8e0d4', '#b0a090']
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        ctx.fillStyle = cols[(x / step + y / step) % cols.length]
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2)
      }
    }
  }, 3, 3)
}

function linenTexture() {
  return makeTexture('linen', 512, (ctx, size) => {
    ctx.fillStyle = '#e4d8c4'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(120, 100, 80, 0.12)'
    ctx.lineWidth = 1
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(size, i)
      ctx.stroke()
    }
  }, 4, 4)
}

function carbonTexture() {
  return makeTexture('carbon', 512, (ctx, size) => {
    ctx.fillStyle = '#1a1a1c'
    ctx.fillRect(0, 0, size, size)
    const s = 10
    for (let y = 0; y < size; y += s) {
      for (let x = 0; x < size; x += s) {
        ctx.fillStyle = ((x + y) / s) % 2 === 0 ? '#222226' : '#141416'
        ctx.fillRect(x, y, s, s)
      }
    }
  }, 6, 6)
}

function corkTexture() {
  return makeTexture('cork', 512, (ctx, size) => {
    ctx.fillStyle = '#c4a05a'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(90, 50, 20, ${0.08 + Math.random() * 0.15})`
      ctx.beginPath()
      ctx.ellipse(Math.random() * size, Math.random() * size, 4 + Math.random() * 12, 3 + Math.random() * 8, Math.random(), 0, Math.PI * 2)
      ctx.fill()
    }
  }, 2, 2)
}

function rattanTexture() {
  return makeTexture('rattan', 512, (ctx, size) => {
    ctx.fillStyle = '#b08950'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#8a6230'
    ctx.lineWidth = 6
    for (let y = 0; y < size; y += 18) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size, y)
      ctx.stroke()
    }
    ctx.lineWidth = 5
    for (let x = 0; x < size; x += 18) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size)
      ctx.stroke()
    }
  }, 3, 3)
}

function lacquerTexture() {
  return makeTexture('lacquer', 256, (ctx, size) => {
    ctx.fillStyle = '#120e0c'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.beginPath()
    ctx.ellipse(size * 0.3, size * 0.25, 80, 30, -0.4, 0, Math.PI * 2)
    ctx.fill()
  }, 1, 1)
}

function plasticTexture() {
  return makeTexture('plastic', 256, (ctx, size) => {
    ctx.fillStyle = '#d8d8dc'
    ctx.fillRect(0, 0, size, size)
    grain(ctx, size, 10)
  }, 1, 1)
}

export function itemSurface(kind: string): SurfaceSpec | null {
  switch (kind) {
    case 'oak':
      return { map: oakFloorTexture(), roughness: 0.62, metalness: 0.02 }
    case 'walnut':
      return { map: walnutFloorTexture(), roughness: 0.6, metalness: 0.02 }
    case 'white-oak':
      return { map: whiteOakTexture(), roughness: 0.62, metalness: 0.02 }
    case 'maple':
      return { map: mapleTexture(), roughness: 0.58, metalness: 0.02 }
    case 'pine':
      return { map: pineTexture(), roughness: 0.64, metalness: 0.02 }
    case 'teak':
      return { map: teakTexture(), roughness: 0.55, metalness: 0.03 }
    case 'ebony':
      return { map: ebonyTexture(), roughness: 0.45, metalness: 0.04 }
    case 'rosewood':
      return { map: rosewoodTexture(), roughness: 0.5, metalness: 0.03 }
    case 'herringbone':
      return { map: herringboneTexture(), roughness: 0.6, metalness: 0.02 }
    case 'bamboo':
      return { map: bambooTexture(), roughness: 0.58, metalness: 0.02 }
    case 'wood':
      return { map: woodWallTexture(), roughness: 0.6, metalness: 0.02 }
    case 'marble':
      return { map: marbleTexture(), roughness: 0.28, metalness: 0.04 }
    case 'black-marble':
      return { map: blackMarbleTexture(), roughness: 0.22, metalness: 0.06 }
    case 'granite':
      return { map: graniteTexture(), roughness: 0.45, metalness: 0.05 }
    case 'limestone':
      return { map: limestoneTexture(), roughness: 0.7, metalness: 0.02 }
    case 'travertine':
      return { map: travertineTexture(), roughness: 0.65, metalness: 0.02 }
    case 'terrazzo':
      return { map: terrazzoTexture(), roughness: 0.4, metalness: 0.03 }
    case 'slate':
      return { map: slateTexture(), roughness: 0.72, metalness: 0.04 }
    case 'concrete':
      return { map: concreteTexture(), roughness: 0.85, metalness: 0.02 }
    case 'tile':
      return { map: tileTexture(), roughness: 0.35, metalness: 0.04 }
    case 'subway':
      return { map: subwayTexture(), roughness: 0.32, metalness: 0.05 }
    case 'hex-tile':
      return { map: hexTileTexture(), roughness: 0.38, metalness: 0.04 }
    case 'mosaic':
      return { map: mosaicTexture(), roughness: 0.4, metalness: 0.04 }
    case 'checker':
      return { map: checkerTexture(), roughness: 0.45, metalness: 0.02 }
    case 'brushed-steel':
      return { map: metalStreaks('#8a9098', 'steel'), roughness: 0.35, metalness: 0.85 }
    case 'chrome':
      return { map: metalStreaks('#c8cdd4', 'chrome'), roughness: 0.12, metalness: 0.95 }
    case 'brass':
      return { map: metalStreaks('#c4a35a', 'brass'), roughness: 0.28, metalness: 0.8 }
    case 'copper':
      return { map: metalStreaks('#b87333', 'copper'), roughness: 0.3, metalness: 0.82 }
    case 'gold':
      return { map: metalStreaks('#d4af37', 'gold'), roughness: 0.22, metalness: 0.9 }
    case 'black-metal':
      return { map: metalStreaks('#2a2c30', 'black-metal'), roughness: 0.4, metalness: 0.75 }
    case 'rust':
      return { map: metalStreaks('#8a4030', 'rust'), roughness: 0.78, metalness: 0.35 }
    case 'linen':
      return { map: linenTexture(), roughness: 0.9, metalness: 0 }
    case 'velvet':
      return { map: fabricNoise('#5c2e4a', 'velvet', 4000), roughness: 0.92, metalness: 0 }
    case 'boucle':
      return { map: fabricNoise('#d8cfc4', 'boucle', 9000), roughness: 0.95, metalness: 0 }
    case 'wool':
      return { map: fabricNoise('#8a7a68', 'wool', 7000), roughness: 0.94, metalness: 0 }
    case 'canvas':
      return { map: fabricNoise('#c4b8a4', 'canvas', 3000), roughness: 0.88, metalness: 0 }
    case 'denim':
      return { map: fabricNoise('#2c4a6e', 'denim', 5000), roughness: 0.86, metalness: 0 }
    case 'felt':
      return { map: fabricNoise('#6e3a3a', 'felt', 6000), roughness: 0.96, metalness: 0 }
    case 'carpet':
      return { map: carpetTexture(), roughness: 0.97, metalness: 0 }
    case 'leather':
      return { map: hideLeather('#5c3a22', 'leather'), roughness: 0.55, metalness: 0.04 }
    case 'saddle':
      return { map: hideLeather('#8a4a22', 'saddle'), roughness: 0.58, metalness: 0.04 }
    case 'white-leather':
      return { map: hideLeather('#e8e0d4', 'white-leather'), roughness: 0.52, metalness: 0.04 }
    case 'suede':
      return { map: hideLeather('#7a5a40', 'suede'), roughness: 0.88, metalness: 0 }
    case 'plaster':
      return { map: plasterTexture(), roughness: 0.9, metalness: 0 }
    case 'paint':
      return { map: paintWallTexture(), roughness: 0.82, metalness: 0 }
    case 'brick':
      return { map: brickTexture(), roughness: 0.85, metalness: 0.02 }
    case 'lacquer':
      return { map: lacquerTexture(), roughness: 0.12, metalness: 0.15 }
    case 'plastic':
      return { map: plasticTexture(), roughness: 0.4, metalness: 0.05 }
    case 'cork':
      return { map: corkTexture(), roughness: 0.9, metalness: 0 }
    case 'rattan':
      return { map: rattanTexture(), roughness: 0.75, metalness: 0.02 }
    case 'carbon':
      return { map: carbonTexture(), roughness: 0.45, metalness: 0.2 }
    default:
      return null
  }
}

export function texturePreview(id: string): string {
  return `${import.meta.env.BASE_URL || './'}tex/${id}/color.jpg`
}
