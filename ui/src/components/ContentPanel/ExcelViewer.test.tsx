import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as XLSX from 'xlsx'
import ExcelViewer from './ExcelViewer'

// `new URL('...', import.meta.url)` gets statically rewritten to a bundled asset URL by Vite's
// import-analysis plugin, which breaks a plain Node fs read at test time — resolve fixtures
// against the Vitest process's cwd (the `ui/` package root) instead.
function fixtureBase64(name: string): string {
  return readFileSync(join(process.cwd(), 'src/test-fixtures', name)).toString('base64')
}

const sampleXlsx = fixtureBase64('sample.xlsx')
const brokenXlsx = fixtureBase64('broken.xlsx')
const chartXlsx = fixtureBase64('chart.xlsx')

function inMemoryWorkbookBase64(sheetName: string, rows: unknown[][]): string {
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName)
  return XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' }) as string
}

describe('ExcelViewer', () => {
  it("renders the workbook's first sheet as a table, with the formula cell's cached value", () => {
    render(<ExcelViewer content={sampleXlsx} />)
    const headerRow = screen.getAllByRole('row')[0]
    expect(within(headerRow).getByRole('columnheader', { name: 'Item' })).toBeInTheDocument()
    expect(within(headerRow).getByRole('columnheader', { name: 'Total' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Widget' })).toBeInTheDocument()
    // Total is a formula (B2*C2); only its cached value should ever render, never "B2*C2".
    expect(screen.getByRole('cell', { name: '28.5' })).toBeInTheDocument()
    expect(screen.queryByText('B2*C2')).not.toBeInTheDocument()
  })

  it('lists every sheet name as a tab, in workbook order, and switching tabs swaps the table', () => {
    render(<ExcelViewer content={sampleXlsx} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Orders', 'People'])
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(tabs[1])

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Ada Lovelace' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Item' })).not.toBeInTheDocument()
  })

  it('resets to the first sheet when the content prop changes to a different workbook', () => {
    const { rerender } = render(<ExcelViewer content={sampleXlsx} />)
    fireEvent.click(screen.getAllByRole('tab')[1])
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()

    const otherXlsx = inMemoryWorkbookBase64('OnlySheet', [['Color'], ['Red'], ['Blue']])
    rerender(<ExcelViewer content={otherXlsx} />)
    expect(screen.getByRole('columnheader', { name: 'Color' })).toBeInTheDocument()
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it("shows a fallback message for a corrupted workbook, and doesn't crash", () => {
    render(<ExcelViewer content={brokenXlsx} />)
    expect(screen.getByText("This file can't be previewed as an Excel workbook.")).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('never issues a network request while parsing', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ExcelViewer content={sampleXlsx} />)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('shows a chart indicator only on the sheet SheetJS flags as chart-typed, and no indicator elsewhere', () => {
    render(<ExcelViewer content={chartXlsx} />)
    // Active (first) sheet has no chart.
    expect(screen.queryByText(/contains a chart/)).not.toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    const chartTabIndex = tabs.findIndex((tab) => tab.textContent === 'ChartSheet')
    expect(chartTabIndex).toBeGreaterThan(-1)
    fireEvent.click(tabs[chartTabIndex])

    expect(screen.getByText(/contains a chart/)).toBeInTheDocument()
  })

  it('shows no chart indicator on any sheet of a chart-free workbook', () => {
    render(<ExcelViewer content={sampleXlsx} />)
    const tabs = screen.getAllByRole('tab')
    for (const tab of tabs) {
      fireEvent.click(tab)
      expect(screen.queryByText(/contains a chart/)).not.toBeInTheDocument()
    }
  })

  it('never issues a network request while rendering the chart indicator', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<ExcelViewer content={chartXlsx} />)
    const tabs = screen.getAllByRole('tab')
    fireEvent.click(tabs[tabs.findIndex((tab) => tab.textContent === 'ChartSheet')])
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
