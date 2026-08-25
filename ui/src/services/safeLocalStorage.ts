// Thin localStorage wrapper: every call is guarded against localStorage being unavailable
// (e.g. private browsing, SSR, or the jsdom test environment without a localStorage shim)
// so callers never need to repeat the availability check themselves.

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  if (typeof window.localStorage?.getItem !== 'function') return null
  return window.localStorage.getItem(key)
}

export function safeLocalStorageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return
  if (typeof window.localStorage?.setItem !== 'function') return
  window.localStorage.setItem(key, value)
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === 'undefined') return
  if (typeof window.localStorage?.removeItem !== 'function') return
  window.localStorage.removeItem(key)
}
