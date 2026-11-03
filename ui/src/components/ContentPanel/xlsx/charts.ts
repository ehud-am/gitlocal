import { DEFAULT_CLR_MAP } from '../ooxml/color'
import { openPackage, type OpcPackage } from '../ooxml/package'
import { DEFAULT_THEME, loadTheme, type Theme } from '../ooxml/theme'
import { attr, child, path } from '../ooxml/xml'
import { parseChart } from '../pptx/chart'
import { MediaRegistry, type PartScope } from '../pptx/fill'
import type { ChartModel } from '../pptx/model'

// Charts in an .xlsx workbook, read from the package itself (SheetJS Community Edition exposes
// none): workbook sheet -> drawing part -> graphicFrame -> chart part, drawn from the chart's
// cached values like PPTX and DOCX charts. Formulas are never recalculated.

/** Cell values of a reference such as `'Sales'!$B$2:$B$5`, in order, or null when unknown. */
export type RangeResolver = (reference: string) => { text: string; number: number | null }[] | null

export interface WorkbookChart {
  /** Parsed chart, or null when its type isn't supported. */
  chart: ChartModel | null
  /** Shape name from the drawing (e.g. "Chart 1"). */
  name: string | null
  /** Top-left cell of the chart's anchor (e.g. "E2"), or null for an absolute anchor. */
  cell: string | null
  widthPx: number
  heightPx: number
}

const EMU_PER_PX = 9525
// Excel's default column width and row height in pixels, used to size cell-anchored charts.
const COLUMN_PX = 64
const ROW_PX = 20
const DEFAULT_SIZE = { widthPx: 480, heightPx: 288 }
const MIN_PX = 160
const MAX_PX = 1200

export function columnName(index: number): string {
  let name = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name
  }
  return name
}

function intText(element: Element | null, name: string): number {
  const value = Number(child(element, name)?.textContent ?? '')
  return Number.isFinite(value) ? value : 0
}

function marker(element: Element | null): { col: number; row: number; colOff: number; rowOff: number } | null {
  if (!element) return null
  return { col: intText(element, 'col'), row: intText(element, 'row'), colOff: intText(element, 'colOff'), rowOff: intText(element, 'rowOff') }
}

function clamp(value: number): number {
  return Math.round(Math.min(MAX_PX, Math.max(MIN_PX, value)))
}

function extentSize(ext: Element | null): { widthPx: number; heightPx: number } | null {
  const cx = Number(attr(ext, 'cx'))
  const cy = Number(attr(ext, 'cy'))
  if (!(cx > 0) || !(cy > 0)) return null
  return { widthPx: clamp(cx / EMU_PER_PX), heightPx: clamp(cy / EMU_PER_PX) }
}

// Size and position of one drawing anchor (twoCellAnchor, oneCellAnchor or absoluteAnchor).
export function anchorLayout(anchor: Element): { cell: string | null; widthPx: number; heightPx: number } {
  const from = marker(child(anchor, 'from'))
  const cell = from ? `${columnName(from.col)}${from.row + 1}` : null
  if (anchor.localName === 'twoCellAnchor') {
    const to = marker(child(anchor, 'to'))
    if (from && to) {
      const width = (to.col - from.col) * COLUMN_PX + (to.colOff - from.colOff) / EMU_PER_PX
      const height = (to.row - from.row) * ROW_PX + (to.rowOff - from.rowOff) / EMU_PER_PX
      if (width > 0 && height > 0) return { cell, widthPx: clamp(width), heightPx: clamp(height) }
    }
    return { cell, ...DEFAULT_SIZE }
  }
  return { cell, ...(extentSize(child(anchor, 'ext')) ?? DEFAULT_SIZE) }
}

