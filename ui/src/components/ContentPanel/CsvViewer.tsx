import Papa from 'papaparse'

interface Props {
  /** Raw UTF-8 CSV source, as delivered by the server (never base64 on the wire). */
  content: string
}

interface CsvTable {
  headers: string[]
  rows: string[][]
  parseError: string | null
}

// The server decodes csv bytes via Buffer#toString('utf-8'); non-UTF-8 content (e.g. binary
// content misnamed `.csv`) surfaces as U+FFFD replacement characters rather than a thrown error,
// so that's the signal used to detect "this isn't actually text" — papaparse itself happily
// produces a garbled single-column row for binary input instead of failing outright.
function looksBinary(content: string): boolean {
  return content.includes('�')
}

function parseCsv(content: string): CsvTable {
  if (content.trim() === '') {
    return { headers: [], rows: [], parseError: null }
  }

  if (looksBinary(content)) {
    return { headers: [], rows: [], parseError: "This file can't be previewed as a CSV." }
  }

  // skipEmptyLines avoids a spurious trailing empty row from a file's final newline.
  const result = Papa.parse<string[]>(content, { skipEmptyLines: true })
  const data = result.data

  if (data.length === 0) {
    return { headers: [], rows: [], parseError: "This file can't be previewed as a CSV." }
  }

  const [headers, ...rows] = data
  const paddedRows = rows.map((row) => (
    row.length >= headers.length
      ? row
      : [...row, ...Array<string>(headers.length - row.length).fill('')]
  ))

  return { headers, rows: paddedRows, parseError: null }
}

export default function CsvViewer({ content }: Props) {
  const table = parseCsv(content)

  if (table.parseError) {
    return <p className="binary-placeholder">{table.parseError}</p>
  }

  if (table.headers.length === 0) {
    return <p className="binary-placeholder">This CSV file is empty.</p>
  }

  return (
    <div className="csv-viewer-table-wrap">
      <table className="csv-viewer-table">
        <thead>
          <tr>
            {table.headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
