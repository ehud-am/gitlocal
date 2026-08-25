import { safeLocalStorageGet, safeLocalStorageSet } from './safeLocalStorage'

export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'gitlocal-theme'

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark'
}

function readStoredTheme(): ThemeMode | null {
  const value = safeLocalStorageGet(STORAGE_KEY)
  return isThemeMode(value) ? value : null
}

export function writeStoredTheme(theme: ThemeMode): void {
  safeLocalStorageSet(STORAGE_KEY, theme)
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
