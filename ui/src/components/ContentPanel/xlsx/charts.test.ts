import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { relsXml, THEME_XML, type Rel } from '../ooxml/test-support'
import { anchorLayout, columnName, fillMissingCaches, loadWorkbookCharts } from './charts'

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'

const CHART = (title: string, type = 'barChart') => `<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>${title}</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:${type}><c:barDir val="col"/><c:ser><c:idx val="0"/><c:tx><c:v>Sales</c:v></c:tx><c:cat><c:strRef><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>Q1</c:v></c:pt><c:pt idx="1"><c:v>Q2</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>3</c:v></c:pt><c:pt idx="1"><c:v>5</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:${type}></c:plotArea><c:legend><c:legendPos val="b"/></c:legend></c:chart></c:chartSpace>`

const frame = (relId: string, name = 'Chart 1') => `<xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${name}"/></xdr:nvGraphicFramePr><a:graphic><a:graphicData uri="${C}"><c:chart r:id="${relId}"/></a:graphicData></a:graphic></xdr:graphicFrame>`
const cell = (tag: string, col: number, row: number, colOff = 0, rowOff = 0) => `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>${colOff}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${rowOff}</xdr:rowOff></xdr:${tag}>`
const drawing = (anchors: string) => `<xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}" xmlns:c="${C}" xmlns:r="${R}">${anchors}</xdr:wsDr>`

interface Sheet {
  name: string
  kind?: 'worksheets' | 'chartsheets'
  drawing?: string
  drawingRels?: Rel[]
  noDrawingRel?: boolean
}

