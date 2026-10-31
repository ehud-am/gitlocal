// Renders a parsed .docx as flowing HTML: paragraphs, runs, lists, tables, pictures, charts and
// text boxes, with Word's own colors and fonts (independent of the app theme).
import { createContext, useContext, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { toRoman } from '../ooxml/text'
import { cssFontFamily } from '../ooxml/theme'
import { ChartView } from '../pptx/chart-view'
import { SINGLE_LINE, type Block, type Border, type Borders, type Inline, type Link, type ParagraphNode, type RunStyle, type TableCell, type TableNode, type TabStop } from './model'

// Jumps to a bookmark (internal links, table of contents entries) or a note inside the viewer.
export const AnchorJumpContext = createContext<(name: string) => void>(() => {})
// The document's default tab interval, in pixels.
export const DefaultTabContext = createContext(48)

export const noteAnchor = (note: 'footnote' | 'endnote', number: number) => `__gitlocal-${note}-${number}`

const px = (value: number) => `${Math.round(value * 100) / 100}px`
const pt = (value: number) => `${Math.round(value * 100) / 100}pt`

function borderCss(border: Border | null | undefined): string | undefined {
  if (border === undefined) return undefined
  if (border === null) return 'none'
  return `${pt(border.widthPt)} ${border.style} ${border.color}`
}

function borderStyle(borders: Borders): CSSProperties {
  return {
    borderTop: borderCss(borders.top),
    borderBottom: borderCss(borders.bottom),
    borderLeft: borderCss(borders.left),
    borderRight: borderCss(borders.right),
  }
}

const DECORATION_STYLE: Record<string, CSSProperties['textDecorationStyle']> = {
  double: 'double', dotted: 'dotted', dashed: 'dashed', wavy: 'wavy',
}

export function runCss(style: RunStyle): CSSProperties {
  const underline = style.underline && style.underline !== 'none'
  const strike = style.strike || style.doubleStrike
  const lines = [underline ? 'underline' : '', strike ? 'line-through' : ''].filter(Boolean).join(' ')
  const shifted = style.vertAlign !== undefined
  const decorationStyle = underline ? DECORATION_STYLE[style.underline as string] : style.doubleStrike ? 'double' : undefined
  return {
    fontFamily: style.font ? cssFontFamily(style.font) : undefined,
    fontSize: style.sizePt ? pt(shifted ? style.sizePt * 0.65 : style.sizePt) : shifted ? 'smaller' : undefined,
    fontWeight: style.bold === undefined ? undefined : style.bold ? 700 : 400,
    fontStyle: style.italic === undefined ? undefined : style.italic ? 'italic' : 'normal',
    textDecorationLine: lines || undefined,
    textDecorationStyle: decorationStyle,
    textDecorationColor: underline ? style.underlineColor : undefined,
    color: style.color,
    backgroundColor: style.highlight ?? style.shading,
    textTransform: style.caps ? 'uppercase' : undefined,
    fontVariant: style.smallCaps && !style.caps ? 'small-caps' : undefined,
    letterSpacing: style.letterSpacingPt ? pt(style.letterSpacingPt) : undefined,
    verticalAlign: style.vertAlign === 'superscript' ? 'super' : style.vertAlign === 'subscript' ? 'sub' : undefined,
  }
}

function LinkAnchor({ link, children }: { link: Link; children: ReactNode }) {
  const jump = useContext(AnchorJumpContext)
  if (link.kind === 'url') {
    return <a className="docx-link" href={link.href} target="_blank" rel="noopener noreferrer" title={link.href}>{children}</a>
  }
  return (
    <a
      className="docx-link"
      href={`#${link.name}`}
      onClick={(event) => {
        event.preventDefault()
        jump(link.name)
      }}
    >
      {children}
    </a>
  )
}

function withLink(link: Link | null, node: ReactNode): ReactNode {
  return link ? <LinkAnchor link={link}>{node}</LinkAnchor> : node
}

function floatStyle(float: 'left' | 'right' | null): CSSProperties {
  if (!float) return {}
  return float === 'left' ? { float: 'left', margin: '0 12px 6px 0' } : { float: 'right', margin: '0 0 6px 12px' }
}

function ImageView({ inline }: { inline: Extract<Inline, { kind: 'image' }> }) {
  const { image, widthPx, heightPx } = inline
  const width = Math.max(1, widthPx)
  const height = Math.max(1, heightPx)
  const outer: CSSProperties = {
    ...floatStyle(inline.float),
    display: inline.block && !inline.float ? 'block' : 'inline-block',
  }
  if (!image.src) {
    return (
      <span className="docx-image-placeholder" style={{ ...outer, width: px(width), height: px(height) }} role="img" aria-label={inline.alt || 'Picture not available'}>
        Picture not available
      </span>
    )
  }
  const { l, t, r, b } = image.crop
  const cropped = l !== 0 || t !== 0 || r !== 0 || b !== 0
  const filter = image.grayscale ? 'grayscale(1)' : undefined
  const opacity = image.opacity < 1 ? image.opacity : undefined
  if (!cropped) {
    return withLink(inline.link, (
      <img
        className="docx-image"
        src={image.src}
        alt={inline.alt}
        style={{ ...outer, width: px(width), aspectRatio: `${width} / ${height}`, filter, opacity }}
      />
    ))
  }
  const fullWidth = width / Math.max(0.01, 1 - l - r)
  const fullHeight = height / Math.max(0.01, 1 - t - b)
  return withLink(inline.link, (
    <span className="docx-image-crop" style={{ ...outer, width: px(width), height: px(height) }}>
      <img
        className="docx-image"
        src={image.src}
        alt={inline.alt}
        style={{ width: px(fullWidth), height: px(fullHeight), maxWidth: 'none', marginLeft: px(-l * fullWidth), marginTop: px(-t * fullHeight), filter, opacity }}
      />
    </span>
  ))
}

function InlineView({ inline }: { inline: Inline }) {
  switch (inline.kind) {
    case 'text':
      return withLink(inline.link, <span style={runCss(inline.style)}>{inline.text}</span>)
    case 'tab':
      return <span data-docx-tab="" className="docx-tab" style={{ ...runCss(inline.style), display: 'inline-block' }} />
    case 'break':
      if (inline.type === 'page') return <span className="docx-page-break" role="separator" aria-label="Page break" />
      if (inline.type === 'column') return <span className="docx-column-break" />
      return <br />
    case 'image':
      return <ImageView inline={inline} />
    case 'chart': {
      const box = { x: 0, y: 0, w: inline.widthPx, h: inline.heightPx, rot: 0, flipH: false, flipV: false }
      const style: CSSProperties = { ...floatStyle(inline.float), width: px(inline.widthPx), height: px(inline.heightPx) }
      if (!inline.chart) {
        return <span className="docx-image-placeholder" style={{ ...style, display: 'inline-flex' }}>Chart not available</span>
      }
      return (
        <span className="docx-chart" style={style}>
          <ChartView chart={inline.chart} box={box} />
        </span>
      )
    }
    case 'textbox':
      return (
        <div
          className="docx-textbox"
          style={{
            ...floatStyle(inline.float),
            display: inline.widthPx && !inline.float ? 'inline-block' : inline.float ? undefined : 'block',
            width: inline.widthPx ? px(inline.widthPx) : undefined,
            minHeight: inline.heightPx ? px(inline.heightPx) : undefined,
            background: inline.fill ?? undefined,
            border: inline.border ? borderCss(inline.border) : undefined,
          }}
        >
          <BlocksView blocks={inline.blocks} />
        </div>
      )
    case 'noteRef':
      return <NoteRefView inline={inline} />
    case 'bookmark':
      return <span data-docx-anchor={inline.name} />
    case 'placeholder':
      return <span className="docx-object-placeholder">{inline.label}</span>
  }
}

function NoteRefView({ inline }: { inline: Extract<Inline, { kind: 'noteRef' }> }) {
  const jump = useContext(AnchorJumpContext)
  const label = `${inline.note === 'footnote' ? 'Footnote' : 'Endnote'} ${inline.number}`
  return (
    <a
      className="docx-link docx-note-ref"
      href={`#${noteAnchor(inline.note, inline.number)}`}
      aria-label={label}
      title={label}
      style={runCss({ ...inline.style, vertAlign: 'superscript' })}
      onClick={(event) => {
        event.preventDefault()
        jump(noteAnchor(inline.note, inline.number))
      }}
    >
      {inline.note === 'endnote' ? toRoman(inline.number) : inline.number}
    </a>
  )
}

// How far a tab at `x` (px from the paragraph's left edge, which is the page margin) advances:
// to the next custom stop past it, or else to the next default interval. Right and center stops
// end or center the following text (`segmentPx` wide) on the stop; decimal is treated as right.
// A right or center stop past the line's end (`limitPx`, 0 when unknown) is pulled back to it, so
// the text after it stays on the line.
export function docxTabAdvance(x: number, segmentPx: number, stops: TabStop[], defaultTabPx: number, limitPx = 0): { width: number; leader: TabStop['leader'] } {
  const stop = stops.find((candidate) => candidate.posPx > x + 0.5)
  if (!stop) return { width: (Math.floor((x + 0.5) / defaultTabPx) + 1) * defaultTabPx - x, leader: 'none' }
  const posPx = stop.align !== 'left' && limitPx > 0 ? Math.min(stop.posPx, limitPx) : stop.posPx
  // Measured offsets are whole pixels, so text ending on a right stop near the margin keeps a
  // pixel of slack instead of wrapping onto the next line.
  const shift = stop.align === 'left' ? 0 : stop.align === 'center' ? segmentPx / 2 : segmentPx + 1
  return { width: Math.max(0, posPx - x - shift), leader: stop.leader }
}

function useTabLayout(paragraph: ParagraphNode, stops: TabStop[], hasTabs: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  const defaultTabPx = useContext(DefaultTabContext)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !hasTabs) return
    const measure = () => {
      const tabs = Array.from(element.querySelectorAll<HTMLElement>(':scope > [data-docx-tab]'))
      const end = element.querySelector<HTMLElement>(':scope > [data-docx-tab-end]')
      for (const tab of tabs) tab.style.width = '0px'
      const limit = element.clientWidth > 0 ? paragraph.indentLeftPx + element.clientWidth : 0
      tabs.forEach((tab, index) => {
        const next = tabs[index + 1] ?? end
        // offsetLeft is from the paragraph's own edge, which sits at its left indent.
        const x = tab.offsetLeft + paragraph.indentLeftPx
        const segment = next ? Math.max(0, next.offsetLeft - tab.offsetLeft) : 0
        const { width, leader } = docxTabAdvance(x, segment, stops, defaultTabPx, limit)
        tab.style.width = `${width}px`
        tab.dataset.leader = leader
      })
    }
    measure()
    // Text widths change once the document's fonts finish loading.
    let active = true
    void document.fonts?.ready.then(() => {
      if (active) measure()
    })
    return () => {
      active = false
    }
  }, [paragraph, stops, hasTabs, defaultTabPx])
  return ref
}

