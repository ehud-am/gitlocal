import type { SearchResult } from '../../types'

interface Props {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, onSelect }: Props) {
  if (results.length === 0) {
    return <p className="search-empty">No files or folders matched the current search.</p>
  }

  return (
    <ul className="search-results" aria-label="search results">
      {results.map((result) => (
        <li key={`${result.matchType}:${result.path}:${result.line ?? 0}`} className="search-result-item">
          <button type="button" className="search-result-button" onClick={() => onSelect(result)}>
            <span className="search-result-path">{result.path}</span>
            <span className="search-result-meta">
              <span>{result.type === 'dir' ? 'Folder' : 'File'}</span>
              {result.localOnly ? <span className="local-only-badge local-only-badge-compact">Local only</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
