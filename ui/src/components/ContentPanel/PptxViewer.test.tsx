import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import PptxViewer from './PptxViewer'

// See ExcelViewer.test.tsx: `new URL('...', import.meta.url)` is rewritten by Vite's import
// analysis, breaking a plain Node fs read at test time — resolve against the Vitest cwd instead.
function fixtureBase64(name: string): string {
  return readFileSync(join(process.cwd(), 'src/test-fixtures', name)).toString('base64')
}

const sample = fixtureBase64('sample.pptx')
const singleSlide = fixtureBase64('single-slide.pptx')
const empty = fixtureBase64('empty.pptx')
const broken = fixtureBase64('broken.pptx')
const variants = fixtureBase64('variants.pptx')
const noSize = fixtureBase64('no-size.pptx')
const missingPresentation = fixtureBase64('missing-presentation.pptx')
const missingSlidePart = fixtureBase64('missing-slide-part.pptx')
const malformedPresentationRoot = fixtureBase64('malformed-presentation-root.pptx')
const malformedSlideRoot = fixtureBase64('malformed-slide-root.pptx')
const notesTargetMissing = fixtureBase64('notes-target-missing.pptx')
const dottedPathImage = fixtureBase64('dotted-path-image.pptx')
const layoutInheritedPlaceholder = fixtureBase64('layout-inherited-placeholder.pptx')
const layoutBackground = fixtureBase64('layout-background.pptx')
const multiLayoutDeck = fixtureBase64('multi-layout-deck.pptx')
const missingLayoutPart = fixtureBase64('missing-layout-part.pptx')
const layoutEdgeCases = fixtureBase64('layout-edge-cases.pptx')
const themeSchemeColors = fixtureBase64('theme-scheme-colors.pptx')
const masterLoadFailures = fixtureBase64('master-load-failures.pptx')
const layoutMasterDecorations = fixtureBase64('layout-master-decorations.pptx')
const largeDeck = fixtureBase64('large-deck.pptx')

