import { useCallback, useEffect, useRef, useState } from 'react'
import type { DocumentModel, Note, Sheet } from './docx/model'
import { AnchorJumpContext, BlocksView, DefaultTabContext, noteAnchor } from './docx/render'

interface Props {
  /** Base64-encoded .docx (OOXML zip) bytes, as delivered by the server. */
  content: string
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return bytes
}

// Zoom is relative to "fit": the page at its real size, or smaller when the panel is narrower.
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const FIT_ZOOM_INDEX = ZOOM_LEVELS.indexOf(1)
// Room left beside the page in the scroll body, so the page's shadow shows.
const PAGE_GUTTER_PX = 24

function hasContent(doc: DocumentModel): boolean {
  return doc.sheets.some((sheet) => sheet.groups.some((group) => group.blocks.length > 0))
}

function NotesView({ notes, kind }: { notes: Note[]; kind: 'footnote' | 'endnote' }) {
  if (notes.length === 0) return null
  return (
    <section className="docx-notes" aria-label={kind === 'footnote' ? 'Footnotes' : 'Endnotes'}>
      {notes.map((note) => (
        <div key={note.number} className="docx-note" data-docx-anchor={noteAnchor(kind, note.number)}>
          <BlocksView blocks={note.blocks} />
        </div>
      ))}
    </section>
  )
}

function SheetView({ sheet, index, total, notes }: { sheet: Sheet; index: number; total: number; notes: { footnotes: Note[]; endnotes: Note[] } | null }) {
  const { page } = sheet
  return (
    <div
      className="docx-sheet"
      role="group"
      aria-label={total > 1 ? `Page ${index + 1} of ${total}` : 'Page'}
      style={{
        width: `${page.widthPx}px`,
        minHeight: `${page.heightPx}px`,
        paddingLeft: `${page.margin.left}px`,
        paddingRight: `${page.margin.right}px`,
      }}
    >
      <div className="docx-header" style={{ minHeight: `${page.margin.top}px`, paddingTop: `${Math.min(page.headerPx, page.margin.top)}px` }}>
        {sheet.header ? <BlocksView blocks={sheet.header} /> : null}
      </div>
      <div className="docx-body">
        {sheet.groups.map((group, groupIndex) => (
          <div
            key={groupIndex}
            className="docx-columns"
            style={group.columns.count > 1 ? { columnCount: group.columns.count, columnGap: `${group.columns.gapPx}px` } : undefined}
          >
            <BlocksView blocks={group.blocks} />
          </div>
        ))}
        {notes ? (
          <>
            <NotesView notes={notes.footnotes} kind="footnote" />
            <NotesView notes={notes.endnotes} kind="endnote" />
          </>
        ) : null}
      </div>
      <div className="docx-footer" style={{ minHeight: `${page.margin.bottom}px`, paddingBottom: `${Math.min(page.footerPx, page.margin.bottom)}px` }}>
        {sheet.footer ? <BlocksView blocks={sheet.footer} /> : null}
      </div>
    </div>
  )
}

function revokeObjectUrls(urls: string[]): void {
  for (const url of urls) URL.revokeObjectURL(url)
}

