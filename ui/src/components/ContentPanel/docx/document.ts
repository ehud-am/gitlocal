// Parses a .docx (WordprocessingML) package into a DocumentModel: the body as flowing paragraphs
// and tables grouped into sheets at page and section breaks, with each section's page setup,
// header and footer, plus footnotes and endnotes. Images, charts and text boxes are kept inline
// where the document anchors them.
import { parseChart } from '../pptx/chart'
import { DEFAULT_CLR_MAP, resolveColor, toCss } from '../pptx/color'
import { MediaRegistry, type PartScope } from '../pptx/fill'
import { loadMedia } from '../pptx/media'
import { openPackage, type OpcPackage } from '../pptx/package'
import { DEFAULT_THEME, loadTheme, type Theme } from '../pptx/theme'
import { attr, child, children, numAttr, path, relAttr } from '../pptx/xml'
import {
  EMU_PER_PX,
  TWIPS_PER_PX,
  type Block,
  type Border,
  type Borders,
  type DocumentModel,
  type Inline,
  type Link,
  type Note,
  type PageSetup,
  type ParagraphNode,
  type RunStyle,
  type Sheet,
  type TableCell,
  type TableNode,
  type TableRow,
  type TabStop,
} from './model'
import { loadNumbering, type Numbering } from './numbering'
import { mergePara, mergeRun, parseBorders, parseParaProps, parseRunProps, shadingColor, SIDE_NAMES, type ParaProps } from './properties'
import { loadStyles, type StyleSheet, type TableRegionStyle } from './styles'

interface Field {
  instr: string
  phase: 'instr' | 'result'
  link: Link | null
}

interface NoteState {
  numbers: Map<string, number>
  order: string[]
}

interface Context {
  pkg: OpcPackage
  theme: Theme
  styles: StyleSheet
  numbering: Numbering
  media: MediaRegistry
  partPath: string
  defaultTabPx: number
  contentWidthPx: number
  fields: Field[]
  footnotes: NoteState
  endnotes: NoteState
  // The number shown by w:footnoteRef/w:endnoteRef while a note's own text is parsed.
  currentNote: number | null
  // Formatting a table style contributes to the paragraphs of the cell being parsed.
  tableLayer: { para: ParaProps; run: RunStyle } | null
}

const px = (twips: number | undefined, fallback = 0) => (twips ?? fallback) / TWIPS_PER_PX

// Only links that leave the app for a web page or a mail client are followed.
export function safeHref(target: string | null | undefined): string | null {
  if (!target) return null
  const trimmed = target.trim()
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null
}

// The content of an mc:AlternateContent block: a Choice in a namespace this preview reads, or
// else the Fallback (VML for older readers).
const UNDERSTOOD_PREFIXES = new Set(['wps', 'wpg', 'wp14', 'w14', 'w15', 'a14', 'wpc', 'c14'])

function alternateContent(element: Element): Element[] {
  for (const choice of children(element, 'Choice')) {
    const requires = (attr(choice, 'Requires') ?? '').split(/\s+/).filter(Boolean)
    if (requires.every((prefix) => UNDERSTOOD_PREFIXES.has(prefix))) return children(choice)
  }
  return children(child(element, 'Fallback'))
}

// Children with content-control, custom-XML and alternate-content wrappers flattened away.
function flatten(container: Element | null): Element[] {
  return children(container).flatMap((element): Element[] => {
    switch (element.localName) {
      case 'sdt': return flatten(child(element, 'sdtContent'))
      case 'customXml': case 'smartTag': return flatten(element)
      case 'AlternateContent': return alternateContent(element).flatMap((chosen) => (chosen.localName === 'sdt' ? flatten(child(chosen, 'sdtContent')) : [chosen]))
      default: return [element]
    }
  })
}

function relTarget(ctx: Context, id: string | null): { target: string; external: boolean } | null {
  if (!id) return null
  const rel = ctx.pkg.rels(ctx.partPath).get(id)
  return rel ? { target: rel.target, external: rel.external } : null
}

