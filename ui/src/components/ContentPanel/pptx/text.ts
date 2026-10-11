import { resolveColor, toCss } from './color'
import type { PartScope } from './fill'
import type { Bullet, Paragraph, TextBody, TextRun } from './model'
import { EMU_PER_PX } from './model'
import { cssFontFamily, resolveTypeface } from './theme'
import { attr, child, children, numAttr } from './xml'

// Where a text body's formatting can come from, highest priority first. Text formatting in OOXML
// is inherited level by level: a paragraph at outline level N takes each property from the first
// of its own a:pPr, the shape's a:lstStyle lvlNpPr, the matching layout and master placeholders'
// lstStyles, the master's title/body/other text style, and finally the presentation default.
export interface TextStyleChain {
  // The shape's own lstStyle first; inherited placeholder/master/presentation lstStyles after it.
  lstStyles: (Element | null)[]
  // a:bodyPr from the shape, then from the layout and master placeholders it inherits from.
  bodyPrs: (Element | null)[]
  // p:style > a:fontRef: a shape style's text color/font, below the shape's own lstStyle.
  fontRef: Element | null
  // A table style's bold setting for the cell (a:tcTxStyle @b), at the same priority as fontRef.
  bold?: boolean
}

export interface TextContext {
  scope: PartScope
  slideNumber: number
}

const DEFAULT_SIZE_PT = 18
const BULLET_ELEMENTS = new Set(['buNone', 'buChar', 'buAutoNum', 'buBlip'])
const FILL_ELEMENTS = new Set(['solidFill', 'gradFill', 'noFill', 'pattFill', 'blipFill'])

function first<T>(sources: (Element | null)[], read: (element: Element) => T | undefined | null): T | undefined {
  for (const source of sources) {
    if (!source) continue
    const value = read(source)
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function spacingPt(element: Element | null, sizePt: number): number | undefined {
  if (!element) return undefined
  const points = numAttr(child(element, 'spcPts'), 'val')
  if (points !== undefined) return points / 100
  const percent = numAttr(child(element, 'spcPct'), 'val')
  if (percent !== undefined) return (percent / 100000) * sizePt * 1.2
  return undefined
}

const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]

function toRoman(value: number): string {
  let remaining = value
  let result = ''
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      result += numeral
      remaining -= amount
    }
  }
  return result
}

function toAlpha(value: number): string {
  let remaining = value
  let result = ''
  while (remaining > 0) {
    const index = (remaining - 1) % 26
    result = String.fromCharCode(97 + index) + result
    remaining = Math.floor((remaining - 1) / 26)
  }
  return result
}

// Formats an a:buAutoNum scheme (e.g. "arabicPeriod", "alphaUcParenR", "romanLcParenBoth").
export function formatAutoNumber(scheme: string, value: number): string {
  let label: string
  if (scheme.startsWith('alphaLc')) label = toAlpha(value)
  else if (scheme.startsWith('alphaUc')) label = toAlpha(value).toUpperCase()
  else if (scheme.startsWith('romanLc')) label = toRoman(value)
  else if (scheme.startsWith('romanUc')) label = toRoman(value).toUpperCase()
  else label = String(value)
  if (scheme.endsWith('ParenBoth')) return `(${label})`
  if (scheme.endsWith('ParenR')) return `${label})`
  if (scheme.endsWith('Plain')) return label
  return `${label}.`
}

interface RunSources {
  // Ordered rPr-like elements: the run's own a:rPr, then each level's a:defRPr.
  rPrs: (Element | null)[]
  // Index in rPrs before which the shape style's fontRef is consulted.
  fontRefAt: number
}

function runColor(sources: RunSources, chain: TextStyleChain, context: TextContext): string {
  const { scope } = context
  const fromElement = (element: Element) => {
    const fill = children(element).find((candidate) => FILL_ELEMENTS.has(candidate.localName))
    if (!fill) return undefined
    if (fill.localName === 'noFill') return 'transparent'
    const colorHost = fill.localName === 'gradFill' ? child(child(fill, 'gsLst'), 'gs') : fill.localName === 'pattFill' ? child(fill, 'fgClr') : fill
    const color = resolveColor(colorHost, scope.colors)
    return color ? toCss(color) : undefined
  }
  const before = first(sources.rPrs.slice(0, sources.fontRefAt), fromElement)
  if (before) return before
  const fontRefColor = chain.fontRef ? resolveColor(chain.fontRef, scope.colors) : null
  if (fontRefColor) return toCss(fontRefColor)
  const after = first(sources.rPrs.slice(sources.fontRefAt), fromElement)
  if (after) return after
  // Nothing set the color: PowerPoint's default text color is the theme's tx1.
  return `#${scope.colors.scheme[scope.colors.clrMap.tx1 ?? 'dk1'] ?? '000000'}`.toLowerCase()
}

