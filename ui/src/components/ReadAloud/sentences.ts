// Sentence boundaries via Intl.Segmenter, with fixups for abbreviations it splits after.
export interface Span {
  start: number
  end: number
}

// Intl.Segmenter already keeps a period followed by lowercase or a digit in the sentence; these
// abbreviations are usually followed by a capitalized word that does not start a new sentence.
const ABBREVIATION = /\b(?:e\.g|i\.e|vs|mr|mrs|ms|dr|prof|st|mt|fig|no|approx)\.$/i
// One spoken clip stays well under the server's 2000-character limit.
export const MAX_SENTENCE_LENGTH = 600

// Intl.Segmenter is ES2022; the UI's TypeScript lib target predates it.
interface SentenceSegmenter {
  segment(text: string): Iterable<{ segment: string; index: number }>
}
type SegmenterConstructor = new (locale: string, options: { granularity: 'sentence' }) => SentenceSegmenter

function segmentSpans(text: string): Span[] {
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterConstructor }).Segmenter
  if (Segmenter) {
    const segmenter = new Segmenter('en', { granularity: 'sentence' })
    return Array.from(segmenter.segment(text), (part) => ({ start: part.index, end: part.index + part.segment.length }))
  }
  return [{ start: 0, end: text.length }]
}

// Splits an over-long sentence at clause punctuation, then at spaces.
function splitLong(text: string, span: Span): Span[] {
  const parts: Span[] = []
  let start = span.start
  while (span.end - start > MAX_SENTENCE_LENGTH) {
    const window = text.slice(start, start + MAX_SENTENCE_LENGTH)
    const clause = Math.max(window.lastIndexOf('; '), window.lastIndexOf(', '), window.lastIndexOf(': '))
    const space = window.lastIndexOf(' ')
    const cut = clause > MAX_SENTENCE_LENGTH / 3 ? clause + 2 : space > 0 ? space + 1 : MAX_SENTENCE_LENGTH
    parts.push({ start, end: start + cut })
    start += cut
  }
  parts.push({ start, end: span.end })
  return parts
}

export function splitSentences(text: string): Span[] {
  const merged: Span[] = []
  // Line breaks inside a block are layout, not sentence ends.
  for (const span of segmentSpans(text.replace(/[\r\n\u2028\u2029]/g, ' '))) {
    const previous = merged[merged.length - 1]
    if (previous && ABBREVIATION.test(text.slice(previous.start, previous.end).trimEnd())) {
      previous.end = span.end
    } else {
      merged.push({ ...span })
    }
  }
  return merged
    .flatMap((span) => splitLong(text, span))
    .map((span) => {
      const slice = text.slice(span.start, span.end)
      const leading = slice.length - slice.trimStart().length
      const trailing = slice.length - slice.trimEnd().length
      return { start: span.start + leading, end: span.end - trailing }
    })
    .filter((span) => span.end > span.start)
}