function hyperlinkFromInstr(instr: string): Link | null {
  const match = /^\s*HYPERLINK\s+(.*)$/i.exec(instr)
  if (!match) return null
  const args = match[1]
  const quoted = (text: string) => /^"([^"]*)"/.exec(text.trim())?.[1] ?? text.trim().split(/\s+/)[0] ?? ''
  const anchor = /\\l\s+("[^"]*"|\S+)/.exec(args)
  if (anchor) return { kind: 'anchor', name: quoted(anchor[1]) }
  const href = safeHref(quoted(args.replace(/\\[a-z]\s+("[^"]*"|\S+)/gi, '')))
  return href ? { kind: 'url', href } : null
}

function mathText(element: Element): string {
  return Array.from(element.getElementsByTagNameNS('*', 't'))
    .filter((t) => t.namespaceURI?.includes('math'))
    .map((t) => t.textContent ?? '')
    .join('')
}

// -- Drawings ------------------------------------------------------------------------------------

function floatFromAnchor(anchor: Element, ctx: Context): { float: 'left' | 'right' | null; block: boolean } {
  const wrap = children(anchor).find((element) => element.localName.startsWith('wrap'))
  if (!wrap || wrap.localName === 'wrapNone' || wrap.localName === 'wrapTopAndBottom') return { float: null, block: true }
  const wrapText = attr(wrap, 'wrapText')
  if (wrapText === 'left') return { float: 'right', block: false }
  if (wrapText === 'right') return { float: 'left', block: false }
  const positionH = child(anchor, 'positionH')
  const align = child(positionH, 'align')?.textContent?.trim()
  if (align === 'right' || align === 'outside') return { float: 'right', block: false }
  if (align === 'center') return { float: null, block: true }
  const offset = Number(child(positionH, 'posOffset')?.textContent ?? '0') / EMU_PER_PX
  return { float: offset > ctx.contentWidthPx / 2 ? 'right' : 'left', block: false }
}

function pictureInline(pic: Element, widthPx: number, heightPx: number, ctx: Context, placement: { float: 'left' | 'right' | null; block: boolean }, alt: string, link: Link | null): Inline | null {
  const blipFill = child(pic, 'blipFill')
  const blip = child(blipFill, 'blip')
  const rel = relTarget(ctx, relAttr(blip, 'embed'))
  if (!rel || rel.external) return { kind: 'placeholder', label: 'Linked picture not available' }
  const image = ctx.media.create(rel.target, blip, child(blipFill, 'srcRect'))
  return { kind: 'image', image, widthPx, heightPx, alt, link, ...placement }
}

function colorScope(ctx: Context) {
  return { scheme: ctx.theme.scheme, clrMap: DEFAULT_CLR_MAP }
}

function shapeInline(wsp: Element, widthPx: number | null, heightPx: number | null, ctx: Context, float: 'left' | 'right' | null): Inline | null {
  const spPr = child(wsp, 'spPr')
  const solid = child(spPr, 'solidFill')
  const fillColor = solid ? resolveColor(solid, colorScope(ctx)) : null
  const ln = child(spPr, 'ln')
  const lineColor = child(ln, 'noFill') ? null : resolveColor(child(ln, 'solidFill'), colorScope(ctx))
  const border: Border | null = lineColor
    ? { style: 'solid', widthPt: Math.max(0.5, (numAttr(ln, 'w') ?? 9525) / 12700), color: toCss(lineColor), spacePt: 0 }
    : null
  const content = path(wsp, 'txbx', 'txbxContent')
  const blocks = content ? parseBlocks(content, ctx) : []
  if (blocks.length === 0 && !fillColor && !border) return null
  return { kind: 'textbox', blocks, widthPx, heightPx, float, fill: fillColor ? toCss(fillColor) : null, border }
}

function groupInlines(group: Element, scale: { x: number; y: number }, ctx: Context): Inline[] {
  const result: Inline[] = []
  for (const element of flatten(group)) {
    const ext = path(element, element.localName === 'grpSp' ? 'grpSpPr' : 'spPr', 'xfrm', 'ext')
    const width = ((numAttr(ext, 'cx') ?? 0) / EMU_PER_PX) * scale.x
    const height = ((numAttr(ext, 'cy') ?? 0) / EMU_PER_PX) * scale.y
    if (element.localName === 'pic') {
      const inline = pictureInline(element, width, height, ctx, { float: null, block: true }, '', null)
      if (inline) result.push(inline)
    } else if (element.localName === 'wsp') {
      const inline = shapeInline(element, width || null, height || null, ctx, null)
      if (inline) result.push(inline)
    } else if (element.localName === 'grpSp') {
      result.push(...groupInlines(element, scale, ctx))
    }
  }
  return result
}

function parseDrawing(drawing: Element, ctx: Context): Inline[] {
  const container = child(drawing, 'inline') ?? child(drawing, 'anchor')
  if (!container) return []
  const docPr = child(container, 'docPr')
  if (attr(docPr, 'hidden') === '1' || attr(docPr, 'hidden') === 'true') return []
  const extent = child(container, 'extent')
  const widthPx = (numAttr(extent, 'cx') ?? 0) / EMU_PER_PX
  const heightPx = (numAttr(extent, 'cy') ?? 0) / EMU_PER_PX
  const placement = container.localName === 'anchor' ? floatFromAnchor(container, ctx) : { float: null, block: false }
  const alt = attr(docPr, 'descr') || attr(docPr, 'title') || ''
  const clickRel = relTarget(ctx, relAttr(child(docPr, 'hlinkClick'), 'id'))
  const clickHref = clickRel?.external ? safeHref(clickRel.target) : null
  const link: Link | null = clickHref ? { kind: 'url', href: clickHref } : null

  const graphicData = path(container, 'graphic', 'graphicData')
  const content = flatten(graphicData)[0]
  if (!content) return []
  switch (content.localName) {
    case 'pic': {
      const inline = pictureInline(content, widthPx, heightPx, ctx, placement, alt, link)
      return inline ? [inline] : []
    }
    case 'chart': {
      const rel = relTarget(ctx, relAttr(content, 'id'))
      const chartSpace = rel && !rel.external ? ctx.pkg.xml(rel.target) : null
      const scope: PartScope = { pkg: ctx.pkg, partPath: rel?.target ?? ctx.partPath, colors: colorScope(ctx), theme: ctx.theme, media: ctx.media }
      const chart = chartSpace ? parseChart(chartSpace, scope) : null
      return [{ kind: 'chart', chart, widthPx, heightPx, float: placement.float }]
    }
    case 'wsp': {
      const inline = shapeInline(content, widthPx, heightPx, ctx, placement.float)
      return inline ? [inline] : []
    }
    case 'wgp': {
      const chExt = path(content, 'grpSpPr', 'xfrm', 'chExt')
      const scale = {
        x: numAttr(chExt, 'cx') ? (numAttr(extent, 'cx') ?? 0) / (numAttr(chExt, 'cx') as number) : 1,
        y: numAttr(chExt, 'cy') ? (numAttr(extent, 'cy') ?? 0) / (numAttr(chExt, 'cy') as number) : 1,
      }
      return groupInlines(content, scale, ctx)
    }
    case 'relIds': return [{ kind: 'placeholder', label: 'SmartArt graphic not available' }]
    default: return [{ kind: 'placeholder', label: 'Embedded object not available' }]
  }
}

// VML (w:pict, w:object): older documents and the fallback of newer shapes and text boxes.
function cssLengthPx(value: string | undefined): number | null {
  if (!value) return null
  const match = /^(-?[\d.]+)(pt|in|px|cm|mm)?$/.exec(value.trim())
  if (!match) return null
  const amount = Number(match[1])
  const factor = { pt: 96 / 72, in: 96, px: 1, cm: 96 / 2.54, mm: 96 / 25.4 }[match[2] ?? 'px'] ?? 1
  return amount * factor
}

function vmlStyle(element: Element): Record<string, string> {
  const result: Record<string, string> = {}
  for (const declaration of (attr(element, 'style') ?? '').split(';')) {
    const [name, ...rest] = declaration.split(':')
    if (name && rest.length > 0) result[name.trim().toLowerCase()] = rest.join(':').trim()
  }
  return result
}

function parseVml(container: Element, ctx: Context): Inline[] {
  const result: Inline[] = []
  for (const element of children(container)) {
    if (element.localName === 'group') {
      result.push(...parseVml(element, ctx))
      continue
    }
    const style = vmlStyle(element)
    if (style.visibility === 'hidden') continue
    const width = cssLengthPx(style.width)
    const height = cssLengthPx(style.height)
    const horizontal = style['mso-position-horizontal']
    const float = style.position === 'absolute' ? (horizontal === 'right' ? 'right' : horizontal === 'center' ? null : 'left') : null
    const imagedata = child(element, 'imagedata')
    const textbox = child(element, 'textbox')
    if (imagedata) {
      const rel = relTarget(ctx, relAttr(imagedata, 'id'))
      if (rel && !rel.external) {
        const image = ctx.media.create(rel.target, null, null)
        result.push({ kind: 'image', image, widthPx: width ?? 96, heightPx: height ?? 96, float, block: false, alt: attr(element, 'alt') ?? '', link: null })
      }
    } else if (textbox) {
      const blocks = parseBlocks(child(textbox, 'txbxContent'), ctx)
      if (blocks.length > 0) {
        const fill = attr(element, 'filled') === 'f' ? null : attr(element, 'fillcolor')
        result.push({ kind: 'textbox', blocks, widthPx: width, heightPx: null, float, fill: fill && /^#[0-9a-f]{6}$/i.test(fill) ? fill : null, border: null })
      }
    }
  }
  return result
}

// -- Paragraphs ----------------------------------------------------------------------------------

function fieldVisible(ctx: Context): boolean {
  return ctx.fields.every((field) => field.phase === 'result')
}

function fieldLink(ctx: Context): Link | null {
  for (let index = ctx.fields.length - 1; index >= 0; index -= 1) {
    if (ctx.fields[index].link) return ctx.fields[index].link
  }
  return null
}

function noteNumber(state: NoteState, id: string): number {
  const existing = state.numbers.get(id)
  if (existing !== undefined) return existing
  const number = state.order.length + 1
  state.numbers.set(id, number)
  state.order.push(id)
  return number
}

class InlineBuilder {
  readonly inlines: Inline[] = []

  text(text: string, style: RunStyle, link: Link | null): void {
    if (!text) return
    const last = this.inlines[this.inlines.length - 1]
    if (last?.kind === 'text' && last.style === style && last.link === link) last.text += text
    else this.inlines.push({ kind: 'text', text, style, link })
  }

  push(...inlines: Inline[]): void {
    this.inlines.push(...inlines)
  }
}

function parseRun(run: Element, base: RunStyle, link: Link | null, ctx: Context, out: InlineBuilder): void {
  const rPr = child(run, 'rPr')
  const style = mergeRun(base, ctx.styles.character(attr(child(rPr, 'rStyle'), 'val')), parseRunProps(rPr, ctx.theme))
  const elements = children(run).flatMap((element) => (element.localName === 'AlternateContent' ? alternateContent(element) : [element]))
  for (const element of elements) {
    // Field codes are tracked even inside hidden runs, so the field structure stays balanced.
    if (element.localName === 'fldChar') {
      const type = attr(element, 'fldCharType')
      if (type === 'begin') ctx.fields.push({ instr: '', phase: 'instr', link: null })
      else if (type === 'separate') {
        const field = ctx.fields[ctx.fields.length - 1]
        if (field) {
          field.phase = 'result'
          field.link = hyperlinkFromInstr(field.instr)
        }
      } else if (type === 'end') ctx.fields.pop()
      continue
    }
    if (element.localName === 'instrText') {
      const field = ctx.fields[ctx.fields.length - 1]
      if (field?.phase === 'instr') field.instr += element.textContent ?? ''
      continue
    }
    if (style.hidden || !fieldVisible(ctx)) continue
    const effectiveLink = fieldLink(ctx) ?? link
    switch (element.localName) {
      case 't': out.text(element.textContent ?? '', style, effectiveLink); break
      case 'tab': case 'ptab': out.push({ kind: 'tab', style }); break
      case 'br': {
        const type = attr(element, 'type')
        out.push({ kind: 'break', type: type === 'page' ? 'page' : type === 'column' ? 'column' : 'line' })
        break
      }
      case 'cr': out.push({ kind: 'break', type: 'line' }); break
      case 'noBreakHyphen': out.text('‑', style, effectiveLink); break
      case 'softHyphen': out.text('­', style, effectiveLink); break
      case 'sym': {
        const code = parseInt(attr(element, 'char') ?? '', 16)
        if (Number.isFinite(code)) {
          const font = attr(element, 'font') ?? undefined
          // Symbol-font characters are often stored in the private use area (F000-F0FF).
          const char = String.fromCharCode(code >= 0xf000 && code <= 0xf0ff ? code - 0xf000 : code)
          out.push({ kind: 'text', text: char, style: { ...style, font }, link: effectiveLink })
        }
        break
      }
      case 'drawing': out.push(...parseDrawing(element, ctx)); break
      case 'pict': case 'object': out.push(...parseVml(element, ctx)); break
      case 'footnoteReference': case 'endnoteReference': {
        const id = attr(element, 'id')
        if (id === null) break
        const note = element.localName === 'footnoteReference' ? 'footnote' : 'endnote'
        const number = noteNumber(note === 'footnote' ? ctx.footnotes : ctx.endnotes, id)
        out.push({ kind: 'noteRef', note, number, style })
        break
      }
      case 'footnoteRef': case 'endnoteRef':
        if (ctx.currentNote !== null) out.text(String(ctx.currentNote), style, null)
        break
      default: break
    }
  }
}

function parseInlineContent(container: Element, base: RunStyle, link: Link | null, ctx: Context, out: InlineBuilder): void {
  for (const element of children(container)) {
    switch (element.localName) {
      case 'r': parseRun(element, base, link, ctx, out); break
      case 'hyperlink': {
        const anchor = attr(element, 'anchor')
        const rel = relTarget(ctx, relAttr(element, 'id'))
        const href = rel?.external ? safeHref(rel.target) : null
        const target: Link | null = href ? { kind: 'url', href } : anchor ? { kind: 'anchor', name: anchor } : null
        parseInlineContent(element, base, target ?? link, ctx, out)
        break
      }
      case 'fldSimple': {
        const fieldLinkTarget = hyperlinkFromInstr(attr(element, 'instr') ?? '')
        parseInlineContent(element, base, fieldLinkTarget ?? link, ctx, out)
        break
      }
      case 'ins': case 'moveTo': case 'smartTag': case 'customXml': case 'dir': case 'bdo':
        parseInlineContent(element, base, link, ctx, out)
        break
      case 'sdt': parseInlineContent(child(element, 'sdtContent') ?? element, base, link, ctx, out); break
      case 'AlternateContent':
        for (const chosen of alternateContent(element)) {
          if (chosen.localName === 'r') parseRun(chosen, base, link, ctx, out)
        }
        break
      case 'bookmarkStart': {
        const name = attr(element, 'name')
        if (name && fieldVisible(ctx)) out.push({ kind: 'bookmark', name })
        break
      }
      case 'oMath': case 'oMathPara': {
        const text = mathText(element)
        if (text && fieldVisible(ctx)) out.push({ kind: 'text', text, style: { ...base, italic: true, font: 'Cambria Math' }, link })
        break
      }
      default: break // w:del, w:moveFrom (deleted text), comments, proofing marks, ...
    }
  }
}

function tabStops(props: ParaProps): TabStop[] {
  return (props.tabs ?? []).map((tab) => ({
    posPx: tab.posTwips / TWIPS_PER_PX,
    align: tab.align === 'clear' ? 'left' : tab.align,
    leader: tab.leader,
  }))
}

function parseParagraph(p: Element, ctx: Context): ParagraphNode {
  const pPr = child(p, 'pPr')
  const direct = parseParaProps(pPr, ctx.theme)
  const style = ctx.styles.paragraph(attr(child(pPr, 'pStyle'), 'val'))
  const defaults = ctx.styles.defaults
  const withoutNumbering = mergePara(defaults.para, ctx.tableLayer?.para, style.para, direct)
  const numId = withoutNumbering.numId
  const label = numId ? ctx.numbering.next(numId, withoutNumbering.ilvl ?? 0) : null
  const props = label ? mergePara(defaults.para, ctx.tableLayer?.para, style.para, label.para, direct) : withoutNumbering

  const runBase = mergeRun(defaults.run, ctx.tableLayer?.run, style.run)
  const markStyle = mergeRun(runBase, props.markStyle)
  const out = new InlineBuilder()
  parseInlineContent(p, runBase, null, ctx, out)

  let line: ParagraphNode['line'] = null
  if (props.line) {
    line = props.line.rule === 'auto'
      ? { rule: 'auto', value: props.line.value / 240 }
      : { rule: props.line.rule, pt: props.line.value / 20 }
  }
  return {
    kind: 'paragraph',
    styleId: style.styleId,
    align: props.align ?? 'left',
    indentLeftPx: px(props.indLeft),
    indentRightPx: px(props.indRight),
    firstLinePx: px(props.firstLine),
    spaceBeforePt: (props.before ?? 0) / 20,
    spaceAfterPt: (props.after ?? 0) / 20,
    contextualSpacing: props.contextualSpacing ?? false,
    line,
    shading: props.shading ?? null,
    borders: props.borders ?? {},
    rtl: props.rtl ?? false,
    outlineLevel: props.outlineLevel !== undefined && props.outlineLevel < 9 ? props.outlineLevel : null,
    marker: label && label.text ? { text: label.text, style: mergeRun(markStyle, label.run), suffix: label.suffix } : null,
    inlines: out.inlines,
    markStyle,
    tabStops: tabStops(props),
    pageBreakBefore: props.pageBreakBefore ?? false,
  }
}

// -- Tables --------------------------------------------------------------------------------------

interface TableLook {
  firstRow: boolean
  lastRow: boolean
  firstColumn: boolean
  lastColumn: boolean
  noHBand: boolean
  noVBand: boolean
}

function parseLook(element: Element | null): TableLook {
  const hex = parseInt(attr(element, 'val') ?? '04A0', 16)
  const flag = (name: string, bit: number) => {
    const value = attr(element, name)
    return value !== null ? value === '1' || value === 'true' : (hex & bit) !== 0
  }
  return {
    firstRow: flag('firstRow', 0x20),
    lastRow: flag('lastRow', 0x40),
    firstColumn: flag('firstColumn', 0x80),
    lastColumn: flag('lastColumn', 0x100),
    noHBand: flag('noHBand', 0x200),
    noVBand: flag('noVBand', 0x400),
  }
}

// The last of several property containers that defines `name` (later containers win).
function lastChild(containers: (Element | null)[], name: string): Element | null {
  for (let index = containers.length - 1; index >= 0; index -= 1) {
    const found = child(containers[index], name)
    if (found) return found
  }
  return null
}

function widthPx(element: Element | null, referencePx: number): number | null {
  if (!element) return null
  const type = attr(element, 'type') ?? 'dxa'
  const raw = attr(element, 'w') ?? ''
  if (type === 'pct' || raw.endsWith('%')) {
    const percent = raw.endsWith('%') ? Number(raw.slice(0, -1)) : Number(raw) / 50
    return Number.isFinite(percent) && percent > 0 ? (referencePx * percent) / 100 : null
  }
  if (type !== 'dxa') return null
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value / TWIPS_PER_PX : null
}

const ALL_BORDER_NAMES = { top: ['top'], bottom: ['bottom'], left: ['left', 'start'], right: ['right', 'end'], insideH: ['insideH'], insideV: ['insideV'] }

type FullBorders = Borders & { insideH?: Border | null; insideV?: Border | null }

function readBorders(container: Element | null, theme: Theme): FullBorders {
  return parseBorders(container, theme, ALL_BORDER_NAMES as Record<keyof Borders, string[]>) as FullBorders
}

function mergeBorders(...layers: FullBorders[]): FullBorders {
  return Object.assign({}, ...layers) as FullBorders
}

interface CellPosition {
  row: number
  col: number
  colSpan: number
  rows: number
  cols: number
}

// Which edges of a region a cell sits on decides whether the region's outer or inside border
// applies there. Row regions span the full width; column regions the full height.
function regionEdges(region: string, borders: FullBorders, at: CellPosition): Borders {
  const firstCol = at.col === 0
  const lastCol = at.col + at.colSpan >= at.cols
  const firstRow = at.row === 0
  const lastRow = at.row === at.rows - 1
  const isRowRegion = region === 'firstRow' || region === 'lastRow' || region.endsWith('Horz')
  const isColumnRegion = region === 'firstCol' || region === 'lastCol' || region.endsWith('Vert')
  const isCorner = region.endsWith('Cell')
  const pick = (outer: Border | null | undefined, inside: Border | null | undefined, onEdge: boolean) => (onEdge ? outer : inside)
  return {
    top: isRowRegion || isCorner ? borders.top : pick(borders.top, borders.insideH, firstRow),
    bottom: isRowRegion || isCorner ? borders.bottom : pick(borders.bottom, borders.insideH, lastRow),
    left: isColumnRegion || isCorner ? borders.left : pick(borders.left, borders.insideV, firstCol),
    right: isColumnRegion || isCorner ? borders.right : pick(borders.right, borders.insideV, lastCol),
  }
}

function definedBorders(borders: Borders): Borders {
  const result: Borders = {}
  for (const side of ['top', 'bottom', 'left', 'right'] as const) {
    if (borders[side] !== undefined) result[side] = borders[side]
  }
  return result
}

function regionsFor(at: CellPosition, look: TableLook, bodyRowIndex: number, available: Map<string, TableRegionStyle>): string[] {
  const regions = ['wholeTable']
  if (!look.noVBand) regions.push(at.col % 2 === 0 ? 'band1Vert' : 'band2Vert')
  if (!look.noHBand && bodyRowIndex >= 0) regions.push(bodyRowIndex % 2 === 0 ? 'band1Horz' : 'band2Horz')
  const firstCol = look.firstColumn && at.col === 0
  const lastCol = look.lastColumn && at.col + at.colSpan >= at.cols
  const firstRow = look.firstRow && at.row === 0
  const lastRow = look.lastRow && at.row === at.rows - 1 && at.rows > 1
  if (firstCol) regions.push('firstCol')
  if (lastCol) regions.push('lastCol')
  if (firstRow) regions.push('firstRow')
  if (lastRow) regions.push('lastRow')
  if (firstRow && firstCol) regions.push('nwCell')
  if (firstRow && lastCol) regions.push('neCell')
  if (lastRow && firstCol) regions.push('swCell')
  if (lastRow && lastCol) regions.push('seCell')
  return regions.filter((region) => available.has(region))
}

function flattenRows(tbl: Element): Element[] {
  return flatten(tbl).filter((element) => element.localName === 'tr')
}

function flattenCells(tr: Element): Element[] {
  return flatten(tr).filter((element) => element.localName === 'tc')
}

function vMergeOf(tc: Element): 'restart' | 'continue' | null {
  const vMerge = path(tc, 'tcPr', 'vMerge')
  if (!vMerge) return null
  return attr(vMerge, 'val') === 'restart' ? 'restart' : 'continue'
}

function parseTable(tbl: Element, ctx: Context): TableNode {
  const tblPr = child(tbl, 'tblPr')
  const regionStyles = ctx.styles.table(attr(child(tblPr, 'tblStyle'), 'val'))
  const whole = regionStyles.get('wholeTable')
  const tblPrs = [...(whole?.tblPr ?? []), tblPr]
  const look = parseLook(child(tblPr, 'tblLook'))
  const tableBorders = mergeBorders(...tblPrs.map((element) => readBorders(child(element, 'tblBorders'), ctx.theme)))

  const margins = [...tblPrs.map((element) => child(element, 'tblCellMar'))]
  const margin = (names: string[], fallback: number) => {
    for (let index = margins.length - 1; index >= 0; index -= 1) {
      for (const name of names) {
        const value = widthPx(child(margins[index], name), 0)
        if (value !== null || child(margins[index], name)) return value ?? 0
      }
    }
    return fallback / TWIPS_PER_PX
  }
  const defaultPadding = {
    top: margin(['top'], 0),
    bottom: margin(['bottom'], 0),
    left: margin(['left', 'start'], 108),
    right: margin(['right', 'end'], 108),
  }

  const columnsPx = children(child(tbl, 'tblGrid'), 'gridCol').map((col) => px(numAttr(col, 'w')))
  const rowElements = flattenRows(tbl)
  const rowCount = rowElements.length

  // Grid positions first, so vertical merges can be matched by column.
  const layout = rowElements.map((tr) => {
    let col = numAttr(child(child(tr, 'trPr'), 'gridBefore'), 'val') ?? 0
    return flattenCells(tr).map((tc) => {
      const span = Math.max(1, numAttr(path(tc, 'tcPr', 'gridSpan'), 'val') ?? 1)
      const entry = { tc, col, span, merge: vMergeOf(tc) }
      col += span
      return entry
    })
  })
  const gridCols = Math.max(columnsPx.length, ...layout.map((row) => row.reduce((sum, cell) => Math.max(sum, cell.col + cell.span), 0)))

  let bodyRow = -1
  const rows: TableRow[] = rowElements.map((tr, rowIndex) => {
    const trPr = child(tr, 'trPr')
    const header = child(trPr, 'tblHeader') !== null && attr(child(trPr, 'tblHeader'), 'val') !== '0'
    if (!(look.firstRow && rowIndex === 0)) bodyRow += 1
    const height = child(trPr, 'trHeight')
    const cells: TableCell[] = []
    const before = numAttr(child(trPr, 'gridBefore'), 'val') ?? 0
    if (before > 0) cells.push(emptyCell(before))
    for (const entry of layout[rowIndex]) {
      if (entry.merge === 'continue') continue
      let rowSpan = 1
      if (entry.merge === 'restart') {
        for (let next = rowIndex + 1; next < rowCount; next += 1) {
          const below = layout[next].find((candidate) => candidate.col === entry.col)
          if (below?.merge !== 'continue') break
          rowSpan += 1
        }
      }
      const at: CellPosition = { row: rowIndex, col: entry.col, colSpan: entry.span, rows: rowCount, cols: gridCols }
      const regions = regionsFor(at, look, look.firstRow && rowIndex === 0 ? -1 : bodyRow, regionStyles)
      cells.push(parseCell(entry.tc, entry.span, rowSpan, at, regions, regionStyles, tableBorders, defaultPadding, ctx))
    }
    return {
      cells,
      heightPx: height ? px(numAttr(height, 'val')) || null : null,
      exactHeight: attr(height, 'hRule') === 'exact',
      header,
    }
  })

  const jc = attr(lastChild(tblPrs, 'jc'), 'val')
  const gridWidth = columnsPx.reduce((sum, width) => sum + width, 0)
  return {
    kind: 'table',
    columnsPx,
    widthPx: widthPx(lastChild(tblPrs, 'tblW'), ctx.contentWidthPx) ?? (gridWidth > 0 ? gridWidth : null),
    align: jc === 'center' ? 'center' : jc === 'right' || jc === 'end' ? 'right' : 'left',
    indentPx: widthPx(lastChild(tblPrs, 'tblInd'), ctx.contentWidthPx) ?? 0,
    rows,
  }
}

function emptyCell(colSpan: number): TableCell {
  return { blocks: [], colSpan, rowSpan: 1, widthPx: null, shading: null, borders: { top: null, bottom: null, left: null, right: null }, vAlign: 'top', padding: { top: 0, right: 0, bottom: 0, left: 0 } }
}

function parseCell(
  tc: Element,
  colSpan: number,
  rowSpan: number,
  at: CellPosition,
  regions: string[],
  regionStyles: Map<string, TableRegionStyle>,
  tableBorders: FullBorders,
  defaultPadding: TableCell['padding'],
  ctx: Context,
): TableCell {
  const tcPr = child(tc, 'tcPr')
  const styles = regions.map((region) => regionStyles.get(region) as TableRegionStyle)

  let borders: Borders = definedBorders(regionEdges('wholeTable', tableBorders, at))
  let shading: string | null = null
  styles.forEach((style, index) => {
    for (const element of style.tcPr) {
      borders = { ...borders, ...definedBorders(regionEdges(regions[index], readBorders(child(element, 'tcBorders'), ctx.theme), at)) }
      const shd = shadingColor(child(element, 'shd'), ctx.theme)
      if (shd !== undefined) shading = shd
    }
  })
  borders = { ...borders, ...definedBorders(parseBorders(child(tcPr, 'tcBorders'), ctx.theme, SIDE_NAMES)) }
  const directShading = shadingColor(child(tcPr, 'shd'), ctx.theme)
  if (directShading !== undefined) shading = directShading

  const tcMar = child(tcPr, 'tcMar')
  const pad = (names: string[], fallback: number) => {
    for (const name of names) {
      const value = widthPx(child(tcMar, name), 0)
      if (value !== null || child(tcMar, name)) return value ?? 0
    }
    return fallback
  }
  const vAlign = attr(child(tcPr, 'vAlign'), 'val')
  const layer = {
    para: mergePara(...styles.map((style) => style.para)),
    run: mergeRun(...styles.map((style) => style.run)),
  }
  const blocks = parseBlocks(tc, { ...ctx, tableLayer: layer })
  return {
    blocks,
    colSpan,
    rowSpan,
    widthPx: widthPx(child(tcPr, 'tcW'), ctx.contentWidthPx),
    shading,
    borders,
    vAlign: vAlign === 'center' ? 'middle' : vAlign === 'bottom' ? 'bottom' : 'top',
    padding: {
      top: pad(['top'], defaultPadding.top),
      right: pad(['right', 'end'], defaultPadding.right),
      bottom: pad(['bottom'], defaultPadding.bottom),
      left: pad(['left', 'start'], defaultPadding.left),
    },
  }
}

// -- Blocks and sections -------------------------------------------------------------------------

// Word drops the space between paragraphs of the same style when they ask for contextual spacing.
function applyContextualSpacing(blocks: Block[]): Block[] {
  for (let index = 1; index < blocks.length; index += 1) {
    const previous = blocks[index - 1]
    const current = blocks[index]
    if (previous.kind !== 'paragraph' || current.kind !== 'paragraph' || previous.styleId !== current.styleId) continue
    if (current.contextualSpacing) current.spaceBeforePt = 0
    if (previous.contextualSpacing) previous.spaceAfterPt = 0
  }
  return blocks
}

function blocksFrom(elements: Element[], ctx: Context): Block[] {
  const blocks: Block[] = []
  for (const element of elements) {
    if (element.localName === 'p') blocks.push(parseParagraph(element, ctx))
    else if (element.localName === 'tbl') blocks.push(parseTable(element, { ...ctx, tableLayer: null }))
  }
  return applyContextualSpacing(blocks)
}

function parseBlocks(container: Element | null, ctx: Context): Block[] {
  return blocksFrom(flatten(container), ctx)
}

interface Section {
  sectPr: Element | null
  blocks: Block[]
}

// A section ends with the paragraph whose properties carry its w:sectPr; the last section's
// properties are the body's own w:sectPr.
function parseBody(body: Element, ctx: Context): Section[] {
  const sections: Section[] = []
  let current: Element[] = []
  for (const element of flatten(body)) {
    if (element.localName === 'sectPr') continue
    current.push(element)
    const sectPr = element.localName === 'p' ? path(element, 'pPr', 'sectPr') : null
    if (sectPr) {
      sections.push({ sectPr, blocks: blocksFrom(current, ctx) })
      current = []
    }
  }
  sections.push({ sectPr: child(body, 'sectPr'), blocks: blocksFrom(current, ctx) })
  return sections
}

function pageSetup(sectPr: Element | null): PageSetup {
  const size = child(sectPr, 'pgSz')
  const margin = child(sectPr, 'pgMar')
  const cols = child(sectPr, 'cols')
  return {
    widthPx: px(numAttr(size, 'w'), 12240),
    heightPx: px(numAttr(size, 'h'), 15840),
    margin: {
      top: Math.abs(px(numAttr(margin, 'top'), 1440)),
      right: px(numAttr(margin, 'right'), 1440),
      bottom: Math.abs(px(numAttr(margin, 'bottom'), 1440)),
      left: px(numAttr(margin, 'left'), 1440) + px(numAttr(margin, 'gutter')),
    },
    headerPx: px(numAttr(margin, 'header'), 720),
    footerPx: px(numAttr(margin, 'footer'), 720),
    columns: { count: Math.max(1, numAttr(cols, 'num') ?? 1), gapPx: px(numAttr(cols, 'space'), 720) },
  }
}

type HeaderRefs = Record<'default' | 'first', string | null>

function headerRefs(sectPr: Element | null, name: 'headerReference' | 'footerReference', inherited: HeaderRefs, ctx: Context): HeaderRefs {
  const result = { ...inherited }
  for (const reference of children(sectPr, name)) {
    const type = attr(reference, 'type') ?? 'default'
    const rel = relTarget(ctx, relAttr(reference, 'id'))
    if ((type === 'default' || type === 'first') && rel && !rel.external) result[type] = rel.target
  }
  return result
}

// Splits paragraphs at page breaks that start or end them; breaks in the middle of a paragraph
// stay inline and show as a separator line.
function leadingBreak(paragraph: ParagraphNode): boolean {
  const index = paragraph.inlines.findIndex((inline) => inline.kind !== 'bookmark')
  if (index < 0 || paragraph.inlines[index].kind !== 'break' || (paragraph.inlines[index] as { type: string }).type !== 'page') return false
  paragraph.inlines.splice(index, 1)
  return true
}

function trailingBreak(paragraph: ParagraphNode): boolean {
  let index = paragraph.inlines.length - 1
  while (index >= 0 && paragraph.inlines[index].kind === 'bookmark') index -= 1
  const last = paragraph.inlines[index]
  if (!last || last.kind !== 'break' || last.type !== 'page') return false
  paragraph.inlines.splice(index, 1)
  return true
}

function buildSheets(sections: Section[], ctx: Context): Sheet[] {
  const sheets: Sheet[] = []
  const partCache = new Map<string, Block[]>()
  const part = (partPath: string | null): Block[] | null => {
    if (!partPath) return null
    const cached = partCache.get(partPath)
    if (cached) return cached
    const blocks = parseBlocks(ctx.pkg.xml(partPath), { ...ctx, partPath, fields: [], tableLayer: null })
    partCache.set(partPath, blocks)
    return blocks
  }

  let headers: HeaderRefs = { default: null, first: null }
  let footers: HeaderRefs = { default: null, first: null }
  sections.forEach((section, sectionIndex) => {
    const page = pageSetup(section.sectPr)
    headers = headerRefs(section.sectPr, 'headerReference', headers, ctx)
    footers = headerRefs(section.sectPr, 'footerReference', footers, ctx)
    const titlePage = child(section.sectPr, 'titlePg') !== null && attr(child(section.sectPr, 'titlePg'), 'val') !== '0'
    const continuous = sectionIndex > 0 && attr(child(section.sectPr, 'type'), 'val') === 'continuous'

    let firstSheetOfSection = true
    const startSheet = () => {
      const which = firstSheetOfSection && titlePage ? 'first' : 'default'
      firstSheetOfSection = false
      const sheet: Sheet = { page, header: part(headers[which]), footer: part(footers[which]), groups: [{ columns: page.columns, blocks: [] }] }
      sheets.push(sheet)
      return sheet
    }
    let sheet: Sheet
    if (continuous && sheets.length > 0) {
      sheet = sheets[sheets.length - 1]
      sheet.groups.push({ columns: page.columns, blocks: [] })
      firstSheetOfSection = false
    } else {
      sheet = startSheet()
    }
    const blocksOf = () => sheet.groups[sheet.groups.length - 1].blocks
    const hasContent = () => sheet.groups.some((group) => group.blocks.length > 0)

    for (const block of section.blocks) {
      if (block.kind === 'paragraph' && (leadingBreak(block) || block.pageBreakBefore) && hasContent()) {
        sheet = startSheet()
      }
      blocksOf().push(block)
      if (block.kind === 'paragraph' && trailingBreak(block)) sheet = startSheet()
    }
  })
  // A trailing hard break leaves an empty last sheet behind.
  if (sheets.length > 1 && sheets[sheets.length - 1].groups.every((group) => group.blocks.length === 0)) sheets.pop()
  return sheets
}

function parseNotes(partPath: string | undefined, kind: 'footnote' | 'endnote', state: NoteState, ctx: Context): Note[] {
  if (!partPath) return []
  const root = ctx.pkg.xml(partPath)
  const byId = new Map<string, Element>()
  for (const note of children(root, kind)) {
    const id = attr(note, 'id')
    if (id !== null) byId.set(id, note)
  }
  const notes: Note[] = []
  // Notes can reference further notes, which are appended to the order while it is walked.
  for (let index = 0; index < state.order.length; index += 1) {
    const element = byId.get(state.order[index])
    const number = index + 1
    if (!element) continue
    notes.push({ number, blocks: parseBlocks(element, { ...ctx, partPath, fields: [], tableLayer: null, currentNote: number }) })
  }
  return notes
}

export async function parseDocument(bytes: Uint8Array): Promise<DocumentModel> {
  const pkg = await openPackage(bytes)
  const main = pkg.relByType('', '/officeDocument')
  const documentPath = main && !main.external ? main.target : 'word/document.xml'
  const root = pkg.xml(documentPath)
  const body = child(root, 'body')
  if (!root || root.localName !== 'document' || !body) throw new Error('Not a Word document')

  const themeRel = pkg.relByType(documentPath, '/theme')
  const theme = themeRel ? loadTheme(pkg, themeRel.target) : DEFAULT_THEME
  const stylesRel = pkg.relByType(documentPath, '/styles')
  const stylesRoot = stylesRel ? pkg.xml(stylesRel.target) : null
  const styles = loadStyles(stylesRoot, theme)
  const numberingRel = pkg.relByType(documentPath, '/numbering')
  const numbering = loadNumbering(numberingRel ? pkg.xml(numberingRel.target) : null, stylesRoot, theme)
  const settingsRel = pkg.relByType(documentPath, '/settings')
  const defaultTab = numAttr(child(settingsRel ? pkg.xml(settingsRel.target) : null, 'defaultTabStop'), 'val')

  const finalPage = pageSetup(child(body, 'sectPr'))
  const ctx: Context = {
    pkg,
    theme,
    styles,
    numbering,
    media: new MediaRegistry(),
    partPath: documentPath,
    defaultTabPx: defaultTab && defaultTab > 0 ? defaultTab / TWIPS_PER_PX : 48,
    contentWidthPx: Math.max(96, finalPage.widthPx - finalPage.margin.left - finalPage.margin.right),
    fields: [],
    footnotes: { numbers: new Map(), order: [] },
    endnotes: { numbers: new Map(), order: [] },
    currentNote: null,
    tableLayer: null,
  }

  const sheets = buildSheets(parseBody(body, ctx), ctx)
  const footnotes = parseNotes(pkg.relByType(documentPath, '/footnotes')?.target, 'footnote', ctx.footnotes, ctx)
  const endnotes = parseNotes(pkg.relByType(documentPath, '/endnotes')?.target, 'endnote', ctx.endnotes, ctx)
  const objectUrls = await loadMedia(pkg, ctx.media.refs)
  return { sheets, footnotes, endnotes, defaultTabPx: ctx.defaultTabPx, objectUrls }
}