function runFont(sources: RunSources, chain: TextStyleChain, context: TextContext): string {
  const theme = context.scope.theme
  const typeface = (script: string) => (element: Element) => {
    const value = attr(child(element, script), 'typeface')
    return value ? resolveTypeface(value, theme) : undefined
  }
  const fontRefFace = (() => {
    const idx = attr(chain.fontRef, 'idx')
    if (idx === 'major') return theme.fonts.majorLatin
    if (idx === 'minor') return theme.fonts.minorLatin
    return undefined
  })()
  const latin = first(sources.rPrs.slice(0, sources.fontRefAt), typeface('latin'))
    ?? fontRefFace
    ?? first(sources.rPrs.slice(sources.fontRefAt), typeface('latin'))
    ?? theme.fonts.minorLatin
  const eastAsian = first(sources.rPrs, typeface('ea'))
  const family = cssFontFamily(latin)
  return eastAsian && eastAsian !== latin ? family.replace(/^("[^"]*")/, `$1, "${eastAsian.replace(/"/g, '')}"`) : family
}

const isOn = (value: string | undefined) => value === '1' || value === 'true' || value === 'on'

function parseRun(
  text: string,
  isBreak: boolean,
  sources: RunSources,
  chain: TextStyleChain,
  context: TextContext,
  fontScale: number,
): TextRun {
  const rPrs = sources.rPrs
  const size = first(rPrs, (element) => numAttr(element, 'sz'))
  const underline = first(rPrs, (element) => attr(element, 'u'))
  const strike = first(rPrs, (element) => attr(element, 'strike'))
  const cap = first(rPrs, (element) => attr(element, 'cap'))
  const highlight = first(rPrs, (element) => {
    const color = resolveColor(child(element, 'highlight'), context.scope.colors)
    return color ? toCss(color) : undefined
  })
  return {
    text,
    isBreak,
    sizePt: ((size ?? DEFAULT_SIZE_PT * 100) / 100) * fontScale,
    bold: isOn(first(rPrs.slice(0, sources.fontRefAt), (element) => attr(element, 'b'))
      ?? (chain.bold === undefined ? undefined : String(chain.bold))
      ?? first(rPrs.slice(sources.fontRefAt), (element) => attr(element, 'b'))),
    italic: isOn(first(rPrs, (element) => attr(element, 'i'))),
    underline: underline !== undefined && underline !== 'none',
    strike: strike !== undefined && strike !== 'noStrike',
    color: runColor(sources, chain, context),
    fontFamily: runFont(sources, chain, context),
    baseline: (first(rPrs, (element) => numAttr(element, 'baseline')) ?? 0) / 1000,
    caps: cap === 'all' ? 'all' : cap === 'small' ? 'small' : 'none',
    letterSpacingPt: (first(rPrs, (element) => numAttr(element, 'spc')) ?? 0) / 100,
    highlight: highlight ?? null,
  }
}

function parseBullet(
  levelSources: (Element | null)[],
  sizePt: number,
  autoNumberValue: () => number,
  context: TextContext,
): Bullet | null {
  const bulletElement = first(levelSources, (element) => children(element).find((candidate) => BULLET_ELEMENTS.has(candidate.localName)))
  if (!bulletElement || bulletElement.localName === 'buNone' || bulletElement.localName === 'buBlip') return null
  const { scope } = context
  const fontFamily = first(levelSources, (element) => {
    if (child(element, 'buFontTx')) return null
    const face = attr(child(element, 'buFont'), 'typeface')
    return face ? cssFontFamily(resolveTypeface(face, scope.theme)) : undefined
  }) ?? null
  const color = first(levelSources, (element) => {
    if (child(element, 'buClrTx')) return null
    const resolved = resolveColor(child(element, 'buClr'), scope.colors)
    return resolved ? toCss(resolved) : undefined
  }) ?? null
  const sizePct = first(levelSources, (element) => {
    if (child(element, 'buSzTx')) return 1
    const pct = numAttr(child(element, 'buSzPct'), 'val')
    if (pct !== undefined) return pct / 100000
    const pts = numAttr(child(element, 'buSzPts'), 'val')
    return pts !== undefined && sizePt > 0 ? pts / 100 / sizePt : undefined
  }) ?? 1
  if (bulletElement.localName === 'buChar') {
    const face = first(levelSources, (element) => (child(element, 'buFontTx') ? null : attr(child(element, 'buFont'), 'typeface') ?? undefined)) ?? null
    const char = attr(bulletElement, 'char') ?? '•'
    const symbol = symbolBullet(face, char)
    return symbol
      ? { kind: 'char', char: symbol, fontFamily: null, color, sizePct }
      : { kind: 'char', char, fontFamily, color, sizePct }
  }
  const scheme = attr(bulletElement, 'type') ?? 'arabicPeriod'
  return { kind: 'number', text: formatAutoNumber(scheme, autoNumberValue()), fontFamily, color, sizePct }
}

// Bullets set in the Wingdings or Symbol fonts store a character code whose glyph only exists in
// that font, which most machines (and the macOS app) don't have. The common ones are mapped to the
// Unicode character they draw.
const SYMBOL_FONT_BULLETS: Record<string, Record<string, string>> = {
  wingdings: {
    l: '●', n: '■', q: '❑', u: '◆', v: '❖', o: '□', p: '◻', w: '⬥', '§': '▪', Ø: '➢', ü: '✔',
    à: '➔', è: '➔', Ÿ: '•', '¨': '◻',
  },
  symbol: { '·': '•', Ø: '¬', Ö: '√', '-': '–', '¾': '—' },
}

export function symbolBullet(typeface: string | null, char: string): string | null {
  const family = typeface?.toLowerCase() ?? ''
  // Wingdings 2/3 and Webdings use other glyph layouts; a plain bullet beats a wrong symbol.
  if (/^(wingdings \d|webdings)$/.test(family)) return '•'
  const table = SYMBOL_FONT_BULLETS[family]
  if (!table) return null
  // Symbol fonts are often addressed through the U+F0xx private-use range.
  const code = char.codePointAt(0) ?? 0
  const normalized = code >= 0xf020 && code <= 0xf0ff ? String.fromCharCode(code - 0xf000) : char
  return table[normalized] ?? '•'
}

const ALIGN: Record<string, Paragraph['align']> = { l: 'left', ctr: 'center', r: 'right', just: 'justify', dist: 'justify', justLow: 'justify', thaiDist: 'justify' }

// Builds the render model for an a:txBody / p:txBody. Returns null when the body has no visible
// text, so empty placeholders (which PowerPoint only shows while editing) draw nothing.
export function parseTextBody(txBody: Element | null, chain: TextStyleChain, context: TextContext): TextBody | null {
  if (!txBody) return null
  const bodyPrs = [child(txBody, 'bodyPr'), ...chain.bodyPrs]
  const lstStyles = [child(txBody, 'lstStyle'), ...chain.lstStyles]

  const autofitSource = first(bodyPrs, (element) => children(element).find((candidate) => ['normAutofit', 'spAutoFit', 'noAutofit'].includes(candidate.localName)))
  const normAutofit = autofitSource?.localName === 'normAutofit' ? autofitSource : null
  const fontScale = (numAttr(normAutofit, 'fontScale') ?? 100000) / 100000
  const lineSpacingReduction = (numAttr(normAutofit, 'lnSpcReduction') ?? 0) / 100000

  const autoNumberCounters = new Map<number, number>()
  const paragraphs: Paragraph[] = []
  let hasText = false

  for (const paragraph of children(txBody, 'p')) {
    const pPr = child(paragraph, 'pPr')
    const level = Math.min(8, Math.max(0, numAttr(pPr, 'lvl') ?? 0))
    // Each list style's level entry, followed by its defPPr (defaults for every level).
    const levelStyles = lstStyles.flatMap((lstStyle) => [child(lstStyle, `lvl${level + 1}pPr`), child(lstStyle, 'defPPr')])
    const levelSources = [pPr, ...levelStyles]
    // The paragraph's own a:pPr/a:defRPr comes first: generated decks often format runs only there.
    const defRPrs = [child(pPr, 'defRPr'), ...levelStyles.map((style) => child(style, 'defRPr'))]
    // fontRef sits right after the run's own properties, the paragraph defaults and the shape's
    // own lstStyle entries.
    const fontRefAt = 4

    const runs: TextRun[] = []
    for (const element of children(paragraph)) {
      if (element.localName === 'r' || element.localName === 'fld') {
        let text = child(element, 't')?.textContent ?? ''
        if (element.localName === 'fld' && attr(element, 'type') === 'slidenum') text = String(context.slideNumber)
        if (text.length === 0) continue
        const sources = { rPrs: [child(element, 'rPr'), ...defRPrs], fontRefAt }
        runs.push(parseRun(text, false, sources, chain, context, fontScale))
      } else if (element.localName === 'br') {
        const sources = { rPrs: [child(element, 'rPr'), ...defRPrs], fontRefAt }
        runs.push(parseRun('', true, sources, chain, context, fontScale))
      }
    }
    if (runs.some((run) => run.text.trim().length > 0)) hasText = true

    const endSources = { rPrs: [child(paragraph, 'endParaRPr'), ...defRPrs], fontRefAt }
    const baseSizePt = runs.find((run) => !run.isBreak)?.sizePt
      ?? parseRun('', false, endSources, chain, context, fontScale).sizePt

    const lnSpc = first(levelSources, (element) => child(element, 'lnSpc'))
    const lnPts = numAttr(child(lnSpc ?? null, 'spcPts'), 'val')
    const lnPct = numAttr(child(lnSpc ?? null, 'spcPct'), 'val')
    const lineSpacing: Paragraph['lineSpacing'] = lnPts !== undefined
      ? { kind: 'pts', value: lnPts / 100 }
      : { kind: 'pct', value: Math.max(0.5, (lnPct ?? 100000) / 100000 - lineSpacingReduction) }

    const hasVisibleRuns = runs.some((run) => !run.isBreak)
    // Counters are per outline level: a shallower paragraph restarts every deeper sequence, and
    // a paragraph without a number at a level ends that level's sequence.
    for (const counterLevel of [...autoNumberCounters.keys()]) {
      if (counterLevel > level) autoNumberCounters.delete(counterLevel)
    }
    let numbered = false
    const bullet = hasVisibleRuns
      ? parseBullet(levelSources, baseSizePt, () => {
        numbered = true
        const startAt = numAttr(first(levelSources, (element) => child(element, 'buAutoNum')) ?? null, 'startAt') ?? 1
        const next = (autoNumberCounters.get(level) ?? startAt - 1) + 1
        autoNumberCounters.set(level, next)
        return next
      }, context)
      : null
    if (!numbered && hasVisibleRuns) autoNumberCounters.delete(level)

    paragraphs.push({
      align: ALIGN[first(levelSources, (element) => attr(element, 'algn')) ?? 'l'] ?? 'left',
      marginLeftPx: (first(levelSources, (element) => numAttr(element, 'marL')) ?? 0) / EMU_PER_PX,
      indentPx: (first(levelSources, (element) => numAttr(element, 'indent')) ?? 0) / EMU_PER_PX,
      lineSpacing,
      // Shrink-on-overflow autofit reduces paragraph spacing along with line spacing.
      spaceBeforePt: (first(levelSources, (element) => spacingPt(child(element, 'spcBef'), baseSizePt)) ?? 0) * (1 - lineSpacingReduction),
      spaceAfterPt: (first(levelSources, (element) => spacingPt(child(element, 'spcAft'), baseSizePt)) ?? 0) * (1 - lineSpacingReduction),
      bullet,
      runs,
      baseSizePt,
      rtl: first(levelSources, (element) => attr(element, 'rtl')) === '1',
    })
  }

  if (!hasText) return null

  const inset = (name: string, fallback: number) => (first(bodyPrs, (element) => numAttr(element, name)) ?? fallback) / EMU_PER_PX
  const anchor = first(bodyPrs, (element) => attr(element, 'anchor'))
  const vert = first(bodyPrs, (element) => attr(element, 'vert'))
  return {
    paragraphs,
    insets: { l: inset('lIns', 91440), t: inset('tIns', 45720), r: inset('rIns', 91440), b: inset('bIns', 45720) },
    anchor: anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top',
    anchorCenter: first(bodyPrs, (element) => attr(element, 'anchorCtr')) === '1',
    wrap: first(bodyPrs, (element) => attr(element, 'wrap')) !== 'none',
    vertical: vert === 'vert' || vert === 'eaVert' || vert === 'wordArtVertRtl' ? 'vert' : vert === 'vert270' ? 'vert270' : 'horz',
    fontScale,
    lineSpacingReduction,
  }
}
