import type {
  GeneratedLocalVisibility,
  RecentItem,
  SearchContentKind,
  SearchMode,
  SearchPresentation,
  SearchTrackedMode,
  ViewerState,
} from '../types'

const RECENT_ITEMS_KEY = 'gitlocal:recent-items'
const MAX_RECENT_ITEMS = 12

const DEFAULTS: ViewerState = {
  repoPath: '',
  branch: '',
  path: '',
  pathType: 'none',
  raw: false,
  sidebarCollapsed: false,
  generatedLocalVisibility: 'hide',
  searchRootPath: '',
  searchContentKind: 'all',
  searchTrackedMode: 'tracked-only',
  searchLimit: 50,
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

function parseGeneratedLocalVisibility(value: string | null): GeneratedLocalVisibility {
  return value === 'show' || value === 'only' || value === 'hide' ? value : DEFAULTS.generatedLocalVisibility
}

function parseSearchContentKind(value: string | null): SearchContentKind {
  return value === 'markdown' || value === 'all' ? value : DEFAULTS.searchContentKind
}

function parseSearchTrackedMode(value: string | null): SearchTrackedMode {
  return value === 'include-generated-local' || value === 'generated-local-only' || value === 'tracked-only'
    ? value
    : DEFAULTS.searchTrackedMode
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value === null) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
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
    generatedLocalVisibility: parseGeneratedLocalVisibility(params.get('generatedLocalVisibility')),
    searchRootPath: params.get('searchRootPath') ?? DEFAULTS.searchRootPath,
    searchContentKind: parseSearchContentKind(params.get('searchContentKind')),
    searchTrackedMode: parseSearchTrackedMode(params.get('searchTrackedMode')),
    searchLimit: parsePositiveInt(params.get('searchLimit'), DEFAULTS.searchLimit),
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
  if (next.generatedLocalVisibility !== DEFAULTS.generatedLocalVisibility) params.set('generatedLocalVisibility', next.generatedLocalVisibility)
  if (next.searchRootPath) params.set('searchRootPath', next.searchRootPath)
  if (next.searchContentKind !== DEFAULTS.searchContentKind) params.set('searchContentKind', next.searchContentKind)
  if (next.searchTrackedMode !== DEFAULTS.searchTrackedMode) params.set('searchTrackedMode', next.searchTrackedMode)
  if (next.searchLimit !== DEFAULTS.searchLimit) params.set('searchLimit', String(next.searchLimit))
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

function readRecentItemsFromStorage(): RecentItem[] {
  try {
    if (typeof window.localStorage?.getItem !== 'function') return []
    const raw = window.localStorage.getItem(RECENT_ITEMS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RecentItem[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.path === 'string' && (item.type === 'file' || item.type === 'folder'))
  } catch {
    return []
  }
}

export function readRecentItems(): RecentItem[] {
  return readRecentItemsFromStorage()
}

export function rememberRecentItem(item: RecentItem): RecentItem[] {
  const normalizedPath = item.path.trim()
  if (!normalizedPath) return readRecentItemsFromStorage()

  const nextItem: RecentItem = {
    ...item,
    path: normalizedPath,
    label: item.label || normalizedPath.split('/').pop() || normalizedPath,
    lastViewedAt: item.lastViewedAt ?? new Date().toISOString(),
  }
  const withoutDuplicate = readRecentItemsFromStorage().filter((existing) => existing.path !== normalizedPath)
  const next = [nextItem, ...withoutDuplicate].slice(0, MAX_RECENT_ITEMS)
  if (typeof window.localStorage?.setItem === 'function') {
    window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(next))
  }
  return next
}

export function rememberRecentChangedItems(items: RecentItem[]): RecentItem[] {
  let current = readRecentItemsFromStorage()
  for (const item of items) {
    const normalizedPath = item.path.trim()
    if (!normalizedPath) continue
    const nextItem: RecentItem = {
      ...item,
      path: normalizedPath,
      label: item.label || normalizedPath.split('/').pop() || normalizedPath,
      lastChangedAt: item.lastChangedAt ?? new Date().toISOString(),
    }
    current = [nextItem, ...current.filter((existing) => existing.path !== normalizedPath)].slice(0, MAX_RECENT_ITEMS)
  }

  if (typeof window.localStorage?.setItem === 'function') {
    window.localStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(current))
  }
  return current
}

export function clearRecentItems(): void {
  if (typeof window.localStorage?.removeItem === 'function') {
    window.localStorage.removeItem(RECENT_ITEMS_KEY)
  }
}
