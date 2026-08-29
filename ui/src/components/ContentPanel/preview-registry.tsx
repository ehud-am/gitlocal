// The preview-type registry: a plain typed lookup mapping a file's PreviewType (FileContent['type'])
// to the component that renders its "pretty" view plus the two flags ContentPanel previously
// branched on inline (raw-toggle availability, editability). This is the framework's entire core —
// deliberately a plain object, not a class-based plugin system (see research.md §3) — so adding a
// new preview type (PDF, SVG, and someday others) never requires touching ContentPanel's dispatch
// logic again (FR-009/SC-004), only adding an entry here plus a new renderer component.
import { Suspense, lazy, type ComponentType } from 'react'
import type { FileContent, FileContentType } from '../../types'
import type { JsonTreeNode } from './json-tree'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
const JSONViewer = lazy(() => import('./JSONViewer'))
const CodeViewer = lazy(() => import('./CodeViewer'))
const PdfViewer = lazy(() => import('./PdfViewer'))
const SvgViewer = lazy(() => import('./SvgViewer'))

const loadingFallback = <div className="content-skeleton" aria-label="loading content" />

// Shared prop shape every registry component accepts. This is a superset of what any single
// renderer needs — each component reads only the fields relevant to it — which keeps the
// registry a simple `Record<type, entry>` instead of requiring per-type generic plumbing.
export interface PreviewComponentProps {
  data: FileContent
  selectedPath: string
  selectedFileName: string
  branch: string
  showRaw: boolean
  jsonRoot: JsonTreeNode | null
  jsonError: string | null
  findQuery: string
  findCaseSensitive: boolean
  onNavigate: (path: string) => void
  setSelectionRoot: (element: HTMLElement | null) => void
}

export interface PreviewRegistryEntry {
  Component: ComponentType<PreviewComponentProps>
  supportsRawToggle: boolean
  editable: boolean
}

function BinaryPreview({ setSelectionRoot }: PreviewComponentProps) {
  return (
    <p ref={setSelectionRoot} className="binary-placeholder">Binary file — preview not available.</p>
  )
}

function ImagePreview({ data, selectedPath, setSelectionRoot }: PreviewComponentProps) {
  return (
    <img
      ref={setSelectionRoot}
      className="content-image"
      src={`data:image/*;base64,${data.content}`}
      alt={selectedPath}
    />
  )
}

function MarkdownPreview({ data, selectedPath, selectedFileName, branch, showRaw, findQuery, findCaseSensitive, onNavigate, setSelectionRoot }: PreviewComponentProps) {
  if (showRaw) {
    return (
      <div ref={setSelectionRoot}>
        <Suspense fallback={loadingFallback}>
          <CodeViewer content={data.content} language="" />
        </Suspense>
      </div>
    )
  }
  return (
    <div
      ref={setSelectionRoot}
      className="markdown-print-surface"
      data-markdown-title={selectedFileName || selectedPath}
      data-content-selection-target
    >
      <Suspense fallback={loadingFallback}>
        <MarkdownRenderer
          content={data.content}
          currentPath={selectedPath}
          branch={branch}
          findQuery={findQuery}
          findCaseSensitive={findCaseSensitive}
          onNavigate={onNavigate}
        />
      </Suspense>
    </div>
  )
}

function JsonPreview({ data, jsonRoot, jsonError, setSelectionRoot }: PreviewComponentProps) {
  if (jsonRoot) {
    return (
      <div ref={setSelectionRoot}>
        <Suspense fallback={loadingFallback}>
          <JSONViewer root={jsonRoot} />
        </Suspense>
      </div>
    )
  }

  return (
    <div ref={setSelectionRoot}>
      {jsonError ? <p className="json-parse-notice">{jsonError} Showing raw content.</p> : null}
      <Suspense fallback={loadingFallback}>
        <CodeViewer content={data.content} language="" />
      </Suspense>
    </div>
  )
}

function TextPreview({ data, showRaw, setSelectionRoot }: PreviewComponentProps) {
  return (
    <div ref={setSelectionRoot}>
      <Suspense fallback={loadingFallback}>
        <CodeViewer content={data.content} language={showRaw ? '' : data.language} />
      </Suspense>
    </div>
  )
}

function PdfPreview({ data, setSelectionRoot }: PreviewComponentProps) {
  return (
    <div ref={setSelectionRoot}>
      <Suspense fallback={loadingFallback}>
        <PdfViewer content={data.content} />
      </Suspense>
    </div>
  )
}

function SvgPreview({ data, showRaw, setSelectionRoot }: PreviewComponentProps) {
  return (
    <div ref={setSelectionRoot}>
      <Suspense fallback={loadingFallback}>
        <SvgViewer content={data.content} showRaw={showRaw} />
      </Suspense>
    </div>
  )
}

export const previewRegistry: Record<FileContentType, PreviewRegistryEntry> = {
  binary: { Component: BinaryPreview, supportsRawToggle: false, editable: false },
  image: { Component: ImagePreview, supportsRawToggle: false, editable: false },
  markdown: { Component: MarkdownPreview, supportsRawToggle: true, editable: true },
  json: { Component: JsonPreview, supportsRawToggle: true, editable: true },
  // `text` IS already the raw/code view, but the raw-toggle control is still offered for it:
  // toggling `showRaw` switches CodeViewer between syntax-highlighted and unhighlighted display
  // (pre-existing behavior — preserved exactly, not a new toggle introduced by this migration).
  text: { Component: TextPreview, supportsRawToggle: true, editable: true },
  pdf: { Component: PdfPreview, supportsRawToggle: false, editable: false },
  svg: { Component: SvgPreview, supportsRawToggle: true, editable: false },
}
