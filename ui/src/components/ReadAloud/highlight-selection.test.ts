import { afterEach, describe, expect, it, vi } from 'vitest'
import { HIGHLIGHT_NAME, SentenceHighlighter } from './highlight'
import { captureSelection, firstVisibleSentence, resolveCapturedSelection, selectedRangeWithin, selectionScope, sentenceAtNode, sentencesInRange } from './selection'
import type { SpeechSentence } from './speech-model'

function rangeOf(node: Node): Range {
  const range = document.createRange()
  range.selectNodeContents(node)
  return range
}

function sentence(range: Range | null): SpeechSentence {
  return { text: 'x', range, blockIndex: 0, kind: 'paragraph', preMs: 0, postMs: 0 }
}

afterEach(() => {
  Reflect.deleteProperty(window, 'Highlight')
  Reflect.deleteProperty(window.CSS ?? {}, 'highlights')
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('SentenceHighlighter', () => {
  it('uses the CSS Custom Highlight API when available', () => {
    document.body.innerHTML = '<p>One</p>'
    const registry = { set: vi.fn(), delete: vi.fn() }
    Object.defineProperty(window, 'Highlight', { value: class { constructor(public range: Range) {} }, configurable: true })
    if (!window.CSS) Object.defineProperty(window, 'CSS', { value: {}, configurable: true })
    Object.defineProperty(window.CSS, 'highlights', { value: registry, configurable: true })
    const highlighter = new SentenceHighlighter()
    highlighter.show(rangeOf(document.querySelector('p')!))
    expect(registry.set).toHaveBeenCalledWith(HIGHLIGHT_NAME, expect.anything())
    highlighter.show(null)
    expect(registry.delete).toHaveBeenCalledWith(HIGHLIGHT_NAME)
  })

  it('draws overlay boxes without the API and scrolls the sentence into view', () => {
    document.body.innerHTML = '<p>One</p>'
    const range = rangeOf(document.querySelector('p')!)
    const scrollIntoView = vi.fn()
    ;(document.querySelector('p') as HTMLElement).scrollIntoView = scrollIntoView
    Object.assign(range, {
      getClientRects: () => [{ left: 1, top: 2, width: 3, height: 4 }],
      getBoundingClientRect: () => ({ top: -10, bottom: -5 }),
    })
    const highlighter = new SentenceHighlighter()
    highlighter.show(range)
    const box = document.querySelector<HTMLElement>('.read-aloud-overlay-rect')!
    expect(box.style.cssText).toContain('left: 1px')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
    window.dispatchEvent(new Event('scroll'))
    highlighter.clear()
    expect(document.querySelector('.read-aloud-overlay')).toBeNull()
  })

  it('does not scroll a visible sentence and tolerates missing geometry', () => {
    document.body.innerHTML = '<p>One</p>'
    const paragraph = document.querySelector('p') as HTMLElement
    paragraph.scrollIntoView = vi.fn()
    const visible = rangeOf(paragraph.firstChild!)
    Object.assign(visible, { getClientRects: () => [], getBoundingClientRect: () => ({ top: 10, bottom: 20 }) })
    const highlighter = new SentenceHighlighter()
    highlighter.show(visible)
    expect(paragraph.scrollIntoView).not.toHaveBeenCalled()
    highlighter.show(rangeOf(paragraph))
    expect(document.querySelectorAll('.read-aloud-overlay')).toHaveLength(1)
  })

  it('offsets overlay boxes for a range inside a frame', () => {
    document.body.innerHTML = '<iframe></iframe>'
    const frame = document.querySelector('iframe')!
    frame.contentDocument!.body.innerHTML = '<p>Framed</p>'
    vi.spyOn(frame, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 50 } as DOMRect)
    const range = rangeOf(frame.contentDocument!.querySelector('p')!)
    Object.assign(range, { getClientRects: () => [{ left: 1, top: 2, width: 3, height: 4 }] })
    const highlighter = new SentenceHighlighter()
    highlighter.show(range)
    expect(document.querySelector<HTMLElement>('.read-aloud-overlay-rect')!.style.left).toBe('101px')
    highlighter.clear()
  })
})

describe('selection helpers', () => {
  it('captures a selection inside the root only', () => {
    document.body.innerHTML = '<div id="root"><p>Alpha beta</p></div><p id="out">Out</p>'
    const root = document.getElementById('root')!
    const selection = document.getSelection()!
    selection.removeAllRanges()
    expect(selectedRangeWithin(root, selection)).toBeNull()
    expect(selectedRangeWithin(null, selection)).toBeNull()
    selection.addRange(rangeOf(root.querySelector('p')!))
    expect(selectedRangeWithin(root, selection)?.toString()).toBe('Alpha beta')
    selection.removeAllRanges()
    selection.addRange(rangeOf(document.getElementById('out')!))
    expect(selectedRangeWithin(root, selection)).toBeNull()
  })

  it('finds sentences overlapping a range, at a node, and in view', () => {
    document.body.innerHTML = '<p id="a">A</p><p id="b">B</p><p id="c">C</p>'
    const [a, b, c] = ['a', 'b', 'c'].map((id) => document.getElementById(id)!)
    const sentences = [sentence(rangeOf(a)), sentence(null), sentence(rangeOf(b)), sentence(rangeOf(c))]
    expect(sentencesInRange(sentences, null)).toBeNull()
    expect(sentencesInRange(sentences, rangeOf(b))).toEqual([2])
    const frame = document.createElement('iframe')
    document.body.appendChild(frame)
    expect(sentencesInRange(sentences, rangeOf(frame.contentDocument!.body))).toBeNull()
    expect(sentenceAtNode(sentences, c)).toBe(3)
    expect(firstVisibleSentence(sentences, 800)).toBe(0)
    Object.assign(sentences[0].range!, { getBoundingClientRect: () => ({ top: -50, bottom: -10, height: 40 }) })
    Object.assign(sentences[2].range!, { getBoundingClientRect: () => ({ top: 10, bottom: 30, height: 20 }) })
    expect(firstVisibleSentence(sentences, 800)).toBe(2)
  })

  it('captures selections as offsets and rebuilds them after a re-render', () => {
    document.body.innerHTML = '<div id="root"><p>Alpha.</p><p>Beta <b>bold</b> end.</p></div>'
    const root = document.getElementById('root')!
    const selection = document.getSelection()!
    selection.removeAllRanges()
    expect(captureSelection(root, selection)).toBeNull()
    expect(resolveCapturedSelection(root, null)).toBeNull()
    selection.addRange(rangeOf(root.querySelectorAll('p')[1]))
    const captured = captureSelection(root, selection)!
    expect(captured).toMatchObject({ start: 6, end: 20 })
    expect(resolveCapturedSelection(root, captured)).toBe(captured.range)
    root.innerHTML = '<p>Alpha.</p><p>Beta <b>bold</b> end.</p>'
    expect(resolveCapturedSelection(root, captured)?.toString()).toBe('Beta bold end.')
    root.innerHTML = ''
    expect(resolveCapturedSelection(root, captured)).toBeNull()
    root.innerHTML = '<p>Al</p>'
    expect(resolveCapturedSelection(root, { ...captured, start: 9, end: 9 })).toBeNull()
    selection.removeAllRanges()
  })

  it('uses the HTML preview frame body as the selection scope', () => {
    document.body.innerHTML = '<div id="root"></div>'
    const root = document.getElementById('root')!
    expect(selectionScope(null, 'html')).toBeNull()
    expect(selectionScope(root, 'markdown')).toBe(root)
    expect(selectionScope(root, 'html')).toBe(root)
    const frame = document.createElement('iframe')
    root.appendChild(frame)
    expect(selectionScope(root, 'html')).toBe(frame.contentDocument!.body)
  })
})
