import type { ReactNode } from 'react'
import type { Box, ChartModel } from './model'

// A compact SVG rendering of a chart from its cached values: enough to read the data and its shape
// (bars, lines, slices, legend, value axis), not a reproduction of every chart formatting option.

const FONT = 12

function niceStep(range: number, targetTicks: number): number {
  const rough = range / Math.max(1, targetTicks)
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const nice = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10
  return nice * magnitude
}

export function valueScale(min: number, max: number, headroom = true): { min: number; max: number; ticks: number[] } {
  const low = Math.min(0, min)
  // Like Office's automatic axis bounds, leave a little headroom above the largest value.
  const high = max <= low ? low + 1 : max + (headroom ? (max - low) * 0.05 : 0)
  const step = niceStep(high - low, 5)
  const start = Math.floor(low / step) * step
  const end = Math.ceil(high / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) ticks.push(Math.round(value * 1e9) / 1e9)
  return { min: start, max: end, ticks }
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1e6) return `${Math.round(value / 1e5) / 10}M`
  if (Math.abs(value) >= 1e4) return `${Math.round(value / 100) / 10}k`
  return String(Math.round(value * 100) / 100)
}

function Legend({ chart, x, y, entries, horizontal }: { chart: ChartModel; x: number; y: number; entries: { label: string; color: string }[]; horizontal: boolean }) {
  let offset = 0
  return (
    <g>
      {entries.map((entry, index) => {
        const position = horizontal ? `translate(${x + offset}, ${y})` : `translate(${x}, ${y + index * (FONT + 6)})`
        offset += FONT * 2 + entry.label.length * FONT * 0.55
        return (
          <g key={index} transform={position}>
            <rect width={FONT - 2} height={FONT - 2} fill={entry.color} />
            <text x={FONT + 2} y={FONT - 2} fontSize={FONT} fill={chart.textColor}>{entry.label}</text>
          </g>
        )
      })}
    </g>
  )
}

function PieChart({ chart, width, height }: { chart: ChartModel; width: number; height: number }) {
  const series = chart.series[0]
  const values = series.values.map((value) => Math.max(0, value ?? 0))
  const total = values.reduce((sum, value) => sum + value, 0) || 1
  const radius = Math.max(1, Math.min(width, height) / 2 - 4)
  const cx = width / 2
  const cy = height / 2
  const inner = chart.type === 'doughnut' ? radius * 0.5 : 0
  let angle = -Math.PI / 2
  const slices: ReactNode[] = values.map((value, index) => {
    const sweep = (value / total) * Math.PI * 2
    const start = angle
    angle += sweep
    const color = series.pointColors?.[index] ?? series.color
    if (sweep >= Math.PI * 2 - 1e-6) {
      return <circle key={index} cx={cx} cy={cy} r={radius} fill={color} />
    }
    const large = sweep > Math.PI ? 1 : 0
    const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
    const d = inner > 0
      ? `M${p(radius, start)} A${radius} ${radius} 0 ${large} 1 ${p(radius, angle)} L${p(inner, angle)} A${inner} ${inner} 0 ${large} 0 ${p(inner, start)} Z`
      : `M${cx} ${cy} L${p(radius, start)} A${radius} ${radius} 0 ${large} 1 ${p(radius, angle)} Z`
    return <path key={index} d={d} fill={color} stroke="#ffffff" strokeWidth="1" />
  })
  return <g>{slices}</g>
}

