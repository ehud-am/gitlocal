import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PdfViewer from './PdfViewer'

const { mockGetDocument } = vi.hoisted(() => ({ mockGetDocument: vi.fn() }))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
}))

vi.mock('./pdf-worker', () => ({ default: 'blob:mock-worker-url' }))

interface MockPage {
  getViewport: () => { width: number; height: number }
  render: () => { promise: Promise<void> }
}

function makePage(): MockPage {
  return {
    getViewport: () => ({ width: 100, height: 100 }),
    render: () => ({ promise: Promise.resolve() }),
  }
}

function makeLoadingTask(promise: Promise<unknown>) {
  return { promise, destroy: vi.fn() }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('PdfViewer', () => {
  beforeEach(() => {
    mockGetDocument.mockReset()
  })

  it('shows a loading skeleton before the document resolves', () => {
    mockGetDocument.mockReturnValue(makeLoadingTask(new Promise(() => {})))
    render(<PdfViewer content="dGVzdA==" />)
    expect(screen.getByLabelText('loading pdf')).toBeInTheDocument()
  })

  it('renders one canvas per page once the document loads', async () => {
    mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
      numPages: 2,
      getPage: () => Promise.resolve(makePage()),
    })))
    render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => {
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Page 2')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it("shows a generic fallback when the document can't be parsed", async () => {
    mockGetDocument.mockReturnValue(makeLoadingTask(Promise.reject(new Error('bad pdf'))))
    render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => {
      expect(screen.getByText("This PDF can't be previewed.")).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows a password-protected-specific fallback for a PasswordException', async () => {
    const passwordError = Object.assign(new Error('needs password'), { name: 'PasswordException' })
    mockGetDocument.mockReturnValue(makeLoadingTask(Promise.reject(passwordError)))
    render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => {
      expect(screen.getByText("This PDF is password-protected and can't be previewed.")).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('renders page placeholders for a large page count without waiting on per-page rendering to finish', async () => {
    mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
      numPages: 50,
      // Never resolves within the test — proves initial placeholder render doesn't block on this.
      getPage: () => new Promise(() => {}),
    })))
    const { container } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => {
      expect(container.querySelectorAll('canvas.pdf-viewer-page')).toHaveLength(50)
    }, { timeout: 5000 })
  })

  it('skips rendering a page whose canvas has no 2D context', async () => {
    const renderSpy = vi.fn(() => ({ promise: Promise.resolve() }))
    mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
      numPages: 1,
      getPage: () => new Promise((resolve) => {
        // Macrotask delay so React commits the canvas before the loop queries for it — see the
        // "sizes the canvas..." test below for the same pattern.
        setTimeout(() => resolve({
          getViewport: () => ({ width: 100, height: 100 }),
          render: renderSpy,
        }), 0)
      }),
    })))
    // Deliberately do NOT mock getContext — jsdom's real (unimplemented) getContext returns
    // undefined, exercising the `!canvasContext` skip branch once the canvas has been found.
    const { container } = render(<PdfViewer content="dGVzdA==" />)
    await waitFor(() => {
      expect(container.querySelector('canvas[data-pdf-page="1"]')).not.toBeNull()
    }, { timeout: 5000 })
    // Give the post-resolution continuation (querySelector -> getContext -> continue) time to run.
    await new Promise((resolve) => { setTimeout(resolve, 20) })
    expect(renderSpy).not.toHaveBeenCalled()
  })

  describe('when unmounted mid-render', () => {
    it('destroys the loading task and ignores a document that resolves after unmount', async () => {
      const docDeferred = deferred<{ numPages: number, getPage: () => Promise<MockPage> }>()
      const task = makeLoadingTask(docDeferred.promise)
      mockGetDocument.mockReturnValue(task)
      const { unmount } = render(<PdfViewer content="dGVzdA==" />)
      // Wait until the effect has reached getDocument() (and assigned the loading task) before
      // unmounting — the dynamic pdfjs-dist/pdf-worker imports resolve asynchronously first.
      await waitFor(() => {
        expect(mockGetDocument).toHaveBeenCalledTimes(1)
      }, { timeout: 5000 })

      unmount()
      expect(task.destroy).toHaveBeenCalledTimes(1)

      docDeferred.resolve({ numPages: 1, getPage: () => Promise.resolve(makePage()) })
      // Flush the microtask queue; the effect's `cancelled` guard must stop it from calling
      // setState on the unmounted component (which would otherwise throw/warn).
      await Promise.resolve()
      await Promise.resolve()
    })

    it('ignores a document promise that rejects after unmount', async () => {
      const docDeferred = deferred<{ numPages: number, getPage: () => Promise<MockPage> }>()
      const task = makeLoadingTask(docDeferred.promise)
      mockGetDocument.mockReturnValue(task)
      const { unmount } = render(<PdfViewer content="dGVzdA==" />)
      await waitFor(() => {
        expect(mockGetDocument).toHaveBeenCalledTimes(1)
      }, { timeout: 5000 })

      unmount()
      // Reject rather than resolve — exercises the catch block's own `cancelled` guard, which
      // must skip setError(...) on an already-unmounted component.
      docDeferred.reject(new Error('boom'))
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    it('stops before rendering a page whose getPage resolves after unmount', async () => {
      const pageDeferred = deferred<MockPage>()
      mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
        numPages: 1,
        getPage: () => pageDeferred.promise,
      })))
      const { unmount, container } = render(<PdfViewer content="dGVzdA==" />)
      await waitFor(() => {
        expect(container.querySelector('canvas[data-pdf-page="1"]')).not.toBeNull()
      }, { timeout: 5000 })

      unmount()
      pageDeferred.resolve(makePage())
      await Promise.resolve()
      await Promise.resolve()
    })

    it('does not start rendering a later page once cancelled between iterations', async () => {
      const renderDeferred = deferred<void>()
      const renderSpy = vi.fn(() => ({ promise: renderDeferred.promise }))
      const getPageSpy = vi.fn()
        .mockImplementationOnce(() => new Promise((resolve) => {
          // Resolve via a macrotask (like a real pdfjs-dist worker round-trip) so React commits
          // the page-1 canvas to the DOM before the loop looks it up — see the analogous note
          // in the "sizes the canvas..." test below.
          setTimeout(() => resolve({
            getViewport: () => ({ width: 100, height: 100 }),
            render: renderSpy,
          }), 0)
        }))
        .mockImplementationOnce(() => Promise.resolve(makePage()))
      mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
        numPages: 2,
        getPage: getPageSpy,
      })))
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
      const { unmount } = render(<PdfViewer content="dGVzdA==" />)
      // Wait until we're genuinely blocked inside `await page.render(...).promise` for page 1 —
      // proves the loop has not yet reached page 2.
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(1)
      }, { timeout: 5000 })
      expect(getPageSpy).toHaveBeenCalledTimes(1)

      unmount()
      renderDeferred.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      expect(getPageSpy).toHaveBeenCalledTimes(1)
      vi.restoreAllMocks()
    })
  })

  describe('with a real canvas 2D context available', () => {
    const renderSpy = vi.fn(() => ({ promise: Promise.resolve() }))

    beforeEach(() => {
      renderSpy.mockClear()
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('sizes the canvas to the page viewport and renders into it', async () => {
      mockGetDocument.mockReturnValue(makeLoadingTask(Promise.resolve({
        numPages: 1,
        // Resolve via a macrotask (like real pdfjs-dist worker round-trips) so the DOM commit
        // from setPages has a chance to flush before the render loop looks up the canvas node.
        getPage: () => new Promise((resolve) => {
          setTimeout(() => resolve({
            getViewport: () => ({ width: 300, height: 150 }),
            render: renderSpy,
          }), 0)
        }),
      })))
      const { container } = render(<PdfViewer content="dGVzdA==" />)
      await waitFor(() => {
        expect(renderSpy).toHaveBeenCalledTimes(1)
      }, { timeout: 5000 })
      const canvas = container.querySelector<HTMLCanvasElement>('canvas[data-pdf-page="1"]')
      expect(canvas?.width).toBe(300)
      expect(canvas?.height).toBe(150)
    })
  })
})
