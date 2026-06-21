import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('global responsive layout styles', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles/globals.css'), 'utf-8')

  it('stacks the app shell at narrow widths so the file tree cannot squeeze the content pane', () => {
    const narrowBlock = css.match(/@media \(max-width: 720px\) \{[\s\S]*?\.search-toolbar/)?.[0] ?? ''

    expect(narrowBlock).toContain('.app-body')
    expect(narrowBlock).toContain('flex-direction: column')
    expect(narrowBlock).toContain('.sidebar')
    expect(narrowBlock).toContain('width: 100%')
    expect(narrowBlock).toContain('max-height: 42vh')
    expect(narrowBlock).toContain('.sidebar-rail')
    expect(narrowBlock).toContain('border-bottom: 1px solid var(--border)')
    expect(narrowBlock).toContain('.sidebar-rail-toolbar')
    expect(narrowBlock).toContain('justify-content: center')
    expect(narrowBlock).toContain('.content-area')
    expect(narrowBlock).toContain('min-width: 0')
  })

  it('defines stable wrapping styles for markdown metadata visualization', () => {
    expect(css).toContain('.markdown-metadata')
    expect(css).toContain('border: 1px solid var(--border)')
    expect(css).toContain('.markdown-metadata-row')
    expect(css).toContain('grid-template-columns: minmax(96px, max-content) minmax(0, 1fr)')
    expect(css).toContain('.markdown-metadata-value')
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('.markdown-metadata-raw')
    expect(css).toContain('white-space: pre-wrap')
  })
})
