import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MarkdownRenderer from './MarkdownRenderer'
import { resolveMarkdownLink } from './markdown-navigation'

describe('MarkdownRenderer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders README HTML logo tags as local repository images', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'image',
        content: 'PHN2Zy8+',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MarkdownRenderer
        content={'<p align="center">\n  <img src="ui/public/gitlocal-logo.svg" alt="GitLocal icon" width="96" height="96">\n</p>'}
        currentPath="README.md"
        branch="main"
        onNavigate={vi.fn()}
      />,
    )

    const logo = await screen.findByRole('img', { name: /gitlocal icon/i })
    expect(logo).toHaveAttribute('src', 'data:image/svg+xml;base64,PHN2Zy8+')
    expect(logo).toHaveAttribute('width', '96')
    expect(logo).toHaveAttribute('height', '96')
    expect(fetchMock).toHaveBeenCalledWith('/api/file?path=ui%2Fpublic%2Fgitlocal-logo.svg&branch=main')
  })

  it('resolves relative markdown images from the current Markdown path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        type: 'image',
        content: 'aW1hZ2U=',
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <MarkdownRenderer
        content={'![Diagram](./diagram.png)'}
        currentPath="docs/README.md"
        onNavigate={vi.fn()}
      />,
    )

    expect(await screen.findByRole('img', { name: /diagram/i })).toHaveAttribute('src', 'data:image/png;base64,aW1hZ2U=')
    expect(fetchMock).toHaveBeenCalledWith('/api/file?path=docs%2Fdiagram.png')
  })

  it('keeps cached local image sources during markdown rerenders', async () => {
    const pendingRefresh = new Promise(() => {})
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'image',
        content: 'Y2FjaGVk',
      }),
    }).mockReturnValueOnce(pendingRefresh)
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(
      <MarkdownRenderer
        content={'![Logo](./assets/logo.svg)'}
        currentPath="docs/README.md"
        branch="rerender-cache"
        onNavigate={vi.fn()}
      />,
    )

    const logo = await screen.findByRole('img', { name: /logo/i })
    expect(logo).toHaveAttribute('src', 'data:image/svg+xml;base64,Y2FjaGVk')

    rerender(
      <MarkdownRenderer
        content={'![Logo](./assets/logo.svg)'}
        currentPath="docs/README.md"
        branch="rerender-cache"
        onNavigate={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: /logo/i })).toHaveAttribute('src', 'data:image/svg+xml;base64,Y2FjaGVk')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('renders copy buttons only for fenced code blocks and copies the selected block', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <MarkdownRenderer
        content={[
          '# Guide',
          '',
          'Paragraph with `inline code` but no block copy action.',
          '',
          '```ts',
          'const answer = 42',
          '```',
          '',
          '```js',
          'console.log(answer)',
          '```',
        ].join('\n')}
        onNavigate={vi.fn()}
      />,
    )

    const copyButtons = screen.getAllByRole('button', { name: /copy code block/i })
    expect(copyButtons).toHaveLength(2)
    expect(screen.getAllByTestId('line-number-gutter')).toHaveLength(2)

    fireEvent.click(copyButtons[0])
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const answer = 42')
    })
  })

  it('renders line numbers for fenced code blocks only', () => {
    render(
      <MarkdownRenderer
        content={[
          '# Guide',
          '',
          'Inline `const answer = 42` only.',
          '',
          '```ts',
          'const answer = 42',
          'console.log(answer)',
          '```',
        ].join('\n')}
        onNavigate={vi.fn()}
      />,
    )

    const gutter = screen.getByTestId('line-number-gutter')
    expect(gutter).toHaveTextContent('1')
    expect(gutter).toHaveTextContent('2')
  })

  it('does not render copy buttons when markdown contains no fenced code blocks', () => {
    render(
      <MarkdownRenderer
        content={'# Guide\n\nParagraph text.\n\n- list item\n\n> quote'}
        onNavigate={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /copy code block/i })).not.toBeInTheDocument()
  })

  it('navigates relative links through onNavigate', () => {
    const onNavigate = vi.fn()

    render(
      <MarkdownRenderer content={'[Guide](./docs/guide.md)'} onNavigate={onNavigate} />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))
    expect(onNavigate).toHaveBeenCalledWith('docs/guide.md')
  })

  it('resolves nested relative links from the current Markdown path', () => {
    const onNavigate = vi.fn()

    render(
      <MarkdownRenderer
        content={'[Guide](../guide.md)'}
        currentPath="specs/025-viewer-usability-upgrades/spec.md"
        onNavigate={onNavigate}
      />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))
    expect(onNavigate).toHaveBeenCalledWith('specs/guide.md')
    expect(resolveMarkdownLink('./notes.md#details', 'docs/readme.md')).toBe('docs/notes.md#details')
  })

  it('adds stable unique IDs to rendered headings', () => {
    render(
      <MarkdownRenderer
        content={'# Overview\n\n## Details\n\n## Details'}
        onNavigate={vi.fn()}
      />,
    )

    expect(document.querySelector('h1#overview')).toHaveTextContent('Overview')
    expect(document.querySelector('h2#details')).toHaveTextContent('Details')
    expect(document.querySelector('h2#details-2')).toHaveTextContent('Details')
  })

})
