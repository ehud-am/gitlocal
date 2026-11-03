import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { ChartView } from './pptx/chart-view'
import { base64ToBytes } from './preview-shared/bytes'
import { DataTable } from './preview-shared/DataTable'
import { loadWorkbookCharts, type RangeResolver, type WorkbookChart } from './xlsx/charts'

interface Props {
  /** Base64-encoded workbook bytes, as delivered by the server. */
  content: string
}

interface Worksheet {
  name: string
  rows: string[][]
  /**
   * True when SheetJS Community Edition flags this sheet as a chartsheet (`!type === 'chart'`).
   * CE exposes no chart data, so the charts themselves are read from the package by
   * `xlsx/charts.ts`; this flag only decides what a chartsheet shows when none could be read.
   */
  hasChart: boolean
}

interface ExcelWorkbook {
  sheets: Worksheet[]
  parseError: string | null
  /** Cell values of a chart's range reference, for charts saved without cached values. */
  resolveRange: RangeResolver | null
}

// `'My Sheet'!$B$2:$B$5` or `Sheet1!A1`: the sheet's cells in row-major order.
export function resolveRangeFor(workbook: XLSX.WorkBook): RangeResolver {
  return (reference) => {
    const match = /^(?:'((?:[^']|'')+)'|([^!]+))!(.+)$/.exec(reference)
    if (!match) return null
    const sheet = workbook.Sheets[match[1] !== undefined ? match[1].replace(/''/g, "'") : match[2]]
    if (!sheet) return null
    const range = XLSX.utils.decode_range(match[3].replace(/\$/g, ''))
    const values: { text: string; number: number | null }[] = []
    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })] as XLSX.CellObject | undefined
        values.push({ text: cell ? String(cell.w ?? cell.v ?? '') : '', number: typeof cell?.v === 'number' ? cell.v : null })
      }
    }
    return values
  }
}

function parseWorkbook(content: string): ExcelWorkbook {
  try {
    const workbook = XLSX.read(content, { type: 'base64' })
    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name]
      // header: 1 keeps rows as arrays instead of objects keyed by the first row; raw: false
      // reads each cell's formatted/cached display value, never a formula (FR-006).
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false })
      const hasChart = worksheet['!type'] === 'chart'
      return { name, rows: rows.map((row) => row.map((cell) => String(cell))), hasChart }
    })

    return { sheets, parseError: null, resolveRange: resolveRangeFor(workbook) }
  } catch {
    return { sheets: [], parseError: "This file can't be previewed as an Excel workbook.", resolveRange: null }
  }
}

function WorkbookChartView({ item }: { item: WorkbookChart }) {
  const label = [item.name, item.cell ? `at ${item.cell}` : null].filter(Boolean).join(' ')
  const box = { x: 0, y: 0, w: item.widthPx, h: item.heightPx, rot: 0, flipH: false, flipV: false }
  return (
    <figure className="excel-viewer-chart">
      <div className="excel-viewer-chart-frame" style={{ width: `${item.widthPx}px`, height: `${item.heightPx}px` }}>
        {item.chart ? (
          <ChartView chart={item.chart} box={box} />
        ) : (
          <p className="excel-viewer-chart-unavailable">This chart type can't be shown in the preview.</p>
        )}
      </div>
      {label ? <figcaption>{label}</figcaption> : null}
    </figure>
  )
}

export default function ExcelViewer({ content }: Props) {
  const workbook = useMemo(() => parseWorkbook(content), [content])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)
  // Charts load asynchronously (jszip is lazy-loaded); null until the current content is read.
  const [charts, setCharts] = useState<Map<string, WorkbookChart[]> | null>(null)

  useEffect(() => {
    let cancelled = false
    setCharts(null)
    if (workbook.parseError) return undefined
    void loadWorkbookCharts(base64ToBytes(content), workbook.resolveRange).then((result) => {
      if (!cancelled) setCharts(result)
    })
    return () => {
      cancelled = true
    }
  }, [content, workbook])

  // The registry renders one long-lived ExcelViewer instance across file switches, so the active
  // tab must reset explicitly whenever a new file's content arrives (mirrors PdfViewer's [content]
  // effect) — otherwise a later file with fewer sheets could be left pointing past its last tab.
  useEffect(() => {
    setActiveSheetIndex(0)
  }, [content])

  if (workbook.parseError) {
    return <p className="binary-placeholder">{workbook.parseError}</p>
  }

  const safeIndex = activeSheetIndex < workbook.sheets.length ? activeSheetIndex : 0
  const activeSheet = workbook.sheets[safeIndex]
  const [headerRow, ...bodyRows] = activeSheet.rows
  const sheetCharts = charts?.get(activeSheet.name) ?? []

  return (
    <div className="excel-viewer">
      <div role="tablist" aria-label="Worksheets" className="excel-viewer-tabs">
        {workbook.sheets.map((sheet, index) => (
          <button
            key={sheet.name}
            type="button"
            role="tab"
            aria-selected={index === safeIndex}
            className={`excel-viewer-tab${index === safeIndex ? ' excel-viewer-tab-active' : ''}`}
            onClick={() => setActiveSheetIndex(index)}
          >
            {sheet.name}
          </button>
        ))}
      </div>
      {sheetCharts.length > 0 && (
        <div className="excel-viewer-charts" aria-label="Charts">
          {sheetCharts.map((item, index) => <WorkbookChartView key={index} item={item} />)}
        </div>
      )}
      {activeSheet.hasChart && charts !== null && sheetCharts.length === 0 && (
        <p className="excel-viewer-chart-indicator">
          This sheet contains a chart that can't be shown in the preview.
        </p>
      )}
      {headerRow === undefined ? (
        activeSheet.hasChart ? null : <p className="binary-placeholder">This worksheet is empty.</p>
      ) : (
        <DataTable headers={headerRow} rows={bodyRows} />
      )}
    </div>
  )
}
