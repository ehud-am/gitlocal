import { useCallback, useEffect, useRef, useState } from 'react'
import { base64ToBytes, revokeObjectUrls } from './preview-shared/bytes'
import { useObservedSize } from './preview-shared/use-observed-size'
import { FIT_ZOOM_INDEX, ZOOM_LEVELS, ZoomControls } from './preview-shared/ZoomControls'
import type { PresentationModel, SlideModel } from './pptx/model'
import { SlideJumpContext, SlideView } from './pptx/render'

interface Props {
  /** Base64-encoded .pptx (OOXML zip) bytes, as delivered by the server. */
  content: string
}

interface SlideCanvasProps {
  slide: SlideModel
  widthPx: number
  heightPx: number
  scale: number
}

// The slide is laid out at its natural (EMU-derived) pixel size, using the same absolute-position
// math as PowerPoint's own coordinate system, then scaled down to fit the visible panel width via
// a CSS transform on an outer frame sized to the scaled result - so the preview stays responsive
// (fills the panel, no fixed-width overflow/scrollbar) without having to redo any shape math.
function PptxSlideCanvas({ slide, widthPx, heightPx, scale }: SlideCanvasProps) {
  return (
    <div className="pptx-viewer-slide-frame" style={{ width: `${widthPx * scale}px`, height: `${heightPx * scale}px` }}>
      <div
        className="pptx-viewer-slide"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          transform: `scale(${scale})`,
        }}
      >
        <SlideView slide={slide} widthPx={widthPx} heightPx={heightPx} />
      </div>
    </div>
  )
}

interface SlideItemProps {
  slide: SlideModel
  widthPx: number
  heightPx: number
  scale: number
  totalSlides: number
  onVisibilityChange: (index: number, isVisible: boolean) => void
}

// One entry in the continuous-scroll slide list. Shape rendering is deferred until the slide
// nears the viewport (so a large deck stays scroll-responsive, FR-013/SC-004); a second observer
// reports which slide is currently in view to drive the "Slide N of M" position indicator.
// IntersectionObserver's `root: null` means the top-level document viewport, NOT "whatever
// scrolls" - the preview panel actually scrolls inside ContentPanel's own scroll wrapper
// (`.content-panel-selection-root`, the one scroll container every preview type mounts inside -
// see ui/src/components/ContentPanel/ContentPanel.tsx), so without an explicit root here every
// slide reads as "always intersecting" against the full page instead of the small visible panel.
// Looked up by that known class rather than by walking parents for a computed `overflow-y` -
// generic overflow-sniffing would also match `.pptx-viewer-scroll-body` itself if this component's
// own CSS ever regained an `overflow` rule, and doing a DOM+getComputedStyle walk per slide item
// forces a style recalc on every mount for no benefit when the answer is already always the same node.
function findScrollableAncestor(element: Element): HTMLElement | null {
  return element.closest<HTMLElement>('.content-panel-selection-root')
}

