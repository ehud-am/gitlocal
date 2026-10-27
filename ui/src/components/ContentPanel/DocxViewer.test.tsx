import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DocxViewer, { ZOOM_LEVELS } from './DocxViewer'
import { buildDocx, para, toBase64 } from './docx/test-support'

// See ExcelViewer.test.tsx: resolve fixtures against the Vitest cwd.
function fixtureBase64(name: string): string {
  return readFileSync(join(process.cwd(), 'src/test-fixtures', name)).toString('base64')
}

async function docxBase64(body: string, extra: Parameters<typeof buildDocx>[0] = { body: '' }): Promise<string> {
  return toBase64(await buildDocx({ ...extra, body }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DocxViewer', () => {
  it('renders a pandoc-generated document: headings, lists, table, picture and footnote', async () => {
    const { container } = render(<DocxViewer content={fixtureBase64('sample.docx')} />)
    expect(screen.getByLabelText('loading document')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Project Overview' }, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Steps' })).toBeInTheDocument()
    expect(screen.getByText('First step')).toBeInTheDocument()
    expect(screen.getByText('Engineer').closest('td')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'web link' })).toHaveAttribute('href', 'https://gitlocal.dev')
    expect(screen.getByAltText('A tiny picture')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Footnotes' })).toHaveTextContent('A footnote about the link.')
    expect(screen.getByRole('group', { name: 'Page' })).toBeInTheDocument()
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('renders a styled document with header, footer, page break and table style', async () => {
    render(<DocxViewer content={fixtureBase64('styled.docx')} />)
    expect(await screen.findByText('Quarterly Report', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.getAllByText('Quarterly Report Header')).toHaveLength(2)
    expect(screen.getAllByText('Confidential Footer')).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Page 1 of 2' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Page 2 of 2' })).toHaveTextContent('Second Page')
    expect(screen.getByText('Bullet one').parentElement).toHaveTextContent('•Bullet one')
    expect(screen.getByText('R1C1').closest('td')).toBeInTheDocument()
  })

  it('shows an error for a file that is not a Word document', async () => {
    render(<DocxViewer content={btoa('not a zip')} />)
    expect(await screen.findByRole('alert')).toHaveTextContent("This file can't be previewed as a Word document.")
  })

  it('says so when the document has no content', async () => {
    render(<DocxViewer content={await docxBase64('<w:sectPr/>')} />)
    expect(await screen.findByText('This document is empty.')).toBeInTheDocument()
  })

  it('zooms relative to fit and resets', async () => {
    render(<DocxViewer content={await docxBase64(para('Zoom me'))} />)
    await screen.findByText('Zoom me')
    const pages = document.querySelector('.docx-viewer-pages') as HTMLElement
    expect(pages.style.transform).toBe('')
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(pages.style.transform).toBe('scale(1.25)')
    expect(screen.getByRole('button', { name: '125%, reset to fit width' })).toBeInTheDocument()
    expect(document.querySelector('.docx-viewer-zoomed')).toBeInTheDocument()
    for (let index = 0; index < ZOOM_LEVELS.length; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /reset to fit width/ }))
    expect(screen.getByRole('button', { name: 'Fit to width' })).toBeInTheDocument()
    for (let index = 0; index < ZOOM_LEVELS.length; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
    expect(pages.style.transform).toBe('scale(0.5)')
  })

  it('fits the page to the panel width and sizes the frame to the scaled height', async () => {
    const observers: { callback: ResizeObserverCallback; element?: Element }[] = []
    vi.stubGlobal('ResizeObserver', class {
      callback: ResizeObserverCallback
      constructor(callback: ResizeObserverCallback) {
        this.callback = callback
        observers.push({ callback })
      }
      observe(element: Element) {
        const entry = observers.find((item) => item.callback === this.callback)
        if (entry) entry.element = element
      }
      disconnect() {}
      unobserve() {}
    })
    const { unmount } = render(<DocxViewer content={await docxBase64(para('Fit me'))} />)
    await screen.findByText('Fit me')
    const body = observers.find((item) => (item.element as HTMLElement | undefined)?.classList.contains('docx-viewer-scroll-body'))
    const pagesObserver = observers.find((item) => (item.element as HTMLElement | undefined)?.classList.contains('docx-viewer-pages'))
    const { act } = await import('react')
    act(() => {
      body?.callback([{ contentRect: { width: 432 } } as ResizeObserverEntry], {} as ResizeObserver)
      pagesObserver?.callback([{ contentRect: { height: 1000 } } as ResizeObserverEntry], {} as ResizeObserver)
      body?.callback([], {} as ResizeObserver)
      pagesObserver?.callback([], {} as ResizeObserver)
    })
    const pages = document.querySelector('.docx-viewer-pages') as HTMLElement
    expect(pages.style.transform).toBe('scale(0.5)')
    const frame = document.querySelector('.docx-viewer-frame') as HTMLElement
    expect(frame.style.width).toBe('408px')
    expect(frame.style.height).toBe('500px')
    unmount()
  })

  it('measures the panel once when ResizeObserver is unavailable', async () => {
    vi.stubGlobal('ResizeObserver', undefined)
    render(<DocxViewer content={await docxBase64(para('No observer'))} />)
    expect(await screen.findByText('No observer')).toBeInTheDocument()
  })

  it('jumps to bookmarks and notes inside the viewer', async () => {
    const scrolled: string[] = []
    const original = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = function scrollIntoView(this: HTMLElement) {
      scrolled.push(this.dataset.docxAnchor ?? '')
    }
    try {
      const content = await docxBase64(
        `<w:p><w:hyperlink w:anchor="Target"><w:r><w:t>Go to target</w:t></w:r></w:hyperlink><w:hyperlink w:anchor="Nowhere"><w:r><w:t>Go nowhere</w:t></w:r></w:hyperlink><w:r><w:footnoteReference w:id="1"/></w:r><w:r><w:endnoteReference w:id="1"/></w:r></w:p>
         <w:p><w:bookmarkStart w:id="0" w:name="Target"/><w:r><w:t>Target text</w:t></w:r></w:p>`,
        {
          body: '',
          footnotes: `<w:footnote w:id="1"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Note text</w:t></w:r></w:p></w:footnote>`,
          endnotes: `<w:endnote w:id="1"><w:p><w:r><w:t>End text</w:t></w:r></w:p></w:endnote>`,
        },
      )
      render(<DocxViewer content={content} />)
      fireEvent.click(await screen.findByRole('link', { name: 'Go to target' }))
      fireEvent.click(screen.getByRole('link', { name: 'Go nowhere' }))
      fireEvent.click(screen.getByRole('link', { name: 'Footnote 1' }))
      fireEvent.click(screen.getByRole('link', { name: 'Endnote 1' }))
      expect(scrolled).toEqual(['Target', '__gitlocal-footnote-1', '__gitlocal-endnote-1'])
      expect(screen.getByRole('region', { name: 'Endnotes' })).toHaveTextContent('End text')
    } finally {
      HTMLElement.prototype.scrollIntoView = original
    }
  })

  it('shows columns from the section properties', async () => {
    render(<DocxViewer content={await docxBase64(`${para('In columns')}<w:sectPr><w:cols w:num="2" w:space="720"/></w:sectPr>`)} />)
    const columns = (await screen.findByText('In columns')).closest('.docx-columns') as HTMLElement
    expect(columns.style.columnCount).toBe('2')
    expect(columns.style.columnGap).toBe('48px')
  })

  it('ignores a stale parse when the content changes, and revokes its object URLs', async () => {
    const revoke = vi.fn()
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL: () => 'blob:x', revokeObjectURL: revoke }))
    const imageDoc = await docxBase64(
      '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="9525" cy="9525"/><wp:docPr id="1" name="p"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImg"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>',
      { body: '', parts: { 'word/media/image1.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]) }, rels: [{ id: 'rIdImg', type: 'image', target: 'media/image1.png' }] },
    )
    const { rerender, unmount } = render(<DocxViewer content={imageDoc} />)
    rerender(<DocxViewer content={await docxBase64(para('Second'))} />)
    expect(await screen.findByText('Second')).toBeInTheDocument()
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:x'))
    rerender(<DocxViewer content={btoa('broken')} />)
    unmount()
  })
})
