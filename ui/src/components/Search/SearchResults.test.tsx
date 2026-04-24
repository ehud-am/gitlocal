import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchResults from './SearchResults'

describe('SearchResults', () => {
  it('renders an empty-state message when no results match', () => {
    render(<SearchResults results={[]} onSelect={vi.fn()} />)

    expect(screen.getByText(/no file names or file contents matched the current search/i)).toBeInTheDocument()
  })

  it('renders results and forwards selection clicks', () => {
    const onSelect = vi.fn()
    const result = {
      path: 'docs/guide.md',
      type: 'file' as const,
      matchType: 'name' as const,
      line: 12,
      localOnly: true,
    }

    render(<SearchResults results={[result]} onSelect={onSelect} />)

    expect(screen.getByText('docs/guide.md')).toBeInTheDocument()
    expect(screen.getByText(/name match/i)).toBeInTheDocument()
    expect(screen.getByText(/local only/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /docs\/guide\.md/i }))
    expect(onSelect).toHaveBeenCalledWith(result)
  })

  it('renders directory rows without the local-only tag', () => {
    const onSelect = vi.fn()
    const result = {
      path: 'docs',
      type: 'dir' as const,
      matchType: 'name' as const,
      localOnly: false,
    }

    render(<SearchResults results={[result]} onSelect={onSelect} />)

    expect(screen.getByText('Folder')).toBeInTheDocument()
    expect(screen.getByText(/name match/i)).toBeInTheDocument()
    expect(screen.queryByText(/local only/i)).not.toBeInTheDocument()
  })

  it('renders snippets for content matches', () => {
    render(
      <SearchResults
        results={[{
          path: 'docs/guide.md',
          type: 'file',
          matchType: 'content',
          snippet: 'Searchable line',
          line: 3,
          localOnly: false,
        }]}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.getByText(/content match/i)).toBeInTheDocument()
    expect(screen.getByText(/line 3: searchable line/i)).toBeInTheDocument()
  })
})