function AxisChart({ chart, width, height }: { chart: ChartModel; width: number; height: number }) {
  const horizontal = chart.type === 'bar'
  const stacked = chart.grouping === 'stacked' || chart.grouping === 'percentStacked'
  const percent = chart.grouping === 'percentStacked'
  const count = Math.max(chart.categories.length, ...chart.series.map((series) => series.values.length))
  if (count === 0) return null

  const totals = Array.from({ length: count }, (_, index) => chart.series.reduce((sum, series) => sum + Math.abs(series.values[index] ?? 0), 0) || 1)
  const valueAt = (seriesIndex: number, index: number) => {
    const raw = chart.series[seriesIndex].values[index] ?? 0
    return percent ? (raw / totals[index]) * 100 : raw
  }
  let min = 0
  let max = 0
  for (let index = 0; index < count; index += 1) {
    let positive = 0
    let negative = 0
    chart.series.forEach((_, seriesIndex) => {
      const value = valueAt(seriesIndex, index)
      if (stacked) {
        if (value >= 0) positive += value
        else negative += value
      } else {
        max = Math.max(max, value)
        min = Math.min(min, value)
      }
    })
    if (stacked) {
      max = Math.max(max, positive)
      min = Math.min(min, negative)
    }
  }
  const scale = valueScale(min, max, !percent)
  const axisSpace = horizontal ? FONT * 1.6 : FONT * 3.2
  const categorySpace = horizontal ? FONT * 5 : FONT * 1.8
  const plot = horizontal
    ? { x: categorySpace, y: 4, w: Math.max(1, width - categorySpace - 8), h: Math.max(1, height - axisSpace - 4) }
    : { x: axisSpace, y: 4, w: Math.max(1, width - axisSpace - 8), h: Math.max(1, height - categorySpace - 4) }
  const valuePos = (value: number) => {
    const fraction = (value - scale.min) / (scale.max - scale.min || 1)
    return horizontal ? plot.x + fraction * plot.w : plot.y + plot.h - fraction * plot.h
  }
  const band = (horizontal ? plot.h : plot.w) / count
  const bandStart = (index: number) => (horizontal ? plot.y : plot.x) + index * band

  const grid = scale.ticks.map((tick) => {
    const position = valuePos(tick)
    return horizontal ? (
      <g key={tick}>
        <line x1={position} x2={position} y1={plot.y} y2={plot.y + plot.h} stroke={chart.gridColor} strokeWidth="1" />
        <text x={position} y={plot.y + plot.h + FONT + 2} fontSize={FONT} fill={chart.textColor} textAnchor="middle">{formatTick(tick)}</text>
      </g>
    ) : (
      <g key={tick}>
        <line x1={plot.x} x2={plot.x + plot.w} y1={position} y2={position} stroke={chart.gridColor} strokeWidth="1" />
        <text x={plot.x - 4} y={position + FONT / 3} fontSize={FONT} fill={chart.textColor} textAnchor="end">{formatTick(tick)}</text>
      </g>
    )
  })

  const labelEvery = Math.max(1, Math.ceil(count / Math.max(1, (horizontal ? plot.h : plot.w) / (FONT * 4))))
  const labels = chart.categories.slice(0, count).map((label, index) => {
    if (index % labelEvery !== 0) return null
    const center = bandStart(index) + band / 2
    return horizontal ? (
      <text key={index} x={plot.x - 4} y={center + FONT / 3} fontSize={FONT} fill={chart.textColor} textAnchor="end">{label}</text>
    ) : (
      <text key={index} x={center} y={plot.y + plot.h + FONT + 2} fontSize={FONT} fill={chart.textColor} textAnchor="middle">{label}</text>
    )
  })

  const marks: ReactNode[] = []
  if (chart.type === 'bar' || chart.type === 'column') {
    const gap = band * 0.2
    const groupWidth = band - gap * 2
    const barWidth = stacked ? groupWidth : groupWidth / chart.series.length
    const offsets = new Array(count).fill(0).map(() => ({ positive: 0, negative: 0 }))
    chart.series.forEach((series, seriesIndex) => {
      for (let index = 0; index < count; index += 1) {
        const value = valueAt(seriesIndex, index)
        let base = 0
        if (stacked) {
          base = value >= 0 ? offsets[index].positive : offsets[index].negative
          if (value >= 0) offsets[index].positive += value
          else offsets[index].negative += value
        }
        const from = valuePos(base)
        const to = valuePos(base + value)
        const along = bandStart(index) + gap + (stacked ? 0 : seriesIndex * barWidth)
        const color = series.pointColors?.[index] ?? series.color
        marks.push(horizontal
          ? <rect key={`${seriesIndex}-${index}`} x={Math.min(from, to)} y={along} width={Math.abs(to - from)} height={barWidth} fill={color} />
          : <rect key={`${seriesIndex}-${index}`} x={along} y={Math.min(from, to)} width={barWidth} height={Math.abs(to - from)} fill={color} />)
      }
    })
  } else {
    const cumulative = new Array(count).fill(0)
    chart.series.forEach((series, seriesIndex) => {
      const xs = (series.xValues ?? []).map((value) => value ?? 0)
      const xMin = xs.length > 0 ? Math.min(...xs) : 0
      const xRange = (xs.length > 0 ? Math.max(...xs) : 0) - xMin || 1
      const points: [number, number][] = []
      const bases: [number, number][] = []
      for (let index = 0; index < count; index += 1) {
        if ((series.values[index] ?? null) === null && !stacked) continue
        const base = stacked ? cumulative[index] : 0
        const value = valueAt(seriesIndex, index) + base
        if (stacked) cumulative[index] = value
        const x = chart.type === 'scatter' && series.xValues
          ? plot.x + (((series.xValues[index] ?? xMin) - xMin) / xRange) * plot.w
          : bandStart(index) + band / 2
        points.push([x, valuePos(value)])
        bases.push([x, valuePos(base)])
      }
      if (points.length === 0) return
      const d = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')
      if (chart.type === 'area') {
        const back = [...bases].reverse().map(([x, y]) => `L${x} ${y}`).join(' ')
        marks.push(<path key={seriesIndex} d={`${d} ${back} Z`} fill={series.color} fillOpacity={0.85} />)
      } else if (chart.type === 'scatter') {
        points.forEach(([x, y], index) => marks.push(<circle key={`${seriesIndex}-${index}`} cx={x} cy={y} r={3} fill={series.color} />))
      } else {
        marks.push(<path key={seriesIndex} d={d} fill="none" stroke={series.color} strokeWidth={2.25} strokeLinejoin="round" />)
      }
    })
  }

  return (
    <g>
      {grid}
      {marks}
      {chart.type === 'scatter' ? null : labels}
    </g>
  )
}

