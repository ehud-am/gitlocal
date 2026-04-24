import type { SearchMode, SearchPresentation, ViewerState } from '../types'

const DEFAULTS: ViewerState = {
  repoPath: '',
  branch: '',
  path: '',
  pathType: 'none',
  raw: false,
  sidebarCollapsed: false,
  searchPresentation: 'collapsed',
  searchQuery: '',
  searchMode: 'both',
  searchCaseSensitive: false,
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
  const presentation = params.get('searchPresentation')
  const searchPresentation: SearchPresentation = presentation === 'expanded' ? 'expanded' : 'collapsed'
  const searchModeParam = params.get('searchMode')
  const searchMode: SearchMode =
    searchModeParam === 'name' || searchModeParam === 'content' || searchModeParam === 'both'
      ? searchModeParam
      : DEFAULTS.searchMode

  return {
    repoPath: params.get('repoPath') ?? DEFAULTS.repoPath,
    branch: params.get('branch') ?? DEFAULTS.branch,
    path: params.get('path') ?? DEFAULTS.path,
    pathType:
      params.get('pathType') === 'dir'
        ? 'dir'
        : params.get('pathType') === 'file'
          ? 'file'
          : DEFAULTS.pathType,
    raw: parseBoolean(params.get('raw'), DEFAULTS.raw),
    sidebarCollapsed: parseBoolean(params.get('sidebarCollapsed'), DEFAULTS.sidebarCollapsed),
    searchPresentation,
    searchQuery: params.get('searchQuery') ?? DEFAULTS.searchQuery,
    searchMode,
    searchCaseSensitive: parseBoolean(params.get('searchCaseSensitive'), DEFAULTS.searchCaseSensitive),
  }
}

export function writeViewerState(partial: Partial<ViewerState>): ViewerState {
  const next = { ...readViewerState(), ...partial }
  const params = new URLSearchParams()

  if (next.repoPath) params.set('repoPath', next.repoPath)
  if (next.branch) params.set('branch', next.branch)
  if (next.path) params.set('path', next.path)
  if (next.pathType !== DEFAULTS.pathType) params.set('pathType', next.pathType)
  if (next.raw) params.set('raw', 'true')
  if (next.sidebarCollapsed) params.set('sidebarCollapsed', 'true')
  if (next.searchPresentation !== DEFAULTS.searchPresentation) params.set('searchPresentation', next.searchPresentation)
  if (next.searchQuery) params.set('searchQuery', next.searchQuery)
  if (next.searchMode !== DEFAULTS.searchMode) params.set('searchMode', next.searchMode)
  if (next.searchCaseSensitive) params.set('searchCaseSensitive', 'true')

  writeParams(params)
  return next
}

export function clearViewerPath(): ViewerState {
  return writeViewerState({ path: '', pathType: 'none', raw: false })
}

export function resetViewerState(): void {
  writeParams(new URLSearchParams())
}
