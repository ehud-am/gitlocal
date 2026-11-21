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
