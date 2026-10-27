import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ChartModel, ImageRef } from '../pptx/model'
import type { Block, Inline, ParagraphNode, TableNode } from './model'
import { AnchorJumpContext, BlocksView, docxTabAdvance, noteAnchor, runCss } from './render'

function paragraph(inlines: Inline[], overrides: Partial<ParagraphNode> = {}): ParagraphNode {
  return {
    kind: 'paragraph', styleId: null, align: 'left', indentLeftPx: 0, indentRightPx: 0, firstLinePx: 0,
    spaceBeforePt: 0, spaceAfterPt: 0, contextualSpacing: false, line: null, shading: null, borders: {},
    rtl: false, outlineLevel: null, marker: null, inlines, markStyle: {}, tabStops: [], pageBreakBefore: false,
    ...overrides,
  }
}

const text = (value: string, style = {}, link: Inline extends infer T ? T extends { kind: 'text'; link: infer L } ? L : never : never = null): Inline => ({ kind: 'text', text: value, style, link })

const image = (overrides: Partial<ImageRef> = {}): ImageRef => ({ mediaPath: 'm.png', src: 'data:image/png;base64,AA==', crop: { l: 0, t: 0, r: 0, b: 0 }, opacity: 1, grayscale: false, ...overrides })

function renderBlocks(blocks: Block[], jump = vi.fn()) {
  const result = render(
    <AnchorJumpContext.Provider value={jump}>
      <div data-testid="root"><BlocksView blocks={blocks} /></div>
    </AnchorJumpContext.Provider>,
  )
  return { ...result, jump }
}

describe('runCss', () => {
  it('maps run formatting to CSS', () => {
    expect(runCss({})).toEqual(expect.objectContaining({ fontFamily: undefined, fontWeight: undefined, fontStyle: undefined }))
    expect(runCss({ bold: true, italic: false, underline: 'double', underlineColor: '#f00', strike: true, color: '#123456', sizePt: 12, font: 'Calibri', highlight: '#ff0', caps: true, letterSpacingPt: 1 })).toMatchObject({
      fontWeight: 700, fontStyle: 'normal', textDecorationLine: 'underline line-through', textDecorationStyle: 'double',
      textDecorationColor: '#f00', color: '#123456', fontSize: '12pt', backgroundColor: '#ff0', textTransform: 'uppercase', letterSpacing: '1pt',
    })
    expect(runCss({ bold: false, italic: true, underline: 'none', doubleStrike: true, shading: '#eee', smallCaps: true, vertAlign: 'subscript', sizePt: 10 })).toMatchObject({
      fontWeight: 400, fontStyle: 'italic', textDecorationLine: 'line-through', textDecorationStyle: 'double', backgroundColor: '#eee', fontVariant: 'small-caps', verticalAlign: 'sub', fontSize: '6.5pt',
    })
    expect(runCss({ vertAlign: 'superscript' })).toMatchObject({ verticalAlign: 'super', fontSize: 'smaller' })
    expect(runCss({ underline: 'single' }).textDecorationStyle).toBeUndefined()
    expect(runCss({ smallCaps: true, caps: true }).fontVariant).toBeUndefined()
  })
})

describe('docxTabAdvance', () => {
  const stops = [
    { posPx: 100, align: 'left' as const, leader: 'none' as const },
    { posPx: 200, align: 'center' as const, leader: 'dot' as const },
    { posPx: 300, align: 'right' as const, leader: 'hyphen' as const },
  ]
  it('advances to the next stop or default interval', () => {
    expect(docxTabAdvance(10, 20, stops, 48)).toEqual({ width: 90, leader: 'none' })
    expect(docxTabAdvance(120, 40, stops, 48)).toEqual({ width: 60, leader: 'dot' })
    expect(docxTabAdvance(250, 40, stops, 48)).toEqual({ width: 9, leader: 'hyphen' })
    expect(docxTabAdvance(290, 40, stops, 48)).toEqual({ width: 0, leader: 'hyphen' })
    expect(docxTabAdvance(310, 0, stops, 48)).toEqual({ width: 26, leader: 'none' })
  })
})