function lineHeight(paragraph: ParagraphNode): CSSProperties['lineHeight'] {
  const { line } = paragraph
  if (!line) return String(SINGLE_LINE)
  if (line.rule === 'auto') return String(Math.round(line.value * SINGLE_LINE * 1000) / 1000)
  if (line.rule === 'exact') return pt(line.pt)
  return `max(${pt(line.pt)}, ${SINGLE_LINE}em)`
}

function paragraphCss(paragraph: ParagraphNode): CSSProperties {
  const { borders } = paragraph
  const space = (border: Border | null | undefined) => (border ? border.spacePt : 0)
  return {
    ...runCss(paragraph.markStyle),
    // Decorations on the paragraph mark are not drawn across the paragraph.
    textDecorationLine: undefined,
    backgroundColor: paragraph.shading ?? undefined,
    verticalAlign: undefined,
    textAlign: paragraph.align,
    direction: paragraph.rtl ? 'rtl' : undefined,
    marginLeft: px(paragraph.indentLeftPx),
    marginRight: px(paragraph.indentRightPx),
    textIndent: paragraph.firstLinePx ? px(paragraph.firstLinePx) : undefined,
    // Word adds the space after one paragraph and before the next instead of collapsing them, so
    // spacing is padding rather than (collapsing) margin.
    paddingTop: `calc(${pt(paragraph.spaceBeforePt)} + ${pt(space(borders.top))})`,
    paddingBottom: `calc(${pt(paragraph.spaceAfterPt)} + ${pt(space(borders.bottom))})`,
    paddingLeft: borders.left ? pt(space(borders.left)) : undefined,
    paddingRight: borders.right ? pt(space(borders.right)) : undefined,
    lineHeight: lineHeight(paragraph),
    ...borderStyle(borders),
  }
}

