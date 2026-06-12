import type { SearchResponse, SearchResult } from '../../types'
import { MetaTag } from '../ui/meta-tag'

interface Props {
  results: SearchResult[]
  response?: SearchResponse | null
  onSelect: (result: SearchResult) => void
  onLoadMore?: () => void
}

function formatGeneratedLocalLabel(state: SearchResult['generatedLocalState']): string {
  if (!state || state === 'tracked') return ''
  if (state === 'local-only') return 'Local only'
  return state[0].toUpperCase() + state.slice(1)
}

export default function SearchResults({ results, response, onSelect, onLoadMore }: Props) {
  if (results.length === 0) {
    return <p className="search-empty">No file names or file contents matched the current search.</p>
  }

  const total = response?.totalEstimate ?? results.length
  const shown = response?.resultCount ?? results.length

  return (
    <div className="search-results-wrap">
      <p className="search-result-count">
        Showing {shown} of {total} {total === 1 ? 'result' : 'results'}.
      </p>
      <ul className="search-results" aria-label="search results">
        {results.map((result) => {
          const generatedLocalLabel = formatGeneratedLocalLabel(result.generatedLocalState)
          return (
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
                  {result.scopeLabel ? <span>{result.scopeLabel}</span> : null}
                  {result.changeState ? <MetaTag label={result.changeState} icon="local-change" tone="info" compact /> : null}
                  {generatedLocalLabel ? <MetaTag label={generatedLocalLabel} icon="local-only" tone="neutral" compact /> : null}
                  {!generatedLocalLabel && result.localOnly ? <MetaTag label="Local only" icon="local-only" tone="neutral" compact /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {response?.partial ? (
        <div className="search-partial-state">
          <span>More matches are available under this scope.</span>
          {onLoadMore ? (
            <button type="button" onClick={onLoadMore}>
              Load more
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
