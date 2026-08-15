import { useEffect, useState } from 'react'

type TipState = { text: string; kbd: string; x: number; y: number }

export function TooltipHost() {
  const [tipState, setTipState] = useState<TipState | null>(null)

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    let timer = 0
    let active: Element | null = null

    const hide = () => {
      window.clearTimeout(timer)
      active = null
      setTipState(null)
    }

    const show = (el: Element, x: number, y: number) => {
      const text = el.getAttribute('data-tip')
      if (!text) return
      setTipState({
        text,
        kbd: el.getAttribute('data-kbd') || '',
        x,
        y,
      })
    }

    const onOver = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]')
      if (!el || el === active) return
      window.clearTimeout(timer)
      active = el
      const x = e.clientX
      const y = e.clientY
      timer = window.setTimeout(() => show(el, x, y), 280)
    }

    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]')
      if (!el) {
        if (active) hide()
        return
      }
      if (el !== active) {
        onOver(e)
        return
      }
      setTipState((cur) => (cur ? { ...cur, x: e.clientX, y: e.clientY } : cur))
    }

    const onOut = (e: PointerEvent) => {
      const next = e.relatedTarget as Element | null
      if (active && next?.closest?.('[data-tip]') === active) return
      hide()
    }

    document.addEventListener('pointerover', onOver)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerout', onOut)
    document.addEventListener('pointerdown', hide)
    document.addEventListener('scroll', hide, true)
    window.addEventListener('keydown', hide)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('pointerover', onOver)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerout', onOut)
      document.removeEventListener('pointerdown', hide)
      document.removeEventListener('scroll', hide, true)
      window.removeEventListener('keydown', hide)
    }
  }, [])

  if (!tipState) return null
  const pad = 14
  const left = Math.min(window.innerWidth - 16, Math.max(16, tipState.x))
  const top = tipState.y < 64 ? tipState.y + pad : tipState.y - pad
  const flip = tipState.y < 64
  return (
    <div
      className={`ui-tip ${flip ? 'below' : 'above'}`}
      role="tooltip"
      style={{ left, top }}
    >
      <span>{tipState.text}</span>
      {tipState.kbd ? <kbd>{tipState.kbd}</kbd> : null}
    </div>
  )
}
