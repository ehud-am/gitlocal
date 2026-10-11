import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Box, ChartModel, Line, Paragraph, ShapeNode, SlideModel, SlideNode, TextBody, TextRun } from './model'
import { NodeView, SlideView, TextBodyView } from './render'

const box = (overrides: Partial<Box> = {}): Box => ({ x: 1, y: 2, w: 100, h: 50, rot: 0, flipH: false, flipV: false, ...overrides })
const run = (overrides: Partial<TextRun> = {}): TextRun => ({
  text: 'text', isBreak: false, sizePt: 18, bold: false, italic: false, underline: false, strike: false, color: '#000000',
  fontFamily: 'Arial', baseline: 0, caps: 'none', letterSpacingPt: 0, highlight: null, ...overrides,
})
const paragraph = (overrides: Partial<Paragraph> = {}): Paragraph => ({
  align: 'left', marginLeftPx: 0, indentPx: 0, lineSpacing: { kind: 'pct', value: 1 }, spaceBeforePt: 0, spaceAfterPt: 0,
  bullet: null, runs: [run()], baseSizePt: 18, rtl: false, ...overrides,
})
const body = (overrides: Partial<TextBody> = {}): TextBody => ({
  paragraphs: [paragraph()], insets: { l: 1, t: 2, r: 3, b: 4 }, anchor: 'top', anchorCenter: false, wrap: true,
  vertical: 'horz', fontScale: 1, lineSpacingReduction: 0, ...overrides,
})
const line = (overrides: Partial<Line> = {}): Line => ({ color: '#ff0000', gradient: null, widthPx: 2, dash: null, cap: 'butt', join: 'round', head: null, tail: null, ...overrides })
const shape = (overrides: Partial<ShapeNode> = {}): ShapeNode => ({
  kind: 'shape', box: box(), geometry: { kind: 'preset', name: 'rect', adj: {} }, fill: null, line: null, text: null, textBox: null, shadow: null, ...overrides,
})

function renderNode(node: SlideNode) {
  return render(<NodeView node={node} />).container
}

