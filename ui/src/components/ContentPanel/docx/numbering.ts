// List numbering (word/numbering.xml). Paragraphs refer to a numbering instance (w:num) and a
// level; the instance points at an abstract definition holding each level's format, text
// template ("%1.%2."), indents and marker formatting. Counters advance as list paragraphs are
// read in document order.
import { toRoman } from '../ooxml/text'
import type { Theme } from '../ooxml/theme'
import { attr, child, children, numAttr, path } from '../ooxml/xml'
import type { RunStyle } from './model'
import { parseParaProps, parseRunProps, type ParaProps } from './properties'

interface Level {
  start: number
  format: string
  text: string
  suffix: 'tab' | 'space' | 'nothing'
  legal: boolean
  para: ParaProps
  run: RunStyle
}

export interface ListLabel {
  text: string
  suffix: 'tab' | 'space' | 'nothing'
  para: ParaProps
  run: RunStyle
}

export interface Numbering {
  next: (numId: string, ilvl: number) => ListLabel | null
  // The level's paragraph properties without advancing a counter (for style-inherited indents).
  levelPara: (numId: string, ilvl: number) => ParaProps | null
}

function parseLevel(lvl: Element, theme: Theme): Level {
  const suffix = attr(child(lvl, 'suff'), 'val')
  return {
    start: numAttr(child(lvl, 'start'), 'val') ?? 0,
    format: attr(child(lvl, 'numFmt'), 'val') ?? 'decimal',
    text: attr(child(lvl, 'lvlText'), 'val') ?? '',
    suffix: suffix === 'space' || suffix === 'nothing' ? suffix : 'tab',
    legal: child(lvl, 'isLgl') !== null && attr(child(lvl, 'isLgl'), 'val') !== '0',
    para: parseParaProps(child(lvl, 'pPr'), theme),
    run: parseRunProps(child(lvl, 'rPr'), theme),
  }
}

// Word's letter numbering repeats the letter past z: a..z, aa..zz, aaa...
function letters(value: number): string {
  if (value <= 0) return String(value)
  const letter = String.fromCharCode(97 + ((value - 1) % 26))
  return letter.repeat(Math.floor((value - 1) / 26) + 1)
}

