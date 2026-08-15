type IconName =
  | 'select'
  | 'pan'
  | 'measure'
  | 'paint'
  | 'stamp'
  | 'note'
  | 'rotate'
  | 'copy'
  | 'trash'
  | 'undo'
  | 'redo'
  | 'sun'
  | 'moon'
  | 'snap'

const d: Record<IconName, string> = {
  select: 'M5 4l6 16 2.2-6.2L19.5 12z',
  pan: 'M9 11V7.5a1.5 1.5 0 013 0V11m0 0V8.5a1.5 1.5 0 013 0V13m0 0v-2.5a1.5 1.5 0 013 0V15.5A3.5 3.5 0 0114.5 19h-2.2A5.3 5.3 0 017 16.2V11a1.5 1.5 0 013 0v2',
  measure: 'M4 18L18 4M7 18h.01M11 14h.01M15 10h.01M8 8l8 8',
  paint: 'M7 14c0 2 1.5 4 4 4s4-1.5 4-3.5c0-2.5-4-3-4-6 2 .4 5 2.2 5 5.5A5 5 0 017 14zM8 6c1.2-1.6 3-2.5 5-2',
  stamp: 'M8 4h8v5H8zM6 12h12v3H6zM5 18h14',
  note: 'M7 5h7l4 4v10H7zM14 5v4h4',
  rotate: 'M4 12a8 8 0 0113.5-5.8M18 4v4h-4M20 12a8 8 0 01-13.5 5.8M6 20v-4h4',
  copy: 'M8 8h10v12H8zM6 16H5V4h10v1',
  trash: 'M5 8h14M9 8V6h6v2M8 8l.8 12h6.4L16 8',
  undo: 'M8 8H4v4M4.6 10.5A8 8 0 1112 20',
  redo: 'M16 8h4v4M19.4 10.5A8 8 0 1012 20',
  sun: 'M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM12 3v1.6M12 19.4V21M4.2 4.2l1.1 1.1M18.7 18.7l1.1 1.1M3 12h1.6M19.4 12H21M4.2 19.8l1.1-1.1M18.7 5.3l1.1-1.1',
  moon: 'M16.4 13.6A6.2 6.2 0 1110 6.2 8 8 0 0016.4 13.6z',
  snap: 'M4 8h4V4M16 4h4v4M20 16v4h-4M8 20H4v-4',
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
      <path d={d[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
