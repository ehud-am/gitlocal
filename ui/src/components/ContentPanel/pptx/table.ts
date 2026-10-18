import type { PartScope } from './fill'
import { parseFill, parseLine, parseStyleFill } from './fill'
import type { Box, Fill, Line, TableCell, TableNode } from './model'
import { EMU_PER_PX } from './model'
import { parseTextBody, type SlideIndex } from './text'
import { attr, child, children, numAttr, parseXml } from './xml'

export interface TableContext {
  scope: PartScope
  slideNumber: number
  slides?: SlideIndex
  // ppt/tableStyles.xml's root (a:tblStyleLst), if the deck has one.
  tableStyles: Element | null
  defaultTextStyle: Element | null
}

// PowerPoint only writes the definitions of the built-in table styles a deck uses into
// tableStyles.xml, and not always. When a referenced style is missing, the preview falls back to
// the default "Medium Style 2" look in the accent color the style id names (or accent1).
const MEDIUM_STYLE_2_ACCENTS: Record<string, string> = {
  '{073A0DAA-6AF3-43AB-8588-CEC1D06C72B9}': 'dk1',
  '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}': 'accent1',
  '{21E4AEA4-8DFA-4A89-87EB-49C32662AFE8}': 'accent2',
  '{F5AB1C69-6EDB-4FF4-983F-18BD219EF322}': 'accent3',
  '{00A15C55-8517-42AA-B614-E9B94910E393}': 'accent4',
  '{7DF18680-E054-41AD-8BC1-D1AEF772440D}': 'accent5',
  '{93296810-A885-4BE3-A3E7-6D5BEEA58F35}': 'accent6',
}

function mediumStyle2(accent: string): Element | null {
  const border = (side: string) => `<a:${side}><a:ln w="12700"><a:solidFill><a:schemeClr val="lt1"/></a:solidFill></a:ln></a:${side}>`
  const borders = ['left', 'right', 'top', 'bottom', 'insideH', 'insideV'].map(border).join('')
  const xml = `<a:tblStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
    <a:wholeTbl><a:tcTxStyle><a:schemeClr val="dk1"/></a:tcTxStyle><a:tcStyle><a:tcBdr>${borders}</a:tcBdr>
      <a:fill><a:solidFill><a:schemeClr val="${accent}"><a:tint val="20000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:wholeTbl>
    <a:band1H><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"><a:tint val="40000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:band1H>
    <a:band1V><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"><a:tint val="40000"/></a:schemeClr></a:solidFill></a:fill></a:tcStyle></a:band1V>
    <a:lastCol><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"/></a:solidFill></a:fill></a:tcStyle></a:lastCol>
    <a:firstCol><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"/></a:solidFill></a:fill></a:tcStyle></a:firstCol>
    <a:lastRow><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"/></a:solidFill></a:fill></a:tcStyle></a:lastRow>
    <a:firstRow><a:tcTxStyle b="on"><a:schemeClr val="lt1"/></a:tcTxStyle><a:tcStyle><a:fill><a:solidFill><a:schemeClr val="${accent}"/></a:solidFill></a:fill></a:tcStyle></a:firstRow>
  </a:tblStyle>`
  return parseXml(xml)
}

function findTableStyle(tableStyles: Element | null, styleId: string | null): Element | null {
  const id = styleId ?? attr(tableStyles, 'def')
  const found = children(tableStyles, 'tblStyle').find((style) => attr(style, 'styleId') === id)
  if (found) return found
  return mediumStyle2((id && MEDIUM_STYLE_2_ACCENTS[id]) ?? 'accent1')
}

interface StylePart {
  tcStyle: Element | null
  tcTxStyle: Element | null
}

// The style parts that apply to a cell, lowest priority first.
function partsFor(style: Element | null, tblPr: Element | null, row: number, col: number, rowCount: number, colCount: number): StylePart[] {
  const flag = (name: string) => attr(tblPr, name) === '1' || attr(tblPr, name) === 'true'
  const names = ['wholeTbl']
  const bodyRow = row - (flag('firstRow') ? 1 : 0)
  const bodyCol = col - (flag('firstCol') ? 1 : 0)
  if (flag('bandCol')) names.push(bodyCol % 2 === 0 ? 'band1V' : 'band2V')
  if (flag('bandRow')) names.push(bodyRow % 2 === 0 ? 'band1H' : 'band2H')
  if (flag('firstCol') && col === 0) names.push('firstCol')
  if (flag('lastCol') && col === colCount - 1) names.push('lastCol')
  if (flag('lastRow') && row === rowCount - 1) names.push('lastRow')
  if (flag('firstRow') && row === 0) names.push('firstRow')
  return names
    .map((name) => child(style, name))
    .filter((part): part is Element => part !== null)
    .map((part) => ({ tcStyle: child(part, 'tcStyle'), tcTxStyle: child(part, 'tcTxStyle') }))
}

