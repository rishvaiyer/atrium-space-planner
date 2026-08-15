export function tip(text: string, kbd?: string) {
  return kbd ? { 'data-tip': text, 'data-kbd': kbd } : { 'data-tip': text }
}
