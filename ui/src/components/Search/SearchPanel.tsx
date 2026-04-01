import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { SearchResult } from '../../types'
import SearchResults from './SearchResults'

interface Props {
  branch: string
  query: string
  autoFocus?: boolean
  onQueryChange: (query: string) => void
  onSelectResult: (result: SearchResult) => void
  onDismiss: () => void
}

export default function SearchPanel({
  branch,
  query,
  autoFocus = false,
  onQueryChange,
  onSelectResult,
  onDismiss,
}: Props) {
  const [draft, setDraft] = useState(query)
  const activeQuery = query.trim()
  const readyForResults = activeQuery.length >= 3

  useEffect(() => {
    setDraft(query)
  }, [query])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', branch, activeQuery],
    queryFn: () => api.getSearchResults(activeQuery, branch),
    enabled: readyForResults,
  })

  const fileResults = (data?.results ?? []).filter((result) => result.type === 'file')

  return (
    <section className={`search-panel${readyForResults ? ' search-panel-active' : ''}`} aria-label="repository search">
      <div className="search-panel-header">
        <div className="search-panel-heading">
          <p className="search-panel-title">Quick find files</p>
          <p className="search-panel-subtitle">Type at least 3 characters to jump to a file by name.</p>
        </div>
        <button type="button" className="search-dismiss" aria-label="Close search" title="Close search" onClick={onDismiss}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M4 4L12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12 4L4 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="search-toolbar">
        <div className="search-input-wrap">
          <svg className="search-input-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10.5 10.5L14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            className="search-input"
            placeholder="Search file names"
            value={draft}
            autoFocus={autoFocus}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              onQueryChange(next.trim())
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onDismiss()
              }
            }}
            aria-label="search query"
          />
        </div>
      </div>
      <div className="search-controls">
        <span className="search-guidance">{readyForResults ? 'Matching file names' : 'Results appear after 3 characters'}</span>
        <span className="search-shortcut-hint" aria-hidden="true">Cmd/Ctrl + F</span>
      </div>
      {!readyForResults ? (
        <p className="search-empty">Type 3 or more characters to see matching file names.</p>
      ) : isLoading ? (
        <p className="search-empty">Searching…</p>
      ) : isError ? (
        <p className="search-empty">Search failed. Please try again.</p>
      ) : (
        <SearchResults results={fileResults} onSelect={onSelectResult} />
      )}
    </section>
  )
}
