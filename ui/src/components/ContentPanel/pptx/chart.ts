import { resolveColor, toCss } from './color'
import type { PartScope } from './fill'
import { parseFill } from './fill'
import type { ChartModel, ChartSeries } from './model'
import { attr, child, children, contentChildren, path } from './xml'

// Chart parts cache the values they were last drawn with (c:strCache / c:numCache), so a chart
// can be redrawn from the .pptx alone without the embedded workbook.

const CHART_TYPES: Record<string, ChartModel['type']> = {
  barChart: 'column', bar3DChart: 'column', lineChart: 'line', line3DChart: 'line',
  areaChart: 'area', area3DChart: 'area', pieChart: 'pie', pie3DChart: 'pie', ofPieChart: 'pie',
  doughnutChart: 'doughnut', scatterChart: 'scatter', bubbleChart: 'scatter', radarChart: 'line',
  stockChart: 'line',
}

const ACCENTS = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6']

function cachePoints(ref: Element | null): Map<number, string> {
  const points = new Map<number, string>()
  if (!ref) return points
  for (const pt of Array.from(ref.getElementsByTagNameNS('*', 'pt'))) {
    const idx = Number(attr(pt, 'idx'))
    const value = child(pt, 'v')?.textContent
    if (Number.isFinite(idx) && value !== null && value !== undefined) points.set(idx, value)
  }
  return points
}

function pointCount(ref: Element | null, points: Map<number, string>): number {
  const declared = Number(attr(ref?.getElementsByTagNameNS('*', 'ptCount')[0] ?? null, 'val'))
  const highest = points.size > 0 ? Math.max(...points.keys()) + 1 : 0
  return Math.max(Number.isFinite(declared) ? declared : 0, highest)
}

function numbers(ref: Element | null): (number | null)[] {
  const points = cachePoints(ref)
  return Array.from({ length: pointCount(ref, points) }, (_, index) => {
    const raw = points.get(index)
    const value = raw === undefined ? NaN : Number(raw)
    return Number.isFinite(value) ? value : null
  })
}

function seriesColor(ser: Element, index: number, scope: PartScope): string {
  const fill = parseFill(child(ser, 'spPr'), scope)
  if (fill?.type === 'solid') return fill.color
  if (fill?.type === 'gradient') return fill.stops[0].color
  const lineColor = resolveColor(path(ser, 'spPr', 'ln', 'solidFill'), scope.colors)
  if (lineColor) return toCss(lineColor)
  return accentColor(index, scope)
}

// Office's automatic chart palette cycles through the theme accents.
function accentColor(index: number, scope: PartScope): string {
  const slot = scope.colors.clrMap[ACCENTS[index % ACCENTS.length]] ?? ACCENTS[index % ACCENTS.length]
  return `#${scope.theme.scheme[slot] ?? '4472C4'}`
}

function richText(element: Element | null): string | null {
  if (!element) return null
  const text = Array.from(element.getElementsByTagNameNS('*', 't')).map((t) => t.textContent ?? '').join('')
  return text.trim().length > 0 ? text : null
}

export function parseChart(chartSpace: Element, scope: PartScope): ChartModel | null {
  const chart = child(chartSpace, 'chart')
  const plotArea = child(chart, 'plotArea')
  const typeElement = contentChildren(plotArea).find((element) => CHART_TYPES[element.localName] !== undefined)
  if (!typeElement) return null

  let type = CHART_TYPES[typeElement.localName]
  if (type === 'column' && attr(child(typeElement, 'barDir'), 'val') === 'bar') type = 'bar'
  const groupingRaw = attr(child(typeElement, 'grouping'), 'val')
  const grouping: ChartModel['grouping'] = groupingRaw === 'stacked' || groupingRaw === 'percentStacked' || groupingRaw === 'clustered' ? groupingRaw : 'standard'
  const varyColors = attr(child(typeElement, 'varyColors'), 'val') === '1'

  let categories: string[] = []
  const series: ChartSeries[] = children(typeElement, 'ser').map((ser, index) => {
    const isScatter = type === 'scatter'
    const valueRef = child(ser, isScatter ? 'yVal' : 'val')
    const values = numbers(valueRef)
    const categoryRef = child(ser, isScatter ? 'xVal' : 'cat')
    if (!isScatter && categories.length === 0) {
      const points = cachePoints(categoryRef)
      categories = Array.from({ length: Math.max(pointCount(categoryRef, points), values.length) }, (_, idx) => points.get(idx) ?? String(idx + 1))
    }
    const color = seriesColor(ser, index, scope)
    let pointColors: string[] | null = null
    if (type === 'pie' || type === 'doughnut' || varyColors) {
      pointColors = values.map((_, pointIndex) => {
        const dPt = children(ser, 'dPt').find((candidate) => attr(child(candidate, 'idx'), 'val') === String(pointIndex))
        const fill = parseFill(child(dPt, 'spPr'), scope)
        if (fill?.type === 'solid') return fill.color
        return accentColor(pointIndex, scope)
      })
    }
    return {
      name: richText(child(ser, 'tx')) ?? child(child(ser, 'tx'), 'v')?.textContent ?? `Series ${index + 1}`,
      color,
      values,
      xValues: isScatter ? numbers(categoryRef) : null,
      pointColors,
    }
  })
  if (series.length === 0) return null

  const titleElement = child(chart, 'title')
  const autoTitleDeleted = attr(child(chart, 'autoTitleDeleted'), 'val') === '1'
  let title = richText(child(titleElement, 'tx'))
  // A title element without text shows PowerPoint's automatic title.
  if (!title && titleElement && !autoTitleDeleted) title = series.length === 1 ? series[0].name : 'Chart Title'
  const legendPosition = attr(path(chart, 'legend', 'legendPos'), 'val')

  const textSlot = scope.colors.clrMap.tx1 ?? 'dk1'
  return {
    type,
    grouping,
    title,
    categories,
    series,
    showLegend: child(chart, 'legend') !== null,
    legendPosition: legendPosition === 'b' || legendPosition === 't' || legendPosition === 'l' ? legendPosition : 'r',
    textColor: `#${scope.theme.scheme[textSlot] ?? '000000'}`,
    gridColor: '#d9d9d9',
  }
}
