import { describe, expect, it } from 'vitest'
import { evaluateFormula, geometryPaths, isLinePreset } from './geometry'
import type { CustomPath, Geometry } from './model'

const PRESETS = `ellipse flowChartConnector roundRect flowChartAlternateProcess flowChartTerminator round2SameRect round1Rect snip1Rect
  snip2SameRect triangle flowChartExtract flowChartMerge rtTriangle diamond flowChartDecision parallelogram flowChartInputOutput trapezoid
  flowChartManualInput flowChartManualOperation pentagon hexagon flowChartPreparation heptagon octagon decagon dodecagon homePlate
  flowChartOffpageConnector chevron rightArrow leftArrow upArrow downArrow leftRightArrow notchedRightArrow plus mathPlus star4 star5 star6
  star7 star8 star10 star12 donut frame pie arc blockArc chord wedgeRectCallout wedgeRoundRectCallout wedgeEllipseCallout can
  flowChartDocument heart cloud cloudCallout moon teardrop lightningBolt sun cube foldedCorner corner halfFrame diagStripe snip2DiagRect
  plaque snipRoundRect round2DiagRect bevel flowChartDelay flowChartPunchedCard flowChartCollate flowChartSort flowChartMagneticDisk
  flowChartMagneticDrum flowChartOr flowChartSummingJunction flowChartMagneticTape upDownArrow stripedRightArrow mathMinus mathEqual
  mathMultiply line straightConnector1 bentConnector2 bentConnector3 bentConnector4 bentConnector5 curvedConnector2 curvedConnector3
  curvedConnector4 curvedConnector5 leftBracket rightBracket leftBrace rightBrace bracketPair bracePair rect someUnknownShape`.split(/\s+/)

const preset = (name: string, adj: Record<string, number> = {}): Geometry => ({ kind: 'preset', name, adj })

describe('preset geometry', () => {
  it.each(PRESETS)('draws %s as a finite SVG path', (name) => {
    for (const [w, h] of [[200, 100], [80, 160]]) {
      const [path] = geometryPaths(preset(name), w, h)
      expect(path.d).toMatch(/^M/)
      expect(path.d).not.toMatch(/NaN|Infinity/)
      expect(path.stroke).toBe(true)
      expect(path.fill).toBe(!isLinePreset(name))
    }
  })

  it('honors adjustment values', () => {
    expect(geometryPaths(preset('triangle', { adj: 0 }), 100, 100)[0].d).toBe('M0 0 L100 100 L0 100 Z')
    expect(geometryPaths(preset('roundRect', { adj: 0 }), 100, 50)[0].d).toBe('M0 0 L100 0 L100 50 L0 50 Z')
    expect(geometryPaths(preset('pie', { adj1: 0, adj2: 5400000 }), 100, 100)[0].d).toContain('L50 50 Z')
    expect(geometryPaths(preset('chord', { adj1: 0, adj2: 0 }), 100, 100)[0].d).toMatch(/ Z$/)
    expect(geometryPaths(preset('wedgeRectCallout', { adj1: 60000, adj2: 0 }), 100, 100)[0].d).toContain('L110 50')
  })

  it('classifies line presets', () => {
    expect(isLinePreset('line')).toBe(true)
    expect(isLinePreset('rect')).toBe(false)
  })
})

describe('shape guide formulas', () => {
  const vars = { w: 200, h: 100, a: 3 }
  it.each([
    ['*/ w 1 2', 100], ['*/ 1 2 0', 0], ['+- w 10 20', 190], ['+/ 10 20 2', 15], ['+/ 1 1 0', 0],
    ['?: 1 5 6', 5], ['?: -1 5 6', 6], ['abs -4', 4], ['at2 1 0', 0], ['cat2 10 1 0', 10], ['cos 10 0', 10],
    ['max 3 a', 3], ['min 3 1', 1], ['mod 3 4 0', 5], ['pin 0 5 10', 5], ['pin 0 -5 10', 0], ['pin 0 50 10', 10],
    ['sat2 10 0 1', 10], ['sin 10 5400000', 10], ['sqrt 16', 4], ['sqrt -4', 0], ['tan 10 0', 0], ['val 7', 7], ['val unknown', 0], ['val', 0],
  ])('evaluates %s', (fmla, expected) => {
    expect(evaluateFormula(fmla as string, vars)).toBeCloseTo(expected as number)
  })
})

describe('custom geometry', () => {
  const custom = (paths: CustomPath[], guides: { name: string; fmla: string }[] = [], adj: Record<string, number> = {}): Geometry => ({ kind: 'custom', guides, adj, paths })

  it('scales path coordinates from the path space and evaluates guides', () => {
    const [path] = geometryPaths(custom([{
      w: 10,
      h: 10,
      fill: true,
      stroke: false,
      commands: [
        { op: 'M', pts: [['0', '0']] },
        { op: 'L', pts: [['half', '10']] },
        { op: 'C', pts: [['1', '1'], ['2', '2'], ['3', '3']] },
        { op: 'Q', pts: [['4', '4'], ['5', '5']] },
        { op: 'L', pts: [] },
        { op: 'Z' },
      ],
    }], [{ name: 'half', fmla: '*/ w 1 2' }]), 100, 50)
    expect(path).toEqual({ d: 'M0 0 L50 50 C10 5 20 10 30 15 Q40 20 50 25 Z', fill: true, stroke: false })
  })

  it('uses the shape size when the path has none, and draws arcs from the current point', () => {
    const [path] = geometryPaths(custom([{
      w: null,
      h: 0,
      fill: false,
      stroke: true,
      commands: [
        { op: 'M', pts: [['w', 'vc']] },
        { op: 'A', wR: 'wd2', hR: 'hd2', stAng: '0', swAng: 'cd2' },
        { op: 'A', wR: 'wd2', hR: 'hd2', stAng: 'cd2', swAng: '-21600000' },
      ],
    }], [], {}), 100, 50)
    expect(path.d).toBe('M100 25 A50 25 0 0 1 0 25 A50 25 0 0 0 100 25 A50 25 0 0 0 0 25')
  })

  it('keeps adjust values available to guides', () => {
    const [path] = geometryPaths(custom([{ w: 100, h: 100, fill: true, stroke: true, commands: [{ op: 'M', pts: [['x', 'adj']] }] }], [{ name: 'x', fmla: 'val adj' }], { adj: 30 }), 100, 100)
    expect(path.d).toBe('M30 30')
  })
})