function ParagraphView({ paragraph }: { paragraph: ParagraphNode }) {
  const hasTabs = paragraph.inlines.some((inline) => inline.kind === 'tab')
  // A hanging indent acts as a tab stop of its own, which is where a list's text lines up.
  const stops = paragraph.firstLinePx < 0
    ? [...paragraph.tabStops, { posPx: paragraph.indentLeftPx, align: 'left' as const, leader: 'none' as const }].sort((a, b) => a.posPx - b.posPx)
    : paragraph.tabStops
  const ref = useTabLayout(paragraph, stops, hasTabs)
  const visible = paragraph.inlines.some((inline) => inline.kind !== 'bookmark')
  const { marker } = paragraph
  const heading = paragraph.outlineLevel !== null
  return (
    <div
      className="docx-paragraph"
      ref={ref}
      style={hasTabs ? { ...paragraphCss(paragraph), position: 'relative' } : paragraphCss(paragraph)}
      role={heading ? 'heading' : undefined}
      aria-level={heading ? (paragraph.outlineLevel as number) + 1 : undefined}
    >
      {marker ? (
        <span
          className="docx-list-marker"
          aria-hidden="true"
          style={{
            ...runCss(marker.style),
            display: 'inline-block',
            textIndent: 0,
            boxSizing: 'border-box',
            minWidth: marker.suffix === 'tab' && paragraph.firstLinePx < 0 ? px(-paragraph.firstLinePx) : undefined,
            paddingRight: marker.suffix === 'tab' ? '0.35em' : undefined,
          }}
        >
          {marker.suffix === 'space' ? `${marker.text} ` : marker.text}
        </span>
      ) : null}
      {paragraph.inlines.map((inline, index) => <InlineView key={index} inline={inline} />)}
      {hasTabs ? <span data-docx-tab-end="" /> : null}
      {visible || marker ? null : <span>{'​'}</span>}
    </div>
  )
}

