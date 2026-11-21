// Turns a rendered preview (the element ContentPanel passes to setSelectionRoot) into sentences.
// Most previews are walked as semantic DOM; plain text, code, JSON, PDF and SVG have their own
// rules because their DOM has no useful structure.
import type { FileContentType } from '../../types'
import { pauseFor, type BlockKind, type SpeechSentence } from './speech-model'
import { TextBuffer } from './text-buffer'
import { splitSentences, type Span } from './sentences'
import { hasSpeakableText, normalizeForSpeech, withTerminalPunctuation } from './normalize'

export interface ExtractOptions {
  type: FileContentType
  language?: string
  content?: string
  showRaw?: boolean
}

interface RawBlock {
  kind: BlockKind
  level: number
  buffer?: TextBuffer
  window?: Span
  spoken?: string
  range?: Range | null
  prefix?: string
}

const SKIP_SELECTOR = [
  'script', 'style', 'noscript', 'template', 'button', 'select', 'input', 'textarea', 'svg', 'canvas', 'pre',
  '[hidden]', '[aria-hidden="true"]', '[data-speech-skip]', '[role="toolbar"]', '[role="tablist"]',
  '.docx-header', '.docx-footer', '.docx-viewer-toolbar', '.docx-comment-meta', '.docx-list-marker',
  '.pptx-viewer-toolbar', '.pptx-viewer-bullet', '.preview-zoom', '.code-line-gutter', '.json-parse-notice',
].join(',')

const CONTAINER_TAGS = new Set([
  'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'HEADER', 'FOOTER', 'ASIDE', 'NAV', 'FIGURE', 'UL', 'OL', 'DL',
  'TABLE', 'TBODY', 'THEAD', 'TFOOT', 'FORM', 'DETAILS', 'SUMMARY', 'BODY', 'HR',
])
const PARAGRAPH_TAGS = new Set(['P', 'DT', 'DD', 'FIGCAPTION', 'CAPTION'])
const TABULAR_TYPES = new Set<FileContentType>(['csv', 'excel'])
const PLAIN_LANGUAGES = new Set(['', 'plaintext', 'text', 'txt'])

function contentsRange(node: Node): Range {
  const range = node.ownerDocument!.createRange()
  range.selectNodeContents(node)
  return range
}

function headingLevel(element: Element): number | null {
  const match = /^H([1-6])$/.exec(element.tagName)
  if (match) return Number(match[1])
  if (element.getAttribute('role') === 'heading') {
    const level = Number(element.getAttribute('aria-level'))
    return Number.isInteger(level) && level > 0 ? level : 2
  }
  return null
}

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

class DomWalker {
  readonly blocks: RawBlock[] = []
  private current: RawBlock | null = null
  private blockDepth = 0
  private context: { kind: BlockKind; prefix: string | null } = { kind: 'paragraph', prefix: null }

  constructor(private readonly options: ExtractOptions) {}

  walk(node: Node): void {
    for (const child of Array.from(node.childNodes)) this.visit(child)
  }

  finish(): RawBlock[] {
    this.flush()
    return this.blocks
  }

  private flush(): void {
    if (this.current?.buffer && !this.current.buffer.isEmpty) this.blocks.push(this.current)
    this.current = null
  }

  private open(kind: BlockKind, level = 1, continuation = false): void {
    this.flush()
    const prefix = continuation ? undefined : this.takePrefix()
    this.current = { kind, level, buffer: new TextBuffer(), prefix }
  }

  private takePrefix(): string | undefined {
    const prefix = this.context.prefix ?? undefined
    this.context.prefix = null
    return prefix
  }

  private push(block: RawBlock): void {
    this.flush()
    this.blocks.push({ ...block, prefix: this.takePrefix() })
  }

  private visit(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!this.current) this.open(this.context.kind)
      this.current!.buffer!.appendNode(node as Text)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const element = node as Element
    if (element.matches(SKIP_SELECTOR)) return

