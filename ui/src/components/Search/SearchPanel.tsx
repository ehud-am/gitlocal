import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { SearchMode, SearchResult } from '../../types'
import SearchResults from './SearchResults'

interface Props {
  branch: string
  mode: SearchMode
  query: string
  caseSensitive: boolean
  onModeChange: (mode: SearchMode) => void
  onQueryChange: (query: string) => void
  onCaseSensitiveChange: (value: boolean) => void
  onSelectResult: (result: SearchResult) => void
}

export default function SearchPanel({
  branch,
  mode,
  query,
  caseSensitive,
  onModeChange,
  onQueryChange,
  onCaseSensitiveChange,
  onSelectResult,
}: Props) {
  const [draft, setDraft] = useState(query)

  useEffect(() => {
    setDraft(query)
  }, [query])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search', branch, mode, query, caseSensitive],
    queryFn: () => api.getSearchResults(query, mode, branch, caseSensitive),
    enabled: query.trim().length > 0,
  })

  return (
    <section className="search-panel" aria-label="repository search">
      <div className="search-toolbar">
        <input
          type="search"
          className="search-input"
          placeholder={mode === 'name' ? 'Search file and folder names' : 'Search file contents'}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              onQueryChange(draft.trim())
            }
          }}
          aria-label="search query"
        />
        <button type="button" className="search-submit" onClick={() => onQueryChange(draft.trim())}>
          Search
        </button>
      </div>
      <div className="search-controls">
        <label>
          <input
            type="radio"
            name="search-mode"
            checked={mode === 'name'}
            onChange={() => onModeChange('name')}
          />
          Name
        </label>
        <label>
          <input
            type="radio"
            name="search-mode"
            checked={mode === 'content'}
            onChange={() => onModeChange('content')}
          />
          Content
        </label>
        <label className="search-checkbox">
          <input
            type="checkbox"
            checked={caseSensitive}
            onChange={(event) => onCaseSensitiveChange(event.target.checked)}
          />
          Case sensitive
        </label>
      </div>
      {query.trim().length === 0 ? (
        <p className="search-empty">Enter a query to search this repository.</p>
      ) : isLoading ? (
        <p className="search-empty">Searching…</p>
      ) : isError ? (
        <p className="search-empty">Search failed. Please try again.</p>
      ) : (
        <SearchResults results={data?.results ?? []} onSelect={onSelectResult} />
      )}
    </section>
  )
}