describe('BlocksView', () => {
  it('renders paragraphs with layout, headings, markers and empty lines', () => {
    renderBlocks([
      paragraph([text('Heading')], { outlineLevel: 1, align: 'center', indentLeftPx: 10, firstLinePx: -20, spaceBeforePt: 6, borders: { top: { style: 'solid', widthPt: 1, color: '#000', spacePt: 2 }, left: null, bottom: undefined }, shading: '#eee', rtl: true, line: { rule: 'auto', value: 2 } }),
      paragraph([text('Item')], { marker: { text: '1.', style: { bold: true }, suffix: 'tab' }, firstLinePx: -24, line: { rule: 'exact', pt: 14 } }),
      paragraph([text('Spaced')], { marker: { text: '•', style: {}, suffix: 'space' }, line: { rule: 'atLeast', pt: 14 } }),
      paragraph([text('Plain marker')], { marker: { text: 'a)', style: {}, suffix: 'nothing' }, borders: { left: { style: 'solid', widthPt: 1, color: '#000', spacePt: 3 }, right: { style: 'solid', widthPt: 1, color: '#000', spacePt: 3 } } }),
      paragraph([{ kind: 'bookmark', name: 'only' }]),
    ])
    const heading = screen.getByRole('heading', { level: 2, name: 'Heading' })
    expect(heading.style.textAlign).toBe('center')
    expect(heading.style.direction).toBe('rtl')
    expect(heading.style.marginLeft).toBe('10px')
    expect(heading.style.textIndent).toBe('-20px')
    expect(heading.style.lineHeight).toBe('2.3')
    expect(heading.style.borderTop).toContain('solid')
    expect(screen.getByText('1.').style.minWidth).toBe('24px')
    expect(screen.getByText('• ', { normalizer: (value) => value })).toBeInTheDocument()
    expect(screen.getByText('a)').style.paddingRight).toBe('')
    const empty = document.querySelector('[data-docx-anchor="only"]')?.parentElement as HTMLElement
    expect(empty.textContent).toBe('​')
    expect(screen.getByText('Item').closest('.docx-paragraph')).toHaveStyle({ lineHeight: '14pt' })
  })

  it('renders links: web links open outside, anchors jump inside the viewer', () => {
    const { jump } = renderBlocks([
      paragraph([text('site', {}, { kind: 'url', href: 'https://gitlocal.dev' }), text('section', {}, { kind: 'anchor', name: 'S2' })]),
    ])
    const web = screen.getByRole('link', { name: 'site' })
    expect(web).toHaveAttribute('href', 'https://gitlocal.dev')
    expect(web).toHaveAttribute('target', '_blank')
    expect(web).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.click(screen.getByRole('link', { name: 'section' }))
    expect(jump).toHaveBeenCalledWith('S2')
  })

  it('renders breaks, tabs, note references and placeholders', () => {
    const { jump } = renderBlocks([
      paragraph([
        text('a'), { kind: 'tab', style: {} }, text('b'),
        { kind: 'break', type: 'line' }, { kind: 'break', type: 'page' }, { kind: 'break', type: 'column' },
        { kind: 'noteRef', note: 'footnote', number: 3, style: {} },
        { kind: 'noteRef', note: 'endnote', number: 4, style: {} },
        { kind: 'placeholder', label: 'SmartArt graphic not available' },
      ], { tabStops: [{ posPx: 200, align: 'right', leader: 'dot' }], firstLinePx: -10, indentLeftPx: 20 }),
    ])
    expect(screen.getByRole('separator', { name: 'Page break' })).toBeInTheDocument()
    expect(document.querySelector('.docx-column-break')).toBeInTheDocument()
    expect(document.querySelector('br')).toBeInTheDocument()
    const tab = document.querySelector<HTMLElement>('[data-docx-tab]')
    expect(tab?.dataset.leader).toBeDefined()
    fireEvent.click(screen.getByRole('link', { name: 'Footnote 3' }))
    expect(jump).toHaveBeenCalledWith(noteAnchor('footnote', 3))
    expect(screen.getByRole('link', { name: 'Endnote 4' })).toHaveTextContent('iv')
    expect(screen.getByText('SmartArt graphic not available')).toBeInTheDocument()
  })

  it('renders pictures: plain, cropped, linked, floating and unavailable', () => {
    renderBlocks([paragraph([
      { kind: 'image', image: image(), widthPx: 100, heightPx: 50, float: null, block: false, alt: 'plain', link: null },
      { kind: 'image', image: image({ crop: { l: 0.1, t: 0.2, r: 0.1, b: 0 }, grayscale: true, opacity: 0.5 }), widthPx: 80, heightPx: 40, float: 'left', block: false, alt: 'cropped', link: { kind: 'url', href: 'https://x.y' } },
      { kind: 'image', image: image(), widthPx: 10, heightPx: 10, float: 'right', block: false, alt: 'right', link: null },
      { kind: 'image', image: image(), widthPx: 10, heightPx: 10, float: null, block: true, alt: 'block', link: null },
      { kind: 'image', image: image({ src: null }), widthPx: 0, heightPx: 0, float: null, block: false, alt: '', link: null },
    ])])
    expect(screen.getByAltText('plain')).toHaveStyle({ width: '100px' })
    const cropped = screen.getByAltText('cropped')
    expect(cropped.style.width).toBe('100px')
    expect(cropped.style.marginLeft).toBe('-10px')
    expect(cropped.style.marginTop).toBe('-10px')
    expect(cropped.style.filter).toBe('grayscale(1)')
    expect(cropped.closest('a')).toHaveAttribute('href', 'https://x.y')
    expect((cropped.parentElement as HTMLElement).style.float).toBe('left')
    expect(screen.getByAltText('right').style.float).toBe('right')
    expect(screen.getByAltText('block').style.display).toBe('block')
    expect(screen.getByRole('img', { name: 'Picture not available' })).toHaveStyle({ width: '1px' })
  })

  it('renders charts, missing charts and text boxes', () => {
    const chart: ChartModel = {
      type: 'column', grouping: 'clustered', title: 'Sales', categories: ['Q1'], series: [{ name: 'S', color: '#000', values: [1], xValues: null, pointColors: null }],
      showLegend: false, legendPosition: 'r', textColor: '#000', gridColor: '#ddd',
    }
    renderBlocks([paragraph([
      { kind: 'chart', chart, widthPx: 200, heightPx: 100, float: 'right' },
      { kind: 'chart', chart: null, widthPx: 50, heightPx: 50, float: null },
      { kind: 'textbox', blocks: [paragraph([text('boxed')])], widthPx: 120, heightPx: 40, float: null, fill: '#fed', border: { style: 'solid', widthPt: 1, color: '#000', spacePt: 0 } },
      { kind: 'textbox', blocks: [paragraph([text('floating box')])], widthPx: null, heightPx: null, float: 'left', fill: null, border: null },
      { kind: 'textbox', blocks: [paragraph([text('wide box')])], widthPx: null, heightPx: null, float: null, fill: null, border: null },
    ])])
    expect(screen.getByRole('img', { name: 'Chart: Sales' })).toBeInTheDocument()
    expect(screen.getByText('Chart not available')).toBeInTheDocument()
    const boxed = screen.getByText('boxed').closest('.docx-textbox') as HTMLElement
    expect(boxed.style.display).toBe('inline-block')
    expect(boxed.style.width).toBe('120px')
    expect(boxed.style.minHeight).toBe('40px')
    expect(boxed.style.border).toContain('solid')
    expect((screen.getByText('floating box').closest('.docx-textbox') as HTMLElement).style.float).toBe('left')
    expect((screen.getByText('wide box').closest('.docx-textbox') as HTMLElement).style.display).toBe('block')
  })

  it('renders tables with spans, borders, shading, padding and row heights', () => {
    const cell = (label: string, overrides = {}) => ({
      blocks: [paragraph([text(label)])], colSpan: 1, rowSpan: 1, widthPx: null, shading: null,
      borders: { top: { style: 'solid' as const, widthPt: 0.5, color: '#000', spacePt: 0 }, left: null }, vAlign: 'top' as const,
      padding: { top: 0, right: 7.2, bottom: 0, left: 7.2 }, ...overrides,
    })
    const table = (overrides: Partial<TableNode>): TableNode => ({
      kind: 'table', columnsPx: [100, 100], widthPx: 200, align: 'left', indentPx: 5,
      rows: [
        { cells: [cell('wide', { colSpan: 2, shading: '#eee', widthPx: 200 })], heightPx: 30, exactHeight: true, header: true },
        { cells: [cell('tall', { rowSpan: 2, vAlign: 'middle' }), cell('x')], heightPx: null, exactHeight: false, header: false },
      ],
      ...overrides,
    })
    renderBlocks([
      table({}),
      table({ align: 'center', widthPx: null }),
      table({ align: 'right', columnsPx: [] }),
    ])
    const tables = document.querySelectorAll('table')
    expect(tables).toHaveLength(3)
    expect(tables[0].style.tableLayout).toBe('fixed')
    expect(tables[0].querySelectorAll('col')[0].style.width).toBe('50%')
    expect(tables[1].querySelectorAll('col')[0].style.width).toBe('100px')
    expect(tables[2].style.tableLayout).toBe('auto')
    expect((tables[0].parentElement as HTMLElement).style.marginLeft).toBe('5px')
    expect((tables[1].parentElement as HTMLElement).style.marginRight).toBe('auto')
    expect((tables[2].parentElement as HTMLElement).style.marginLeft).toBe('auto')
    const wide = screen.getAllByText('wide')[0].closest('td') as HTMLTableCellElement
    expect(wide.colSpan).toBe(2)
    expect(wide.style.backgroundColor).toBe('rgb(238, 238, 238)')
    expect(wide.querySelector('div[style*="overflow"]')).toBeInTheDocument()
    const tall = screen.getAllByText('tall')[0].closest('td') as HTMLTableCellElement
    expect(tall.rowSpan).toBe(2)
    expect(tall.style.verticalAlign).toBe('middle')
    expect((tall.parentElement as HTMLElement).style.height).toBe('')
  })
})
