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

  it('renders skill-style front matter in a distinct metadata region', () => {
    render(
      <MarkdownRenderer
        content={[
          '---',
          'name: "speckit-specify"',
          'description: "Create a specification"',
          'compatibility: "Requires spec-kit"',
          'metadata:',
          '  author: "github-spec-kit"',
          '---',
          '',
          '# User Input',
        ].join('\n')}
        onNavigate={vi.fn()}
      />,
    )

    const metadata = screen.getByRole('region', { name: /document metadata/i })
    expect(metadata).toHaveTextContent('name')
    expect(metadata).toHaveTextContent('speckit-specify')
    expect(metadata).toHaveTextContent('description')
    expect(metadata).toHaveTextContent('Create a specification')
    expect(metadata).toHaveTextContent('metadata')
    expect(metadata).toHaveTextContent('author')
    expect(metadata).toHaveTextContent('github-spec-kit')
    expect(screen.getByRole('heading', { name: 'User Input' })).toBeInTheDocument()
  })

  it('renders the markdown body after front matter with normal markdown behavior', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const onNavigate = vi.fn()

    render(
      <MarkdownRenderer
        content={[
          '---',
          'title: "Guide"',
          '---',
          '',
          '# Guide',
          '',
          'A **strong** paragraph with [relative](./next.md).',
          '',
          '- item',
          '',
          '```ts',
          'const frontMatter = false',
          '```',
        ].join('\n')}
        currentPath="docs/guide.md"
        onNavigate={onNavigate}
      />,
    )

    expect(document.querySelector('h1#guide')).toHaveTextContent('Guide')
    expect(screen.getByText('strong').tagName).toBe('STRONG')
    fireEvent.click(screen.getByRole('link', { name: 'relative' }))
    expect(onNavigate).toHaveBeenCalledWith('docs/next.md')
    expect(screen.getByText('item').tagName).toBe('LI')
    expect(screen.getByRole('button', { name: /copy code block/i })).toBeInTheDocument()
  })

  it('renders nested metadata and list values readably', () => {
    render(
      <MarkdownRenderer
        content={[
          '---',
          'enabled: true',
          'retries: 3',
          'tags: ["docs", "skills"]',
          'metadata:',
          '  reviewers:',
          '    - product',
          '    - engineering',
          '---',
          '# Body',
        ].join('\n')}
        onNavigate={vi.fn()}
      />,
    )

    const metadata = screen.getByRole('region', { name: /document metadata/i })
    expect(metadata).toHaveTextContent('enabled')
    expect(metadata).toHaveTextContent('true')
    expect(metadata).toHaveTextContent('retries')
    expect(metadata).toHaveTextContent('3')
    expect(metadata).toHaveTextContent('tags')
    expect(metadata).toHaveTextContent('docs, skills')
    expect(metadata).toHaveTextContent('reviewers')
    expect(metadata).toHaveTextContent('product')
    expect(metadata).toHaveTextContent('engineering')
  })

  it('does not show metadata visualization for ordinary markdown', () => {
    render(
      <MarkdownRenderer
        content={'# Ordinary\n\n---\n\n```yaml\n---\nname: sample\n---\n```'}
        onNavigate={vi.fn()}
      />,
    )

    expect(screen.queryByRole('region', { name: /document metadata/i })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ordinary' })).toBeInTheDocument()
    expect(screen.getByText('sample')).toBeInTheDocument()
  })

  it('keeps malformed bounded front matter readable without hiding body content', () => {
    render(
      <MarkdownRenderer
        content={'---\nname: ok\nnot yaml\n---\n# Body'}
        onNavigate={vi.fn()}
      />,
    )

    const metadata = screen.getByRole('region', { name: /document metadata/i })
    expect(metadata).toHaveTextContent('Some metadata lines could not be structured.')
    expect(metadata).toHaveTextContent('not yaml')
    expect(screen.getByRole('heading', { name: 'Body' })).toBeInTheDocument()
  })

  it('keeps incomplete yaml-shaped front matter readable as fallback text', () => {
    render(
      <MarkdownRenderer
        content={'---\nname: missing-close\n# Body'}
        onNavigate={vi.fn()}
      />,
    )

    const metadata = screen.getByRole('region', { name: /document metadata/i })
    expect(metadata).toHaveTextContent('Front matter starts here but has no closing delimiter.')
    expect(metadata).toHaveTextContent('name: missing-close')
    expect(metadata).toHaveTextContent('# Body')
    expect(screen.queryByRole('heading', { name: 'Body' })).not.toBeInTheDocument()
  })

})
