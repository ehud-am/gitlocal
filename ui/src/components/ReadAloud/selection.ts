import type { SpeechSentence } from './speech-model'

function intersects(a: Range, b: Range): boolean {
  if (a.startContainer.ownerDocument !== b.startContainer.ownerDocument) return false
  return a.compareBoundaryPoints(Range.END_TO_START, b) < 0 && a.compareBoundaryPoints(Range.START_TO_END, b) > 0
}

// The user's selection inside the readable content, captured when reading starts.
export function selectedRangeWithin(root: HTMLElement | null, selection: Selection | null | undefined): Range | null {
  if (!root || !selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  return root.contains(range.commonAncestorContainer) ? range.cloneRange() : null
}

// Where a selection for reading lives: the HTML preview renders into a sandboxed same-origin
// frame, so its selection is the frame document's, under the frame body.
export function selectionScope(root: HTMLElement | null, type: string): HTMLElement | null {
  if (!root || type !== 'html') return root
  return root.querySelector('iframe')?.contentDocument?.body ?? root
}

export interface CapturedSelection {
  range: Range
  // Character offsets in the root's text, used if the preview re-renders its DOM before the
  // sentences are extracted and the captured range no longer points into the document.
  start: number
  end: number
}

function textLengthBefore(root: Node, container: Node, offset: number): number {
  const range = root.ownerDocument!.createRange()
  range.setStart(root, 0)
  range.setEnd(container, offset)
  return range.toString().length
}

export function captureSelection(root: HTMLElement | null, selection: Selection | null | undefined): CapturedSelection | null {
  const range = selectedRangeWithin(root, selection)
  if (!root || !range) return null
  return {
    range,
    start: textLengthBefore(root, range.startContainer, range.startOffset),
    end: textLengthBefore(root, range.endContainer, range.endOffset),
  }
}

// A start point at a node boundary goes to the next node, an end point to the previous one.
function pointAt(root: Node, offset: number, isStart: boolean): { node: Text; offset: number } | null {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let seen = 0
  let last: Text | null = null
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (isStart ? seen + node.length > offset : seen + node.length >= offset) return { node, offset: offset - seen }
    seen += node.length
    last = node
  }
  return last ? { node: last, offset: last.length } : null
}

// The captured range if it still covers the selected text under root, else a range rebuilt from offsets.
export function resolveCapturedSelection(root: HTMLElement | null, captured: CapturedSelection | null): Range | null {
  if (!root || !captured) return null
  // A live range whose nodes were replaced collapses to their parent instead of failing.
  const intact = root.contains(captured.range.commonAncestorContainer)
    && !captured.range.collapsed
    && captured.range.toString().length === captured.end - captured.start
  if (intact) return captured.range
  const start = pointAt(root, captured.start, true)
  const end = pointAt(root, captured.end, false)
  if (!start || !end) return null
  const range = root.ownerDocument.createRange()
  range.setStart(start.node, start.offset)
  range.setEnd(end.node, end.offset)
  return range.collapsed ? null : range
}

// Indices of the sentences a selected range overlaps, or null when it overlaps none.
export function sentencesInRange(sentences: SpeechSentence[], selected: Range | null): number[] | null {
  if (!selected) return null
  const indices = sentences.flatMap((sentence, index) => (sentence.range && intersects(sentence.range, selected) ? [index] : []))
  return indices.length > 0 ? indices : null
}

// The first sentence at least partly inside the viewport, so "Read all" starts where the user is.
export function firstVisibleSentence(sentences: SpeechSentence[], viewportHeight: number): number {
  const index = sentences.findIndex((sentence) => {
    if (!sentence.range || typeof sentence.range.getBoundingClientRect !== 'function') return false
    const rect = sentence.range.getBoundingClientRect()
    return rect.height > 0 && rect.bottom > 0 && rect.top < viewportHeight
  })
  return Math.max(index, 0)
}

export function sentenceAtNode(sentences: SpeechSentence[], node: Node): number {
  return sentences.findIndex((sentence) => sentence.range?.intersectsNode(node) ?? false)
}
