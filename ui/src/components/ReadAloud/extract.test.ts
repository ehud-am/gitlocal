import { describe, expect, it } from 'vitest'
import { extractSentences, stripCommentMarkers, type ExtractOptions } from './extract'

function mount(html: string): HTMLElement {
  document.body.innerHTML = `<div id="root">${html}</div>`
  return document.getElementById('root')!
}

function read(html: string, options: ExtractOptions) {
  return extractSentences(mount(html), options)
}

const texts = (html: string, options: ExtractOptions) => read(html, options).map((sentence) => sentence.text)

describe('extractSentences: semantic DOM', () => {
  it('reads headings as their own sentences with pauses, then paragraphs', () => {
    const sentences = read('<h1>Intro</h1><p>First sentence. Second one.</p><h3>Next step?</h3>', { type: 'markdown' })
    expect(sentences.map((sentence) => [sentence.kind, sentence.text, sentence.preMs, sentence.postMs])).toEqual([
      ['heading', 'Intro.', 400, 800],
      ['paragraph', 'First sentence.', 0, 0],
      ['paragraph', 'Second one.', 0, 450],
      ['heading', 'Next step?', 300, 600],
    ])
    expect(sentences[1].range?.toString()).toBe('First sentence.')
  })

  it('handles lists, nested lists, quotes, images, line breaks and skipped content', () => {
    expect(texts(
      '<ul><li>One<ul><li>Nested</li></ul>tail</li></ul>'
      + '<blockquote><p>Quoted.</p><p>More.</p></blockquote>'
      + '<p>Line<br>break <img alt="Chart of sales"> end</p><img alt="">'
      + '<pre><code>skipped()</code></pre><button>Skip</button><p aria-hidden="true">Hidden</p>'
      + '<div><span>Loose</span> text</div><div><div><span>Deep</span></div></div>',
      { type: 'markdown' },
    )).toEqual(['One', 'Nested', 'tail', 'Quote. Quoted.', 'More.', 'Line break', 'Image: Chart of sales', 'end', 'Loose text', 'Deep'])
  })

  it('treats role=heading with aria-level as a heading', () => {
    const sentences = read('<p role="heading" aria-level="3">Docx heading</p><p role="heading">No level</p><p>Body.</p>', { type: 'docx' })
    expect(sentences.map((sentence) => [sentence.kind, sentence.preMs])).toEqual([['heading', 300], ['heading', 400], ['paragraph', 0]])
  })

  it('skips docx headers and footers and keeps text inside a block with nested divs', () => {
    expect(texts('<div class="docx-header"><p>Header</p></div><ul><li><span>A</span><div>B</div></li></ul><div class="docx-footer">F</div>', { type: 'docx' }))
      .toEqual(['A B'])
  })

  it('reads table rows with headers, numbered for spreadsheets', () => {
    const html = '<table><thead><tr><th>Name</th><th>Age</th></tr></thead><tbody><tr><td>Ada</td><td>36</td></tr><tr><td></td><td></td></tr><tr><td>Bo</td><td></td></tr></tbody></table>'
    expect(texts(html, { type: 'csv' })).toEqual(['Row 1. Name: Ada. Age: 36.', 'Row 3. Name: Bo.'])
    expect(texts(html, { type: 'markdown' })).toEqual(['Name: Ada. Age: 36.', 'Name: Bo.'])
    expect(texts('<table><tr><td>x</td><td>y</td></tr></table>', { type: 'markdown' })).toEqual(['x. y.'])
  })

  it('reads the selected Excel sheet name as a heading', () => {
    const sentences = read('<div role="tablist"><button role="tab" aria-selected="false">A</button><button role="tab" aria-selected="true">Sales</button></div><table><tbody><tr><td>1</td></tr></tbody></table>', { type: 'excel' })
    expect(sentences.map((sentence) => sentence.text)).toEqual(['Sheet Sales.', 'Row 1. 1.'])
    expect(texts('<table><tbody><tr><td>1</td></tr></tbody></table>', { type: 'excel' })).toEqual(['Row 1. 1.'])
  })

  it('announces slides, reads titles as headings, and prefixes speaker notes', () => {
    const html = '<div data-speech-role="slide" data-speech-slide="2" data-speech-slide-total="5">'
      + '<div data-speech-role="title"><span>Roadmap</span></div><div><p>Ship it.</p></div>'
      + '<div data-speech-role="notes"><h4 data-speech-skip="">Notes</h4><p>Say hello.</p></div></div>'
      + '<div data-speech-skip=""><p>Hidden slide</p></div>'
    const sentences = read(html, { type: 'pptx' })
    expect(sentences.map((sentence) => [sentence.kind, sentence.text])).toEqual([
      ['slide', 'Slide 2 of 5.'],
      ['heading', 'Roadmap.'],
      ['paragraph', 'Ship it.'],
      ['notes', 'Speaker notes. Say hello.'],
    ])
    expect(sentences[0].preMs).toBe(900)
  })

  it('walks the HTML preview frame body', () => {
    const root = mount('<iframe></iframe>')
    const frame = root.querySelector('iframe')!
    frame.contentDocument!.body.innerHTML = '<h2>Page</h2><p>Hi.</p>'
    expect(extractSentences(root, { type: 'html' }).map((sentence) => sentence.text)).toEqual(['Page.', 'Hi.'])
    expect(extractSentences(mount('<p>Inline html</p>'), { type: 'html' }).map((sentence) => sentence.text)).toEqual(['Inline html'])
  })

  it('returns nothing for an HTML frame without a document', () => {
    const root = mount('<iframe></iframe>')
    const frame = root.querySelector('iframe')!
    Object.defineProperty(frame, 'contentDocument', { value: null })
    expect(extractSentences(root, { type: 'html' })).toEqual([])
  })
})

