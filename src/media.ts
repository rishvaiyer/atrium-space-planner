import { useEffect, useState } from 'react'

const QUERY = '(max-width: 900px)'

function matches(query: string) {
  return typeof window !== 'undefined' && window.matchMedia(query).matches
}

export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => matches(QUERY))

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setMobile(mq.matches)
    onChange()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange)
      return () => mq.removeEventListener('change', onChange)
    }
    mq.addListener(onChange)
    return () => mq.removeListener(onChange)
  }, [])

  return mobile
}

export function isCoarsePointer() {
  return matches('(pointer: coarse)')
}
