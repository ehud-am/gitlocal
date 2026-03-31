import type { SearchResult } from '../../types'

interface Props {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, onSelect }: Props) {
  if (results.length === 0) {
    return <p className="search-empty">No results matched the current search.</p>
  }

  return (
    <ul className="search-results" aria-label="search results">
      {results.map((result) => (
        <li key={`${result.matchType}:${result.path}:${result.line ?? 0}`} className="search-result-item">
          <button type="button" className="search-result-button" onClick={() => onSelect(result)}>
            <span className="search-result-path">{result.path}</span>
            <span className="search-result-meta">
              {result.type === 'dir' ? 'Folder' : 'File'}
              {result.line ? ` • line ${result.line}` : ''}
            </span>
            {result.snippet && <span className="search-result-snippet">{result.snippet}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
