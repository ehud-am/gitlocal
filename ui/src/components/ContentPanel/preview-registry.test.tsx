import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'
import { previewRegistry, type PreviewComponentProps } from './preview-registry'
import { parseJsonTree } from './json-tree'
import type { FileContent, FileContentType } from '../../types'

vi.mock('./PdfViewer', () => ({
  default: () => <div data-testid="pdf-viewer-stub" />,
}))

function makeFileContent(type: FileContentType, overrides: Partial<FileContent> = {}): FileContent {
  return {
    path: 'file.ext',
    content: 'hello world',
    encoding: 'utf-8',
    type,
    language: '',
    editable: false,
    revisionToken: 'rev-1',
    ...overrides,
  }
}

function baseProps(data: FileContent, overrides: Partial<PreviewComponentProps> = {}): PreviewComponentProps {
  return {
    data,
    selectedPath: data.path,
    selectedFileName: data.path,
    branch: 'main',
    showRaw: false,
    jsonRoot: null,
    jsonError: null,
    findQuery: '',
    findCaseSensitive: false,
    onNavigate: vi.fn(),
    setSelectionRoot: vi.fn(),
    ...overrides,
  }
}

describe('previewRegistry', () => {
  it('has an entry for every FileContentType with the expected flags', () => {
    const expectedFlags: Record<FileContentType, { supportsRawToggle: boolean; editable: boolean }> = {
      markdown: { supportsRawToggle: true, editable: true },
      json: { supportsRawToggle: true, editable: true },
      text: { supportsRawToggle: true, editable: true },
      image: { supportsRawToggle: false, editable: false },
      binary: { supportsRawToggle: false, editable: false },
      pdf: { supportsRawToggle: false, editable: false },
      svg: { supportsRawToggle: true, editable: false },
      csv: { supportsRawToggle: true, editable: false },
      excel: { supportsRawToggle: false, editable: false },
    }

    for (const [type, flags] of Object.entries(expectedFlags) as [FileContentType, { supportsRawToggle: boolean; editable: boolean }][]) {
      expect(previewRegistry[type].supportsRawToggle).toBe(flags.supportsRawToggle)
      expect(previewRegistry[type].editable).toBe(flags.editable)
      expect(previewRegistry[type].Component).toBeTypeOf('function')
    }
  })

  it('renders the binary fallback message for type binary', () => {
    const data = makeFileContent('binary', { content: '', encoding: 'none' })
    const Component = previewRegistry.binary.Component
    render(<Component {...baseProps(data)} />)
    expect(screen.getByText(/Binary file/i)).toBeInTheDocument()
  })

  it('renders an <img> with a base64 data URI for type image', () => {
    const data = makeFileContent('image', { content: 'abc123', encoding: 'base64' })
    const Component = previewRegistry.image.Component
    render(<Component {...baseProps(data)} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toContain('abc123')
  })

  it('renders MarkdownRenderer for markdown when showRaw is false', async () => {
    const data = makeFileContent('markdown', { content: '# Heading' })
    const Component = previewRegistry.markdown.Component
    render(<Component {...baseProps(data, { showRaw: false })} />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Heading' })).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders raw code view for markdown when showRaw is true', async () => {
    const data = makeFileContent('markdown', { content: '# Heading' })
    const Component = previewRegistry.markdown.Component
    render(<Component {...baseProps(data, { showRaw: true })} />)
    await waitFor(() => {
      expect(screen.getByText('# Heading')).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(screen.queryByRole('heading', { name: 'Heading' })).not.toBeInTheDocument()
  })

  it('falls back to selectedPath for the markdown title attribute when selectedFileName is empty', async () => {
    const data = makeFileContent('markdown', { content: '# Heading', path: 'docs/readme.md' })
    const Component = previewRegistry.markdown.Component
    const { container } = render(
      <Component {...baseProps(data, { showRaw: false, selectedPath: 'docs/readme.md', selectedFileName: '' })} />,
    )
    await waitFor(() => {
      expect(container.querySelector('.markdown-print-surface')).toHaveAttribute('data-markdown-title', 'docs/readme.md')
    }, { timeout: 5000 })
  })

  it('renders JSONViewer for json when a parsed root is supplied', async () => {
    const parsed = parseJsonTree(JSON.stringify({ name: 'gitlocal' }))
    if (!parsed.ok) throw new Error('expected valid JSON')
    const data = makeFileContent('json', { content: JSON.stringify({ name: 'gitlocal' }) })
    const Component = previewRegistry.json.Component
    render(<Component {...baseProps(data, { jsonRoot: parsed.root })} />)
    await waitFor(() => {
      expect(screen.getByText('name')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders a parse-error notice plus raw content for json when jsonRoot is null', async () => {
    const data = makeFileContent('json', { content: '{"a": 1,}' })
    const Component = previewRegistry.json.Component
    render(<Component {...baseProps(data, { jsonRoot: null, jsonError: 'This file could not be parsed as valid JSON.' })} />)
    await waitFor(() => {
      expect(screen.getByText(/could not be parsed as valid JSON/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders CodeViewer for text using the supplied language when not raw', async () => {
    const data = makeFileContent('text', { content: 'const x = 1', language: 'typescript' })
    const Component = previewRegistry.text.Component
    render(<Component {...baseProps(data, { showRaw: false })} />)
    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
          && element.textContent?.includes('const x = 1') === true),
      ).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders CodeViewer for text without a language (unhighlighted) when raw', async () => {
    const data = makeFileContent('text', { content: 'const y = 2', language: 'typescript' })
    const Component = previewRegistry.text.Component
    render(<Component {...baseProps(data, { showRaw: true })} />)
    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
          && element.textContent?.includes('const y = 2') === true),
      ).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders PdfViewer for pdf', async () => {
    const data = makeFileContent('pdf', { content: 'JVBER...', encoding: 'base64' })
    const Component = previewRegistry.pdf.Component
    render(<Component {...baseProps(data)} />)
    await waitFor(() => {
      expect(screen.getByTestId('pdf-viewer-stub')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders SvgViewer as a graphic for svg when showRaw is false', async () => {
    const data = makeFileContent('svg', { content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })
    const Component = previewRegistry.svg.Component
    render(<Component {...baseProps(data, { showRaw: false })} />)
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders SvgViewer raw XML for svg when showRaw is true', async () => {
    const data = makeFileContent('svg', { content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' })
    const Component = previewRegistry.svg.Component
    render(<Component {...baseProps(data, { showRaw: true })} />)
    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
          && element.textContent?.includes('<svg') === true),
      ).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders CsvViewer as a table for csv when showRaw is false', async () => {
    const data = makeFileContent('csv', { content: 'a,b\n1,2\n' })
    const Component = previewRegistry.csv.Component
    render(<Component {...baseProps(data, { showRaw: false })} />)
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'a' })).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders raw CSV source via CodeViewer for csv when showRaw is true', async () => {
    const data = makeFileContent('csv', { content: 'a,b\n1,2\n' })
    const Component = previewRegistry.csv.Component
    render(<Component {...baseProps(data, { showRaw: true })} />)
    await waitFor(() => {
      expect(
        screen.getByText((_, element) => element?.tagName.toLowerCase() === 'code'
          && element.textContent?.includes('a,b') === true),
      ).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(screen.queryByRole('columnheader')).not.toBeInTheDocument()
  })

  it('renders ExcelViewer as a table for excel', async () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['a', 'b'], [1, 2]]), 'Sheet1')
    const content = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' })
    const data = makeFileContent('excel', { content, encoding: 'base64' })
    const Component = previewRegistry.excel.Component
    render(<Component {...baseProps(data)} />)
    await waitFor(() => {
      expect(screen.getByRole('columnheader', { name: 'a' })).toBeInTheDocument()
    }, { timeout: 5000 })
  })
})
