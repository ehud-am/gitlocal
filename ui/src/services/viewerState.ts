import type {
  DefaultReaderPreference,
  DefaultReaderPreferenceStatus,
  GeneratedLocalVisibility,
  RecentItem,
  SearchContentKind,
  SearchMode,
  SearchPresentation,
  SearchTrackedMode,
  ViewerState,
} from '../types'
import { safeLocalStorageGet, safeLocalStorageRemove, safeLocalStorageSet } from './safeLocalStorage'

const RECENT_ITEMS_KEY = 'gitlocal:recent-items'
const DEFAULT_READER_PROMPT_KEY = 'gitlocal:default-markdown-reader-prompt'
const MAX_RECENT_ITEMS = 12

const DEFAULT_READER_PROMPT: DefaultReaderPreference = {
  status: 'not-asked',
  askedAt: '',
  answeredAt: '',
  message: '',
}

const DEFAULTS: ViewerState = {
  repoPath: '',
  branch: '',
  path: '',
  pathType: 'none',
  raw: false,
  sidebarCollapsed: false,
  hideDotfiles: false,
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

function parseDefaultReaderPromptStatus(value: unknown): DefaultReaderPreferenceStatus {
  return value === 'accepted' || value === 'declined' || value === 'failed' || value === 'not-asked'
    ? value
    : 'not-asked'
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
    hideDotfiles: parseBoolean(params.get('hideDotfiles'), DEFAULTS.hideDotfiles),
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
  if (next.hideDotfiles) params.set('hideDotfiles', 'true')
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

export function readDefaultReaderPromptPreference(): DefaultReaderPreference {
  try {
    const raw = safeLocalStorageGet(DEFAULT_READER_PROMPT_KEY)
    if (!raw) return { ...DEFAULT_READER_PROMPT }
    const parsed = JSON.parse(raw) as Partial<DefaultReaderPreference>
    return {
      status: parseDefaultReaderPromptStatus(parsed.status),
      askedAt: typeof parsed.askedAt === 'string' ? parsed.askedAt : '',
      answeredAt: typeof parsed.answeredAt === 'string' ? parsed.answeredAt : '',
      message: typeof parsed.message === 'string' ? parsed.message : '',
    }
  } catch {
    return { ...DEFAULT_READER_PROMPT }
  }
}

export function writeDefaultReaderPromptPreference(
  status: DefaultReaderPreferenceStatus,
  message = '',
): DefaultReaderPreference {
  const current = readDefaultReaderPromptPreference()
  const now = new Date().toISOString()
  const preference: DefaultReaderPreference = {
    status,
    askedAt: current.askedAt || now,
    answeredAt: status === 'not-asked' ? '' : now,
    message,
  }

  safeLocalStorageSet(DEFAULT_READER_PROMPT_KEY, JSON.stringify(preference))
  return preference
}

function readRecentItemsFromStorage(): RecentItem[] {
  try {
    const raw = safeLocalStorageGet(RECENT_ITEMS_KEY)
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

function normalizeRecentItem(item: RecentItem, timestampField: 'lastViewedAt' | 'lastChangedAt'): RecentItem | null {
  const normalizedPath = item.path.trim()
  if (!normalizedPath) return null
  return {
    ...item,
    path: normalizedPath,
    label: item.label || normalizedPath.split('/').pop() || normalizedPath,
    [timestampField]: item[timestampField] ?? new Date().toISOString(),
  }
}

export function rememberRecentItem(item: RecentItem): RecentItem[] {
  const nextItem = normalizeRecentItem(item, 'lastViewedAt')
  if (!nextItem) return readRecentItemsFromStorage()

  const withoutDuplicate = readRecentItemsFromStorage().filter((existing) => existing.path !== nextItem.path)
  const next = [nextItem, ...withoutDuplicate].slice(0, MAX_RECENT_ITEMS)
  safeLocalStorageSet(RECENT_ITEMS_KEY, JSON.stringify(next))
  return next
}

export function rememberRecentChangedItems(items: RecentItem[]): RecentItem[] {
  let current = readRecentItemsFromStorage()
  for (const item of items) {
    const nextItem = normalizeRecentItem(item, 'lastChangedAt')
    if (!nextItem) continue
    current = [nextItem, ...current.filter((existing) => existing.path !== nextItem.path)].slice(0, MAX_RECENT_ITEMS)
  }

  safeLocalStorageSet(RECENT_ITEMS_KEY, JSON.stringify(current))
  return current
}

export function clearRecentItems(): void {
  safeLocalStorageRemove(RECENT_ITEMS_KEY)
}
