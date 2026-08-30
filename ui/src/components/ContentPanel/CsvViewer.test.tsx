import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CsvViewer from './CsvViewer'
import sampleCsv from '../../test-fixtures/sample.csv?raw'
import quotedFieldsCsv from '../../test-fixtures/quoted-fields.csv?raw'

describe('CsvViewer', () => {
  it('renders sample.csv as a table with the correct headers and row data', () => {
    render(<CsvViewer content={sampleCsv} />)
    const headerRow = screen.getAllByRole('row')[0]
    expect(within(headerRow).getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(within(headerRow).getByRole('columnheader', { name: 'Years' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Grace Hopper' })).toBeInTheDocument()
    // 1 header row + 3 data rows, no spurious trailing row from the file's final newline
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('parses a quoted field containing a comma and an embedded newline as a single cell', () => {
    render(<CsvViewer content={quotedFieldsCsv} />)
    expect(screen.getByRole('cell', { name: 'Smith, John' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '123 Main St, Springfield' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /First line\s+second line/ })).toBeInTheDocument()
  })

  it('shows a fallback message for binary content misnamed .csv', () => {
    const binaryish = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]).toString('utf-8')
    render(<CsvViewer content={binaryish} />)
    expect(screen.getByText("This file can't be previewed as a CSV.")).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an empty-table state (not an error) for genuinely empty content', () => {
    render(<CsvViewer content="" />)
    expect(screen.getByText('This CSV file is empty.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('pads ragged rows so every row has one cell per header', () => {
    render(<CsvViewer content={'a,b,c\n1,2\n'} />)
    const rows = screen.getAllByRole('row')
    const dataRow = rows[1]
    expect(within(dataRow).getAllByRole('cell')).toHaveLength(3)
  })
})
