import { useEffect, useRef, useState } from 'react'

interface Props {
  content: string
}

interface PageRenderState {
  pageNumber: number
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return bytes
}

function getEffectiveDevicePixelRatio(): number {
  const dpr = window.devicePixelRatio
  return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
}

// Conservative canvas backing-store cap: browsers (and WebKit, which the native macOS app embeds)
// impose per-dimension canvas size limits well below this on some configurations. Scaling by
// devicePixelRatio without a cap risks a blank/failed render on an unusually large PDF page.
const MAX_CANVAS_DIMENSION_PX = 8192

function clampDevicePixelRatioToCanvasLimit(devicePixelRatio: number, baseWidth: number, baseHeight: number): number {
  const maxRatio = Math.min(MAX_CANVAS_DIMENSION_PX / baseWidth, MAX_CANVAS_DIMENSION_PX / baseHeight)
  return Math.min(devicePixelRatio, maxRatio)
}

export default function PdfViewer({ content }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [pages, setPages] = useState<PageRenderState[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let loadingTask: { destroy: () => void } | null = null
    setPages(null)
    setError(null)

    async function renderPdf(): Promise<void> {
      try {
        const [pdfjs, { default: workerSrc }] = await Promise.all([
          import('pdfjs-dist'),
          import('./pdf-worker'),
        ])
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc

        const data = base64ToUint8Array(content)
        const task = pdfjs.getDocument({ data })
        loadingTask = task
        const pdfDocument = await task.promise
        if (cancelled) return

        setPages(Array.from({ length: pdfDocument.numPages }, (_, index) => ({ pageNumber: index + 1 })))

        const container = containerRef.current
        if (!container) return

        for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
          if (cancelled) return
          // eslint-disable-next-line no-await-in-loop -- pages must render in order, progressively
          const page = await pdfDocument.getPage(pageNumber)
          if (cancelled) return

          const baseViewport = page.getViewport({ scale: 1.5 })
          const effectiveDevicePixelRatio = clampDevicePixelRatioToCanvasLimit(
            getEffectiveDevicePixelRatio(),
            baseViewport.width,
            baseViewport.height,
          )
          const viewport = effectiveDevicePixelRatio === 1 ? baseViewport : page.getViewport({ scale: 1.5 * effectiveDevicePixelRatio })
          const canvas = container.querySelector<HTMLCanvasElement>(`canvas[data-pdf-page="${pageNumber}"]`)
          if (!canvas) continue

          const canvasContext = canvas.getContext('2d')
          if (!canvasContext) continue

          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.width = `${baseViewport.width}px`
          canvas.style.height = `${baseViewport.height}px`

          // eslint-disable-next-line no-await-in-loop -- see above
          await page.render({ canvasContext, viewport, canvas }).promise
        }
      } catch (renderError) {
        if (cancelled) return
        const isPasswordProtected = Boolean(
          renderError && typeof renderError === 'object' && 'name' in renderError && (renderError as { name?: string }).name === 'PasswordException',
        )
        setError(
          isPasswordProtected
            ? "This PDF is password-protected and can't be previewed."
            : "This PDF can't be previewed.",
        )
      }
    }

    void renderPdf()

    return () => {
      cancelled = true
      loadingTask?.destroy()
    }
  }, [content])

  if (error) {
    return <p className="binary-placeholder">{error}</p>
  }

  return (
    <div className="pdf-viewer" ref={containerRef}>
      {pages === null ? (
        <div className="content-skeleton" aria-label="loading pdf" />
      ) : (
        pages.map((page) => (
          <canvas
            key={page.pageNumber}
            data-pdf-page={page.pageNumber}
            className="pdf-viewer-page"
            aria-label={`Page ${page.pageNumber}`}
          />
        ))
      )}
    </div>
  )
}
