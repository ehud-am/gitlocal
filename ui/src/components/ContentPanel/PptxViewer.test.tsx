import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import PptxViewer from './PptxViewer'
import { ZOOM_LEVELS } from './preview-shared/ZoomControls'
import { buildDeck, sp } from './pptx/test-support'

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
const themeBgRef = fixtureBase64('theme-bgref.pptx')
const groupedShapes = fixtureBase64('grouped-shapes.pptx')
const layoutGroupDecoration = fixtureBase64('layout-group-decoration.pptx')
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

  trigger(element: Element, isIntersecting = true): void {
    this.callback(
      [{ isIntersecting, target: element } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

const EMU_PER_PX = 9525

// Shape positions are rounded to thousandths of a pixel in the rendered styles.
function expectPx(value: string, emu: number): void {
  expect(value.endsWith('px')).toBe(true)
  expect(parseFloat(value)).toBeCloseTo(emu / EMU_PER_PX, 2)
}

// A shape inside a group is positioned relative to the group's box; this adds up the offsets of
// every enclosing group to give the shape's position on the slide.
function slideOffset(element: HTMLElement): { left: number; top: number } {
  let left = 0
  let top = 0
  for (let node: HTMLElement | null = element; node && !node.classList.contains('pptx-viewer-slide-content'); node = node.parentElement) {
    if (node.classList.contains('pptx-viewer-shape') || node.classList.contains('pptx-viewer-group')) {
      left += parseFloat(node.style.left || '0')
      top += parseFloat(node.style.top || '0')
    }
  }
  return { left, top }
}

function slideBackground(index: number): HTMLElement {
  return slideItem(index).querySelector('.pptx-viewer-background') as HTMLElement
}

const IMAGE_SRC = /^(blob:|data:image\/png;base64,)/

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

  it('makes every slide individually keyboard-focusable, so Tab-ing through reaches all of them', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    for (let index = 0; index < 3; index += 1) {
      const item = slideItem(index)
      expect(item).toHaveAttribute('tabindex', '0')
      expect(item).toHaveAttribute('role', 'group')
      expect(item).toHaveAttribute('aria-label', `Slide ${index + 1} of 3`)
    }
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
      renderObserver?.trigger(firstSlideEl, false)
      expect(screen.queryByText('Slide One Title')).toBeNull()
      renderObserver?.trigger(firstSlideEl)
      await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

      // Triggering the visibility observer for slide 3 moves the position indicator to it.
      visibilityObserver?.trigger(thirdSlideEl)
      await waitFor(() => expect(screen.getByText('Slide 3 of 3')).toBeInTheDocument())

      // Once slide 3 scrolls out of view again the indicator returns to the first slide.
      visibilityObserver?.trigger(thirdSlideEl, false)
      await waitFor(() => expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument())
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

  it('releases image URLs when unmounted before parsing finishes', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    try {
      const { unmount } = render(<PptxViewer content={variants} />)
      unmount()
      // A deck that fails to parse after unmounting reports nothing either.
      render(<PptxViewer content={broken} />).unmount()
      // Let the in-flight parse settle; its result is discarded, not rendered.
      await new Promise((resolve) => setTimeout(resolve, 200))
      expect(document.querySelector('.pptx-viewer')).toBeNull()
      expect(screen.queryByRole('alert')).toBeNull()
    } finally {
      revoke.mockRestore()
    }
  })

  it('resets to showing the first slide\'s position when the content prop changes to a different deck', async () => {
    const { rerender } = render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    rerender(<PptxViewer content={singleSlide} />)
    await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument()
  })

  it('embeds a resolvable slide image as an object or data URL', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
    const image = slideItem(1).querySelector('.pptx-viewer-image')
    expect(image).not.toBeNull()
    expect(image?.getAttribute('src')).toMatch(IMAGE_SRC)
  })

  it('renders an unformatted text run with the inherited defaults (18pt, regular, theme text color)', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Unformatted body text.')).toBeInTheDocument())
    const run = screen.getByText('Unformatted body text.')
    expect(run.style.fontWeight).toBe('400')
    expect(run.style.fontStyle).toBe('normal')
    expect(run.style.fontSize).toBe('18pt')
    expect(run.style.color).toBe('rgb(0, 0, 0)')
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
    expect(noRPrRun.style.fontWeight).toBe('400')

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
    expect(image?.getAttribute('src')).toMatch(IMAGE_SRC)
  })

  it('renders a placeholder\'s text at its layout-inherited position/size when the slide defines no geometry of its own', async () => {
    render(<PptxViewer content={layoutInheritedPlaceholder} />)
    await waitFor(() => expect(screen.getByText('Inherited Title')).toBeInTheDocument())

    const shapeEl = screen.getByText('Inherited Title').closest('.pptx-viewer-shape') as HTMLElement
    // The layout places this placeholder at x=457200 EMU / 9525 = 48px, not at the slide's own
    // (absent) geometry, which would have defaulted to 0px, nor at the master's 100000 EMU.
    expectPx(shapeEl.style.left, 457200)
    expectPx(shapeEl.style.top, 274638)
  })

  it('inherits a slide\'s background from its layout, and falls through to the master when the layout has none', async () => {
    render(<PptxViewer content={layoutBackground} />)
    await waitFor(() => expect(screen.getByText('Layout Background Slide')).toBeInTheDocument())

    expect(slideBackground(0).style.backgroundColor).toBe('rgb(0, 255, 0)') // layout's own bg (green) wins over master's (red)
    expect(slideBackground(1).style.backgroundColor).toBe('rgb(255, 0, 0)') // layout has none -> falls through to master's (red)
  })

  it('renders each slide\'s own layout formatting across a deck with multiple layouts, honoring a slide-level override', async () => {
    render(<PptxViewer content={multiLayoutDeck} />)
    await waitFor(() => expect(screen.getByText('Layout One Title')).toBeInTheDocument())

    const layout1Shape = screen.getByText('Layout One Title').closest('.pptx-viewer-shape') as HTMLElement
    expectPx(layout1Shape.style.left, 457200)

    const layout2Shape = screen.getByText('Layout Two Title').closest('.pptx-viewer-shape') as HTMLElement
    expectPx(layout2Shape.style.left, 685800)

    // Slide 3 uses layout2 too, but defines its own position directly - that override must win.
    const overriddenShape = screen.getByText('Overridden Title').closest('.pptx-viewer-shape') as HTMLElement
    expectPx(overriddenShape.style.left, 1000000)
    expect(overriddenShape.style.left).not.toBe(layout2Shape.style.left)
  })

  it('falls back to the slide\'s own data, without crashing, when its referenced layout part is missing', async () => {
    render(<PptxViewer content={missingLayoutPart} />)
    await waitFor(() => expect(screen.getByText('Missing Layout Slide')).toBeInTheDocument())
    const shapeEl = screen.getByText('Missing Layout Slide').closest('.pptx-viewer-shape') as HTMLElement
    // The slide's own direct geometry is still used - no crash, no silent drop.
    expectPx(shapeEl.style.left, 500000)
  })

  it('matches a slide placeholder to its layout counterpart by shared @idx', async () => {
    render(<PptxViewer content={multiLayoutDeck} />)
    await waitFor(() => expect(screen.getByText('Layout One Title')).toBeInTheDocument())
    const shapeEl = screen.getByText('Layout One Title').closest('.pptx-viewer-shape') as HTMLElement
    expectPx(shapeEl.style.left, 457200)
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

    expect(slideBackground(0).style.backgroundColor).toBe('rgb(255, 102, 0)') // theme1's accent1 = #FF6600

    const titleRun = screen.getByText('Accent Background Slide')
    expect(titleRun.style.color).toBe('rgb(255, 102, 0)')
  })

  it('resolves a schemeClr background that indirectly names a theme slot via clrMap (bg1 -> lt1)', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('Default Mapped Background Slide')).toBeInTheDocument())

    expect(slideBackground(1).style.backgroundColor).toBe('rgb(255, 255, 255)') // theme1's lt1 = #FFFFFF
  })

  it('resolves a theme color defined via a:sysClr\'s lastClr attribute (not a:srgbClr)', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('SysClr Theme Background Slide')).toBeInTheDocument())

    expect(slideBackground(2).style.backgroundColor).toBe('rgb(245, 245, 245)') // theme2's lt1 via sysClr lastClr = #F5F5F5
  })

  it('degrades a schemeClr background to the default when the referenced theme slot is undefined', async () => {
    render(<PptxViewer content={themeSchemeColors} />)
    await waitFor(() => expect(screen.getByText('Incomplete Theme Slide')).toBeInTheDocument())
    // theme3 has no lt1 color at all - "bg1" (-> lt1) falls back to the default Office palette's white.
    expect(slideBackground(3).style.backgroundColor).toBe('rgb(255, 255, 255)')
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

    // Two visible decoration images (master + layout) render as real <img> elements; the two
    // hidden ones are skipped entirely (not even as an "unavailable" placeholder).
    const images = slideItem(0).querySelectorAll('.pptx-viewer-image')
    expect(images).toHaveLength(2)
    for (const image of images) {
      expect(image.getAttribute('src')).toMatch(IMAGE_SRC)
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

  it('shows an EMF/WMF image it cannot decode as unavailable rather than as a broken image', async () => {
    render(<PptxViewer content={layoutMasterDecorations} />)
    await waitFor(() => expect(screen.getByText('Slide Own Title')).toBeInTheDocument())
    // The layout's third decoration picture references an .emf target whose bytes are not a valid
    // metafile - shown as unavailable, same as an unresolvable image reference.
    expect(screen.getByText('Image not available in this preview')).toBeInTheDocument()
  })

  it('resolves a p:bgRef themed background (an index into the theme\'s bgFillStyleLst)', async () => {
    render(<PptxViewer content={themeBgRef} />)
    await waitFor(() => expect(screen.getByText('BgRef Themed Background Slide')).toBeInTheDocument())
    expect(slideBackground(0).style.backgroundColor).toBe('rgb(51, 102, 204)') // theme accent1 = #3366CC
  })

  it('still resolves a direct p:bgPr background on a different slide in the same deck as bgRef', async () => {
    render(<PptxViewer content={themeBgRef} />)
    await waitFor(() => expect(screen.getByText('BgPr Still Works Slide')).toBeInTheDocument())
    expect(slideBackground(1).style.backgroundColor).toBe('rgb(0, 255, 0)')
  })

  it('maps a group shape\'s (p:grpSp) children into slide coordinates via its group transform', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Group Child A')).toBeInTheDocument())

    const childA = screen.getByText('Group Child A').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(childA).left).toBeCloseTo(1000000 / EMU_PER_PX, 2)
    expect(slideOffset(childA).top).toBeCloseTo(1000000 / EMU_PER_PX, 2)
    expectPx(childA.style.width, 500000)
    expectPx(childA.style.height, 250000)

    const childB = screen.getByText('Group Child B').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(childB).left).toBeCloseTo(2000000 / EMU_PER_PX, 2)
    expect(slideOffset(childB).top).toBeCloseTo(1500000 / EMU_PER_PX, 2)
  })

  it('composes transforms through a nested group (group inside a group), including an image inside it', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Inner Group Text')).toBeInTheDocument())

    // Outer group scale=2, inner group's own scale=0.5 -> composed scale=1 (exercises
    // multiplication, not just one level passing through as an identity).
    const innerText = screen.getByText('Inner Group Text').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(innerText).left).toBeCloseTo(2000000 / EMU_PER_PX, 2)
    expect(slideOffset(innerText).top).toBeCloseTo(2000000 / EMU_PER_PX, 2)
    expectPx(innerText.style.width, 500000)

    const image = slideItem(1).querySelector('.pptx-viewer-image') as HTMLElement
    expect(image).not.toBeNull()
    const imageShape = image.closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(imageShape).left).toBeCloseTo(2500000 / EMU_PER_PX, 2)
    expect(slideOffset(imageShape).top).toBeCloseTo(2000000 / EMU_PER_PX, 2)
  })

  it('renders nothing from inside a hidden (hidden="1") group', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Hidden Group Slide')).toBeInTheDocument())
    expect(screen.queryByText('Should Not Render')).not.toBeInTheDocument()
  })

  it('treats a group with no a:xfrm as an identity transform (child keeps its own raw coordinates)', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Group Edge Cases Slide')).toBeInTheDocument())
    const shapeEl = screen.getByText('No Xfrm Group Child').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(shapeEl).left).toBeCloseTo(1000000 / EMU_PER_PX, 2)
    expect(slideOffset(shapeEl).top).toBeCloseTo(1000000 / EMU_PER_PX, 2)
  })

  it('falls back scale to the group\'s own a:ext when a:chExt is missing', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Group Edge Cases Slide')).toBeInTheDocument())
    const shapeEl = screen.getByText('No ChExt Group Child').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(shapeEl).left).toBeCloseTo(500000 / EMU_PER_PX, 2)
    expect(slideOffset(shapeEl).top).toBeCloseTo(500000 / EMU_PER_PX, 2)
  })

  it('skips a hidden shape and an empty-run shape inside a visible group, but keeps its other visible content', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Visible Child In Group')).toBeInTheDocument())
    expect(screen.queryByText('Hidden Child In Group')).not.toBeInTheDocument()
  })

  it('skips a hidden group nested inside a visible group', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Visible Child In Group')).toBeInTheDocument())
    expect(screen.queryByText('Should Not Render Nested')).not.toBeInTheDocument()
  })

  it('does not crash on a degenerate zero-size group (no a:chExt and a zero-size a:ext)', async () => {
    render(<PptxViewer content={groupedShapes} />)
    await waitFor(() => expect(screen.getByText('Zero Size Group Child')).toBeInTheDocument())
    const shapeEl = screen.getByText('Zero Size Group Child').closest('.pptx-viewer-shape') as HTMLElement
    expect(slideOffset(shapeEl).left).toBeCloseTo(4500000 / EMU_PER_PX, 2)
    expect(shapeEl.style.width).toBe('0px')
  })

  it('renders a group decoration on a layout, but not a hidden layout-level group', async () => {
    render(<PptxViewer content={layoutGroupDecoration} />)
    await waitFor(() => expect(screen.getByText('Layout Group Decoration')).toBeInTheDocument())
    expect(screen.queryByText('Layout Hidden Group Should Not Render')).not.toBeInTheDocument()
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

describe('PptxViewer controls', () => {
  const box: [number, number, number, number] = [0, 0, 952500, 952500]
  const linkTo = (text: string, rId: string) => sp({ box, body: `<a:bodyPr/><a:p><a:r><a:rPr><a:hlinkClick r:id="${rId}" action="ppaction://hlinksldjump"/></a:rPr><a:t>${text}</a:t></a:r></a:p>` })
  async function deck(): Promise<string> {
    const bytes = await buildDeck({
      slides: [
        { shapes: linkTo('go hidden', 'rIdS2') + linkTo('go last', 'rIdS3'), rels: [{ id: 'rIdS2', type: 'slide', target: 'slide2.xml' }, { id: 'rIdS3', type: 'slide', target: 'slide3.xml' }] },
        { attrs: ' show="0"', shapes: sp({ text: 'Secret', box }) },
        { shapes: sp({ text: 'Last', box }) },
      ],
    })
    return Buffer.from(bytes).toString('base64')
  }

  it('marks hidden slides and can leave them out', async () => {
    render(<PptxViewer content={await deck()} />)
    await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())
    expect(slideItem(1)).toHaveClass('pptx-viewer-slide-hidden')
    expect(slideItem(1).getAttribute('aria-label')).toBe('Slide 2 of 3 (hidden)')
    expect(screen.getByText('Hidden slide')).toBeInTheDocument()
    const toggle = screen.getByRole('checkbox', { name: 'Show hidden slides (1)' })
    fireEvent.click(toggle)
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
    expect(document.querySelectorAll('.pptx-viewer-slide-item')).toHaveLength(2)
    expect(screen.getByText('Slide 1 of 3')).toBeInTheDocument()
  })

  it('shows no hidden-slide toggle for a deck without hidden slides', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('jumps to a linked slide, showing hidden slides again when the target is one', async () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      render(<PptxViewer content={await deck()} />)
      await waitFor(() => expect(screen.getByText('go last')).toBeInTheDocument())
      fireEvent.click(screen.getByText('go last'))
      await waitFor(() => expect(document.activeElement).toBe(slideItem(2)))
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })

      fireEvent.click(screen.getByRole('checkbox', { name: 'Show hidden slides (1)' }))
      expect(screen.queryByText('Secret')).not.toBeInTheDocument()
      fireEvent.click(screen.getByText('go hidden'))
      await waitFor(() => expect(screen.getByText('Secret')).toBeInTheDocument())
      await waitFor(() => expect(document.activeElement).toBe(slideItem(1)))
    } finally {
      // @ts-expect-error - restoring jsdom's missing implementation
      delete Element.prototype.scrollIntoView
    }
  })

  it('zooms relative to fit-to-width and resets to fit', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    const frame = () => slideItem(0).querySelector('.pptx-viewer-slide-frame') as HTMLElement
    const fitWidth = parseFloat(frame().style.width)
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })
    const zoomOut = screen.getByRole('button', { name: 'Zoom out' })
    expect(screen.getByRole('button', { name: 'Fit to width' })).toHaveTextContent('Fit')

    fireEvent.click(zoomIn)
    expect(parseFloat(frame().style.width)).toBeCloseTo(fitWidth * 1.25)
    expect(screen.getByRole('button', { name: '125%, reset to fit width' })).toBeInTheDocument()
    expect(document.querySelector('.pptx-viewer-scroll-body')).toHaveClass('pptx-viewer-zoomed')

    for (let step = 0; step < ZOOM_LEVELS.length; step += 1) fireEvent.click(zoomIn)
    expect(zoomIn).toBeDisabled()
    expect(screen.getByText('300%')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '300%, reset to fit width' }))
    expect(parseFloat(frame().style.width)).toBeCloseTo(fitWidth)
    for (let step = 0; step < ZOOM_LEVELS.length; step += 1) fireEvent.click(zoomOut)
    expect(zoomOut).toBeDisabled()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(document.querySelector('.pptx-viewer-scroll-body')).not.toHaveClass('pptx-viewer-zoomed')
  })
})
