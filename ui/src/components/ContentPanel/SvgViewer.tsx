import { Suspense, lazy, useEffect, useState } from 'react'

const CodeViewer = lazy(() => import('./CodeViewer'))

interface Props {
  /** Raw UTF-8 SVG source, as delivered by the server (never base64 on the wire). */
  content: string
  /** When true, show the raw XML source (via CodeViewer) instead of the rendered graphic. */
  showRaw: boolean
}

// Browsers do not execute <script> elements or fetch most externally-referenced resources when
// SVG content is loaded via an <img src="data:..."> URI (unlike inline <svg> DOM injection,
// <object>, or <iframe>). This keeps SVG preview safely inert with no sanitization dependency —
// see research.md §2.
function svgTextToDataUri(svgText: string): string {
  const base64 = btoa(unescape(encodeURIComponent(svgText)))
  return `data:image/svg+xml;base64,${base64}`
}

export default function SvgViewer({ content, showRaw }: Props) {
  const [loadFailed, setLoadFailed] = useState(false)

  // Reset the fallback state when the underlying file changes — SvgViewer isn't remounted when
  // the user navigates from one SVG file to another (the registry renders the same component
  // instance across files of the same preview type), so without this a previous file's load
  // failure would incorrectly persist onto the next, valid SVG.
  useEffect(() => {
    setLoadFailed(false)
  }, [content])

  if (showRaw) {
    return (
      <Suspense fallback={<div className="content-skeleton" aria-label="loading content" />}>
        <CodeViewer content={content} language="xml" />
      </Suspense>
    )
  }

  if (loadFailed) {
    return <p className="binary-placeholder">This SVG can&apos;t be previewed.</p>
  }

  return (
    <img
      className="content-image"
      src={svgTextToDataUri(content)}
      alt="SVG preview"
      onError={() => setLoadFailed(true)}
    />
  )
}