function cellCss(cell: TableCell): CSSProperties {
  return {
    ...borderStyle(cell.borders),
    backgroundColor: cell.shading ?? undefined,
    verticalAlign: cell.vAlign,
    padding: `${px(cell.padding.top)} ${px(cell.padding.right)} ${px(cell.padding.bottom)} ${px(cell.padding.left)}`,
    width: cell.widthPx ? px(cell.widthPx) : undefined,
  }
}

function TableView({ table }: { table: TableNode }) {
  const gridWidth = table.columnsPx.reduce((sum, width) => sum + width, 0)
  const fixed = table.columnsPx.length > 0 && gridWidth > 0
  const wrapper: CSSProperties = {
    marginLeft: table.align === 'left' ? px(table.indentPx) : 'auto',
    marginRight: table.align === 'center' ? 'auto' : undefined,
    width: table.widthPx ? px(table.widthPx) : undefined,
  }
  return (
    <div className="docx-table-wrapper" style={wrapper}>
      <table className="docx-table" style={{ width: table.widthPx ? '100%' : undefined, tableLayout: fixed ? 'fixed' : 'auto' }}>
        {fixed ? (
          <colgroup>
            {table.columnsPx.map((width, index) => <col key={index} style={{ width: table.widthPx ? `${(width / gridWidth) * 100}%` : px(width) }} />)}
          </colgroup>
        ) : null}
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ height: row.heightPx ? px(row.heightPx) : undefined }}>
              {row.cells.map((cell, cellIndex) => (
                <td key={cellIndex} colSpan={cell.colSpan > 1 ? cell.colSpan : undefined} rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined} style={cellCss(cell)}>
                  {row.exactHeight && row.heightPx
                    ? <div style={{ maxHeight: px(row.heightPx), overflow: 'hidden' }}><BlocksView blocks={cell.blocks} /></div>
                    : <BlocksView blocks={cell.blocks} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function BlocksView({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, index) => (block.kind === 'paragraph'
        ? <ParagraphView key={index} paragraph={block} />
        : <TableView key={index} table={block} />))}
    </>
  )
}
