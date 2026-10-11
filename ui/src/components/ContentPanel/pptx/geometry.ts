import type { CustomPath, Geometry } from './model'

export interface GeometryPath {
  d: string
  fill: boolean
  stroke: boolean
}

// Shapes PowerPoint draws as an open outline only (no interior to fill).
const LINE_PRESETS = new Set([
  'line', 'straightConnector1', 'bentConnector2', 'bentConnector3', 'bentConnector4', 'bentConnector5',
  'curvedConnector2', 'curvedConnector3', 'curvedConnector4', 'curvedConnector5', 'arc',
  'leftBracket', 'rightBracket', 'leftBrace', 'rightBrace', 'bracketPair', 'bracePair',
])

export function isLinePreset(name: string): boolean {
  return LINE_PRESETS.has(name)
}

const n = (value: number): string => String(Math.round(value * 100) / 100)

function polygon(points: [number, number][]): string {
  return `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${n(x)} ${n(y)}`).join(' ')} Z`
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${n(cx - rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx + rx)} ${n(cy)} A${n(rx)} ${n(ry)} 0 1 0 ${n(cx - rx)} ${n(cy)} Z`
}

function roundRectPath(w: number, h: number, r: number): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2))
  if (radius === 0) return polygon([[0, 0], [w, 0], [w, h], [0, h]])
  return [
    `M${n(radius)} 0 L${n(w - radius)} 0 A${n(radius)} ${n(radius)} 0 0 1 ${n(w)} ${n(radius)}`,
    `L${n(w)} ${n(h - radius)} A${n(radius)} ${n(radius)} 0 0 1 ${n(w - radius)} ${n(h)}`,
    `L${n(radius)} ${n(h)} A${n(radius)} ${n(radius)} 0 0 1 0 ${n(h - radius)}`,
    `L0 ${n(radius)} A${n(radius)} ${n(radius)} 0 0 1 ${n(radius)} 0 Z`,
  ].join(' ')
}

// Point on an ellipse for a DrawingML angle (degrees, clockwise from the x axis). DrawingML angles
// on ellipses are "visual" angles, so they are converted to the parametric angle first.
function ellipsePoint(cx: number, cy: number, rx: number, ry: number, degrees: number): [number, number] {
  const radians = (degrees * Math.PI) / 180
  const parametric = Math.atan2(rx * Math.sin(radians), ry * Math.cos(radians))
  return [cx + rx * Math.cos(parametric), cy + ry * Math.sin(parametric)]
}

function starPath(w: number, h: number, points: number, innerRatio: number): string {
  const result: [number, number][] = []
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / points
    const ratio = index % 2 === 0 ? 1 : innerRatio
    result.push([w / 2 + (w / 2) * ratio * Math.cos(angle), h / 2 + (h / 2) * ratio * Math.sin(angle)])
  }
  return polygon(result)
}

function regularPolygon(w: number, h: number, sides: number): string {
  const result: [number, number][] = []
  for (let index = 0; index < sides; index += 1) {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides
    result.push([w / 2 + (w / 2) * Math.cos(angle), h / 2 + (h / 2) * Math.sin(angle)])
  }
  return polygon(result)
}

