// A plain table with a header row, shared by the CSV and Excel previews. Rows shorter than the
// header are padded so every column has a cell.
interface Props {
  headers: string[]
  rows: string[][]
}

export function DataTable({ headers, rows }: Props) {
  return (
    <div className="csv-viewer-table-wrap">
      <table className="csv-viewer-table">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th key={index}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: Math.max(headers.length, row.length) }, (_, cellIndex) => (
                <td key={cellIndex}>{row[cellIndex] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