function PptxSlideItem({ slide, widthPx, heightPx, scale, totalSlides, onVisibilityChange }: SlideItemProps) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      // No IntersectionObserver support in this environment: render immediately rather than
      // showing an empty slide forever. Position tracking simply stays at its initial value.
      setShouldRender(true)
      return
    }

    const root = findScrollableAncestor(element)
    const renderObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShouldRender(true)
      },
      { root, rootMargin: '200% 0px' },
    )
    // threshold 0 (any pixel visible) rather than e.g. 0.5: a slide taller than the visible panel
    // can never reach 50% of its OWN area visible, so a ratio threshold would never fire for it.
    // The parent picks the topmost of all currently-intersecting slides as "current" instead.
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onVisibilityChange(slide.index, entry.isIntersecting)
      },
      { root, threshold: 0 },
    )
    renderObserver.observe(element)
    visibilityObserver.observe(element)

    return () => {
      renderObserver.disconnect()
      visibilityObserver.disconnect()
      onVisibilityChange(slide.index, false)
    }
  }, [slide.index, onVisibilityChange])

  return (
    <div
      ref={elementRef}
      className={slide.hidden ? 'pptx-viewer-slide-item pptx-viewer-slide-hidden' : 'pptx-viewer-slide-item'}
      data-slide-index={slide.index}
      tabIndex={0}
      role="group"
      aria-label={`Slide ${slide.index + 1} of ${totalSlides}${slide.hidden ? ' (hidden)' : ''}`}
    >
      {slide.hidden ? <span className="pptx-viewer-hidden-tag">Hidden slide</span> : null}
      {shouldRender ? (
        <PptxSlideCanvas slide={slide} widthPx={widthPx} heightPx={heightPx} scale={scale} />
      ) : (
        <div
          className="pptx-viewer-slide-frame pptx-viewer-slide-pending"
          style={{ width: `${widthPx * scale}px`, height: `${heightPx * scale}px` }}
          aria-hidden="true"
        />
      )}
      {slide.notes ? (
        <div className="pptx-viewer-notes" aria-label={`Speaker notes for slide ${slide.index + 1}`}>
          <h4>Notes</h4>
          <p>{slide.notes}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function PptxViewer({ content }: Props) {
  const [presentation, setPresentation] = useState<PresentationModel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visibleIndices, setVisibleIndices] = useState<ReadonlySet<number>>(() => new Set())
  const [zoomIndex, setZoomIndex] = useState(FIT_ZOOM_INDEX)
  const [showHidden, setShowHidden] = useState(true)
  const [pendingJump, setPendingJump] = useState<number | null>(null)
  const viewerRef = useRef<HTMLDivElement | null>(null)

  // Slides render at their natural (EMU-derived) pixel size, then scale down/up via CSS transform
  // to exactly fill the available panel width - keeping the preview responsive instead of a
  // fixed-size canvas that overflows (needing a horizontal scrollbar) in a narrower panel.
  const [scrollBodyRef, containerWidthPx] = useObservedSize('width')

  useEffect(() => {
    let cancelled = false
    setPresentation(null)
    setError(null)
    setVisibleIndices(new Set())
    setShowHidden(true)
    setPendingJump(null)

    let objectUrls: string[] = []

    async function run(): Promise<void> {
      try {
        const bytes = base64ToBytes(content)
        // The parser (and the libraries it uses) only load once a .pptx is actually opened.
        const { parsePresentation } = await import('./pptx/presentation')
        const parsed = await parsePresentation(bytes)
        objectUrls = parsed.objectUrls
        if (cancelled) {
          revokeObjectUrls(objectUrls)
          return
        }
        setPresentation(parsed)
      } catch {
        if (cancelled) return
        setError("This file can't be previewed as a PowerPoint presentation.")
      }
    }

    void run()

    return () => {
      cancelled = true
      revokeObjectUrls(objectUrls)
    }
  }, [content])

  // The "current" slide for the position indicator is the topmost of all currently-intersecting
  // slides (a scroll-spy pattern) - robust even when a slide is much taller than the visible
  // panel, where a visibility-ratio threshold could never be satisfied (see PptxSlideItem).
  const handleSlideVisibilityChange = useCallback((index: number, isVisible: boolean) => {
    setVisibleIndices((previous) => {
      const next = new Set(previous)
      if (isVisible) next.add(index)
      else next.delete(index)
      return next
    })
  }, [])

  // Following a link to another slide scrolls it into view, first showing hidden slides if the
  // target is one of them (runs after that re-render, so the target element exists).
  const jumpToSlide = useCallback((index: number) => {
    if (presentation?.slides[index]?.hidden) setShowHidden(true)
    setPendingJump(index)
  }, [presentation])

  useEffect(() => {
    if (pendingJump === null) return
    setPendingJump(null)
    const target = viewerRef.current?.querySelector<HTMLElement>(`[data-slide-index="${pendingJump}"]`)
    if (!target) return
    target.scrollIntoView?.({ block: 'start' })
    target.focus({ preventScroll: true })
  }, [pendingJump, showHidden])

  const visibleSlideIndex = visibleIndices.size > 0 ? Math.min(...visibleIndices) : 0

  if (error) {
    return <p className="binary-placeholder" role="alert">{error}</p>
  }

  if (presentation === null) {
    return <div className="content-skeleton" aria-label="loading presentation" />
  }

  if (presentation.slides.length === 0) {
    return <p className="binary-placeholder">This presentation has no slides.</p>
  }

  const canvasWidthPx = presentation.widthPx
  const canvasHeightPx = presentation.heightPx
  const zoom = ZOOM_LEVELS[zoomIndex]
  const scale = (containerWidthPx > 0 ? containerWidthPx / canvasWidthPx : 1) * zoom
  const hiddenCount = presentation.slides.filter((slide) => slide.hidden).length
  const shownSlides = showHidden ? presentation.slides : presentation.slides.filter((slide) => !slide.hidden)

  return (
    <div className="pptx-viewer" ref={viewerRef}>
      <div className="pptx-viewer-toolbar">
        <span className="pptx-viewer-slide-counter">
          Slide {visibleSlideIndex + 1} of {presentation.slides.length}
        </span>
        {hiddenCount > 0 ? (
          <label className="pptx-viewer-hidden-toggle">
            <input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} />
            Show hidden slides ({hiddenCount})
          </label>
        ) : null}
        <ZoomControls zoomIndex={zoomIndex} onZoomIndexChange={setZoomIndex} />
      </div>
      <SlideJumpContext.Provider value={jumpToSlide}>
        <div className={zoom > 1 ? 'pptx-viewer-scroll-body pptx-viewer-zoomed' : 'pptx-viewer-scroll-body'} ref={scrollBodyRef}>
          {shownSlides.map((slide) => (
            <PptxSlideItem
              key={slide.index}
              slide={slide}
              totalSlides={presentation.slides.length}
              widthPx={canvasWidthPx}
              heightPx={canvasHeightPx}
              scale={scale}
              onVisibilityChange={handleSlideVisibilityChange}
            />
          ))}
        </div>
      </SlideJumpContext.Provider>
    </div>
  )
}
