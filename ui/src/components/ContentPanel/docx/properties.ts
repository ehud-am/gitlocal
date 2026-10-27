// Reads WordprocessingML run (w:rPr) and paragraph (w:pPr) properties into partial layers that
// are merged in Word's order: document defaults, table style, paragraph style chain, numbering
// level, character style, then direct formatting.
import { DEFAULT_SCHEME } from '../pptx/color'
import type { Theme } from '../pptx/theme'
import { resolveTypeface } from '../pptx/theme'
import { attr, child, children, numAttr } from '../pptx/xml'
import type { Border, Borders, RunStyle } from './model'

// w:val on a toggle property: absent or anything but an explicit "off" turns it on.
export function onOff(element: Element | null): boolean | undefined {
  if (!element) return undefined
  const value = attr(element, 'val')
  return value === null || !(value === '0' || value === 'false' || value === 'off')
}

const THEME_COLOR_SLOTS: Record<string, string> = {
  dark1: 'dk1', text1: 'dk1', light1: 'lt1', background1: 'lt1',
  dark2: 'dk2', text2: 'dk2', light2: 'lt2', background2: 'lt2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
  accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hyperlink: 'hlink', followedHyperlink: 'folHlink',
}

function hexChannels(hex: string): [number, number, number] | null {
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number]
}

function channelsToCss(channels: number[]): string {
  return `#${channels.map((value) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0')).join('')}`
}

// A color given as w:val (hex or "auto") or as a theme color with an optional tint or shade
// (hex bytes, FF = unchanged). Returns null for "auto" and anything unreadable.
export function wordColor(element: Element | null, theme: Theme, valueAttr = 'val'): string | null {
  if (!element) return null
  const themeColor = attr(element, valueAttr === 'fill' ? 'themeFill' : 'themeColor')
  let channels: [number, number, number] | null = null
  if (themeColor && THEME_COLOR_SLOTS[themeColor]) {
    const slot = THEME_COLOR_SLOTS[themeColor]
    channels = hexChannels(theme.scheme[slot] ?? DEFAULT_SCHEME[slot])
  }
  if (!channels) {
    const value = attr(element, valueAttr)
    if (!value || value === 'auto') return null
    channels = hexChannels(value)
  }
  if (!channels) return null
  const tint = attr(element, valueAttr === 'fill' ? 'themeFillTint' : 'themeTint')
  const shade = attr(element, valueAttr === 'fill' ? 'themeFillShade' : 'themeShade')
  if (themeColor && tint && /^[0-9a-fA-F]{2}$/.test(tint)) {
    const amount = parseInt(tint, 16) / 255
    return channelsToCss(channels.map((value) => value * amount + 255 * (1 - amount)))
  }
  if (themeColor && shade && /^[0-9a-fA-F]{2}$/.test(shade)) {
    const amount = parseInt(shade, 16) / 255
    return channelsToCss(channels.map((value) => value * amount))
  }
  return channelsToCss(channels)
}

// Cell and paragraph shading: the fill color, or for a solid pattern the pattern color.
export function shadingColor(shd: Element | null, theme: Theme): string | null | undefined {
  if (!shd) return undefined
  const pattern = attr(shd, 'val')
  if (pattern === 'solid') return wordColor(shd, theme, 'color') ?? '#000000'
  if (pattern === 'nil') return null
  return wordColor(shd, theme, 'fill')
}

const HIGHLIGHT: Record<string, string> = {
  yellow: '#ffff00', green: '#00ff00', cyan: '#00ffff', magenta: '#ff00ff', blue: '#0000ff',
  red: '#ff0000', darkBlue: '#000080', darkCyan: '#008080', darkGreen: '#008000',
  darkMagenta: '#800080', darkRed: '#800000', darkYellow: '#808000', darkGray: '#808080',
  lightGray: '#c0c0c0', black: '#000000', white: '#ffffff',
}

