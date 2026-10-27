import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '../ooxml/theme'
import { parseChart } from './chart'
import { ChartView, valueScale } from './chart-view'
import type { Box, ChartModel, ChartSeries } from './model'
import { el, scopeFor } from './test-support'

const BOX: Box = { x: 10, y: 20, w: 400, h: 300, rot: 0, flipH: false, flipV: false }

const numRef = (values: (number | string)[], count = values.length) => `<c:numRef><c:numCache><c:ptCount val="${count}"/>${values.map((value, index) => `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`).join('')}</c:numCache></c:numRef>`
const strRef = (values: string[]) => `<c:strRef><c:strCache><c:ptCount val="${values.length}"/>${values.map((value, index) => `<c:pt idx="${index}"><c:v>${value}</c:v></c:pt>`).join('')}</c:strCache></c:strRef>`

async function chartOf(plot: string, extra = '') {
  const scope = await scopeFor({})
  return parseChart(el(`<c:chartSpace><c:chart>${extra}<c:plotArea><c:layout/>${plot}</c:plotArea></c:chart></c:chartSpace>`), scope)
}

describe('parseChart', () => {
  it('reads a clustered column chart from cached values', async () => {
    const chart = await chartOf(`<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/>
      <c:ser><c:tx>${strRef(['Sales'])}</c:tx><c:spPr><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></c:spPr><c:cat>${strRef(['Q1', 'Q2'])}</c:cat><c:val>${numRef([1, 'x'], 3)}</c:val></c:ser>
      <c:ser><c:spPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="00FF00"/></a:gs></a:gsLst></a:gradFill></c:spPr><c:val>${numRef([3, 4])}</c:val></c:ser>
      <c:ser><c:tx><c:v>Literal</c:v></c:tx><c:spPr><a:ln><a:solidFill><a:srgbClr val="0000FF"/></a:solidFill></a:ln></c:spPr><c:val>${numRef([5])}</c:val></c:ser>
      <c:ser><c:val>${numRef([6])}</c:val></c:ser></c:barChart>`, '<c:title/><c:legend><c:legendPos val="b"/></c:legend>')
    expect(chart).toMatchObject({ type: 'column', grouping: 'clustered', title: 'Chart Title', categories: ['Q1', 'Q2', '3'], showLegend: true, legendPosition: 'b', textColor: '#000000' })
    expect(chart?.series.map((series) => series.name)).toEqual(['Sales', 'Series 2', 'Literal', 'Series 4'])
    expect(chart?.series.map((series) => series.color)).toEqual(['#ff0000', '#00ff00', '#0000ff', '#ffc000'])
    expect(chart?.series[0].values).toEqual([1, null, null])
    expect(chart?.series[0].pointColors).toBeNull()
  })

  it('reads bar direction, stacking, titles and legend positions', async () => {
    const bar = await chartOf(`<c:bar3DChart><c:barDir val="bar"/><c:grouping val="percentStacked"/><c:ser><c:tx>${strRef(['Only'])}</c:tx><c:val>${numRef([1])}</c:val></c:ser></c:bar3DChart>`, '<c:title/><c:legend><c:legendPos val="t"/></c:legend>')
    expect(bar).toMatchObject({ type: 'bar', grouping: 'percentStacked', title: 'Only', legendPosition: 't' })
    const titled = await chartOf(`<c:lineChart><c:grouping val="standard"/><c:ser><c:val>${numRef([1])}</c:val></c:ser></c:lineChart>`, '<c:title><c:tx><c:rich><a:p><a:r><a:t>Revenue</a:t></a:r></a:p></c:rich></c:tx></c:title><c:legend><c:legendPos val="l"/></c:legend>')
    expect(titled).toMatchObject({ type: 'line', grouping: 'standard', title: 'Revenue', legendPosition: 'l' })
    const deleted = await chartOf(`<c:areaChart><c:grouping val="stacked"/><c:ser><c:val>${numRef([1])}</c:val></c:ser></c:areaChart>`, '<c:title/><c:autoTitleDeleted val="1"/><c:legend/>')
    expect(deleted).toMatchObject({ type: 'area', grouping: 'stacked', title: null, legendPosition: 'r' })
    const noTitle = await chartOf(`<c:radarChart><c:ser><c:val>${numRef([1])}</c:val></c:ser></c:radarChart>`)
    expect(noTitle).toMatchObject({ type: 'line', title: null, showLegend: false, grouping: 'standard' })
  })

  it('colors pie slices per point', async () => {
    const pie = await chartOf(`<c:pieChart><c:ser><c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:srgbClr val="123456"/></a:solidFill></c:spPr></c:dPt><c:cat>${strRef(['a', 'b', 'c'])}</c:cat><c:val>${numRef([1, 2, 3])}</c:val></c:ser></c:pieChart>`)
    expect(pie?.series[0].pointColors).toEqual(['#4472c4', '#123456', '#a5a5a5'])
    const varied = await chartOf(`<c:barChart><c:varyColors val="1"/><c:ser><c:val>${numRef([1, 2])}</c:val></c:ser></c:barChart>`)
    expect(varied?.series[0].pointColors).toHaveLength(2)
  })

  it('reads scatter x values and ignores charts it cannot draw', async () => {
    const scatter = await chartOf(`<c:scatterChart><c:ser><c:xVal>${numRef([1, 2])}</c:xVal><c:yVal>${numRef([3, 4])}</c:yVal></c:ser></c:scatterChart>`)
    expect(scatter).toMatchObject({ type: 'scatter', categories: [] })
    expect(scatter?.series[0]).toMatchObject({ xValues: [1, 2], values: [3, 4] })
    expect(await chartOf('<c:surfaceChart><c:ser/></c:surfaceChart>')).toBeNull()
    expect(await chartOf('<c:lineChart/>')).toBeNull()
    const empty = await chartOf('<c:lineChart><c:ser><c:val><c:numRef><c:numCache><c:pt idx="bad"><c:v>1</c:v></c:pt><c:pt idx="0"/></c:numCache></c:numRef></c:val></c:ser><c:ser/></c:lineChart>')
    expect(empty?.series[0].values).toEqual([])
    expect(empty?.series[1].values).toEqual([])
  })

  it('falls back to the default palette when the theme lacks accents', async () => {
    const scope = await scopeFor({}, 'ppt/slides/slide1.xml', { ...DEFAULT_THEME, scheme: {} })
    const chart = parseChart(el(`<c:chartSpace><c:chart><c:plotArea><c:lineChart><c:ser><c:val>${numRef([1])}</c:val></c:ser></c:lineChart></c:plotArea></c:chart></c:chartSpace>`), scope)
    expect(chart?.series[0].color).toBe('#4472c4')
    expect(chart?.textColor).toBe('#000000')
  })
})