function presetPath(name: string, w: number, h: number, adj: Record<string, number>): string {
  const ss = Math.min(w, h)
  const a = (key: string, fallback: number) => (adj[key] ?? fallback) / 100000
  switch (name) {
    case 'ellipse':
    case 'flowChartConnector':
      return ellipsePath(w / 2, h / 2, w / 2, h / 2)
    case 'roundRect':
      return roundRectPath(w, h, ss * a('adj', 16667))
    case 'flowChartAlternateProcess':
      return roundRectPath(w, h, ss * 0.1667)
    case 'flowChartTerminator':
      return roundRectPath(w, h, Math.min(w, h) / 2)
    case 'round2SameRect': {
      const r = Math.min(ss * a('adj1', 16667), w / 2, h / 2)
      return `M${n(r)} 0 L${n(w - r)} 0 A${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(r)} L${n(w)} ${n(h)} L0 ${n(h)} L0 ${n(r)} A${n(r)} ${n(r)} 0 0 1 ${n(r)} 0 Z`
    }
    case 'round1Rect': {
      const r = Math.min(ss * a('adj', 16667), w / 2, h / 2)
      return `M0 0 L${n(w - r)} 0 A${n(r)} ${n(r)} 0 0 1 ${n(w)} ${n(r)} L${n(w)} ${n(h)} L0 ${n(h)} Z`
    }
    case 'snip1Rect': {
      const s = ss * a('adj', 16667)
      return polygon([[0, 0], [w - s, 0], [w, s], [w, h], [0, h]])
    }
    case 'snip2SameRect': {
      const s = ss * a('adj1', 16667)
      return polygon([[s, 0], [w - s, 0], [w, s], [w, h], [0, h], [0, s]])
    }
    case 'triangle':
    case 'flowChartExtract': {
      const apex = w * a('adj', 50000)
      return polygon([[apex, 0], [w, h], [0, h]])
    }
    case 'flowChartMerge':
      return polygon([[0, 0], [w, 0], [w / 2, h]])
    case 'rtTriangle':
      return polygon([[0, 0], [w, h], [0, h]])
    case 'diamond':
    case 'flowChartDecision':
      return polygon([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])
    case 'parallelogram':
    case 'flowChartInputOutput': {
      const x = name === 'parallelogram' ? ss * a('adj', 25000) : w / 5
      return polygon([[x, 0], [w, 0], [w - x, h], [0, h]])
    }
    case 'trapezoid': {
      const x = ss * a('adj', 25000)
      return polygon([[x, 0], [w - x, 0], [w, h], [0, h]])
    }
    case 'flowChartManualInput':
      return polygon([[0, h / 5], [w, 0], [w, h], [0, h]])
    case 'flowChartManualOperation':
      return polygon([[0, 0], [w, 0], [w * 0.8, h], [w * 0.2, h]])
    case 'pentagon':
      return regularPolygon(w, h, 5)
    case 'hexagon': {
      const x = ss * a('adj', 25000)
      return polygon([[x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h], [0, h / 2]])
    }
    case 'flowChartPreparation': {
      const x = w / 5
      return polygon([[x, 0], [w - x, 0], [w, h / 2], [w - x, h], [x, h], [0, h / 2]])
    }
    case 'heptagon':
      return regularPolygon(w, h, 7)
    case 'octagon': {
      const x = ss * a('adj', 29289)
      return polygon([[x, 0], [w - x, 0], [w, x], [w, h - x], [w - x, h], [x, h], [0, h - x], [0, x]])
    }
    case 'decagon':
      return regularPolygon(w, h, 10)
    case 'dodecagon':
      return regularPolygon(w, h, 12)
    case 'homePlate':
    case 'flowChartOffpageConnector': {
      if (name === 'flowChartOffpageConnector') return polygon([[0, 0], [w, 0], [w, h * 0.8], [w / 2, h], [0, h * 0.8]])
      const x = w - ss * a('adj', 50000)
      return polygon([[0, 0], [x, 0], [w, h / 2], [x, h], [0, h]])
    }
    case 'chevron': {
      const x = ss * a('adj', 50000)
      return polygon([[0, 0], [w - x, 0], [w, h / 2], [w - x, h], [0, h], [x, h / 2]])
    }
    case 'rightArrow': {
      const shaft = h * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const y1 = (h - shaft) / 2
      return polygon([[0, y1], [w - head, y1], [w - head, 0], [w, h / 2], [w - head, h], [w - head, y1 + shaft], [0, y1 + shaft]])
    }
    case 'leftArrow': {
      const shaft = h * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const y1 = (h - shaft) / 2
      return polygon([[w, y1], [head, y1], [head, 0], [0, h / 2], [head, h], [head, y1 + shaft], [w, y1 + shaft]])
    }
    case 'upArrow': {
      const shaft = w * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const x1 = (w - shaft) / 2
      return polygon([[x1, h], [x1, head], [0, head], [w / 2, 0], [w, head], [x1 + shaft, head], [x1 + shaft, h]])
    }
    case 'downArrow': {
      const shaft = w * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const x1 = (w - shaft) / 2
      return polygon([[x1, 0], [x1, h - head], [0, h - head], [w / 2, h], [w, h - head], [x1 + shaft, h - head], [x1 + shaft, 0]])
    }
    case 'leftRightArrow': {
      const shaft = h * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const y1 = (h - shaft) / 2
      return polygon([[0, h / 2], [head, 0], [head, y1], [w - head, y1], [w - head, 0], [w, h / 2], [w - head, h], [w - head, y1 + shaft], [head, y1 + shaft], [head, h]])
    }
    case 'notchedRightArrow': {
      const shaft = h * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const y1 = (h - shaft) / 2
      const notch = (shaft / h) * head * 0.5
      return polygon([[0, y1], [w - head, y1], [w - head, 0], [w, h / 2], [w - head, h], [w - head, y1 + shaft], [0, y1 + shaft], [notch, h / 2]])
    }
    case 'plus':
    case 'mathPlus': {
      const x = ss * a('adj', 25000)
      return polygon([[x, 0], [w - x, 0], [w - x, x], [w, x], [w, h - x], [w - x, h - x], [w - x, h], [x, h], [x, h - x], [0, h - x], [0, x], [x, x]])
    }
    case 'star4': return starPath(w, h, 4, 0.25)
    case 'star5': return starPath(w, h, 5, 0.382)
    case 'star6': return starPath(w, h, 6, 0.577)
    case 'star7': return starPath(w, h, 7, 0.6)
    case 'star8': return starPath(w, h, 8, 0.7)
    case 'star10': return starPath(w, h, 10, 0.75)
    case 'star12': return starPath(w, h, 12, 0.8)
    case 'donut': {
      const t = ss * a('adj', 25000)
      return `${ellipsePath(w / 2, h / 2, w / 2, h / 2)} ${ellipsePath(w / 2, h / 2, Math.max(0, w / 2 - t), Math.max(0, h / 2 - t))}`
    }
    case 'frame': {
      const t = ss * a('adj1', 12500)
      return `${polygon([[0, 0], [w, 0], [w, h], [0, h]])} ${polygon([[t, t], [t, h - t], [w - t, h - t], [w - t, t]])}`
    }
    case 'pie':
    case 'arc':
    case 'blockArc':
    case 'chord': {
      const start = (adj.adj1 ?? (name === 'pie' ? 0 : 16200000)) / 60000
      const end = (adj.adj2 ?? (name === 'pie' ? 16200000 : 0)) / 60000
      const sweep = ((end - start) % 360 + 360) % 360 || 360
      const [x1, y1] = ellipsePoint(w / 2, h / 2, w / 2, h / 2, start)
      const [x2, y2] = ellipsePoint(w / 2, h / 2, w / 2, h / 2, start + sweep)
      const arc = `M${n(x1)} ${n(y1)} A${n(w / 2)} ${n(h / 2)} 0 ${sweep > 180 ? 1 : 0} 1 ${n(x2)} ${n(y2)}`
      if (name === 'arc') return arc
      if (name === 'chord') return `${arc} Z`
      return `${arc} L${n(w / 2)} ${n(h / 2)} Z`
    }
    case 'wedgeRectCallout':
    case 'wedgeRoundRectCallout':
    case 'wedgeEllipseCallout': {
      const tipX = w / 2 + w * a('adj1', -20833)
      const tipY = h / 2 + h * a('adj2', 62500)
      const body = name === 'wedgeEllipseCallout'
        ? ellipsePath(w / 2, h / 2, w / 2, h / 2)
        : roundRectPath(w, h, name === 'wedgeRoundRectCallout' ? ss * 0.1667 : 0)
      // The pointer is a triangle from the tip to a short base on the body's center.
      const baseHalf = Math.min(w, h) / 8
      const horizontal = Math.abs(tipX - w / 2) / w > Math.abs(tipY - h / 2) / h
      const pointer = horizontal
        ? polygon([[w / 2, h / 2 - baseHalf], [tipX, tipY], [w / 2, h / 2 + baseHalf]])
        : polygon([[w / 2 - baseHalf, h / 2], [tipX, tipY], [w / 2 + baseHalf, h / 2]])
      return `${body} ${pointer}`
    }
    case 'can': {
      const ry = ss * a('adj', 25000) / 2
      return `M0 ${n(ry)} A${n(w / 2)} ${n(ry)} 0 0 1 ${n(w)} ${n(ry)} L${n(w)} ${n(h - ry)} A${n(w / 2)} ${n(ry)} 0 0 1 0 ${n(h - ry)} Z`
    }
    case 'flowChartDocument':
      return `M0 0 L${n(w)} 0 L${n(w)} ${n(h * 0.83)} C${n(w * 0.75)} ${n(h * 0.7)} ${n(w * 0.5)} ${n(h * 1.05)} 0 ${n(h * 0.92)} Z`
    case 'heart':
      return `M${n(w / 2)} ${n(h / 4)} C${n(w / 2)} 0 0 0 0 ${n(h * 0.3)} C0 ${n(h * 0.6)} ${n(w / 2)} ${n(h * 0.8)} ${n(w / 2)} ${n(h)} C${n(w / 2)} ${n(h * 0.8)} ${n(w)} ${n(h * 0.6)} ${n(w)} ${n(h * 0.3)} C${n(w)} 0 ${n(w / 2)} 0 ${n(w / 2)} ${n(h / 4)} Z`
    case 'cloud':
    case 'cloudCallout': {
      // A ring of outward bulges around an ellipse.
      const bumps = 10
      const points = Array.from({ length: bumps }, (_, index) => {
        const angle = (index / bumps) * Math.PI * 2
        return [w / 2 + w * 0.42 * Math.cos(angle), h / 2 + h * 0.38 * Math.sin(angle)] as [number, number]
      })
      const arcs = points.map(([x, y], index) => {
        const [nx, ny] = points[(index + 1) % bumps]
        const radius = Math.hypot(nx - x, ny - y) * 0.62
        return `A${n(radius)} ${n(radius)} 0 0 1 ${n(nx)} ${n(ny)}`
      })
      return `M${n(points[0][0])} ${n(points[0][1])} ${arcs.join(' ')} Z`
    }
    case 'moon': {
      const inner = w * (1 - a('adj', 50000))
      return `M${n(w)} 0 A${n(w)} ${n(h / 2)} 0 0 0 ${n(w)} ${n(h)} A${n(inner)} ${n(h / 2)} 0 0 1 ${n(w)} 0 Z`
    }
    case 'teardrop':
      return `M${n(w / 2)} 0 L${n(w)} 0 L${n(w)} ${n(h / 2)} A${n(w / 2)} ${n(h / 2)} 0 1 1 ${n(w / 2)} 0 Z`
    case 'lightningBolt': {
      const raw: [number, number][] = [[8472, 0], [12860, 6080], [11050, 6797], [16577, 12007], [14767, 12877], [21600, 21600], [10012, 14915], [12222, 13987], [5022, 9705], [7602, 8382], [0, 3890]]
      return polygon(raw.map(([x, y]) => [(x / 21600) * w, (y / 21600) * h]))
    }
    case 'sun': {
      const rays: string[] = []
      for (let index = 0; index < 8; index += 1) {
        const angle = (index * Math.PI) / 4
        const tip: [number, number] = [w / 2 + (w / 2) * Math.cos(angle), h / 2 + (h / 2) * Math.sin(angle)]
        const base = (offset: number): [number, number] => [w / 2 + w * 0.36 * Math.cos(angle + offset), h / 2 + h * 0.36 * Math.sin(angle + offset)]
        rays.push(polygon([base(-0.17), tip, base(0.17)]))
      }
      return `${ellipsePath(w / 2, h / 2, w * 0.25, h * 0.25)} ${rays.join(' ')}`
    }
    case 'cube': {
      const d = ss * a('adj', 25000)
      return `${polygon([[0, d], [w - d, d], [w - d, h], [0, h]])} ${polygon([[0, d], [d, 0], [w, 0], [w - d, d]])} ${polygon([[w - d, d], [w, 0], [w, h - d], [w - d, h]])}`
    }
    case 'foldedCorner': {
      const d = ss * a('adj', 16667)
      return `${polygon([[0, 0], [w, 0], [w, h - d], [w - d, h], [0, h]])} ${polygon([[w - d, h], [w - d * 0.8, h - d * 0.8], [w, h - d]])}`
    }
    case 'corner': {
      const dy = ss * a('adj1', 50000)
      const dx = ss * a('adj2', 50000)
      return polygon([[0, 0], [dx, 0], [dx, h - dy], [w, h - dy], [w, h], [0, h]])
    }
    case 'halfFrame': {
      const dy = ss * a('adj1', 33333)
      const dx = ss * a('adj2', 33333)
      return polygon([[0, 0], [w, 0], [w - (w * dy) / h, dy], [dx, dy], [dx, h - (h * dx) / w], [0, h]])
    }
    case 'diagStripe': {
      const d = a('adj', 50000)
      return polygon([[0, h * d], [w * d, 0], [w, 0], [0, h]])
    }
    case 'snip2DiagRect': {
      const s1 = ss * a('adj2', 16667)
      return polygon([[0, 0], [w - s1, 0], [w, s1], [w, h], [s1, h], [0, h - s1]])
    }
    case 'plaque':
    case 'snipRoundRect':
    case 'round2DiagRect':
    case 'bevel':
      return roundRectPath(w, h, ss * 0.1667)
    case 'flowChartDelay':
      return `M0 0 L${n(w / 2)} 0 A${n(w / 2)} ${n(h / 2)} 0 0 1 ${n(w / 2)} ${n(h)} L0 ${n(h)} Z`
    case 'flowChartPunchedCard':
      return polygon([[w * 0.2, 0], [w, 0], [w, h], [0, h], [0, h * 0.2]])
    case 'flowChartCollate':
      return polygon([[0, 0], [w, 0], [0, h], [w, h]])
    case 'flowChartSort':
      return polygon([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]])
    case 'flowChartMagneticDisk':
    case 'flowChartMagneticDrum':
      return presetPath('can', w, h, {})
    case 'flowChartOr':
    case 'flowChartSummingJunction':
    case 'flowChartMagneticTape':
      return ellipsePath(w / 2, h / 2, w / 2, h / 2)
    case 'upDownArrow': {
      const shaft = w * a('adj1', 50000)
      const head = ss * a('adj2', 50000)
      const x1 = (w - shaft) / 2
      return polygon([[w / 2, 0], [w, head], [x1 + shaft, head], [x1 + shaft, h - head], [w, h - head], [w / 2, h], [0, h - head], [x1, h - head], [x1, head], [0, head]])
    }
    case 'stripedRightArrow':
      return presetPath('rightArrow', w, h, adj)
    case 'mathMinus':
      return polygon([[w * 0.1, h * 0.38], [w * 0.9, h * 0.38], [w * 0.9, h * 0.62], [w * 0.1, h * 0.62]])
    case 'mathEqual':
      return `${polygon([[w * 0.1, h * 0.2], [w * 0.9, h * 0.2], [w * 0.9, h * 0.42], [w * 0.1, h * 0.42]])} ${polygon([[w * 0.1, h * 0.58], [w * 0.9, h * 0.58], [w * 0.9, h * 0.8], [w * 0.1, h * 0.8]])}`
    case 'mathMultiply': {
      const t = ss * 0.12
      return polygon([[t, 0], [w / 2, h / 2 - t], [w - t, 0], [w, t], [w / 2 + t, h / 2], [w, h - t], [w - t, h], [w / 2, h / 2 + t], [t, h], [0, h - t], [w / 2 - t, h / 2], [0, t]])
    }
    case 'line':
    case 'straightConnector1':
      return `M0 0 L${n(w)} ${n(h)}`
    case 'bentConnector2':
      return `M0 0 L${n(w)} 0 L${n(w)} ${n(h)}`
    case 'bentConnector3': {
      const x = w * a('adj1', 50000)
      return `M0 0 L${n(x)} 0 L${n(x)} ${n(h)} L${n(w)} ${n(h)}`
    }
    case 'bentConnector4':
    case 'bentConnector5': {
      const x = w * a('adj1', 50000)
      const y = h * a('adj2', 50000)
      return `M0 0 L${n(x)} 0 L${n(x)} ${n(y)} L${n(w)} ${n(y)} L${n(w)} ${n(h)}`
    }
    case 'curvedConnector2':
      return `M0 0 Q${n(w)} 0 ${n(w)} ${n(h)}`
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5': {
      const x = w * a('adj1', 50000)
      return `M0 0 C${n(x)} 0 ${n(x)} ${n(h)} ${n(w)} ${n(h)}`
    }
    case 'leftBracket':
      return `M${n(w)} 0 Q0 0 0 ${n(Math.min(w, h / 2))} L0 ${n(h - Math.min(w, h / 2))} Q0 ${n(h)} ${n(w)} ${n(h)}`
    case 'rightBracket':
      return `M0 0 Q${n(w)} 0 ${n(w)} ${n(Math.min(w, h / 2))} L${n(w)} ${n(h - Math.min(w, h / 2))} Q${n(w)} ${n(h)} 0 ${n(h)}`
    case 'leftBrace':
      return `M${n(w)} 0 Q${n(w / 2)} 0 ${n(w / 2)} ${n(h / 4)} L${n(w / 2)} ${n(h / 2 - w / 2)} Q${n(w / 2)} ${n(h / 2)} 0 ${n(h / 2)} Q${n(w / 2)} ${n(h / 2)} ${n(w / 2)} ${n(h / 2 + w / 2)} L${n(w / 2)} ${n(h * 0.75)} Q${n(w / 2)} ${n(h)} ${n(w)} ${n(h)}`
    case 'rightBrace':
      return `M0 0 Q${n(w / 2)} 0 ${n(w / 2)} ${n(h / 4)} L${n(w / 2)} ${n(h / 2 - w / 2)} Q${n(w / 2)} ${n(h / 2)} ${n(w)} ${n(h / 2)} Q${n(w / 2)} ${n(h / 2)} ${n(w / 2)} ${n(h / 2 + w / 2)} L${n(w / 2)} ${n(h * 0.75)} Q${n(w / 2)} ${n(h)} 0 ${n(h)}`
    case 'bracketPair':
    case 'bracePair': {
      const r = ss * 0.1667
      return `M${n(r)} 0 Q0 0 0 ${n(r)} L0 ${n(h - r)} Q0 ${n(h)} ${n(r)} ${n(h)} M${n(w - r)} 0 Q${n(w)} 0 ${n(w)} ${n(r)} L${n(w)} ${n(h - r)} Q${n(w)} ${n(h)} ${n(w - r)} ${n(h)}`
    }
    default:
      return polygon([[0, 0], [w, 0], [w, h], [0, h]])
  }
}

