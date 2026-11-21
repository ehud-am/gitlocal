import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pdf = vi.hoisted(() => ({ fail: false, rendered: 0, noText: false, holdRender: null as null | Promise<void> }))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: () => new Promise((resolve) => setTimeout(() => resolve({
        getViewport: () => ({ width: 100, height: 100 }),
        render: () => ({ promise: pdf.holdRender ?? Promise.resolve() }),
        ...(pdf.noText ? {} : { streamTextContent: () => ({}) }),
      }), 0)),
    }),
    destroy: () => undefined,
  }),
  TextLayer: class {
    constructor(private readonly options: { container: HTMLElement }) {}
    async render() {
      pdf.rendered += 1
      const span = document.createElement('span')
      span.textContent = 'Page text.'
      this.options.container.appendChild(span)
      if (pdf.fail) throw new Error('bad text')
    }
  },
}))
vi.mock('./pdf-worker', () => ({ default: 'blob:worker' }))

import PdfViewer from './PdfViewer'

afterEach(() => {
  vi.restoreAllMocks()
  pdf.fail = false
  pdf.rendered = 0
  pdf.noText = false
  pdf.holdRender = null
})

describe('PdfViewer text layer', () => {
  it('renders a text layer over each page', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
    const { container } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => expect(container.querySelector('[data-pdf-text-layer="1"]')?.textContent).toBe('Page text.'), { timeout: 5000 })
  })

  it('clears a text layer that fails to render', async () => {
    pdf.fail = true
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
    const { container } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => expect(pdf.rendered).toBe(1), { timeout: 5000 })
    await waitFor(() => expect(container.querySelector('[data-pdf-text-layer="1"]')?.textContent).toBe(''))
    expect(container.querySelector('canvas')).not.toBeNull()
  })
  it('skips the text layer when the page has no text stream', async () => {
    pdf.noText = true
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
    const { container } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => expect(container.querySelector('canvas')?.width).toBe(100), { timeout: 5000 })
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(pdf.rendered).toBe(0)
  })

  it('stops before the text layer when unmounted during the canvas render', async () => {
    let finish: () => void = () => undefined
    pdf.holdRender = new Promise<void>((resolve) => { finish = resolve })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
    const { container, unmount } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => expect(container.querySelector('canvas')?.width).toBe(100), { timeout: 5000 })
    unmount()
    finish()
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(pdf.rendered).toBe(0)
  })
})