function styleBorder(parts: StylePart[], side: string, context: TableContext): Line | null | undefined {
  let result: Line | null | undefined
  for (const part of parts) {
    const border = child(child(part.tcStyle, 'tcBdr'), side)
    if (!border) continue
    const ln = child(border, 'ln')
    result = ln ? parseLine([ln], context.scope) : parseLine([], context.scope, child(border, 'lnRef'))
  }
  return result
}

function styleFill(parts: StylePart[], context: TableContext): Fill | null {
  let result: Fill | null = null
  for (const part of parts) {
    const fillHost = child(part.tcStyle, 'fill')
    const fill = parseFill(fillHost, context.scope) ?? parseStyleFill(child(part.tcStyle, 'fillRef'), context.scope)
    if (fill) result = fill
  }
  return result
}

const borderFromCell = (tcPr: Element | null, name: string, context: TableContext): Line | null | undefined => {
  const ln = child(tcPr, name)
  return ln ? parseLine([ln], context.scope) : undefined
}

export function parseTable(tbl: Element | null, box: Box, context: TableContext): TableNode | null {
  if (!tbl) return null
  const tblPr = child(tbl, 'tblPr')
  const style = findTableStyle(context.tableStyles, child(tblPr, 'tableStyleId')?.textContent?.trim() ?? null)
  const columns = children(child(tbl, 'tblGrid'), 'gridCol').map((col) => (numAttr(col, 'w') ?? 0) / EMU_PER_PX)
  const rowElements = children(tbl, 'tr')
  if (columns.length === 0 || rowElements.length === 0) return null

  const rows = rowElements.map((tr, rowIndex) => {
    const cells: TableCell[] = children(tr, 'tc').map((tc, colIndex) => {
      const tcPr = child(tc, 'tcPr')
      const parts = partsFor(style, tblPr, rowIndex, colIndex, rowElements.length, columns.length)
      const lastTextStyle = [...parts].reverse().find((part) => part.tcTxStyle)?.tcTxStyle ?? null
      const boldFlag = [...parts].reverse().map((part) => attr(part.tcTxStyle, 'b')).find((value) => value !== null)
      const text = parseTextBody(child(tc, 'txBody'), {
        lstStyles: [context.defaultTextStyle],
        bodyPrs: [],
        fontRef: lastTextStyle,
        bold: boldFlag === undefined ? undefined : boldFlag === 'on',
      }, { scope: context.scope, slideNumber: context.slideNumber, slides: context.slides })
      if (text) {
        text.insets = {
          l: (numAttr(tcPr, 'marL') ?? 91440) / EMU_PER_PX,
          r: (numAttr(tcPr, 'marR') ?? 91440) / EMU_PER_PX,
          t: (numAttr(tcPr, 'marT') ?? 45720) / EMU_PER_PX,
          b: (numAttr(tcPr, 'marB') ?? 45720) / EMU_PER_PX,
        }
        const anchor = attr(tcPr, 'anchor')
        text.anchor = anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : 'top'
      }
      const lastRow = rowIndex === rowElements.length - 1
      const lastCol = colIndex === columns.length - 1
      const pick = (cellName: string, outer: string, inner: string, isOuter: boolean) => {
        const own = borderFromCell(tcPr, cellName, context)
        if (own !== undefined) return own
        return styleBorder(parts, isOuter ? outer : inner, context) ?? null
      }
      return {
        text,
        fill: parseFill(tcPr, context.scope) ?? styleFill(parts, context),
        borders: {
          left: pick('lnL', 'left', 'insideV', colIndex === 0),
          right: pick('lnR', 'right', 'insideV', lastCol),
          top: pick('lnT', 'top', 'insideH', rowIndex === 0),
          bottom: pick('lnB', 'bottom', 'insideH', lastRow),
        },
        colSpan: Math.max(1, numAttr(tc, 'gridSpan') ?? 1),
        rowSpan: Math.max(1, numAttr(tc, 'rowSpan') ?? 1),
        merged: attr(tc, 'hMerge') === '1' || attr(tc, 'vMerge') === '1',
      }
    })
    return { heightPx: (numAttr(tr, 'h') ?? 0) / EMU_PER_PX, cells }
  })

  return { kind: 'table', box, columns, rows }
}