// --- Custom geometry (a:custGeom): DrawingML shape-guide formulas and path commands ---

type Variables = Record<string, number>

function builtinVariables(w: number, h: number): Variables {
  const ss = Math.min(w, h)
  const ls = Math.max(w, h)
  return {
    w, h, l: 0, t: 0, r: w, b: h, hc: w / 2, vc: h / 2, ss, ls,
    wd2: w / 2, wd3: w / 3, wd4: w / 4, wd5: w / 5, wd6: w / 6, wd8: w / 8, wd10: w / 10, wd32: w / 32,
    hd2: h / 2, hd3: h / 3, hd4: h / 4, hd5: h / 5, hd6: h / 6, hd8: h / 8, hd10: h / 10, hd32: h / 32,
    ssd2: ss / 2, ssd4: ss / 4, ssd6: ss / 6, ssd8: ss / 8, ssd16: ss / 16, ssd32: ss / 32,
    cd2: 10800000, cd4: 5400000, cd8: 2700000, '3cd4': 16200000, '3cd8': 8100000, '5cd8': 13500000, '7cd8': 18900000,
  }
}

function evalArg(token: string, vars: Variables): number {
  const literal = Number(token)
  if (Number.isFinite(literal)) return literal
  return vars[token] ?? 0
}

const toRadians = (angle: number) => (angle / 60000) * (Math.PI / 180)

