import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import JSONViewer from './JSONViewer'
import { parseJsonTree } from './json-tree'

function parseOrThrow(content: string) {
  const parsed = parseJsonTree(content)
  if (!parsed.ok) throw new Error('expected valid JSON')
  return parsed.root
}

describe('JSONViewer', () => {
  it('renders a package.json-style object as formatted, syntax-colored JSON source', () => {
    const { container } = render(<JSONViewer root={parseOrThrow(JSON.stringify({
      name: 'gitlocal',
      version: 9,
      private: true,
      license: null,
      scripts: { test: 'vitest' },
    }))} />)

    expect(screen.getByText('"name"')).toHaveClass('json-code-key')
    expect(screen.getByText('"gitlocal"')).toHaveClass('json-code-string')
    expect(screen.getByText('9')).toHaveClass('json-code-number')
    expect(screen.getByText('true')).toHaveClass('json-code-boolean')
    expect(screen.getByText('null')).toHaveClass('json-code-null')
    expect(screen.getByText('"scripts"')).toBeInTheDocument()
    expect(screen.getByText('"vitest"')).toBeInTheDocument()
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"scripts": {')
    // Only the last member of each object omits its trailing comma.
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"test": "vitest"}')
  })

  it('escapes string values the way JSON source does', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ quote: 'say "hi"' }))} />)
    expect(screen.getByText('"say \\"hi\\""')).toBeInTheDocument()
  })

  it('summarizes arrays and objects by size', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({
      tags: ['a', 'b'],
      meta: { owner: 'ehud' },
    }))} />)

    expect(screen.getByText('2 items')).toBeInTheDocument()
    expect(screen.getByText('1 key')).toBeInTheDocument()
    expect(screen.getByText('2 keys')).toBeInTheDocument()
  })

  it('renders a root-level bare scalar as a minimal single-value view', () => {
    render(<JSONViewer root={parseOrThrow('"hello"')} />)
    expect(screen.getByText('"hello"')).toBeInTheDocument()
  })

  it('shows empty objects and arrays inline with an empty marker', () => {
    const { container } = render(<JSONViewer root={parseOrThrow(JSON.stringify({ empty_obj: {}, empty_arr: [] }))} />)

    expect(screen.getAllByText('empty')).toHaveLength(2)
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"empty_obj": {},')
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"empty_arr": []')
  })

  it('folds a nested node to a one-line summary and unfolds it again', () => {
    const { container } = render(<JSONViewer root={parseOrThrow(JSON.stringify({ scripts: { test: 'vitest' }, after: 1 }))} />)

    expect(screen.getByText('"test"')).toBeInTheDocument()
    const [, scriptsToggle] = screen.getAllByRole('button', { name: 'Collapse' })
    fireEvent.click(scriptsToggle)
    expect(screen.getByText('"scripts"')).toBeInTheDocument()
    expect(screen.queryByText('"test"')).not.toBeInTheDocument()
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"scripts": {…},')
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('"test"')).toBeInTheDocument()
  })

  it('shows array items without index keys, like JSON source', () => {
    const { container } = render(<JSONViewer root={parseOrThrow(JSON.stringify({ d: ['e', 'f'] }))} />)

    expect(screen.getByText('"e"')).toBeInTheDocument()
    expect(screen.queryByText('"0"')).not.toBeInTheDocument()
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"e","f"]')
  })

  it('renders deeply nested structures with parent-child scoping', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ a: { b: { c: { d: ['e'] } } } }))} />)

    expect(screen.getByText('"a"')).toBeInTheDocument()
    expect(screen.getByText('"b"')).toBeInTheDocument()
    expect(screen.getByText('"c"')).toBeInTheDocument()
    expect(screen.getByText('"d"')).toBeInTheDocument()
    expect(screen.getByText('"e"')).toBeInTheDocument()
  })

  it('renders a large array without error and keeps collapse/expand working', () => {
    const items = Array.from({ length: 2000 }, (_, i) => `item-${i}`)
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ items }))} />)

    expect(screen.getByText('2000 items')).toBeInTheDocument()
    expect(screen.getByText('"item-0"')).toBeInTheDocument()
    expect(screen.getByText('"item-1999"')).toBeInTheDocument()

    const [, itemsToggle] = screen.getAllByRole('button', { name: 'Collapse' })
    fireEvent.click(itemsToggle)
    expect(screen.queryByText('"item-0"')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('"item-0"')).toBeInTheDocument()
  })

  it('tolerates hand-built nodes without optional counts, children or values', () => {
    const { container } = render(<JSONViewer root={{
      valueKind: 'object',
      childCount: 2,
      children: [
        { key: 'list', valueKind: 'array', childCount: 1 },
        { key: 'bare', valueKind: 'string' },
      ],
    }} />)

    expect(container.querySelector('.json-viewer')?.textContent).toContain('"list": [')
    expect(container.querySelector('.json-viewer')?.textContent).toContain('"bare": ')
    render(<JSONViewer root={{ valueKind: 'array' }} />)
    expect(screen.getByText('empty')).toBeInTheDocument()
    render(<JSONViewer root={{ valueKind: 'number' }} />)
  })
})