describe('text rendering', () => {
  it('styles runs', () => {
    const { container } = render(<TextBodyView body={body({
      paragraphs: [paragraph({
        runs: [
          run({ text: 'b', bold: true, italic: true, underline: true, strike: true, caps: 'all', letterSpacingPt: 1, highlight: '#ff0' }),
          run({ text: 'sup', baseline: 30 }),
          run({ text: 'sub', baseline: -25, caps: 'small' }),
          run({ isBreak: true, text: '' }),
        ],
      })],
    })} />)
    const [bold, sup, sub] = Array.from(container.querySelectorAll('.pptx-viewer-run')) as HTMLElement[]
    expect(bold.style).toMatchObject({ fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline line-through', textTransform: 'uppercase', letterSpacing: '1pt', backgroundColor: 'rgb(255, 255, 0)' })
    expect(sup.style).toMatchObject({ verticalAlign: 'super', fontSize: '12.06pt' })
    expect(sub.style).toMatchObject({ verticalAlign: 'sub', fontVariant: 'small-caps' })
    expect(container.querySelector('br')).not.toBeNull()
  })

  it('lays out paragraphs with spacing, indents and bullets', () => {
    const { container } = render(<TextBodyView body={body({
      anchor: 'middle',
      anchorCenter: true,
      wrap: false,
      vertical: 'vert',
      paragraphs: [
        paragraph({ indentPx: -20, marginLeftPx: 20, spaceBeforePt: 6, spaceAfterPt: 3, rtl: true, bullet: { kind: 'char', char: '•', fontFamily: 'Symbol', color: '#00f', sizePct: 0.5 } }),
        paragraph({ spaceBeforePt: 6, lineSpacing: { kind: 'pts', value: 20 }, bullet: { kind: 'number', text: '1.', fontFamily: null, color: null, sizePct: 1 } }),
        paragraph({ runs: [], baseSizePt: 30, bullet: null }),
      ],
    })} />)
    const text = container.querySelector('.pptx-viewer-text') as HTMLElement
    expect(text.style).toMatchObject({ justifyContent: 'center', alignItems: 'center', whiteSpace: 'pre', writingMode: 'vertical-rl' })
    const [first, second, empty] = Array.from(container.querySelectorAll('.pptx-viewer-paragraph')) as HTMLElement[]
    expect(first.style).toMatchObject({ marginTop: '0px', marginBottom: '3pt', paddingLeft: '20px', textIndent: '-20px', direction: 'rtl', lineHeight: '1.2' })
    const bullet = first.querySelector('.pptx-viewer-bullet') as HTMLElement
    expect(bullet.textContent).toBe('•')
    expect(bullet.style).toMatchObject({ minWidth: '20px', fontSize: '9pt', color: 'rgb(0, 0, 255)' })
    expect(second.style.marginTop).toBe('6pt')
    expect(second.style.lineHeight).toBe('20pt')
    expect(second.querySelector('.pptx-viewer-bullet')?.textContent).toBe('1.')
    expect((second.querySelector('.pptx-viewer-bullet') as HTMLElement).style.paddingRight).toBe('0.4em')
    expect((empty.lastElementChild as HTMLElement).style.fontSize).toBe('30pt')
  })

  it('anchors to the bottom and rotates vert270 text', () => {
    const { container } = render(<TextBodyView body={body({ anchor: 'bottom', vertical: 'vert270' })} />)
    expect((container.querySelector('.pptx-viewer-text') as HTMLElement).style).toMatchObject({ justifyContent: 'flex-end', transform: 'rotate(180deg)' })
  })
})

describe('node rendering', () => {
  it('draws a filled, outlined, rotated and flipped shape with text in its own box', () => {
    const container = renderNode(shape({
      box: box({ rot: 30, flipH: true, flipV: true }),
      geometry: { kind: 'preset', name: 'ellipse', adj: {} },
      fill: { type: 'solid', color: '#00ff00' },
      line: line({ dash: '4 2', head: { type: 'oval', width: 3, length: 3 }, tail: { type: 'diamond', width: 3, length: 3 } }),
      shadow: 'drop-shadow(1px 1px 1px black)',
      text: body(),
      textBox: box({ x: 5, y: 6, w: 7, h: 8 }),
    }))
    const outer = container.querySelector('.pptx-viewer-shape') as HTMLElement
    expect(outer.style).toMatchObject({ left: '1px', top: '2px', transform: 'rotate(30deg)', filter: 'drop-shadow(1px 1px 1px black)' })
    expect((outer.firstElementChild as HTMLElement).style.transform).toBe('scale(-1, -1)')
    const fill = container.querySelector('.pptx-viewer-fill') as HTMLElement
    expect(fill.style.backgroundColor).toBe('rgb(0, 255, 0)')
    expect(fill.style.clipPath).toContain('path(evenodd')
    const path = container.querySelector('.pptx-viewer-outline > path') as SVGPathElement
    expect(path.getAttribute('stroke-dasharray')).toBe('4 2')
    expect(path.getAttribute('marker-start')).toMatch(/^url\(#/)
    expect(path.getAttribute('marker-end')).toMatch(/^url\(#/)
    expect(container.querySelectorAll('marker')).toHaveLength(2)
    expect((container.querySelector('.pptx-viewer-text') as HTMLElement).style).toMatchObject({ left: '5px', top: '6px', width: '7px', height: '8px' })
  })

  it('draws every line-end style and gradient outlines', () => {
    for (const type of ['triangle', 'stealth', 'arrow'] as const) {
      const container = renderNode(shape({ geometry: { kind: 'preset', name: 'line', adj: {} }, line: line({ tail: { type, width: 1, length: 1 } }) }))
      expect(container.querySelector('marker')?.firstElementChild).not.toBeNull()
      expect(container.querySelector('.pptx-viewer-fill')).toBeNull()
    }
    const gradient = renderNode(shape({ line: line({ gradient: { angle: 45, stops: [{ offset: 0, color: '#f00' }, { offset: 1, color: '#00f' }] } }) }))
    expect(gradient.querySelectorAll('linearGradient stop')).toHaveLength(2)
    expect(gradient.querySelector('.pptx-viewer-outline > path')?.getAttribute('stroke')).toMatch(/^url\(#/)
  })

  it('omits outlines for paths that are not stroked and clip paths for unfilled geometry', () => {
    const container = renderNode(shape({
      geometry: { kind: 'custom', guides: [], adj: {}, paths: [{ w: null, h: null, fill: false, stroke: false, commands: [{ op: 'M', pts: [['0', '0']] }] }] },
      fill: { type: 'solid', color: '#fff' },
      line: line(),
    }))
    expect(container.querySelector('.pptx-viewer-outline')).toBeNull()
    expect(container.querySelector('.pptx-viewer-fill')).toBeNull()
    const rect = renderNode(shape({ fill: { type: 'solid', color: '#fff' } }))
    expect((rect.querySelector('.pptx-viewer-fill') as HTMLElement).style.clipPath).toBe('')
  })

  it('draws pictures, their outlines and unavailable placeholders', () => {
    const image = { mediaPath: 'a.png', src: 'blob:a', crop: { l: 0, t: 0, r: 0, b: 0 }, opacity: 1, grayscale: false }
    const container = renderNode({ kind: 'picture', box: box({ flipH: true }), geometry: { kind: 'preset', name: 'ellipse', adj: {} }, image, line: line(), shadow: null })
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:a')
    expect(container.querySelector('.pptx-viewer-outline')).not.toBeNull()
    const missing = renderNode({ kind: 'picture', box: box(), geometry: { kind: 'preset', name: 'rect', adj: {} }, image: { ...image, src: null }, line: null, shadow: 'x' })
    expect(missing.textContent).toBe('Image not available in this preview')
  })

  it('draws groups with their transform', () => {
    const container = renderNode({ kind: 'group', box: box({ rot: 10, flipV: true }), children: [shape({ text: body() })] })
    expect((container.querySelector('.pptx-viewer-group') as HTMLElement).style.transform).toBe('rotate(10deg) scale(1, -1)')
    const plain = renderNode({ kind: 'group', box: box(), children: [] })
    expect((plain.querySelector('.pptx-viewer-group') as HTMLElement).style.transform).toBe('')
  })

  it('draws tables with spans, fills, borders and cell text', () => {
    const cell = (overrides = {}) => ({ text: null, fill: null, borders: { left: null, right: null, top: null, bottom: null }, colSpan: 1, rowSpan: 1, merged: false, ...overrides })
    const container = renderNode({
      kind: 'table',
      box: box(),
      columns: [50, 50],
      rows: [
        { heightPx: 20, cells: [cell({ colSpan: 2, rowSpan: 2, fill: { type: 'solid', color: '#abcdef' }, text: body({ anchor: 'middle' }), borders: { left: line(), right: line({ dash: '1 1' }), top: null, bottom: null } }), cell({ merged: true })] },
        { heightPx: 20, cells: [cell({ text: body({ anchor: 'bottom' }) }), cell({ text: body() })] },
      ],
    })
    const cells = Array.from(container.querySelectorAll('td')) as HTMLTableCellElement[]
    expect(cells).toHaveLength(3)
    expect(cells[0].colSpan).toBe(2)
    expect(cells[0].rowSpan).toBe(2)
    expect(cells[0].style.backgroundColor).toBe('rgb(171, 205, 239)')
    expect(cells[0].style.verticalAlign).toBe('middle')
    expect(cells[0].style.borderLeft).toBe('2px solid rgb(255, 0, 0)')
    expect(cells[0].style.borderRight).toBe('2px dashed rgb(255, 0, 0)')
    expect(cells[1].style.verticalAlign).toBe('bottom')
    expect(cells[2].style.verticalAlign).toBe('top')
    expect(container.querySelector('table')?.style.width).toBe('100px')
  })

  it('draws charts and skips charts that could not be read', () => {
    const chart: ChartModel = { type: 'pie', grouping: 'standard', title: null, categories: ['a'], series: [{ name: 's', color: '#f00', values: [1], xValues: null, pointColors: null }], showLegend: false, legendPosition: 'r', textColor: '#000', gridColor: '#ccc' }
    expect(renderNode({ kind: 'chart', box: box(), chart }).querySelector('.pptx-viewer-chart')).not.toBeNull()
    expect(renderNode({ kind: 'chart', box: box(), chart: null }).innerHTML).toBe('')
  })
})

describe('SlideView', () => {
  it('draws the background and nodes in order', () => {
    const slide: SlideModel = { index: 0, background: { type: 'solid', color: '#123456' }, nodes: [shape({ text: body() }), shape({ fill: { type: 'solid', color: '#fff' } })], notes: null }
    const { container } = render(<SlideView slide={slide} widthPx={960} heightPx={540} />)
    expect((container.querySelector('.pptx-viewer-background') as HTMLElement).style.backgroundColor).toBe('rgb(18, 52, 86)')
    expect((container.querySelector('.pptx-viewer-slide-content') as HTMLElement).style).toMatchObject({ width: '960px', height: '540px' })
    expect(container.querySelectorAll('.pptx-viewer-shape')).toHaveLength(2)
  })
})