    const role = element.getAttribute('data-speech-role')
    if (role === 'slide') {
      const number = element.getAttribute('data-speech-slide')
      const total = element.getAttribute('data-speech-slide-total')
      this.push({ kind: 'slide', level: 1, spoken: `Slide ${number} of ${total}.`, range: null })
      this.walk(element)
      this.flush()
      return
    }
    if (role === 'notes') {
      this.withContext({ kind: 'notes', prefix: 'Speaker notes.' }, element)
      return
    }
    const level = role === 'title' ? 2 : headingLevel(element)
    if (level !== null) {
      this.block(element, 'heading', level)
      return
    }
    const tag = element.tagName
    if (tag === 'TR') {
      this.row(element as HTMLTableRowElement)
      return
    }
    if (tag === 'LI') {
      this.block(element, 'list-item')
      return
    }
    if (tag === 'BLOCKQUOTE') {
      this.withContext({ kind: 'quote', prefix: 'Quote.' }, element)
      return
    }
    if (PARAGRAPH_TAGS.has(tag)) {
      this.block(element, this.context.kind)
      return
    }
    if (tag === 'IMG') {
      const alt = collapse(element.getAttribute('alt'))
      if (alt) this.push({ kind: this.context.kind, level: 1, spoken: `Image: ${alt}`, range: null })
      return
    }
    if (tag === 'BR') {
      this.current?.buffer?.appendSeparator()
      return
    }
    if (CONTAINER_TAGS.has(tag)) {
      if (this.blockDepth > 0) {
        this.current?.buffer?.appendSeparator()
        this.walk(element)
        this.current?.buffer?.appendSeparator()
        return
      }
      this.flush()
      this.walk(element)
      this.flush()
      return
    }
    this.walk(element)
  }

  private withContext(context: { kind: BlockKind; prefix: string | null }, element: Element): void {
    const saved = this.context
    this.flush()
    this.context = { ...context }
    this.walk(element)
    this.flush()
    this.context = saved
  }

  private block(element: Element, kind: BlockKind, level = 1): void {
    const parent = this.current
    this.open(kind, level)
    this.blockDepth += 1
    this.walk(element)
    this.blockDepth -= 1
    this.flush()
    if (parent && this.blockDepth > 0) this.open(parent.kind, parent.level, true)
  }

  private row(row: HTMLTableRowElement): void {
    const table = row.closest('table')
    const headerRow = table?.tHead?.rows[0] ?? null
    if (headerRow && row.parentElement?.tagName === 'THEAD') return
    const headers = headerRow ? Array.from(headerRow.cells, (cell) => collapse(cell.textContent)) : []
    const parts = Array.from(row.cells, (cell, index) => {
      const value = collapse(cell.textContent)
      if (!value) return null
      return headers[index] ? `${headers[index]}: ${value}` : value
    }).filter((part): part is string => part !== null)
    if (parts.length === 0) return
    const bodyRows = table ? Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)) : []
    const number = bodyRows.indexOf(row) + 1 || row.rowIndex + 1
    const prefix = TABULAR_TYPES.has(this.options.type) ? `Row ${number}. ` : ''
    this.push({ kind: 'table-row', level: 1, spoken: `${prefix}${parts.join('. ')}.`, range: contentsRange(row) })
  }
}

function collectTextNodes(root: Node, buffer: TextBuffer): void {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) buffer.appendNode(node as Text)
}

// Splits one buffer into blocks at a separator pattern (blank lines for text, newlines for JSON).
function windowsOf(buffer: TextBuffer, separator: RegExp, kind: BlockKind): RawBlock[] {
  const blocks: RawBlock[] = []
  let start = 0
  const pattern = new RegExp(separator.source, 'g')
  const pushWindow = (end: number) => {
    if (hasSpeakableText(buffer.text.slice(start, end))) blocks.push({ kind, level: 1, buffer, window: { start, end } })
  }
  for (let match = pattern.exec(buffer.text); match; match = pattern.exec(buffer.text)) {
    pushWindow(match.index)
    start = match.index + match[0].length
  }
  pushWindow(buffer.text.length)
  return blocks
}

function plainTextBlocks(root: HTMLElement, separator: RegExp): RawBlock[] {
  const buffer = new TextBuffer()
  collectTextNodes(root.querySelector('pre code') ?? root, buffer)
  return windowsOf(buffer, separator, 'paragraph')
}

