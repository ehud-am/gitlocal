import { describe, expect, it } from 'vitest'
import { hasSpeakableText, normalizeForSpeech, withTerminalPunctuation } from './normalize'
import { MAX_SENTENCE_LENGTH, splitSentences } from './sentences'
import { TextBuffer } from './text-buffer'
import { pauseFor } from './speech-model'

describe('normalizeForSpeech', () => {
  it('rewrites links, versions, dates, abbreviations and markup', () => {
    expect(normalizeForSpeech('See https://www.example.com/docs?a=1 now')).toBe('See link to example.com now')
    expect(normalizeForSpeech('Ships in v1.2.3 & later')).toBe('Ships in version 1.2.3 and later')
    expect(normalizeForSpeech('Due 2026-11-21.')).toBe('Due November 21, 2026.')
    expect(normalizeForSpeech('Bad date 2026-13-40')).toBe('Bad date 2026-13-40')
    expect(normalizeForSpeech('Bad day 2026-01-00')).toBe('Bad day 2026-01-00')
    expect(normalizeForSpeech('Fruit, e.g. apples, i.e. food, etc. vs. veg')).toBe('Fruit, for example apples, that is food, et cetera versus veg')
    expect(normalizeForSpeech('**Bold** `code` 🎉 • item')).toBe('Bold code item')
  })

  it('detects speakable text and adds terminal punctuation', () => {
    expect(hasSpeakableText(' — ')).toBe(false)
    expect(hasSpeakableText('a')).toBe(true)
    expect(withTerminalPunctuation('Intro')).toBe('Intro.')
    expect(withTerminalPunctuation('Why?')).toBe('Why?')
  })
})

describe('splitSentences', () => {
  it('splits on sentence ends and trims spaces', () => {
    const text = 'First one.  Second one! Third?'
    expect(splitSentences(text).map((span) => text.slice(span.start, span.end))).toEqual(['First one.', 'Second one!', 'Third?'])
  })

  it('keeps abbreviations inside a sentence', () => {
    const text = 'Call Dr. Smith now. Then stop.'
    expect(splitSentences(text).map((span) => text.slice(span.start, span.end))).toEqual(['Call Dr. Smith now.', 'Then stop.'])
  })

  it('splits over-long sentences at clauses, then spaces, then hard', () => {
    const clauses = `${'word '.repeat(60)}, ${'more '.repeat(80)}`
    const parts = splitSentences(clauses)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.every((span) => span.end - span.start <= MAX_SENTENCE_LENGTH)).toBe(true)
    const solid = 'x'.repeat(MAX_SENTENCE_LENGTH + 10)
    expect(splitSentences(solid).map((span) => span.end - span.start)).toEqual([MAX_SENTENCE_LENGTH, 10])
    const spaced = `${'abcdefghij'.repeat(30)} ${'abcdefghij'.repeat(40)}`
    expect(splitSentences(spaced)[0].end).toBe(300)
  })

  it('reads the whole text as one sentence without Intl.Segmenter', () => {
    const original = (Intl as unknown as { Segmenter?: unknown }).Segmenter
    Reflect.deleteProperty(Intl, 'Segmenter')
    try {
      expect(splitSentences(' One. Two. ')).toEqual([{ start: 1, end: 10 }])
    } finally {
      Object.defineProperty(Intl, 'Segmenter', { value: original, configurable: true, writable: true })
    }
  })

  it('drops whitespace-only spans', () => {
    expect(splitSentences('   ')).toEqual([])
  })
})

describe('TextBuffer', () => {
  it('maps slices back to DOM ranges across nodes and separators', () => {
    document.body.innerHTML = '<p><span>Hello</span> <b>world</b></p>'
    const buffer = new TextBuffer()
    const [hello, , world] = [document.querySelector('span')!.firstChild as Text, null, document.querySelector('b')!.firstChild as Text]
    buffer.appendNode(hello)
    buffer.appendSeparator()
    buffer.appendNode(world)
    expect(buffer.text).toBe('Hello world')
    expect(buffer.isEmpty).toBe(false)
    expect(buffer.rangeFor(0, 11)?.toString()).toBe('Hello world')
    expect(buffer.rangeFor(6, 11)?.toString()).toBe('world')
    expect(buffer.rangeFor(5, 6)).toBeNull()
    expect(buffer.rangeFor(20, 30)).toBeNull()
    expect(new TextBuffer().isEmpty).toBe(true)
  })
})

describe('pauseFor', () => {
  it('pauses longer around headings and slides', () => {
    expect(pauseFor('heading', 1)).toEqual({ preMs: 400, postMs: 800 })
    expect(pauseFor('heading', 4)).toEqual({ preMs: 300, postMs: 600 })
    expect(pauseFor('heading')).toEqual({ preMs: 400, postMs: 800 })
    expect(pauseFor('list-item').postMs).toBe(300)
    expect(pauseFor('table-row').postMs).toBe(350)
    expect(pauseFor('slide')).toEqual({ preMs: 900, postMs: 0 })
    expect(pauseFor('notes').preMs).toBe(200)
    expect(pauseFor('quote').preMs).toBe(200)
    expect(pauseFor('paragraph')).toEqual({ preMs: 0, postMs: 450 })
    expect(pauseFor('code')).toEqual({ preMs: 0, postMs: 450 })
  })
})
