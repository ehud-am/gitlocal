import type { SearchResult } from '../../types'
import { MetaTag } from '../ui/meta-tag'

interface Props {
  results: SearchResult[]
  onSelect: (result: SearchResult) => void
}

export default function SearchResults({ results, onSelect }: Props) {
  if (results.length === 0) {
    return <p className="search-empty">No file names or file contents matched the current search.</p>
  }

  return (
    <ul className="search-results" aria-label="search results">
      {results.map((result) => (
        <li key={`${result.matchType}:${result.path}:${result.line ?? 0}`} className="search-result-item">
          <button type="button" className="search-result-button" onClick={() => onSelect(result)}>
            <span className="search-result-copy">
              <span className="search-result-path">{result.path}</span>
              {result.snippet ? (
                <span className="search-result-snippet">
                  {result.line ? `Line ${result.line}: ` : ''}
                  {result.snippet}
                </span>
              ) : null}
            </span>
            <span className="search-result-meta">
              <MetaTag
                label={result.matchType === 'name' ? 'Name match' : 'Content match'}
                icon={result.matchType === 'name' ? 'git' : 'local-change'}
                tone={result.matchType === 'name' ? 'neutral' : 'info'}
                compact
              />
              <span>{result.type === 'dir' ? 'Folder' : 'File'}</span>
              {result.localOnly ? <MetaTag label="Local only" icon="local-only" tone="neutral" compact /> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