describe('extractSentences: text, code, json, svg, pdf', () => {
  it('reads plain text by paragraph', () => {
    const sentences = read('<pre><code>First para.\nstill first.\n\nSecond para.</code></pre>', { type: 'text', language: '' })
    expect(sentences.map((sentence) => sentence.text)).toEqual(['First para. still first.', 'Second para.'])
    expect(sentences[1].range?.toString()).toBe('Second para.')
  })

  it('reads only comments in code files', () => {
    const html = '<pre><code><span class="hljs-comment">// Adds two numbers.</span>\nfunction add() {}\n<span class="hljs-comment">/* multi\n * line */</span><span class="hljs-comment">//</span></code></pre>'
    expect(texts(html, { type: 'text', language: 'typescript' })).toEqual(['Adds two numbers.', 'multi line'])
    expect(stripCommentMarkers('# note')).toBe(' note')
  })

  it('reads JSON and raw views line by line or by paragraph', () => {
    expect(texts('<pre><code>{\n  "name": "x"\n}</code></pre>', { type: 'json' })).toEqual(['"name": "x"'])
    expect(texts('<pre><code># Title\n\nBody</code></pre>', { type: 'markdown', showRaw: true })).toEqual(['# Title', 'Body'])
  })

  it('reads SVG title, desc and text from the source', () => {
    const content = '<svg xmlns="http://www.w3.org/2000/svg"><title>Logo</title><desc>A mark</desc><text>  </text><text>GitLocal</text></svg>'
    expect(texts('<img alt="">', { type: 'svg', content })).toEqual(['Logo', 'A mark', 'GitLocal'])
    expect(texts('<img alt="">', { type: 'svg' })).toEqual([])
    expect(texts('<pre><code>&lt;svg/&gt;</code></pre>', { type: 'svg', content, showRaw: true })).toEqual(['<svg/>'])
  })

  it('groups PDF text layer lines into paragraphs', () => {
    const span = (top: number, text: string) => `<span style="top: ${top}%">${text}</span>`
    const html = `<div class="textLayer">${span(10, 'First line')}${span(10, 'same line')}${span(12, 'second line.')}${span(14, 'third line.')}${span(30, 'New paragraph.')}<span class="markedContent">${span(5, 'Back up.')}</span></div>`
      + `<div class="textLayer">${span(10, 'Page two.')}<span style="top: 20%"></span></div><div class="textLayer"></div>`
    expect(texts(html, { type: 'pdf' })).toEqual(['First line same line second line. third line.', 'New paragraph.', 'Back up.', 'Page two.'])
    expect(texts(`<div class="textLayer">${span(10, 'Only.')}</div>`, { type: 'pdf' })).toEqual(['Only.'])
  })

  it('reads nothing for images and binary files', () => {
    expect(read('<p>x</p>', { type: 'image' })).toEqual([])
    expect(read('<p>x</p>', { type: 'binary' })).toEqual([])
  })
})