const UNDERLINE: Record<string, RunStyle['underline']> = {
  single: 'single', words: 'single', thick: 'single', double: 'double',
  dotted: 'dotted', dottedHeavy: 'dotted', dash: 'dashed', dashedHeavy: 'dashed',
  dashLong: 'dashed', dashLongHeavy: 'dashed', dotDash: 'dashed', dashDotHeavy: 'dashed',
  dotDotDash: 'dashed', dashDotDotHeavy: 'dashed', wave: 'wavy', wavyHeavy: 'wavy',
  wavyDouble: 'wavy', none: 'none',
}

function themeFont(name: string | null, theme: Theme): string | null {
  if (!name) return null
  if (name.startsWith('major')) return resolveTypeface(name === 'majorEastAsia' ? '+mj-ea' : '+mj-lt', theme)
  if (name.startsWith('minor')) return resolveTypeface(name === 'minorEastAsia' ? '+mn-ea' : '+mn-lt', theme)
  return null
}

export function parseRunProps(rPr: Element | null, theme: Theme): RunStyle {
  const style: RunStyle = {}
  if (!rPr) return style
  const set = <K extends keyof RunStyle>(key: K, value: RunStyle[K] | undefined) => {
    if (value !== undefined) style[key] = value
  }
  set('bold', onOff(child(rPr, 'b')))
  set('italic', onOff(child(rPr, 'i')))
  set('strike', onOff(child(rPr, 'strike')))
  set('doubleStrike', onOff(child(rPr, 'dstrike')))
  set('caps', onOff(child(rPr, 'caps')))
  set('smallCaps', onOff(child(rPr, 'smallCaps')))
  set('hidden', onOff(child(rPr, 'vanish')))
  set('rtl', onOff(child(rPr, 'rtl')))

  const underline = child(rPr, 'u')
  if (underline) {
    set('underline', UNDERLINE[attr(underline, 'val') ?? 'single'] ?? 'single')
    set('underlineColor', wordColor(underline, theme, 'color') ?? undefined)
  }
  const color = child(rPr, 'color')
  if (color) style.color = wordColor(color, theme) ?? undefined
  const size = numAttr(child(rPr, 'sz'), 'val')
  if (size !== undefined && size > 0) style.sizePt = size / 2

  const fonts = child(rPr, 'rFonts')
  if (fonts) {
    // A theme font reference takes precedence over the literal name next to it.
    const font = themeFont(attr(fonts, 'asciiTheme'), theme) ?? attr(fonts, 'ascii')
      ?? themeFont(attr(fonts, 'hAnsiTheme'), theme) ?? attr(fonts, 'hAnsi')
    if (font) style.font = font
  }

  const highlight = attr(child(rPr, 'highlight'), 'val')
  if (highlight) style.highlight = highlight === 'none' ? undefined : HIGHLIGHT[highlight]
  const shading = shadingColor(child(rPr, 'shd'), theme)
  if (shading !== undefined) style.shading = shading ?? undefined

  const vertAlign = attr(child(rPr, 'vertAlign'), 'val')
  if (vertAlign === 'superscript' || vertAlign === 'subscript') style.vertAlign = vertAlign
  else if (vertAlign === 'baseline') style.vertAlign = undefined

  const spacing = numAttr(child(rPr, 'spacing'), 'val')
  if (spacing !== undefined) style.letterSpacingPt = spacing / 20
  return style
}

// Later layers win; a key explicitly set to undefined (e.g. highlight "none") clears it.
export function mergeRun(...layers: (RunStyle | undefined)[]): RunStyle {
  const result: RunStyle = {}
  for (const layer of layers) {
    if (!layer) continue
    for (const key of Object.keys(layer) as (keyof RunStyle)[]) {
      ;(result as Record<string, unknown>)[key] = layer[key]
    }
  }
  return result
}