const COMMENT_MARKERS = /^\s*(?:\/\/+!?|#+!?|\/\*+!?|\*+\/?|--+|<!--|;+|%+|'(?=\s))\s?|\s*(?:\*+\/|-->)\s*$/gm

export function stripCommentMarkers(text: string): string {
  return text.replace(COMMENT_MARKERS, ' ')
}

function commentBlocks(root: HTMLElement): RawBlock[] {
  return Array.from(root.querySelectorAll('.hljs-comment'), (element) => {
    const buffer = new TextBuffer()
    collectTextNodes(element, buffer)
    return { kind: 'code' as const, level: 1, buffer }
  }).filter((block) => hasSpeakableText(stripCommentMarkers(block.buffer.text)))
}

function svgBlocks(content: string | undefined): RawBlock[] {
  if (!content) return []
  const doc = new DOMParser().parseFromString(content, 'image/svg+xml')
  return Array.from(doc.querySelectorAll('title, desc, text'), (element) => collapse(element.textContent))
    .filter(hasSpeakableText)
    .map((spoken) => ({ kind: 'paragraph' as const, level: 1, spoken, range: null }))
}

// PDF text layer: one span per text run, positioned in % of the page. Runs with the same top form
// a line; a gap clearly larger than the usual line spacing starts a new paragraph.
function pdfBlocks(root: HTMLElement): RawBlock[] {
  const blocks: RawBlock[] = []
  for (const layer of Array.from(root.querySelectorAll<HTMLElement>('.textLayer'))) {
    const spans = Array.from(layer.querySelectorAll<HTMLElement>('span')).filter((span) => span.childNodes.length > 0 && span.querySelector('span') === null)
    const tops = spans.map((span) => Number.parseFloat(span.style.top) || 0)
    const gaps = tops.slice(1).map((top, index) => top - tops[index]).filter((gap) => gap > 0.05).sort((a, b) => a - b)
    const typicalGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : Infinity
    let buffer = new TextBuffer()
    spans.forEach((span, index) => {
      const gap = index === 0 ? 0 : tops[index] - tops[index - 1]
      if (index > 0 && (gap > typicalGap * 1.6 || gap < -0.05)) {
        if (!buffer.isEmpty) blocks.push({ kind: 'paragraph', level: 1, buffer })
        buffer = new TextBuffer()
      } else if (index > 0) {
        buffer.appendSeparator()
      }
      collectTextNodes(span, buffer)
    })
    if (!buffer.isEmpty) blocks.push({ kind: 'paragraph', level: 1, buffer })
  }
  return blocks
}

function walkBlocks(root: Node, options: ExtractOptions): RawBlock[] {
  const walker = new DomWalker(options)
  walker.walk(root)
  return walker.finish()
}

function excelBlocks(root: HTMLElement, options: ExtractOptions): RawBlock[] {
  const tab = root.querySelector('[role="tab"][aria-selected="true"]')
  const name = collapse(tab?.textContent)
  const heading: RawBlock[] = name ? [{ kind: 'heading', level: 2, spoken: `Sheet ${name}`, range: null }] : []
  return [...heading, ...walkBlocks(root, options)]
}

export function extractBlocks(root: HTMLElement, options: ExtractOptions): RawBlock[] {
  switch (options.type) {
    case 'image':
    case 'binary':
      return []
    case 'svg':
      return options.showRaw ? plainTextBlocks(root, /\n\s*\n/) : svgBlocks(options.content)
    case 'json':
      return plainTextBlocks(root, /\n/)
    case 'text':
      return PLAIN_LANGUAGES.has(options.language ?? '') ? plainTextBlocks(root, /\n\s*\n/) : commentBlocks(root)
    case 'pdf':
      return pdfBlocks(root)
    case 'excel':
      return excelBlocks(root, options)
    default: {
      if (options.showRaw) return plainTextBlocks(root, /\n\s*\n/)
      const frame = options.type === 'html' ? root.querySelector('iframe') : null
      const body = frame?.contentDocument?.body
      if (frame) return body ? walkBlocks(body, options) : []
      return walkBlocks(root, options)
    }
  }
}

export function blocksToSentences(blocks: RawBlock[]): SpeechSentence[] {
  const sentences: SpeechSentence[] = []
  blocks.forEach((block, blockIndex) => {
    let pieces: { text: string; range: Range | null }[]
    if (block.spoken !== undefined) {
      pieces = [{ text: normalizeForSpeech(block.spoken), range: block.range ?? null }]
    } else {
      const buffer = block.buffer!
      const window = block.window ?? { start: 0, end: buffer.text.length }
      const text = buffer.text.slice(window.start, window.end)
      const clean = (value: string) => normalizeForSpeech(block.kind === 'code' ? stripCommentMarkers(value) : value)
      if (block.kind === 'heading') {
        const leading = text.length - text.trimStart().length
        const trailing = text.length - text.trimEnd().length
        pieces = [{ text: clean(text), range: buffer.rangeFor(window.start + leading, window.end - trailing) }]
      } else {
        pieces = splitSentences(text).map((span) => ({
          text: clean(text.slice(span.start, span.end)),
          range: buffer.rangeFor(window.start + span.start, window.start + span.end),
        }))
      }
    }
    pieces = pieces.filter((piece) => hasSpeakableText(piece.text))
    if (pieces.length === 0) return
    if (block.kind === 'heading') pieces[0].text = withTerminalPunctuation(pieces[0].text)
    if (block.prefix) pieces[0].text = `${block.prefix} ${pieces[0].text}`
    const { preMs, postMs } = pauseFor(block.kind, block.level)
    pieces.forEach((piece, index) => {
      sentences.push({
        text: piece.text,
        range: piece.range,
        blockIndex,
        kind: block.kind,
        preMs: index === 0 ? preMs : 0,
        postMs: index === pieces.length - 1 ? postMs : 0,
      })
    })
  })
  return sentences
}

export function extractSentences(root: HTMLElement, options: ExtractOptions): SpeechSentence[] {
  return blocksToSentences(extractBlocks(root, options))
}