// Files written by some tools (openpyxl, for one) leave out a chart's cached values and keep only
// the cell references. Those caches are filled in from the sheet's own cell values before parsing.
export function fillMissingCaches(chartSpace: Element, resolve: RangeResolver): void {
  for (const ref of Array.from(chartSpace.getElementsByTagNameNS('*', '*')).filter((element) => element.localName === 'numRef' || element.localName === 'strRef')) {
    const numeric = ref.localName === 'numRef'
    if (child(ref, numeric ? 'numCache' : 'strCache')) continue
    const formula = child(ref, 'f')?.textContent?.trim()
    const values = formula ? resolve(formula) : null
    if (!values) continue
    const doc = ref.ownerDocument
    const ns = ref.namespaceURI
    const make = (name: string) => doc.createElementNS(ns, ref.prefix ? `${ref.prefix}:${name}` : name)
    const cache = make(numeric ? 'numCache' : 'strCache')
    const count = make('ptCount')
    count.setAttribute('val', String(values.length))
    cache.appendChild(count)
    values.forEach((value, index) => {
      // A numeric reference over text cells (categories often are) keeps the text.
      const content = numeric && value.number !== null ? String(value.number) : value.text
      if (numeric && content === '') return
      const pt = make('pt')
      pt.setAttribute('idx', String(index))
      const v = make('v')
      v.textContent = content
      pt.appendChild(v)
      cache.appendChild(pt)
    })
    ref.appendChild(cache)
  }
}

const ANCHORS = new Set(['twoCellAnchor', 'oneCellAnchor', 'absoluteAnchor'])

function chartsInDrawing(pkg: OpcPackage, drawingPath: string, theme: Theme, resolve: RangeResolver | null): WorkbookChart[] {
  const drawing = pkg.xml(drawingPath)
  if (!drawing) return []
  const charts: WorkbookChart[] = []
  for (const anchor of Array.from(drawing.children).filter((element) => ANCHORS.has(element.localName))) {
    const layout = anchorLayout(anchor)
    // A chart may sit directly in the anchor or inside a group shape.
    for (const frame of Array.from(anchor.getElementsByTagNameNS('*', 'graphicFrame'))) {
      const chartRef = path(frame, 'graphic', 'graphicData', 'chart')
      const relId = chartRef?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? attr(chartRef, 'id')
      const rel = relId ? pkg.rels(drawingPath).get(relId) : undefined
      if (!rel || rel.external) continue
      const chartSpace = pkg.xml(rel.target)
      if (!chartSpace) continue
      if (resolve) fillMissingCaches(chartSpace, resolve)
      const scope: PartScope = { pkg, partPath: rel.target, colors: { scheme: theme.scheme, clrMap: DEFAULT_CLR_MAP }, theme, media: new MediaRegistry() }
      const name = attr(path(frame, 'nvGraphicFramePr', 'cNvPr'), 'name')
      charts.push({ chart: parseChart(chartSpace, scope), name: name && name.trim() ? name : null, ...layout })
    }
  }
  return charts
}

/** Charts per sheet name, in drawing order. Sheets without charts are left out. */
export function chartsByPackage(pkg: OpcPackage, resolve: RangeResolver | null = null): Map<string, WorkbookChart[]> {
  const result = new Map<string, WorkbookChart[]>()
  const workbookPath = pkg.relByType('', '/officeDocument')?.target ?? 'xl/workbook.xml'
  const workbook = pkg.xml(workbookPath)
  if (!workbook) return result
  const themeRel = pkg.relByType(workbookPath, '/theme')
  const theme = themeRel ? loadTheme(pkg, themeRel.target) : DEFAULT_THEME
  const workbookRels = pkg.rels(workbookPath)
  for (const sheet of Array.from(workbook.getElementsByTagNameNS('*', 'sheet'))) {
    const name = attr(sheet, 'name')
    const relId = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const sheetRel = relId ? workbookRels.get(relId) : undefined
    if (!name || !sheetRel || sheetRel.external) continue
    const drawingRef = child(pkg.xml(sheetRel.target), 'drawing')
    const drawingId = drawingRef?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')
    const drawingRel = drawingId ? pkg.rels(sheetRel.target).get(drawingId) : undefined
    if (!drawingRel || drawingRel.external) continue
    const charts = chartsInDrawing(pkg, drawingRel.target, theme, resolve)
    if (charts.length > 0) result.set(name, charts)
  }
  return result
}

/** Charts of a workbook's bytes; empty for a file that isn't an OOXML package (e.g. legacy .xls). */
export async function loadWorkbookCharts(bytes: Uint8Array, resolve: RangeResolver | null = null): Promise<Map<string, WorkbookChart[]>> {
  try {
    return chartsByPackage(await openPackage(bytes), resolve)
  } catch {
    return new Map()
  }
}