const BORDER_STYLES: Record<string, Border['style']> = {
  single: 'solid', thick: 'solid', double: 'double', triple: 'double', dotted: 'dotted',
  dashed: 'dashed', dashSmallGap: 'dashed', dotDash: 'dashed', dotDotDash: 'dashed',
  thinThickSmallGap: 'double', thickThinSmallGap: 'double', thinThickMediumGap: 'double',
  thickThinMediumGap: 'double', thinThickLargeGap: 'double', thickThinLargeGap: 'double',
}

// A border element (w:top, w:insideH, ...): null means "explicitly none", undefined "not set".
export function parseBorder(element: Element | null, theme: Theme): Border | null | undefined {
  if (!element) return undefined
  const value = attr(element, 'val') ?? 'single'
  if (value === 'nil' || value === 'none') return null
  const style = BORDER_STYLES[value] ?? 'solid'
  const eighths = numAttr(element, 'sz') ?? 4
  const widthPt = Math.max(0.25, eighths / 8)
  return {
    style,
    // A double line needs room for two strokes and a gap to show as double in CSS.
    widthPt: style === 'double' ? Math.max(widthPt, 2.25) : widthPt,
    color: wordColor(element, theme, 'color') ?? '#000000',
    spacePt: numAttr(element, 'space') ?? 0,
  }
}

export function parseBorders(container: Element | null, theme: Theme, names: Record<keyof Borders, string[]>): Borders {
  const borders: Borders = {}
  for (const side of Object.keys(names) as (keyof Borders)[]) {
    for (const name of names[side]) {
      const border = parseBorder(child(container, name), theme)
      if (border !== undefined) {
        borders[side] = border
        break
      }
    }
  }
  return borders
}

export const SIDE_NAMES: Record<keyof Borders, string[]> = {
  top: ['top'], bottom: ['bottom'], left: ['left', 'start'], right: ['right', 'end'],
}

export interface RawTab {
  posTwips: number
  align: 'left' | 'center' | 'right' | 'decimal' | 'clear'
  leader: 'none' | 'dot' | 'hyphen' | 'underscore' | 'middleDot'
}

// Paragraph properties in their raw units (twips), merged before conversion.
export interface ParaProps {
  align?: 'left' | 'center' | 'right' | 'justify'
  indLeft?: number
  indRight?: number
  firstLine?: number
  before?: number
  after?: number
  line?: { rule: 'auto' | 'exact' | 'atLeast'; value: number }
  contextualSpacing?: boolean
  shading?: string | null
  borders?: Borders
  rtl?: boolean
  outlineLevel?: number
  numId?: string
  ilvl?: number
  tabs?: RawTab[]
  pageBreakBefore?: boolean
  markStyle?: RunStyle
}

const ALIGN: Record<string, ParaProps['align']> = {
  left: 'left', start: 'left', center: 'center', right: 'right', end: 'right',
  both: 'justify', distribute: 'justify', mediumKashida: 'justify', highKashida: 'justify',
  lowKashida: 'justify', thaiDistribute: 'justify',
}

const TAB_ALIGN: Record<string, RawTab['align']> = {
  left: 'left', start: 'left', center: 'center', right: 'right', end: 'right',
  decimal: 'decimal', clear: 'clear', bar: 'left', num: 'left',
}

const LEADERS = new Set(['dot', 'hyphen', 'underscore', 'middleDot'])

// "Auto" spacing (HTML-style paragraph spacing, used by documents converted from web pages).
const AUTO_SPACING_TWIPS = 280

