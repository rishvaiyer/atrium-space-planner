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
  const floors = ['oak', 'walnut', 'herringbone', 'terrazzo', 'marble', 'concrete', 'tile', 'slate', 'carpet', 'checker'] as const
  const walls = ['plaster', 'paint', 'brick', 'wood'] as const
  if ((floors as readonly string[]).includes(kind)) return floorTexture(kind as (typeof floors)[number])
  if ((walls as readonly string[]).includes(kind)) return wallTexture(kind as 'plaster' | 'paint' | 'brick' | 'wood' | 'concrete' | 'tile')
  return null
}
