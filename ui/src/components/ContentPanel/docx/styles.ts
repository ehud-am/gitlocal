// The document's style sheet (word/styles.xml): document defaults plus named paragraph,
// character and table styles, each resolved through its w:basedOn chain.
import type { Theme } from '../pptx/theme'
import { attr, child, children } from '../pptx/xml'
import type { RunStyle } from './model'
import { mergePara, mergeRun, parseParaProps, parseRunProps, type ParaProps } from './properties'

// Formatting a table style applies to one region (whole table, header row, banded rows, ...).
export interface TableRegionStyle {
  para: ParaProps
  run: RunStyle
  // w:tcPr and w:tblPr elements, base style first, read when the table is laid out.
  tcPr: Element[]
  tblPr: Element[]
}

export interface ResolvedStyle {
  para: ParaProps
  run: RunStyle
}

export interface StyleSheet {
  defaults: ResolvedStyle
  paragraph: (styleId: string | null) => ResolvedStyle & { styleId: string | null }
  character: (styleId: string | null) => RunStyle
  table: (styleId: string | null) => Map<string, TableRegionStyle>
}

interface RawStyle {
  type: string
  basedOn: string | null
  element: Element
}

const MAX_DEPTH = 20

export function loadStyles(root: Element | null, theme: Theme): StyleSheet {
  const docDefaults = child(root, 'docDefaults')
  const defaults: ResolvedStyle = {
    para: parseParaProps(child(child(docDefaults, 'pPrDefault'), 'pPr'), theme),
    run: parseRunProps(child(child(docDefaults, 'rPrDefault'), 'rPr'), theme),
  }

  const raw = new Map<string, RawStyle>()
  const defaultIds: Record<string, string> = {}
  for (const style of children(root, 'style')) {
    const id = attr(style, 'styleId')
    const type = attr(style, 'type') ?? 'paragraph'
    if (!id) continue
    raw.set(id, { type, basedOn: attr(child(style, 'basedOn'), 'val'), element: style })
    const isDefault = attr(style, 'default')
    if ((isDefault === '1' || isDefault === 'true') && !defaultIds[type]) defaultIds[type] = id
  }

  // The chain from the most basic ancestor down to the style itself, limited to one style type.
  const chain = (id: string | null, type: string): RawStyle[] => {
    const result: RawStyle[] = []
    const seen = new Set<string>()
    let current = id
    while (current && !seen.has(current) && result.length < MAX_DEPTH) {
      seen.add(current)
      const style = raw.get(current)
      if (!style || style.type !== type) break
      result.unshift(style)
      current = style.basedOn
    }
    return result
  }

  const paragraphCache = new Map<string, ResolvedStyle & { styleId: string | null }>()
  const paragraph = (styleId: string | null) => {
    const id = styleId && raw.get(styleId)?.type === 'paragraph' ? styleId : defaultIds.paragraph ?? null
    const key = id ?? ''
    const cached = paragraphCache.get(key)
    if (cached) return cached
    const styles = chain(id, 'paragraph')
    const resolved = {
      styleId: id,
      para: mergePara(...styles.map((style) => parseParaProps(child(style.element, 'pPr'), theme))),
      run: mergeRun(...styles.map((style) => parseRunProps(child(style.element, 'rPr'), theme))),
    }
    paragraphCache.set(key, resolved)
    return resolved
  }

  const characterCache = new Map<string, RunStyle>()
  const character = (styleId: string | null): RunStyle => {
    if (!styleId) return {}
    const cached = characterCache.get(styleId)
    if (cached) return cached
    const resolved = mergeRun(...chain(styleId, 'character').map((style) => parseRunProps(child(style.element, 'rPr'), theme)))
    characterCache.set(styleId, resolved)
    return resolved
  }

  const tableCache = new Map<string, Map<string, TableRegionStyle>>()
  const table = (styleId: string | null): Map<string, TableRegionStyle> => {
    const id = styleId && raw.get(styleId)?.type === 'table' ? styleId : defaultIds.table ?? null
    const key = id ?? ''
    const cached = tableCache.get(key)
    if (cached) return cached
    const regions = new Map<string, TableRegionStyle>()
    const add = (region: string, container: Element) => {
      const existing = regions.get(region) ?? { para: {}, run: {}, tcPr: [], tblPr: [] }
      const tcPr = child(container, 'tcPr')
      const tblPr = child(container, 'tblPr')
      regions.set(region, {
        para: mergePara(existing.para, parseParaProps(child(container, 'pPr'), theme)),
        run: mergeRun(existing.run, parseRunProps(child(container, 'rPr'), theme)),
        tcPr: tcPr ? [...existing.tcPr, tcPr] : existing.tcPr,
        tblPr: tblPr ? [...existing.tblPr, tblPr] : existing.tblPr,
      })
    }
    for (const style of chain(id, 'table')) {
      add('wholeTable', style.element)
      for (const conditional of children(style.element, 'tblStylePr')) {
        const type = attr(conditional, 'type')
        if (type) add(type, conditional)
      }
    }
    tableCache.set(key, regions)
    return regions
  }

  return { defaults, paragraph, character, table }
}