export function evaluateFormula(fmla: string, vars: Variables): number {
  const [op, ...args] = fmla.trim().split(/\s+/)
  const [x = 0, y = 0, z = 0] = args.map((token) => evalArg(token, vars))
  switch (op) {
    case '*/': return z === 0 ? 0 : (x * y) / z
    case '+-': return x + y - z
    case '+/': return z === 0 ? 0 : (x + y) / z
    case '?:': return x > 0 ? y : z
    case 'abs': return Math.abs(x)
    case 'at2': return (Math.atan2(y, x) * 180 / Math.PI) * 60000
    case 'cat2': return x * Math.cos(Math.atan2(z, y))
    case 'cos': return x * Math.cos(toRadians(y))
    case 'max': return Math.max(x, y)
    case 'min': return Math.min(x, y)
    case 'mod': return Math.sqrt(x * x + y * y + z * z)
    case 'pin': return y < x ? x : y > z ? z : y
    case 'sat2': return x * Math.sin(Math.atan2(z, y))
    case 'sin': return x * Math.sin(toRadians(y))
    case 'sqrt': return Math.sqrt(Math.max(0, x))
    case 'tan': return x * Math.tan(toRadians(y))
    default: return x // 'val'
  }
}

function customPaths(geometry: Extract<Geometry, { kind: 'custom' }>, w: number, h: number): GeometryPath[] {
  return geometry.paths.map((path: CustomPath) => {
    // Path coordinates live in the path's own w/h space (when given) and are scaled to the shape.
    const pathW = path.w && path.w > 0 ? path.w : w
    const pathH = path.h && path.h > 0 ? path.h : h
    const vars: Variables = { ...builtinVariables(pathW, pathH), ...geometry.adj }
    for (const guide of geometry.guides) vars[guide.name] = evaluateFormula(guide.fmla, vars)
    const sx = w / pathW
    const sy = h / pathH
    const point = ([px, py]: [string, string]): [number, number] => [evalArg(px, vars) * sx, evalArg(py, vars) * sy]
    let current: [number, number] = [0, 0]
    let start: [number, number] = [0, 0]
    const parts: string[] = []
    for (const command of path.commands) {
      if (command.op === 'Z') {
        parts.push('Z')
        current = start
      } else if (command.op === 'A') {
        const wR = evalArg(command.wR, vars) * sx
        const hR = evalArg(command.hR, vars) * sy
        const stAng = evalArg(command.stAng, vars) / 60000
        const swAng = evalArg(command.swAng, vars) / 60000
        // The arc starts at the current point, which sits at stAng on the ellipse.
        const [sx0, sy0] = ellipsePoint(0, 0, wR, hR, stAng)
        const cx = current[0] - sx0
        const cy = current[1] - sy0
        const steps = Math.abs(swAng) >= 360 ? 2 : 1
        for (let step = 1; step <= steps; step += 1) {
          const [ex, ey] = ellipsePoint(cx, cy, wR, hR, stAng + (swAng * step) / steps)
          const sweepPart = Math.abs(swAng / steps)
          parts.push(`A${n(wR)} ${n(hR)} 0 ${sweepPart > 180 ? 1 : 0} ${swAng > 0 ? 1 : 0} ${n(ex)} ${n(ey)}`)
          current = [ex, ey]
        }
      } else {
        const points = command.pts.map(point)
        if (points.length === 0) continue
        parts.push(`${command.op}${points.map(([x, y]) => `${n(x)} ${n(y)}`).join(' ')}`)
        current = points[points.length - 1]
        if (command.op === 'M') start = current
      }
    }
    return { d: parts.join(' '), fill: path.fill, stroke: path.stroke }
  })
}

export function geometryPaths(geometry: Geometry, w: number, h: number): GeometryPath[] {
  if (geometry.kind === 'custom') return customPaths(geometry, w, h)
  const line = isLinePreset(geometry.name)
  return [{ d: presetPath(geometry.name, w, h, geometry.adj), fill: !line, stroke: true }]
}
