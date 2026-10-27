import Papa from 'papaparse'
import { DataTable } from './preview-shared/DataTable'

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
  return { headers, rows, parseError: null }
}

export default function CsvViewer({ content }: Props) {
  const table = parseCsv(content)

  if (table.parseError) {
    return <p className="binary-placeholder">{table.parseError}</p>
  }

  if (table.headers.length === 0) {
    return <p className="binary-placeholder">This CSV file is empty.</p>
  }

  return <DataTable headers={table.headers} rows={table.rows} />
}
