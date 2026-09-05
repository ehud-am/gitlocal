import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('PptxViewer', () => {
  it('renders the first slide as a formatted view, not raw markup or a download prompt', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => {
      expect(screen.getByText('Slide One Title')).toBeInTheDocument()
    }, { timeout: 5000 })
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

  it('steps through slides in order via next/previous, disabling at the first and last slide', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())

    const previousButton = screen.getByRole('button', { name: /Previous slide/i })
    const nextButton = screen.getByRole('button', { name: /Next slide/i })
    expect(previousButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
    expect(previousButton).not.toBeDisabled()

    fireEvent.click(nextButton)
    await waitFor(() => expect(screen.getByText('Slide Three Title')).toBeInTheDocument())
    expect(nextButton).toBeDisabled()

    fireEvent.click(previousButton)
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
  })

  it('shows speaker notes only for the slide that has them', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    expect(screen.getByLabelText('Speaker notes')).toHaveTextContent('Speaker notes for the first slide.')

    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
    expect(screen.queryByLabelText('Speaker notes')).not.toBeInTheDocument()
  })

  it('renders a single-slide deck without navigation errors, with both controls disabled', async () => {
    render(<PptxViewer content={singleSlide} />)
    await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Previous slide/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Next slide/i })).toBeDisabled()
  })

  it('renders a zero-slide deck with a clear message and no navigation errors', async () => {
    render(<PptxViewer content={empty} />)
    await waitFor(() => {
      expect(screen.getByText('This presentation has no slides.')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /Next slide/i })).not.toBeInTheDocument()
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

  it('resets to the first slide when the content prop changes to a different deck', async () => {
    const { rerender } = render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())

    rerender(<PptxViewer content={singleSlide} />)
    await waitFor(() => expect(screen.getByText('Only Slide')).toBeInTheDocument())
    expect(screen.getByText('Slide 1 of 1')).toBeInTheDocument()
  })

  it('embeds a resolvable slide image as a data URI', async () => {
    render(<PptxViewer content={sample} />)
    await waitFor(() => expect(screen.getByText('Slide One Title')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Slide Two Title')).toBeInTheDocument())
    const image = document.querySelector('.pptx-viewer-image')
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
    await waitFor(() => expect(screen.getByText('Plain Run Slide')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Broken Image Slide')).toBeInTheDocument())
    expect(screen.getByText('Image not available in this preview')).toBeInTheDocument()
    expect(document.querySelector('.pptx-viewer-image')).not.toBeInTheDocument()
  })

  it('treats a notes part with no text content as having no notes', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Plain Run Slide')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Broken Image Slide')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Empty Notes Slide')).toBeInTheDocument())
    expect(screen.queryByLabelText('Speaker notes')).not.toBeInTheDocument()
  })

  it('renders italic runs, skips empty runs, tolerates a run with no rPr, and omits an empty text shape', async () => {
    render(<PptxViewer content={variants} />)
    await waitFor(() => expect(screen.getByText('Plain Run Slide')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next slide/i }))
    await waitFor(() => expect(screen.getByText('Edge Case Run Slide')).toBeInTheDocument())

    const italicRun = screen.getByText('Italic run text.')
    expect(italicRun.style.fontStyle).toBe('italic')
    const noRPrRun = screen.getByText('No-rPr run text.')
    expect(noRPrRun.style.fontWeight).toBe('')

    // Five shapes total on this slide: Title + Italic/No-rPr text box + empty text box (dropped,
    // has zero runs) + an unpositioned text box (no a:xfrm at all) — three text boxes render.
    expect(screen.getByText('Unpositioned run text.')).toBeInTheDocument()
    expect(document.querySelectorAll('.pptx-viewer-shape')).toHaveLength(3)
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
    expect(screen.queryByLabelText('Speaker notes')).not.toBeInTheDocument()
  })

  it('resolves a "./" leading path segment in an image relationship target', async () => {
    render(<PptxViewer content={dottedPathImage} />)
    await waitFor(() => expect(screen.getByText('Dotted Path Image')).toBeInTheDocument())
    const image = document.querySelector('.pptx-viewer-image')
    expect(image?.getAttribute('src')).toContain('data:image/png;base64,')
  })
})