export default function DocxViewer({ content }: Props) {
  const [doc, setDoc] = useState<DocumentModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const [contentHeightPx, setContentHeightPx] = useState(0)
  const [zoomIndex, setZoomIndex] = useState(FIT_ZOOM_INDEX)
  const viewerRef = useRef<HTMLDivElement | null>(null)
  const widthObserverRef = useRef<ResizeObserver | null>(null)
  const heightObserverRef = useRef<ResizeObserver | null>(null)

  // Callback refs, because the elements only mount once parsing has finished (see PptxViewer).
  const scrollBodyRef = useCallback((element: HTMLDivElement | null) => {
    widthObserverRef.current?.disconnect()
    widthObserverRef.current = null
    if (!element) return
    if (typeof ResizeObserver === 'undefined') {
      setContainerWidthPx(element.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidthPx(entry.contentRect.width)
    })
    observer.observe(element)
    widthObserverRef.current = observer
  }, [])

  // The pages are laid out at their real size and scaled with a CSS transform, which doesn't
  // change their layout size, so the frame around them is sized to the scaled height.
  const pagesRef = useCallback((element: HTMLDivElement | null) => {
    heightObserverRef.current?.disconnect()
    heightObserverRef.current = null
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContentHeightPx(entry.contentRect.height)
    })
    observer.observe(element)
    heightObserverRef.current = observer
  }, [])

  useEffect(() => () => {
    widthObserverRef.current?.disconnect()
    heightObserverRef.current?.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    setDoc(null)
    setError(null)
    let objectUrls: string[] = []

    async function run(): Promise<void> {
      try {
        const bytes = base64ToUint8Array(content)
        // The parser (and the libraries it uses) only load once a .docx is actually opened.
        const { parseDocument } = await import('./docx/document')
        const parsed = await parseDocument(bytes)
        objectUrls = parsed.objectUrls
        if (cancelled) {
          revokeObjectUrls(objectUrls)
          return
        }
        setDoc(parsed)
      } catch {
        if (cancelled) return
        setError("This file can't be previewed as a Word document.")
      }
    }

    void run()

    return () => {
      cancelled = true
      revokeObjectUrls(objectUrls)
    }
  }, [content])

  const jumpToAnchor = useCallback((name: string) => {
    const target = Array.from(viewerRef.current?.querySelectorAll<HTMLElement>('[data-docx-anchor]') ?? [])
      .find((element) => element.dataset.docxAnchor === name)
    target?.scrollIntoView?.({ block: 'start' })
  }, [])

  if (error) {
    return <p className="binary-placeholder" role="alert">{error}</p>
  }

  if (doc === null) {
    return <div className="content-skeleton" aria-label="loading document" />
  }

  if (!hasContent(doc)) {
    return <p className="binary-placeholder">This document is empty.</p>
  }

  const pageWidthPx = Math.max(...doc.sheets.map((sheet) => sheet.page.widthPx))
  const available = containerWidthPx > 0 ? containerWidthPx - PAGE_GUTTER_PX : pageWidthPx
  const fit = Math.min(1, Math.max(0.1, available / pageWidthPx))
  const zoom = ZOOM_LEVELS[zoomIndex]
  const scale = fit * zoom
  const notes = { footnotes: doc.footnotes, endnotes: doc.endnotes }

  return (
    <div className="docx-viewer" ref={viewerRef}>
      <div className="docx-viewer-toolbar">
        <div className="pptx-viewer-zoom" role="group" aria-label="Zoom">
          <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoomIndex === 0} onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}>−</button>
          <button type="button" className="pptx-viewer-zoom-level" title="Fit to width" aria-label={zoom === 1 ? 'Fit to width' : `${Math.round(zoom * 100)}%, reset to fit width`} onClick={() => setZoomIndex(FIT_ZOOM_INDEX)}>
            {zoom === 1 ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </button>
          <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoomIndex === ZOOM_LEVELS.length - 1} onClick={() => setZoomIndex((index) => Math.min(ZOOM_LEVELS.length - 1, index + 1))}>+</button>
        </div>
      </div>
      <AnchorJumpContext.Provider value={jumpToAnchor}>
        <DefaultTabContext.Provider value={doc.defaultTabPx}>
          <div className={scale * pageWidthPx > available ? 'docx-viewer-scroll-body docx-viewer-zoomed' : 'docx-viewer-scroll-body'} ref={scrollBodyRef}>
            <div
              className="docx-viewer-frame"
              style={{
                width: `${pageWidthPx * scale}px`,
                height: contentHeightPx > 0 ? `${contentHeightPx * scale}px` : undefined,
              }}
            >
              <div
                className="docx-viewer-pages"
                ref={pagesRef}
                style={{ width: `${pageWidthPx}px`, transform: scale === 1 ? undefined : `scale(${scale})` }}
              >
                {doc.sheets.map((sheet, index) => (
                  <SheetView
                    key={index}
                    sheet={sheet}
                    index={index}
                    total={doc.sheets.length}
                    notes={index === doc.sheets.length - 1 ? notes : null}
                  />
                ))}
              </div>
            </div>
          </div>
        </DefaultTabContext.Provider>
      </AnchorJumpContext.Provider>
    </div>
  )
}