// A minimal IntersectionObserver test double: records what was observed and with what options,
// and lets a test manually fire an intersection so the render-defer / visibility-tracking effects
// in PptxViewer can be exercised deterministically (jsdom has no real IntersectionObserver).
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  elements: Element[] = []

  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this)
  }

  observe(element: Element): void {
    this.elements.push(element)
  }

  unobserve(): void {}
  disconnect(): void {}

  trigger(element: Element): void {
    this.callback(
      [{ isIntersecting: true, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

function slideItem(index: number): HTMLElement {
  const el = document.querySelector(`[data-slide-index="${index}"]`)
  if (!el) throw new Error(`No slide item rendered for index ${index}`)
  return el as HTMLElement
}

describe('PptxViewer', () => {
  it('renders every slide as a formatted view, not raw markup or a download prompt', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => {
      expect(screen.getByText('Slide One Title')).toBeInTheDocument()
    }, { timeout: 5000 })
    expect(screen.getByText('Slide Two Title')).toBeInTheDocument()
    expect(screen.getByText('Slide Three Title')).toBeInTheDocument()
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument()
    expect(screen.queryByText(/<p:sld/)).not.toBeInTheDocument()
  })

  it('has no detectable accessibility violations when a slide with notes is rendered', async () => {
    const { container } = render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('has no detectable accessibility violations in the error state', async () => {
    const { container } = render(<PptxViewer content={broken} />)
    await waitFor(() => expect(screen.getByText(/can't be previewed/i)).toBeInTheDocument())
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('presents all slides in one continuously scrollable list, in slide order, with no button interaction required', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    expect(screen.queryByRole('button', { name: /Previous slide/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Next slide/i })).not.toBeInTheDocument()

    const items = document.querySelectorAll('.pptx-viewer-slide-item')
    expect(items).toHaveLength(3)
    // Slides must appear in document order 0, 1, 2 - not just "somewhere in the DOM".
    expect(Array.from(items).map((el) => el.getAttribute('data-slide-index'))).toEqual(['0', '1', '2'])
    expect(slideItem(0)).toHaveTextContent('Slide One Title')
    expect(slideItem(1)).toHaveTextContent('Slide Two Title')
    expect(slideItem(2)).toHaveTextContent('Slide Three Title')
  })

  it('updates the "Slide N of M" indicator to whichever slide the visibility observer reports as in view', async () => {
    const OriginalIO = globalThis.IntersectionObserver
    FakeIntersectionObserver.instances = []
    // @ts-expect-error - test double, not a full IntersectionObserver implementation
    globalThis.IntersectionObserver = FakeIntersectionObserver

    try {
      render(<PptxViewer content={sample} />)
      // With the observer replaced by the test double, shape rendering stays deferred until a
      // render-observer trigger — wait for the slide-item wrappers themselves, not their content.
      await waitFor(() => expect(document.querySelectorAll('.pptx-viewer-slide-item')).toHaveLength(3))
      expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument()

      const firstSlideEl = slideItem(0)
      const thirdSlideEl = slideItem(2)
      // Two observers are created per slide item (render-defer, then visibility); the render one
      // is configured with rootMargin, the visibility one with a threshold.
      const renderObserver = FakeIntersectionObserver.instances.find(
        (instance) => instance.options?.rootMargin !== undefined && instance.elements.includes(firstSlideEl),
      )
      const visibilityObserver = FakeIntersectionObserver.instances.find(
        (instance) => instance.options?.threshold === 0 && instance.elements.includes(thirdSlideEl),
      )
      expect(renderObserver).toBeDefined()
      expect(visibilityObserver).toBeDefined()

      // Triggering the render observer for slide 1 reveals its shapes (deferred-render path).
      renderObserver?.trigger(firstSlideEl)
      await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

      // Triggering the visibility observer for slide 3 moves the position indicator to it.
      visibilityObserver?.trigger(thirdSlideEl)
      await waitFor(() => expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument())
    } finally {
      globalThis.IntersectionObserver = OriginalIO
    }
  })

  it('shows speaker notes inline for whichever slides have them while scrolling', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    expect(slideItem(0)).toHaveTextContent('Speaker notes for the first slide.')
    expect(screen.queryByLabelText('Speaker notes for slide 2')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Speaker notes for slide 3')).not.toBeInTheDocument()
  })

  it('renders a single-slide deck without errors', async () => {
    render(<PptxViewer content={singleSlide} />)
    await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument()
    expect(document.querySelectorAll('.pptx-viewer-slide-item')).toHaveLength(1)
  })

  it('renders a zero-slide deck with a clear message and no scroll list', async () => {
    render(<PptxViewer content={empty} />)
    await waitFor(() => {
      expect(screen.getByText('This presentation has no slides.')).toBeInTheDocument()
    })
    expect(document.querySelector('.pptx-viewer-scroll-body')).not.toBeInTheDocument()
  })

  it('shows a clear "cannot preview this file" state for a corrupted pptx, without crashing', async () => {
    render(<PptxViewer content={broken} />)
    await waitFor(() => {
      expect(screen.getByText("This file can't be previewed as a PowerPoint presentation.")).toBeInTheDocument()
    })
  })

  it('presents no edit controls anywhere in the preview', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save|edit|delete/i })).not.toBeInTheDocument()
  })

  it('never issues a network request while parsing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('resets to showing the first slide\'s position when the content prop changes to a different deck', async () => {
    const { rerender } = render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    rerender(<PptxViewer content={singleSlide} />)
    await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument()
  })

  it('embeds a resolvable slide image as a data URI', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
    const image = slideItem(1).querySelector('.pptx-viewer-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toContain('data:image/png;base64,')
  })

  it('renders an unformatted text run without bold/italic/size/color styling', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Unformatted body text.')).toBeInTheDocument())
    const run = screen.getByText('Unformatted body text.')
    expect(run.style.fontWeight).toBe('')
    expect(run.style.fontStyle).toBe('')
    expect(run.style.fontSize).toBe('')
    expect(run.style.color).toBe('')
  })

  it('shows a placeholder for an unresolvable embedded image instead of omitting the shape', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Broken Image Slide')).toBeInTheDocument())
    expect(slideItem(1)).toHaveTextContent('Image not available in this preview')
    expect(slideItem(1).querySelector('.pptx-viewer-image')).not.toBeInTheDocument()
  })

  it('treats a notes part with no text content as having no notes', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Empty Notes Slide')).toBeInTheDocument())
    expect(screen.queryByLabelText('Speaker notes for slide 3')).not.toBeInTheDocument()
  })

  it('renders italic runs, skips empty runs, tolerates a run with no rPr, and omits an empty text shape', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Edge Case Run Slide')).toBeInTheDocument())

    const italicRun = screen.getByText('Italic run text.')
    expect(italicRun.style.fontStyle).toBe('italic')
    const noRPrRun = screen.getByText('No-rPr run text.')
    expect(noRPrRun.style.fontWeight).toBe('')

    // Five shapes total on this slide: Title + Italic/No-rPr text box + empty text box (dropped,
    // has zero runs) + an unpositioned text box (no a:xfrm at all) — three text boxes render.
    expect(screen.getByText('Unpositioned run text.')).toBeInTheDocument()
    expect(slideItem(3).querySelectorAll('.pptx-viewer-shape')).toHaveLength(3)
  })

  it('falls back to a default slide size when the presentation omits an explicit sldSz', async () => {
    render(<PptxViewer content={noSize} />)
    await waitFor(() => expect(screen.getByText('No Explicit Size')).toBeInTheDocument())
    const slideEl = document.querySelector('.pptx-viewer-slide') as HTMLElement
    expect(slideEl.style.width).not.toBe('')
    expect(slideEl.style.height).not.toBe('')
  })

  it.each([
    ['a valid zip missing ppt/presentation.xml', missingPresentation],
    ['a valid zip whose referenced slide part is never written', missingSlidePart],
    ['a presentation part with an unexpected root element', malformedPresentationRoot],
    ['a slide part with an unexpected root element', malformedSlideRoot],
  ])('shows the "cannot preview" state for %s, without crashing', async (_label, content) => {
    render(<PptxViewer content={content} />)
    await waitFor(() => {
      expect(screen.getByText("This file can't be previewed as a PowerPoint presentation.")).toBeInTheDocument()
    })
  })

  it('treats a slide whose notes relationship points at a missing notes part as having no notes', async () => {
    render(<PptxViewer content={notesTargetMissing} />)
    await waitFor(() => expect(screen.getByText('Notes Target Missing')).toBeInTheDocument())
    expect(screen.queryByLabelText(/Speaker notes/)).not.toBeInTheDocument()
  })

  it('resolves a "./" leading path segment in an image relationship target', async () => {
    render(<PptxViewer content={dottedPathImage} />)
    await waitFor(() => expect(screen.getByText('Dotted Path Image')).toBeInTheDocument())
    const image = document.querySelector('.pptx-viewer-image')
    expect(image?.getAttribute('src')).toContain('data:image/png;base64,')
  })

  it('renders a placeholder\'s text at its layout-inherited position/size when the slide defines no geometry of its own', async () => {
    render(<PptxViewer content={layoutInheritedPlaceholder} />)
    await waitFor(() => expect(screen.getByText('Inherited Title')).toBeInTheDocument())

    const shapeEl = screen.getByText('Inherited Title').closest('.pptx-viewer-shape') as HTMLElement
    // The layout places this placeholder at x=457200 EMU / 9525 = 48px, not at the slide's own
    // (absent) geometry, which would have defaulted to 0px, nor at the master's 100000 EMU.
    expect(shapeEl.style.left).toBe(`${457200 / 9525}px`)
    expect(shapeEl.style.top).toBe(`${274638 / 9525}px`)
  })

  it('inherits a slide\'s background from its layout, and falls through to the master when the layout has none', async () => {
    render(<PptxViewer content={layoutBackground} />)
    await waitFor(() => expect(screen.getByText('Layout Background Slide')).toBeInTheDocument())

    const layoutBgSlide = slideItem(0).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(layoutBgSlide.style.backgroundColor).toBe('rgb(0, 255, 0)') // layout's own bg (green) wins over master's (red)

    const masterBgSlide = slideItem(1).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(masterBgSlide.style.backgroundColor).toBe('rgb(255, 0, 0)') // layout has none -> falls through to master's (red)
  })

  it('renders each slide\'s own layout formatting across a deck with multiple layouts, honoring a slide-level override', async () => {
    render(<PptxViewer content={multiLayoutDeck} />)
    await waitFor(() => expect(screen.getByText('Layout One Title')).toBeInTheDocument())

    const layout1Shape = screen.getByText('Layout One Title').closest('.pptx-viewer-shape') as HTMLElement
    expect(layout1Shape.style.left).toBe(`${457200 / 9525}px`)

    const layout2Shape = screen.getByText('Layout Two Title').closest('.pptx-viewer-shape') as HTMLElement
    expect(layout2Shape.style.left).toBe(`${685800 / 9525}px`)

    // Slide 3 uses layout2 too, but defines its own position directly - that override must win.
    const overriddenShape = screen.getByText('Overridden Title').closest('.pptx-viewer-shape') as HTMLElement
    expect(overriddenShape.style.left).toBe(`${1000000 / 9525}px`)
    expect(overriddenShape.style.left).not.toBe(layout2Shape.style.left)
  })

  it('falls back to the slide\'s own data, without crashing, when its referenced layout part is missing', async () => {
    render(<PptxViewer content={missingLayoutPart} />)
    await waitFor(() => expect(screen.getByText('Missing Layout Slide')).toBeInTheDocument())
    const shapeEl = screen.getByText('Missing Layout Slide').closest('.pptx-viewer-shape') as HTMLElement
    // The slide's own direct geometry is still used - no crash, no silent drop.
    expect(shapeEl.style.left).toBe(`${500000 / 9525}px`)
  })

  it('matches a slide placeholder to its layout counterpart by shared @idx', async () => {
    render(<PptxViewer content={multiLayoutDeck} />)
    await waitFor(() => expect(screen.getByText('Layout One Title')).toBeInTheDocument())
    const shapeEl = screen.getByText('Layout One Title').closest('.pptx-viewer-shape') as HTMLElement
    expect(shapeEl.style.left).toBe(`${457200 / 9525}px`)
  })

  it.each([
    ['a layout with no _rels file at all (no master to inherit from)', 'No Master Rels Slide'],
    ['a layout whose _rels file has no slideMaster relationship', 'No Master Rel Slide'],
  ])('degrades gracefully for %s', async (_label, titleText) => {
    render(<PptxViewer content={layoutEdgeCases} />)
    await waitFor(() => expect(screen.getByText(titleText)).toBeInTheDocument())
  })

  it('skips a layout shape that is not a placeholder, and a notes shape with no text body, without crashing', async () => {
    render(<PptxViewer content={layoutEdgeCases} />)
    await waitFor(() => expect(screen.getByText('No Master Rels Slide')).toBeInTheDocument())
    expect(screen.getByText('Real note text.')).toBeInTheDocument()
  })

  it('resolves a schemeClr background/run color that directly names a theme slot (accent1)', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('Accent Background Slide')).toBeInTheDocument())

    const slideEl = slideItem(0).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(slideEl.style.backgroundColor).toBe('rgb(255, 102, 0)') // theme1's accent1 = #FF6600

    const titleRun = screen.getByText('Accent Background Slide')
    expect(titleRun.style.color).toBe('rgb(255, 102, 0)')
  })

  it('resolves a schemeClr background that indirectly names a theme slot via clrMap (bg1 -> lt1)', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('Default Mapped Background Slide')).toBeInTheDocument())

    const slideEl = slideItem(1).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(slideEl.style.backgroundColor).toBe('rgb(255, 255, 255)') // theme1's lt1 = #FFFFFF
  })

  it('resolves a theme color defined via a:sysClr\'s lastClr attribute (not a:srgbClr)', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('SysClr Theme Background Slide')).toBeInTheDocument())

    const slideEl = slideItem(2).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(slideEl.style.backgroundColor).toBe('rgb(245, 245, 245)') // theme2's lt1 via sysClr lastClr = #F5F5F5
  })

  it('degrades a schemeClr background to the default when the referenced theme slot is undefined', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('Incomplete Theme Slide')).toBeInTheDocument())
    // theme3 has no lt1 color at all - "bg1" (-> lt1) can't resolve, so no crash and no color set.
    const slideEl = slideItem(3).querySelector('.pptx-viewer-slide') as HTMLElement
    expect(slideEl.style.backgroundColor).toBe('rgb(255, 255, 255)')
  })

  it.each([
    ['a layout whose master relationship points at a master part that was never written', 'Missing Master File Slide'],
    ['a layout whose master part has an unexpected root element', 'Malformed Master Root Slide'],
  ])('degrades gracefully for %s', async (_label, titleText) => {
    render(<PptxViewer content={masterLoadFailures} />)
    await waitFor(() => expect(screen.getByText(titleText)).toBeInTheDocument())
  })

  it('renders non-placeholder decorations (logos, static text) from both the layout and the master, but not hidden ones', async () => {
    render(<PptxViewer content={layoutMasterDecorations} />)
    await waitFor(() => expect(screen.getByText('Slide Own Title')).toBeInTheDocument())

    expect(screen.getByText('Master Decoration Text')).toBeInTheDocument()
    expect(screen.getByText('Layout Decoration Text')).toBeInTheDocument()
    expect(screen.queryByText('Master Hidden Text')).not.toBeInTheDocument()
    expect(screen.queryByText('Layout Hidden Text')).not.toBeInTheDocument()

    // Two visible decoration images (master + layout) render as real <img> data URIs; the two
    // hidden ones are skipped entirely (not even as an "unavailable" placeholder).
    const images = slideItem(0).querySelectorAll('.pptx-viewer-image')
    expect(images).toHaveLength(2)
    for (const image of images) {
      expect(image.getAttribute('src')).toContain('data:image/png;base64,')
    }
  })

  it('stacks decorations master-under-layout-under-slide, matching PowerPoint\'s own composited order', async () => {
    render(<PptxViewer content={layoutMasterDecorations} />)
    await waitFor(() => expect(screen.getByText('Slide Own Title')).toBeInTheDocument())

    const shapeTexts = [...slideItem(0).querySelectorAll('.pptx-viewer-shape')].map((el) => el.textContent)
    const masterIdx = shapeTexts.indexOf('Master Decoration Text')
    const layoutIdx = shapeTexts.indexOf('Layout Decoration Text')
    const slideIdx = shapeTexts.indexOf('Slide Own Title')
    expect(masterIdx).toBeGreaterThanOrEqual(0)
    expect(masterIdx).toBeLessThan(layoutIdx)
    expect(layoutIdx).toBeLessThan(slideIdx)
  })

  it('treats an EMF/WMF image as unavailable rather than showing a broken image (no browser-native decoder)', async () => {
    render(<PptxViewer content={layoutMasterDecorations} />)
    await waitFor(() => expect(screen.getByText('Slide Own Title')).toBeInTheDocument())
    // The layout's third decoration picture references an .emf target - shown as unavailable,
    // same as an unresolvable image reference, rather than a browser-broken-image icon.
    expect(screen.getByText('Image not available in this preview')).toBeInTheDocument()
  })

  it('scales the slide canvas to fill the available panel width via a responsive frame + transform', async () => {
    const OriginalRO = globalThis.ResizeObserver
    class FakeResizeObserver {
      static capturedCallback: ResizeObserverCallback | null = null
      constructor(callback: ResizeObserverCallback) {
        FakeResizeObserver.capturedCallback = callback
      }
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver

    try {
      render(<PptxViewer content={singleSlide} />)
      await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())

      // sample/singleSlide fixtures use the 9144000 EMU (960px) default slide width; simulate the
      // panel measuring out to exactly half that, and confirm the slide scales down to match.
      FakeResizeObserver.capturedCallback?.(
        [{ contentRect: { width: 480 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      )
      await waitFor(() => {
        const slideEl = document.querySelector('.pptx-viewer-slide') as HTMLElement
        expect(slideEl.style.transform).toBe('scale(0.5)')
      })
      const frameEl = document.querySelector('.pptx-viewer-slide-frame') as HTMLElement
      expect(frameEl.style.height).toBe('360px') // 720px natural height * 0.5 scale
    } finally {
      globalThis.ResizeObserver = OriginalRO
    }
  })

  it('renders a large deck (60 slides) without throwing', async () => {
    render(<PptxViewer content={largeDeck} />)
    await waitFor(() => expect(screen.getByText('Slide Number 1')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 60')).toBeInTheDocument()
    expect(document.querySelectorAll('.pptx-viewer-slide-item')).toHaveLength(60)
    expect(screen.getByText('Slide Number 60')).toBeInTheDocument()
  })
})
