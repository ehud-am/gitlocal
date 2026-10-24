import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HtmlViewer, { buildPreviewDocument, frameLeftPreview } from './HtmlViewer'

function frameWithDocument(doc: Partial<Document> | null): HTMLIFrameElement {
  const frame = document.createElement('iframe')
  Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => doc })
  return frame
}

describe('buildPreviewDocument', () => {
  it('puts the no-network policy and link target after the doctype', () => {
    const doc = buildPreviewDocument('<!DOCTYPE html>\n<html><body>Hi</body></html>')
    expect(doc.startsWith('<!DOCTYPE html><meta http-equiv="Content-Security-Policy" content="default-src \'none\';')).toBe(true)
    expect(doc).toContain('<base target="_blank">\n<html><body>Hi</body></html>')
  })

  it('puts the policy first when there is no doctype', () => {
    const doc = buildPreviewDocument('<p>Fragment</p>')
    expect(doc.startsWith('<meta http-equiv="Content-Security-Policy"')).toBe(true)
    expect(doc.endsWith('<p>Fragment</p>')).toBe(true)
  })

  it('disables meta refresh redirects', () => {
    const doc = buildPreviewDocument('<meta http-equiv="refresh" content="0;url=https://example.com"><meta HTTP-EQUIV=Refresh content=1>')
    expect(doc).not.toMatch(/http-equiv\s*=\s*["']?refresh/i)
    expect(doc.match(/data-gitlocal-disabled-refresh/g)).toHaveLength(2)
  })
})

describe('frameLeftPreview', () => {
  it('is false for the srcdoc document and true for a web page or an unreadable document', () => {
    expect(frameLeftPreview(frameWithDocument({ URL: 'about:srcdoc' }))).toBe(false)
    expect(frameLeftPreview(frameWithDocument({ URL: 'https://example.com/' }))).toBe(true)
    expect(frameLeftPreview(frameWithDocument(null))).toBe(true)
  })
})

describe('HtmlViewer', () => {
  const originalResizeObserver = globalThis.ResizeObserver

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver
    vi.restoreAllMocks()
  })

  it('renders the page in a sandboxed frame with no scripts and a notice', () => {
    render(<HtmlViewer content="<h1>Title</h1>" />)
    const frame = screen.getByTitle('HTML preview')
    expect(frame).toHaveAttribute('sandbox', 'allow-same-origin')
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(frame.getAttribute('srcdoc')).toContain('<h1>Title</h1>')
    expect(screen.getByText(/Scripts, forms and links are turned off/)).toBeInTheDocument()
  })

  it('sizes the frame to its content on load and follows later size changes', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    let callback: (() => void) | undefined
    globalThis.ResizeObserver = vi.fn(function (this: unknown, cb: () => void) {
      callback = cb
      return { observe, disconnect, unobserve: vi.fn() }
    }) as unknown as typeof ResizeObserver

    const { unmount } = render(<HtmlViewer content="<p>Tall</p>" />)
    const frame = screen.getByTitle('HTML preview') as HTMLIFrameElement
    const root = { scrollHeight: 900 }
    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      get: () => ({ URL: 'about:srcdoc', documentElement: root }),
    })

    fireEvent.load(frame)
    expect(frame.style.height).toBe('900px')
    expect(observe).toHaveBeenCalledWith(root)

    root.scrollHeight = 20
    callback?.()
    expect(frame.style.height).toBe('240px')

    unmount()
    expect(disconnect).toHaveBeenCalled()
  })

  it('skips sizing when the frame has no document element', () => {
    render(<HtmlViewer content="<p>x</p>" />)
    const frame = screen.getByTitle('HTML preview') as HTMLIFrameElement
    Object.defineProperty(frame, 'contentDocument', {
      configurable: true,
      get: () => ({ URL: 'about:srcdoc', documentElement: null }),
    })
    fireEvent.load(frame)
    expect(frame.style.height).toBe('')
  })

  it('resets the preview when a link navigates the frame to a web page', () => {
    render(<HtmlViewer content="<a target=_self href=https://example.com>x</a>" />)
    const frame = screen.getByTitle('HTML preview') as HTMLIFrameElement
    Object.defineProperty(frame, 'contentDocument', { configurable: true, get: () => null })

    fireEvent.load(frame)

    const fresh = screen.getByTitle('HTML preview')
    expect(fresh).not.toBe(frame)
    expect(fresh.getAttribute('srcdoc')).toContain('example.com')
  })
})