const series = (values: (number | null)[], extra: Partial<ChartSeries> = {}): ChartSeries => ({ name: 'S', color: '#f00', values, xValues: null, pointColors: null, ...extra })
const model = (overrides: Partial<ChartModel>): ChartModel => ({
  type: 'column', grouping: 'clustered', title: null, categories: ['a', 'b'], series: [series([1, 2])],
  showLegend: false, legendPosition: 'r', textColor: '#000', gridColor: '#ccc', ...overrides,
})

describe('ChartView', () => {
  it('computes nice value axes with headroom', () => {
    expect(valueScale(0, 5)).toEqual({ min: 0, max: 6, ticks: [0, 1, 2, 3, 4, 5, 6] })
    expect(valueScale(0, 100, false).max).toBe(100)
    expect(valueScale(-3, 7).min).toBe(-4)
    expect(valueScale(0, 0).ticks.length).toBeGreaterThan(1)
  })

  it('draws column and bar charts, clustered and stacked', () => {
    const { container, rerender } = render(<ChartView chart={model({ title: 'T', series: [series([1, 2]), series([-1, 3], { pointColors: ['#0f0', '#00f'] })], showLegend: true })} box={BOX} />)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Chart: T')
    expect(container.querySelectorAll('rect[height]').length).toBeGreaterThanOrEqual(4)
    rerender(<ChartView chart={model({ type: 'bar', grouping: 'stacked', series: [series([1, -2]), series([3, -1])], showLegend: true, legendPosition: 'l' })} box={BOX} />)
    expect(container.querySelector('.pptx-viewer-chart')).toHaveStyle({ left: '10px', top: '20px' })
    rerender(<ChartView chart={model({ grouping: 'percentStacked', series: [series([1, 1]), series([3, 0])], showLegend: true, legendPosition: 't' })} box={BOX} />)
    expect(container.textContent).toContain('100')
  })

  it('draws line, stacked area and scatter charts', () => {
    const { container, rerender } = render(<ChartView chart={model({ type: 'line', series: [series([1, null, 3]), series([null, null])], categories: ['a', 'b', 'c'] })} box={BOX} />)
    expect(container.querySelectorAll('path[stroke="#f00"]')).toHaveLength(1)
    rerender(<ChartView chart={model({ type: 'area', grouping: 'stacked', series: [series([1, null]), series([2, 2])] })} box={BOX} />)
    expect(container.querySelectorAll('path[fill-opacity]')).toHaveLength(2)
    rerender(<ChartView chart={model({ type: 'scatter', categories: [], series: [series([1, 2], { xValues: [5, null] }), series([3], { xValues: [] })] })} box={BOX} />)
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  it('draws large values with compact tick labels and thins crowded category labels', () => {
    const categories = Array.from({ length: 60 }, (_, index) => `c${index}`)
    const { container, rerender } = render(<ChartView chart={model({ categories, series: [series(categories.map(() => 2_000_000))] })} box={BOX} />)
    expect(container.textContent).toContain('M')
    expect(container.textContent).not.toContain('c1c')
    rerender(<ChartView chart={model({ series: [series([20_000, 10])] })} box={BOX} />)
    expect(container.textContent).toContain('k')
    rerender(<ChartView chart={model({ categories: [], series: [series([])] })} box={BOX} />)
    expect(container.querySelectorAll('rect')).toHaveLength(0)
  })

  it('draws pie and doughnut charts with a legend per category', () => {
    const { container, rerender } = render(<ChartView chart={model({ type: 'pie', categories: ['a', 'b'], series: [series([1, 3], { pointColors: ['#0f0'] })], showLegend: true })} box={BOX} />)
    expect(container.querySelectorAll('path')).toHaveLength(2)
    expect(container.textContent).toContain('a')
    rerender(<ChartView chart={model({ type: 'doughnut', series: [series([1, null])], showLegend: true, legendPosition: 'b' })} box={BOX} />)
    expect(container.querySelector('circle')).not.toBeNull()
    rerender(<ChartView chart={model({ type: 'doughnut', series: [series([1, 1])] })} box={{ ...BOX, w: 0, h: 0 }} />)
    expect(container.querySelectorAll('path')).toHaveLength(2)
  })
})