function ordinalSuffix(value: number): string {
  const lastTwo = value % 100
  if (lastTwo >= 11 && lastTwo <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'
}

export function formatNumber(value: number, format: string): string {
  switch (format) {
    case 'none': return ''
    case 'upperRoman': return toRoman(value).toUpperCase()
    case 'lowerRoman': return toRoman(value)
    case 'upperLetter': return letters(value).toUpperCase()
    case 'lowerLetter': return letters(value)
    case 'decimalZero': return value < 10 && value >= 0 ? `0${value}` : String(value)
    case 'ordinal': return `${value}${ordinalSuffix(value)}`
    case 'decimalEnclosedCircle': return value >= 1 && value <= 20 ? String.fromCodePoint(0x2460 + value - 1) : String(value)
    default: return String(value)
  }
}

// Bullet characters from the Symbol and Wingdings fonts are stored in the private use area and
// only show correctly in those fonts, so the common ones are mapped to Unicode equivalents.
const SYMBOL_BULLETS: Record<number, string> = {
  0xb7: '•', 0xa7: '▪', 0xd8: '➢', 0x76: '❖', 0xfc: '✓', 0x6e: '■', 0x71: '❑', 0xa8: '◆', 0x6f: '□', 0x77: '◆', 0xe0: '➢', 0xa1: '○',
}

export function bulletText(text: string): { text: string; symbolic: boolean } {
  const code = text.codePointAt(0)
  if (code !== undefined && code >= 0xf000 && code <= 0xf0ff) return { text: SYMBOL_BULLETS[code - 0xf000] ?? '•', symbolic: true }
  return { text, symbolic: false }
}

export function loadNumbering(root: Element | null, stylesRoot: Element | null, theme: Theme): Numbering {
  const abstracts = new Map<string, Element>()
  for (const abstract of children(root, 'abstractNum')) {
    const id = attr(abstract, 'abstractNumId')
    if (id !== null) abstracts.set(id, abstract)
  }
  const nums = new Map<string, Element>()
  for (const num of children(root, 'num')) {
    const id = attr(num, 'numId')
    if (id !== null) nums.set(id, num)
  }

  // A numbering style's definition lives in the numbering instance its style points at.
  const styleNumId = (styleId: string): string | null => {
    const style = children(stylesRoot, 'style').find((candidate) => attr(candidate, 'styleId') === styleId)
    return attr(path(style, 'pPr', 'numPr', 'numId'), 'val')
  }

  const levelCache = new Map<string, { abstractId: string; levels: Map<number, Level>; starts: Map<number, number> } | null>()
  const definition = (numId: string) => {
    if (levelCache.has(numId)) return levelCache.get(numId) ?? null
    let result: { abstractId: string; levels: Map<number, Level>; starts: Map<number, number> } | null = null
    const num = nums.get(numId)
    let abstractId = attr(child(num, 'abstractNumId'), 'val')
    let abstract = abstractId === null ? undefined : abstracts.get(abstractId)
    const link = attr(child(abstract, 'numStyleLink'), 'val')
    if (link) {
      const linkedNum = nums.get(styleNumId(link) ?? '')
      const linkedId = attr(child(linkedNum, 'abstractNumId'), 'val')
      if (linkedId !== null && abstracts.has(linkedId)) {
        abstractId = linkedId
        abstract = abstracts.get(linkedId)
      }
    }
    if (abstract && abstractId !== null) {
      const levels = new Map<number, Level>()
      for (const lvl of children(abstract, 'lvl')) levels.set(numAttr(lvl, 'ilvl') ?? 0, parseLevel(lvl, theme))
      const starts = new Map<number, number>()
      for (const override of children(num, 'lvlOverride')) {
        const ilvl = numAttr(override, 'ilvl') ?? 0
        const replacement = child(override, 'lvl')
        if (replacement) levels.set(ilvl, parseLevel(replacement, theme))
        const start = numAttr(child(override, 'startOverride'), 'val')
        if (start !== undefined) starts.set(ilvl, start)
      }
      result = { abstractId, levels, starts }
    }
    levelCache.set(numId, result)
    return result
  }

  // Counters are shared by every instance of the same abstract list, so a list continues across
  // instances unless an instance restarts a level (w:startOverride) the first time it is used.
  const counters = new Map<string, number[]>()
  const restarted = new Set<string>()

  const next = (numId: string, ilvl: number): ListLabel | null => {
    if (numId === '0') return null
    const def = definition(numId)
    const level = def?.levels.get(ilvl)
    if (!def || !level) return null
    const counts = counters.get(def.abstractId) ?? []
    counters.set(def.abstractId, counts)
    const restartKey = `${numId}:${ilvl}`
    const override = def.starts.get(ilvl)
    if (override !== undefined && !restarted.has(restartKey)) {
      restarted.add(restartKey)
      counts[ilvl] = override - 1
    }
    counts[ilvl] = (counts[ilvl] ?? level.start - 1) + 1
    // A higher level advancing restarts every level below it.
    counts.length = ilvl + 1

    let text: string
    if (level.format === 'bullet') {
      text = bulletText(level.text).text
    } else {
      text = level.text.replace(/%([1-9])/g, (_, digit: string) => {
        const index = Number(digit) - 1
        const referenced = def.levels.get(index)
        const value = counts[index] ?? referenced?.start ?? 1
        const format = level.legal ? 'decimal' : referenced?.format ?? 'decimal'
        return formatNumber(value, format)
      })
    }
    const run = level.format === 'bullet' && bulletText(level.text).symbolic ? { ...level.run, font: undefined } : level.run
    return { text, suffix: level.suffix, para: level.para, run }
  }

  const levelPara = (numId: string, ilvl: number): ParaProps | null => definition(numId)?.levels.get(ilvl)?.para ?? null

  return { next, levelPara }
}