export function ChartView({ chart, box }: { chart: ChartModel; box: Box }) {
  const width = Math.max(box.w, 1)
  const height = Math.max(box.h, 1)
  const titleHeight = chart.title ? FONT * 2 : 0
  const pie = chart.type === 'pie' || chart.type === 'doughnut'
  const legendEntries = pie
    ? chart.categories.map((label, index) => ({ label, color: chart.series[0].pointColors?.[index] ?? chart.series[0].color }))
    : chart.series.map((series) => ({ label: series.name, color: series.color }))
  const longestLabel = Math.max(0, ...legendEntries.map((entry) => entry.label.length))
  const sideLegend = chart.showLegend && (chart.legendPosition === 'r' || chart.legendPosition === 'l')
  const rowLegend = chart.showLegend && !sideLegend
  const legendWidth = sideLegend ? Math.min(width * 0.35, FONT * 2 + longestLabel * FONT * 0.6) : 0
  const legendHeight = rowLegend ? FONT * 2 : 0
  const legendRowWidth = legendEntries.reduce((sum, entry) => sum + FONT * 2 + entry.label.length * FONT * 0.55, 0)
  const plotWidth = Math.max(1, width - legendWidth)
  const plotHeight = Math.max(1, height - titleHeight - legendHeight)
  const plotX = chart.legendPosition === 'l' ? legendWidth : 0
  const plotY = titleHeight + (chart.legendPosition === 't' ? legendHeight : 0)
  let legend: ReactNode = null
  if (sideLegend) {
    const legendY = titleHeight + Math.max(0, (plotHeight - legendEntries.length * (FONT + 6)) / 2)
    legend = <Legend chart={chart} x={chart.legendPosition === 'l' ? 4 : plotWidth + 4} y={legendY} entries={legendEntries} horizontal={false} />
  } else if (rowLegend) {
    const legendY = chart.legendPosition === 't' ? titleHeight + FONT * 0.4 : height - legendHeight + FONT * 0.4
    legend = <Legend chart={chart} x={Math.max(0, (width - legendRowWidth) / 2)} y={legendY} entries={legendEntries} horizontal />
  }
  return (
    <div className="pptx-viewer-shape pptx-viewer-chart" style={{ position: 'absolute', left: `${box.x}px`, top: `${box.y}px`, width: `${width}px`, height: `${height}px` }}>
      <svg width={width} height={height} role="img" aria-label={chart.title ? `Chart: ${chart.title}` : 'Chart'} style={{ fontFamily: 'Calibri, Carlito, Arial, sans-serif' }}>
        {chart.title ? (
          <text x={width / 2} y={FONT * 1.4} fontSize={FONT * 1.3} fill={chart.textColor} textAnchor="middle">{chart.title}</text>
        ) : null}
        <g transform={`translate(${plotX}, ${plotY})`}>
          {pie
            ? <PieChart chart={chart} width={plotWidth} height={plotHeight} />
            : <AxisChart chart={chart} width={plotWidth} height={plotHeight} />}
        </g>
        {legend}
      </svg>
    </div>
  )
}