export function parseParaProps(pPr: Element | null, theme: Theme): ParaProps {
  const props: ParaProps = {}
  if (!pPr) return props
  const jc = attr(child(pPr, 'jc'), 'val')
  if (jc && ALIGN[jc]) props.align = ALIGN[jc]

  const ind = child(pPr, 'ind')
  if (ind) {
    const left = numAttr(ind, 'left') ?? numAttr(ind, 'start')
    const right = numAttr(ind, 'right') ?? numAttr(ind, 'end')
    if (left !== undefined) props.indLeft = left
    if (right !== undefined) props.indRight = right
    const hanging = numAttr(ind, 'hanging')
    const firstLine = numAttr(ind, 'firstLine')
    if (hanging !== undefined) props.firstLine = -hanging
    else if (firstLine !== undefined) props.firstLine = firstLine
  }

  const spacing = child(pPr, 'spacing')
  if (spacing) {
    const isAuto = (name: string) => {
      const value = attr(spacing, name)
      return value !== null && value !== '0' && value !== 'false' && value !== 'off'
    }
    const before = isAuto('beforeAutospacing') ? AUTO_SPACING_TWIPS : numAttr(spacing, 'before')
    const after = isAuto('afterAutospacing') ? AUTO_SPACING_TWIPS : numAttr(spacing, 'after')
    if (before !== undefined) props.before = before
    if (after !== undefined) props.after = after
    const line = numAttr(spacing, 'line')
    if (line !== undefined && line > 0) {
      const rule = attr(spacing, 'lineRule')
      props.line = { rule: rule === 'exact' || rule === 'atLeast' ? rule : 'auto', value: line }
    }
  }

  const contextual = onOff(child(pPr, 'contextualSpacing'))
  if (contextual !== undefined) props.contextualSpacing = contextual
  const shading = shadingColor(child(pPr, 'shd'), theme)
  if (shading !== undefined) props.shading = shading
  const pBdr = child(pPr, 'pBdr')
  if (pBdr) props.borders = parseBorders(pBdr, theme, SIDE_NAMES)
  const bidi = onOff(child(pPr, 'bidi'))
  if (bidi !== undefined) props.rtl = bidi
  const outline = numAttr(child(pPr, 'outlineLvl'), 'val')
  if (outline !== undefined) props.outlineLevel = outline
  const pageBreak = onOff(child(pPr, 'pageBreakBefore'))
  if (pageBreak !== undefined) props.pageBreakBefore = pageBreak

  const numPr = child(pPr, 'numPr')
  if (numPr) {
    const numId = attr(child(numPr, 'numId'), 'val')
    const ilvl = numAttr(child(numPr, 'ilvl'), 'val')
    if (numId !== null) props.numId = numId
    if (ilvl !== undefined) props.ilvl = ilvl
  }

  const tabs = child(pPr, 'tabs')
  if (tabs) {
    props.tabs = children(tabs, 'tab').flatMap((tab): RawTab[] => {
      const pos = numAttr(tab, 'pos')
      if (pos === undefined) return []
      const leader = attr(tab, 'leader') ?? 'none'
      return [{
        posTwips: pos,
        align: TAB_ALIGN[attr(tab, 'val') ?? 'left'] ?? 'left',
        leader: LEADERS.has(leader) ? leader as RawTab['leader'] : 'none',
      }]
    })
  }

  const markRPr = child(pPr, 'rPr')
  if (markRPr) props.markStyle = parseRunProps(markRPr, theme)
  return props
}

export function mergePara(...layers: (ParaProps | undefined)[]): ParaProps {
  const result: ParaProps = {}
  for (const layer of layers) {
    if (!layer) continue
    for (const key of Object.keys(layer) as (keyof ParaProps)[]) {
      if (key === 'tabs') {
        // Tab stops accumulate; a "clear" stop removes an inherited one at that position.
        const cleared = new Set(layer.tabs?.filter((tab) => tab.align === 'clear').map((tab) => tab.posTwips))
        const inherited = (result.tabs ?? []).filter((tab) => !cleared.has(tab.posTwips))
        result.tabs = [...inherited, ...(layer.tabs ?? []).filter((tab) => tab.align !== 'clear')]
          .sort((a, b) => a.posTwips - b.posTwips)
      } else if (key === 'borders') {
        result.borders = { ...result.borders, ...layer.borders }
      } else if (key === 'markStyle') {
        result.markStyle = mergeRun(result.markStyle, layer.markStyle)
      } else {
        ;(result as Record<string, unknown>)[key] = layer[key]
      }
    }
  }
  return result
}
