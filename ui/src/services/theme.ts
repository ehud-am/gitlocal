export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'gitlocal-theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  if (typeof window.localStorage?.getItem !== 'function') return null
  const value = window.localStorage.getItem(STORAGE_KEY)
  return isThemeMode(value) ? value : null
}

export function writeStoredTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return
  if (typeof window.localStorage?.setItem !== 'function') return
  window.localStorage.setItem(STORAGE_KEY, theme)
}

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light'
  const stored = readStoredTheme()
  if (stored) return stored
  if (typeof window.matchMedia !== 'function') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}
