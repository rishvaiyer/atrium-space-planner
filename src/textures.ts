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

export function floorTexture(kind: 'oak' | 'terrazzo' | 'concrete' | 'tile'): CanvasTexture {
  switch (kind) {
    case 'oak':
      return oakFloorTexture()
    case 'terrazzo':
      return terrazzoTexture()
    case 'concrete':
      return concreteTexture()
    case 'tile':
      return tileTexture()
  }
}
