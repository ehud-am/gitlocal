import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface Props {
  /** The HTML document's source text. */
  content: string
}

// Rendered HTML preview (#117). The page is shown in an iframe whose sandbox allows nothing but
// same-origin access: no scripts, forms, popups or top-level navigation, so a repository file
// cannot run code in GitLocal. allow-same-origin is safe without allow-scripts and lets the
// viewer size the frame to its content. The injected policy below also blocks every network
// load (remote stylesheets, images, fonts, frames), so opening a file never contacts a server;
// inline styles and data: images still render.
const PREVIEW_POLICY = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:"
const PREVIEW_HEAD = `<meta http-equiv="Content-Security-Policy" content="${PREVIEW_POLICY}"><base target="_blank">`

const MIN_FRAME_HEIGHT = 160

// The policy must come before anything that loads, so it goes right after the doctype (keeping
// the document out of quirks mode) or at the very start. A <meta http-equiv="refresh"> would
// navigate the frame away, which neither the sandbox nor the policy prevents, so it is disabled.
export function buildPreviewDocument(content: string): string {
  const safe = content.replace(/http-equiv\s*=\s*(["']?)refresh\1/gi, 'data-gitlocal-disabled-refresh')
  const doctype = /^\s*<!doctype[^>]*>/i.exec(safe)
  if (!doctype) return `${PREVIEW_HEAD}${safe}`
  return `${doctype[0]}${PREVIEW_HEAD}${safe.slice(doctype[0].length)}`
}

// A link with its own target="_self" can still navigate the frame to a web page. That page loads
// cross-origin (no readable document) or at an http(s) URL; either way the preview is reset.
export function frameLeftPreview(frame: HTMLIFrameElement): boolean {
  const doc = frame.contentDocument
  return !doc || /^https?:/i.test(doc.URL)
}

export default function HtmlViewer({ content }: Props) {
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)
  const [generation, setGeneration] = useState(0)
  const srcDoc = useMemo(() => buildPreviewDocument(content), [content])

  const fitToContent = useCallback(() => {
    const frame = frameRef.current
    const root = frame?.contentDocument?.documentElement
    if (!frame || !root) return
    frame.style.height = `${Math.max(MIN_FRAME_HEIGHT, root.scrollHeight)}px`
  }, [])

  const handleLoad = useCallback(() => {
    observerRef.current?.disconnect()
    if (frameRef.current && frameLeftPreview(frameRef.current)) {
      setGeneration((value) => value + 1)
      return
    }
    fitToContent()
    const root = frameRef.current?.contentDocument?.documentElement
    if (root && typeof ResizeObserver !== 'undefined') {
      observerRef.current = new ResizeObserver(fitToContent)
      observerRef.current.observe(root)
    }
  }, [fitToContent])

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return (
    <div className="html-viewer">
      <p className="html-viewer-notice">
        Rendered preview. Scripts, forms and links are turned off, and files the page links to are not loaded.
      </p>
      <iframe
        key={generation}
        ref={frameRef}
        className="html-viewer-frame"
        title="HTML preview"
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={srcDoc}
        onLoad={handleLoad}
      />
    </div>
  )
}
