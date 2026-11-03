// Test helper: the chart.xlsx fixture (a data sheet plus a chartsheet) changed with JSZip, so
// SheetJS still reads the sheets while the package carries the chart parts under test.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { relsXml } from '../ooxml/test-support'

const C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main'

const salesChart = `<c:chartSpace xmlns:c="${C}" xmlns:a="${A}"><c:chart><c:title/><c:plotArea><c:lineChart><c:ser><c:tx><c:v>Sales</c:v></c:tx><c:cat><c:strRef><c:strCache><c:ptCount val="3"/><c:pt idx="0"><c:v>Jan</c:v></c:pt><c:pt idx="1"><c:v>Feb</c:v></c:pt><c:pt idx="2"><c:v>Mar</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:numCache><c:ptCount val="3"/><c:pt idx="0"><c:v>100</c:v></c:pt><c:pt idx="1"><c:v>150</c:v></c:pt><c:pt idx="2"><c:v>130</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:lineChart></c:plotArea></c:chart></c:chartSpace>`
const surfaceChart = `<c:chartSpace xmlns:c="${C}"><c:chart><c:plotArea><c:surfaceChart/></c:plotArea></c:chart></c:chartSpace>`

const anchor = (col: number, relId: string, name: string) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${col + 6}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>15</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="${name}"/></xdr:nvGraphicFramePr><a:graphic><a:graphicData uri="${C}"><c:chart r:id="${relId}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`

export async function buildEmbeddedChartWorkbook(options: { chartsheetWithoutDrawing?: boolean } = {}): Promise<string> {
  const zip = await JSZip.loadAsync(readFileSync(join(process.cwd(), 'src/test-fixtures/chart.xlsx')))
  if (options.chartsheetWithoutDrawing) {
    const chartsheet = await zip.file('xl/chartsheets/sheet1.xml')!.async('text')
    zip.file('xl/chartsheets/sheet1.xml', chartsheet.replace(/<drawing [^>]*\/>/, ''))
  } else {
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('text')
    zip.file('xl/worksheets/sheet1.xml', sheet
      .replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ')
      .replace('</worksheet>', '<drawing r:id="rIdD"/></worksheet>'))
    zip.file('xl/worksheets/_rels/sheet1.xml.rels', relsXml([{ id: 'rIdD', type: 'drawing', target: '../drawings/drawing2.xml' }]))
    zip.file('xl/drawings/drawing2.xml', `<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${A}" xmlns:c="${C}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchor(3, 'rId1', 'Sales chart')}${anchor(10, 'rId2', 'Surface')}</xdr:wsDr>`)
    zip.file('xl/drawings/_rels/drawing2.xml.rels', relsXml([
      { id: 'rId1', type: 'chart', target: '../charts/chart2.xml' },
      { id: 'rId2', type: 'chart', target: '../charts/chart3.xml' },
    ]))
    zip.file('xl/charts/chart2.xml', salesChart)
    zip.file('xl/charts/chart3.xml', surfaceChart)
  }
  return zip.generateAsync({ type: 'base64' })
}
