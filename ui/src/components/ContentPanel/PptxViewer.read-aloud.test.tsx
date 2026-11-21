import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import PptxViewer from './PptxViewer'
import { ReadAloudRenderAllContext } from '../ReadAloud/render-context'
import { extractSentences } from '../ReadAloud/extract'
import { buildDeck, sp } from './pptx/test-support'

const sample = readFileSync(join(process.cwd(), 'src/test-fixtures', 'sample.pptx')).toString('base64')

// An observer that never reports an intersection, so slides stay unrendered unless read aloud
// asks for everything.
class SilentIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe('PptxViewer with read aloud', () => {
  beforeEach(() => vi.stubGlobal('IntersectionObserver', SilentIntersectionObserver))
  afterEach(() => vi.unstubAllGlobals())

  it('defers slides normally but renders all of them while reading, with speech roles', async () => {
    const view = (renderAll: boolean) => (
      <ReadAloudRenderAllContext.Provider value={renderAll}>
        <PptxViewer content={sample} />
      </ReadAloudRenderAllContext.Provider>
    )
    const { container, rerender } = render(view(false))
    await waitFor(() => expect(container.querySelectorAll('[data-speech-role="slide"]')).toHaveLength(3), { timeout: 5000 })
    expect(screen.queryByText('Slide One Title')).toBeNull()

    rerender(view(true))
    expect(screen.getByText('Slide Two Title')).toBeInTheDocument()
    const first = container.querySelector('[data-speech-role="slide"]')!
    expect(first.getAttribute('data-speech-slide')).toBe('1')
    expect(first.getAttribute('data-speech-slide-total')).toBe('3')
    const texts = extractSentences(container as HTMLElement, { type: 'pptx' }).map((sentence) => sentence.text)
    expect(texts[0]).toBe('Slide 1 of 3.')
    expect(texts.join(' ')).toContain('Slide One Title')
  })

  it('marks title placeholders as headings', async () => {
    const bytes = await buildDeck({ slides: [{ shapes: sp({ text: 'Agenda', ph: '<p:ph type="title"/>', box: [0, 0, 100000, 100000] }) + sp({ text: 'Body text', box: [0, 200000, 100000, 100000] }) }] })
    const { container } = render(
      <ReadAloudRenderAllContext.Provider value>
        <PptxViewer content={Buffer.from(bytes).toString('base64')} />
      </ReadAloudRenderAllContext.Provider>,
    )
    await waitFor(() => expect(container.querySelector('[data-speech-role="title"]')).not.toBeNull(), { timeout: 5000 })
    const sentences = extractSentences(container as HTMLElement, { type: 'pptx' })
    expect(sentences.map((sentence) => [sentence.kind, sentence.text])).toEqual([['slide', 'Slide 1 of 1.'], ['heading', 'Agenda.'], ['paragraph', 'Body text']])
  })
})
