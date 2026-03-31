import type { SearchMode, ViewerState } from '../types'

const DEFAULTS: ViewerState = {
  branch: '',
  path: '',
  raw: false,
  sidebarCollapsed: false,
  searchMode: 'name',
  searchQuery: '',
  caseSensitive: false,
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === null) return fallback
  return value === 'true'
}

function getParams(): URLSearchParams {
  return new URLSearchParams(window.location.search)
}

function writeParams(params: URLSearchParams): void {
  const query = params.toString()
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)
}

export function readViewerState(): ViewerState {
  const params = getParams()
  const mode = params.get('searchMode')
  const searchMode: SearchMode = mode === 'content' ? 'content' : 'name'

  return {
    branch: params.get('branch') ?? DEFAULTS.branch,
    path: params.get('path') ?? DEFAULTS.path,
    raw: parseBoolean(params.get('raw'), DEFAULTS.raw),
    sidebarCollapsed: parseBoolean(params.get('sidebarCollapsed'), DEFAULTS.sidebarCollapsed),
    searchMode,
    searchQuery: params.get('searchQuery') ?? DEFAULTS.searchQuery,
    caseSensitive: parseBoolean(params.get('caseSensitive'), DEFAULTS.caseSensitive),
  }
}

export function writeViewerState(partial: Partial<ViewerState>): ViewerState {
  const next = { ...readViewerState(), ...partial }
  const params = new URLSearchParams()

  if (next.branch) params.set('branch', next.branch)
  if (next.path) params.set('path', next.path)
  if (next.raw) params.set('raw', 'true')
  if (next.sidebarCollapsed) params.set('sidebarCollapsed', 'true')
  if (next.searchMode !== DEFAULTS.searchMode) params.set('searchMode', next.searchMode)
  if (next.searchQuery) params.set('searchQuery', next.searchQuery)
  if (next.caseSensitive) params.set('caseSensitive', 'true')

  writeParams(params)
  return next
}

export function clearViewerPath(): ViewerState {
  return writeViewerState({ path: '', raw: false })
}

export function resetViewerState(): void {
  writeParams(new URLSearchParams())
}
