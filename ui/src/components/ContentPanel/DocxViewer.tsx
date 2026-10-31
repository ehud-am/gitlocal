import { useCallback, useEffect, useRef, useState } from 'react'
import { base64ToBytes, revokeObjectUrls } from './preview-shared/bytes'
import { useObservedSize } from './preview-shared/use-observed-size'
import { FIT_ZOOM_INDEX, ZOOM_LEVELS, ZoomControls } from './preview-shared/ZoomControls'
import type { DocumentModel, Note, Sheet } from './docx/model'
import { AnchorJumpContext, BlocksView, DefaultTabContext, noteAnchor } from './docx/render'

interface Props {
  /** Base64-encoded .docx (OOXML zip) bytes, as delivered by the server. */
  content: string
}

// Zoom is relative to "fit": the page at its real size, or smaller when the panel is narrower.
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

export default function DocxViewer({ content }: Props) {
  const [doc, setDoc] = useState<DocumentModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoomIndex, setZoomIndex] = useState(FIT_ZOOM_INDEX)
  const viewerRef = useRef<HTMLDivElement | null>(null)

  const [scrollBodyRef, containerWidthPx] = useObservedSize('width')
  // The pages are laid out at their real size and scaled with a CSS transform, which doesn't
  // change their layout size, so the frame around them is sized to the scaled height.
  const [pagesRef, contentHeightPx] = useObservedSize('height')

  useEffect(() => {
    let cancelled = false
    setDoc(null)
    setError(null)
    let objectUrls: string[] = []

    async function run(): Promise<void> {
      try {
        const bytes = base64ToBytes(content)
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
        <ZoomControls zoomIndex={zoomIndex} onZoomIndexChange={setZoomIndex} />
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
