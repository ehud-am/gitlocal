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
  it('renders a package.json-style object as an indented key/value tree', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({
      name: 'gitlocal',
      version: '0.9.0',
      scripts: { test: 'vitest' },
    }))} />)

    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('gitlocal')).toBeInTheDocument()
    expect(screen.getByText('version')).toBeInTheDocument()
    expect(screen.getByText('0.9.0')).toBeInTheDocument()
    expect(screen.getByText('scripts')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('vitest')).toBeInTheDocument()
  })

  it('distinguishes arrays from objects with a type badge', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({
      tags: ['a', 'b'],
      meta: { owner: 'ehud' },
    }))} />)

    expect(screen.getByText('Array(2)')).toBeInTheDocument()
    expect(screen.getByText('Object(1)')).toBeInTheDocument()
  })

  it('renders a root-level bare scalar as a minimal single-value view', () => {
    render(<JSONViewer root={parseOrThrow('"hello"')} />)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('shows an explicit empty indicator for empty objects and arrays', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ empty_obj: {}, empty_arr: [] }))} />)

    expect(screen.getByText('Object(0) (empty)')).toBeInTheDocument()
    expect(screen.getByText('Array(0) (empty)')).toBeInTheDocument()
  })

  it('supports collapsing and expanding a nested node', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ scripts: { test: 'vitest' } }))} />)

    expect(screen.getByText('test')).toBeInTheDocument()
    const [, scriptsToggle] = screen.getAllByRole('button', { name: 'Collapse' })
    fireEvent.click(scriptsToggle)
    expect(screen.getByText('scripts')).toBeInTheDocument()
    expect(screen.queryByText('test')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('test')).toBeInTheDocument()
  })

  it('renders deeply nested structures with parent-child scoping', () => {
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ a: { b: { c: { d: ['e'] } } } }))} />)

    expect(screen.getByText('a')).toBeInTheDocument()
    expect(screen.getByText('b')).toBeInTheDocument()
    expect(screen.getByText('c')).toBeInTheDocument()
    expect(screen.getByText('d')).toBeInTheDocument()
    expect(screen.getByText('e')).toBeInTheDocument()
  })

  it('renders a large array without error and keeps collapse/expand working', () => {
    const items = Array.from({ length: 2000 }, (_, i) => `item-${i}`)
    render(<JSONViewer root={parseOrThrow(JSON.stringify({ items }))} />)

    expect(screen.getByText('Array(2000)')).toBeInTheDocument()
    expect(screen.getByText('item-0')).toBeInTheDocument()
    expect(screen.getByText('item-1999')).toBeInTheDocument()

    const [, itemsToggle] = screen.getAllByRole('button', { name: 'Collapse' })
    fireEvent.click(itemsToggle)
    expect(screen.queryByText('item-0')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }))
    expect(screen.getByText('item-0')).toBeInTheDocument()
  })
})
