import { useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

interface Props {
  /** Base64-encoded workbook bytes, as delivered by the server. */
  content: string
}

interface Worksheet {
  name: string
  rows: string[][]
}

interface ExcelWorkbook {
  sheets: Worksheet[]
  parseError: string | null
}

function parseWorkbook(content: string): ExcelWorkbook {
  try {
    const workbook = XLSX.read(content, { type: 'base64' })
    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name]
      // header: 1 keeps rows as arrays instead of objects keyed by the first row; raw: false
      // reads each cell's formatted/cached display value, never a formula (FR-006).
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: '', raw: false })
      return { name, rows: rows.map((row) => row.map((cell) => String(cell))) }
    })

    if (sheets.length === 0) {
      return { sheets: [], parseError: "This file can't be previewed as an Excel workbook." }
    }

    return { sheets, parseError: null }
  } catch {
    return { sheets: [], parseError: "This file can't be previewed as an Excel workbook." }
  }
}

export default function ExcelViewer({ content }: Props) {
  const workbook = useMemo(() => parseWorkbook(content), [content])
  const [activeSheetIndex, setActiveSheetIndex] = useState(0)

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
      {headerRow === undefined ? (
        <p className="binary-placeholder">This worksheet is empty.</p>
      ) : (
        <div className="csv-viewer-table-wrap">
          <table className="csv-viewer-table">
            <thead>
              <tr>
                {headerRow.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {headerRow.map((_, cellIndex) => (
                    <td key={cellIndex}>{row[cellIndex] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
