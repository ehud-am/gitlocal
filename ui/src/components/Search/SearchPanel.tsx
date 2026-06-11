import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { SearchContentKind, SearchMode, SearchResult, SearchTrackedMode } from '../../types'
import { Button } from '../ui/button'
import SearchResults from './SearchResults'

interface Props {
  branch: string
  query: string
  mode: SearchMode
  caseSensitive: boolean
  rootPath: string
  currentFolderPath?: string
  contentKinds: SearchContentKind
  trackedMode: SearchTrackedMode
  limit: number
  autoFocus?: boolean
  onSearch: (search: {
    query: string
    mode: SearchMode
    caseSensitive: boolean
    rootPath: string
    contentKinds: SearchContentKind
    trackedMode: SearchTrackedMode
    limit: number
  }) => void
  onSelectResult: (result: SearchResult) => void
  onDismiss: () => void
}

function modeIncludes(mode: SearchMode, target: 'name' | 'content'): boolean {
  return mode === 'both' || mode === target
}

function resolveMode(searchNames: boolean, searchContents: boolean): SearchMode | null {
  if (searchNames && searchContents) return 'both'
  if (searchNames) return 'name'
  if (searchContents) return 'content'
  return null
}

export default function SearchPanel({
  branch,
  query,
  mode,
  caseSensitive,
  rootPath,
  currentFolderPath = '',
  contentKinds,
  trackedMode,
  limit,
  autoFocus = false,
  onSearch,
  onSelectResult,
  onDismiss,
}: Props) {
  const [draft, setDraft] = useState(query)
  const [searchNames, setSearchNames] = useState(modeIncludes(mode, 'name'))
  const [searchContents, setSearchContents] = useState(modeIncludes(mode, 'content'))
  const [draftCaseSensitive, setDraftCaseSensitive] = useState(caseSensitive)
  const [draftRootPath, setDraftRootPath] = useState(rootPath)
  const [draftContentKinds, setDraftContentKinds] = useState<SearchContentKind>(contentKinds)
  const [draftTrackedMode, setDraftTrackedMode] = useState<SearchTrackedMode>(trackedMode)
  const [draftLimit, setDraftLimit] = useState(limit)
  const [cursor, setCursor] = useState('')
  const submittedQuery = query.trim()
  const submittedMode = mode
  const resolvedDraftMode = resolveMode(searchNames, searchContents)
  const readyForResults = submittedQuery.length >= 3 && submittedMode !== undefined
  const draftQuery = draft.trim()
  const isSubmitBlocked = draftQuery.length < 3 || !resolvedDraftMode
  const isDraftDirty =
    draftQuery !== submittedQuery
    || resolvedDraftMode !== submittedMode
    || draftCaseSensitive !== caseSensitive
    || draftRootPath !== rootPath
    || draftContentKinds !== contentKinds
    || draftTrackedMode !== trackedMode
    || draftLimit !== limit

  useEffect(() => {
    setDraft(query)
    setCursor('')
  }, [query])

  useEffect(() => {
    setSearchNames(modeIncludes(mode, 'name'))
    setSearchContents(modeIncludes(mode, 'content'))
  }, [mode])

  useEffect(() => {
    setDraftCaseSensitive(caseSensitive)
  }, [caseSensitive])

  useEffect(() => {
    setDraftRootPath(rootPath)
  }, [rootPath])

  useEffect(() => {
    setDraftContentKinds(contentKinds)
  }, [contentKinds])

  useEffect(() => {
    setDraftTrackedMode(trackedMode)
  }, [trackedMode])

  useEffect(() => {
    setDraftLimit(limit)
  }, [limit])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', branch, submittedQuery, submittedMode, caseSensitive, rootPath, contentKinds, trackedMode, limit, cursor],
    queryFn: () => api.getSearchResults(submittedQuery, branch, submittedMode, caseSensitive, {
      rootPath,
      contentKinds,
      trackedMode,
      limit,
      cursor,
    }),
    enabled: readyForResults,
  })

  const guidanceMessage =
    !resolvedDraftMode
      ? 'Choose at least one search target.'
      : draftQuery.length === 0
        ? 'Enter at least 3 characters, then press Search or Enter.'
        : draftQuery.length < 3
          ? 'Search requires at least 3 characters.'
          : isDraftDirty
            ? 'Press Search or Enter to run the updated query.'
            : readyForResults
              ? 'Showing submitted matches.'
              : 'Press Search or Enter to start.'

  function submitSearch(): void {
    if (!resolvedDraftMode || draftQuery.length < 3) return
    onSearch({
      query: draftQuery,
      mode: resolvedDraftMode,
      caseSensitive: draftCaseSensitive,
      rootPath: draftRootPath,
      contentKinds: draftContentKinds,
      trackedMode: draftTrackedMode,
      limit: draftLimit,
    })
    setCursor('')
  }

  return (
    <section className={`search-panel${readyForResults ? ' search-panel-active' : ''}`} aria-label="repository search">
      <div className="search-panel-header">
        <div className="search-panel-heading">
          <p className="search-panel-title">Search repository</p>
          <p className="search-panel-subtitle">Search file names, file content, or both across the selected branch.</p>
        </div>
        <button type="button" className="search-dismiss" aria-label="Close search" title="Close search" onClick={onDismiss}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M4 4L12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitSearch()
        }}
      >
        <div className="search-toolbar">
          <div className="search-input-wrap">
            <svg className="search-input-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10.5 10.5L14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="search-input"
              placeholder="Search repository"
              value={draft}
              autoFocus={autoFocus}
              onChange={(event) => {
                setDraft(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  onDismiss()
                }
              }}
              aria-label="search query"
            />
          </div>
          <Button type="submit" className="search-submit" disabled={isSubmitBlocked}>
            Search
          </Button>
        </div>
        <div className="search-options" role="group" aria-label="search options">
          <label className="search-checkbox">
            <input
              type="checkbox"
              checked={searchNames}
              onChange={(event) => setSearchNames(event.target.checked)}
            />
            <span>File names</span>
          </label>
          <label className="search-checkbox">
            <input
              type="checkbox"
              checked={searchContents}
              onChange={(event) => setSearchContents(event.target.checked)}
            />
            <span>File contents</span>
          </label>
          <label className="search-checkbox">
            <input
              type="checkbox"
              checked={draftCaseSensitive}
              onChange={(event) => setDraftCaseSensitive(event.target.checked)}
            />
            <span>Case sensitive</span>
          </label>
        </div>
        <div className="search-scope-grid" role="group" aria-label="search scope">
          <label>
            <span>Folder scope</span>
            <select
              value={draftRootPath ? 'current' : 'repo'}
              onChange={(event) => {
                setDraftRootPath(event.target.value === 'current' ? currentFolderPath : '')
              }}
            >
              <option value="repo">Whole repository</option>
              <option value="current">Current folder{currentFolderPath ? `: ${currentFolderPath}` : ''}</option>
            </select>
          </label>
          <label>
            <span>Content scope</span>
            <select
              value={draftContentKinds}
              onChange={(event) => setDraftContentKinds(event.target.value as SearchContentKind)}
            >
              <option value="all">All text</option>
              <option value="markdown">Markdown only</option>
            </select>
          </label>
          <label>
            <span>Tracked files</span>
            <select
              value={draftTrackedMode}
              onChange={(event) => setDraftTrackedMode(event.target.value as SearchTrackedMode)}
            >
              <option value="tracked-only">Tracked only</option>
              <option value="include-generated-local">Include generated/local</option>
              <option value="generated-local-only">Generated/local only</option>
            </select>
          </label>
          <label>
            <span>Limit</span>
            <select
              value={String(draftLimit)}
              onChange={(event) => setDraftLimit(Number(event.target.value))}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </label>
        </div>
      </form>
      <div className="search-controls">
        <span className="search-guidance">{guidanceMessage}</span>
      </div>
      {!readyForResults || isDraftDirty ? (
        <p className="search-empty">
          {!resolvedDraftMode
            ? 'Choose at least one search target to search.'
            : draftQuery.length < 3
              ? 'Type 3 or more characters, then press Search or Enter.'
              : 'Press Search or Enter to run the current query.'}
        </p>
      ) : isLoading ? (
        <p className="search-empty">Searching…</p>
      ) : isError ? (
        <p className="search-empty">Search failed. Please try again.</p>
      ) : (
        <SearchResults
          results={data?.results ?? []}
          response={data}
          onSelect={onSelectResult}
          onLoadMore={data?.nextCursor ? () => setCursor(data.nextCursor ?? '') : undefined}
        />
      )}
    </section>
  )
}