async function buildWorkbook(sheets: Sheet[], options: { theme?: boolean } = {}): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('_rels/.rels', relsXml([{ id: 'rId1', type: 'officeDocument', target: 'xl/workbook.xml' }]))
  const workbookRels: Rel[] = []
  if (options.theme !== false) {
    zip.file('xl/theme/theme1.xml', THEME_XML)
    workbookRels.push({ id: 'rIdTheme', type: 'theme', target: 'theme/theme1.xml' })
  }
  const sheetElements = sheets.map((sheet, index) => {
    const kind = sheet.kind ?? 'worksheets'
    const part = `xl/${kind}/sheet${index + 1}.xml`
    workbookRels.push({ id: `rId${index + 1}`, type: kind === 'worksheets' ? 'worksheet' : 'chartsheet', target: `${kind}/sheet${index + 1}.xml` })
    const root = kind === 'worksheets' ? 'worksheet' : 'chartsheet'
    zip.file(part, `<${root} xmlns="${MAIN}" xmlns:r="${R}"><sheetData/>${sheet.drawing === undefined && !sheet.noDrawingRel ? '' : '<drawing r:id="rIdD"/>'}</${root}>`)
    if (sheet.drawing !== undefined) {
      zip.file(`xl/${kind}/_rels/sheet${index + 1}.xml.rels`, relsXml([{ id: 'rIdD', type: 'drawing', target: `../drawings/drawing${index + 1}.xml` }]))
      zip.file(`xl/drawings/drawing${index + 1}.xml`, sheet.drawing)
      zip.file(`xl/drawings/_rels/drawing${index + 1}.xml.rels`, relsXml(sheet.drawingRels ?? []))
    }
    return `<sheet name="${sheet.name}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
  })
  zip.file('xl/workbook.xml', `<workbook xmlns="${MAIN}" xmlns:r="${R}"><sheets>${sheetElements.join('')}<sheet name="NoRel" sheetId="99"/></sheets></workbook>`)
  zip.file('xl/_rels/workbook.xml.rels', relsXml(workbookRels))
  zip.file('xl/charts/chart1.xml', CHART('Revenue'))
  zip.file('xl/charts/chart2.xml', CHART('Pie-less', 'surfaceChart'))
  return zip.generateAsync({ type: 'uint8array' })
}

describe('xlsx charts', () => {
  it('names columns like Excel', () => {
    expect([0, 25, 26, 27, 701, 702].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA'])
  })

  it('reads a chart embedded in a worksheet, with its anchor cell and size', async () => {
    const bytes = await buildWorkbook([
      { name: 'Data' },
      {
        name: 'Report',
        drawing: drawing(`<xdr:twoCellAnchor>${cell('from', 4, 1)}${cell('to', 10, 16, 9525 * 10, 0)}${frame('rId1', 'Revenue chart')}<xdr:clientData/></xdr:twoCellAnchor>`),
        drawingRels: [{ id: 'rId1', type: 'chart', target: '../charts/chart1.xml' }],
      },
    ])
    const charts = await loadWorkbookCharts(bytes)
    expect([...charts.keys()]).toEqual(['Report'])
    const [item] = charts.get('Report') ?? []
    expect(item.cell).toBe('E2')
    expect(item.name).toBe('Revenue chart')
    expect(item.widthPx).toBe(6 * 64 + 10)
    expect(item.heightPx).toBe(15 * 20)
    expect(item.chart?.title).toBe('Revenue')
    expect(item.chart?.categories).toEqual(['Q1', 'Q2'])
    expect(item.chart?.series[0].values).toEqual([3, 5])
    expect(item.chart?.series[0].color).toBe('#4f81bd')
  })

  it('reads chartsheets, grouped charts and unsupported chart types, and skips broken references', async () => {
    const bytes = await buildWorkbook([
      {
        name: 'ChartSheet',
        kind: 'chartsheets',
        drawing: drawing(`<xdr:absoluteAnchor><xdr:pos x="0" y="0"/><xdr:ext cx="0" cy="0"/>${frame('rId1', ' ')}<xdr:clientData/></xdr:absoluteAnchor>`),
        drawingRels: [{ id: 'rId1', type: 'chart', target: '../charts/chart1.xml' }],
      },
      {
        name: 'Mixed',
        drawing: drawing([
          `<xdr:oneCellAnchor>${cell('from', 0, 0)}<xdr:ext cx="${9525 * 300}" cy="${9525 * 200}"/><xdr:grpSp>${frame('rId2')}${frame('rId1')}</xdr:grpSp></xdr:oneCellAnchor>`,
          `<xdr:twoCellAnchor>${cell('from', 2, 2)}${cell('to', 2, 2)}${frame('rIdExternal')}${frame('rIdMissing')}${frame('rIdNoPart')}</xdr:twoCellAnchor>`,
          `<xdr:twoCellAnchor>${frame('rId1')}</xdr:twoCellAnchor>`,
          `<xdr:sp/>`,
        ].join('')),
        drawingRels: [
          { id: 'rId1', type: 'chart', target: '../charts/chart1.xml' },
          { id: 'rId2', type: 'chart', target: '../charts/chart2.xml' },
          { id: 'rIdExternal', type: 'chart', target: 'https://example.com/chart.xml', external: true },
          { id: 'rIdNoPart', type: 'chart', target: '../charts/chart9.xml' },
        ],
      },
      { name: 'BrokenDrawing', noDrawingRel: true },
      { name: 'EmptyDrawing', drawing: drawing('') },
      { name: 'MissingDrawingPart', drawing: undefined },
    ], { theme: false })
    const charts = await loadWorkbookCharts(bytes)
    expect([...charts.keys()]).toEqual(['ChartSheet', 'Mixed'])

    const [sheetChart] = charts.get('ChartSheet') ?? []
    expect(sheetChart).toMatchObject({ cell: null, name: null, widthPx: 480, heightPx: 288 })

    const mixed = charts.get('Mixed') ?? []
    expect(mixed.map((item) => [item.cell, item.widthPx, item.heightPx, item.chart?.title ?? null])).toEqual([
      ['A1', 300, 200, null],
      ['A1', 300, 200, 'Revenue'],
      [null, 480, 288, 'Revenue'],
    ])
  })

  it('returns no charts for bytes that are not an OOXML workbook', async () => {
    expect((await loadWorkbookCharts(new Uint8Array([1, 2, 3]))).size).toBe(0)
    const zip = new JSZip()
    zip.file('hello.txt', 'hi')
    expect((await loadWorkbookCharts(await zip.generateAsync({ type: 'uint8array' }))).size).toBe(0)
  })

  it('sizes anchors within limits', () => {
    const doc = new DOMParser().parseFromString(
      drawing(`<xdr:oneCellAnchor><xdr:ext cx="${9525 * 5000}" cy="${9525 * 10}"/></xdr:oneCellAnchor>`),
      'application/xml',
    )
    expect(anchorLayout(doc.documentElement.firstElementChild as Element)).toEqual({ cell: null, widthPx: 1200, heightPx: 160 })
  })

  it('fills caches missing from a chart from the referenced cells, and keeps existing caches', () => {
    const doc = new DOMParser().parseFromString(
      `<c:chartSpace xmlns:c="${C}"><c:ser><c:tx><c:strRef><c:f>'Q''s'!B1</c:f></c:strRef></c:tx>
        <c:cat><c:strRef><c:f>Data!$A$2:$A$3</c:f></c:strRef></c:cat>
        <c:val><c:numRef><c:f>Data!$B$2:$B$3</c:f></c:numRef></c:val>
        <c:x><c:numRef><c:f>Unknown!A1</c:f></c:numRef></c:x>
        <c:y><c:numRef><c:f/></c:numRef></c:y>
        <c:z><c:numRef><c:f>Data!C1</c:f><c:numCache><c:ptCount val="0"/></c:numCache></c:numRef></c:z></c:ser></c:chartSpace>`,
      'application/xml',
    )
    const cells: Record<string, { text: string; number: number | null }[]> = {
      "'Q''s'!B1": [{ text: 'Sales', number: null }],
      'Data!$A$2:$A$3': [{ text: 'Jan', number: null }, { text: 'Feb', number: null }],
      'Data!$B$2:$B$3': [{ text: '10', number: 10 }, { text: '', number: null }],
    }
    fillMissingCaches(doc.documentElement, (reference) => cells[reference] ?? null)
    const caches = Array.from(doc.getElementsByTagNameNS(C, '*')).filter((element) => element.localName.endsWith('Cache'))
    expect(caches.map((cache) => new XMLSerializer().serializeToString(cache).replace(/ xmlns:c="[^"]+"/g, ''))).toEqual([
      '<c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Sales</c:v></c:pt></c:strCache>',
      '<c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>Jan</c:v></c:pt><c:pt idx="1"><c:v>Feb</c:v></c:pt></c:strCache>',
      '<c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>10</c:v></c:pt></c:numCache>',
      '<c:numCache><c:ptCount val="0"/></c:numCache>',
    ])
  })
})
