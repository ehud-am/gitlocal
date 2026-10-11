import { resolveColor, toCss, type ColorContext, type Rgba } from './color'
import type { Fill, GradientStop, ImageRef, Line, LineEnd, LineEndType } from './model'
import { EMU_PER_PX } from './model'
import type { OpcPackage } from './package'
import type { Theme } from './theme'
import { attr, child, children, numAttr, relAttr } from './xml'

// Collects every image the parse references so each media part is read (and converted, for
// EMF/WMF) exactly once after the parse, however many slides reuse it (e.g. a logo on the master).
export class MediaRegistry {
  readonly refs: ImageRef[] = []

  create(mediaPath: string, blip: Element | null, srcRect: Element | null): ImageRef {
    const crop = {
      l: (numAttr(srcRect, 'l') ?? 0) / 100000,
      t: (numAttr(srcRect, 't') ?? 0) / 100000,
      r: (numAttr(srcRect, 'r') ?? 0) / 100000,
      b: (numAttr(srcRect, 'b') ?? 0) / 100000,
    }
    const alphaModFix = child(blip, 'alphaModFix')
    const opacity = alphaModFix ? (numAttr(alphaModFix, 'amt') ?? 100000) / 100000 : 1
    const ref: ImageRef = { mediaPath, src: null, crop, opacity, grayscale: child(blip, 'grayscl') !== null }
    this.refs.push(ref)
    return ref
  }
}

// Everything needed to resolve fills, lines and images found in one OOXML part: color references
// resolve through the theme + active color map, and r:embed ids through this part's relationships.
export interface PartScope {
  pkg: OpcPackage
  partPath: string
  colors: ColorContext
  theme: Theme
  media: MediaRegistry
}

const FILL_ELEMENTS = new Set(['noFill', 'solidFill', 'gradFill', 'blipFill', 'pattFill', 'grpFill'])

export function hasFillElement(container: Element | null | undefined): boolean {
  return children(container).some((element) => FILL_ELEMENTS.has(element.localName))
}

function themeScope(scope: PartScope): PartScope {
  return scope.theme.partPath ? { ...scope, partPath: scope.theme.partPath } : scope
}

function parseGradient(gradFill: Element, scope: PartScope, phColor: Rgba | null): Fill | undefined {
  const stops: GradientStop[] = []
  for (const gs of children(child(gradFill, 'gsLst'), 'gs')) {
    const color = resolveColor(gs, scope.colors, phColor)
    if (color) stops.push({ offset: Math.min(1, Math.max(0, (numAttr(gs, 'pos') ?? 0) / 100000)), color: toCss(color) })
  }
  if (stops.length === 0) return undefined
  stops.sort((a, b) => a.offset - b.offset)
  const pathElement = child(gradFill, 'path')
  if (pathElement) {
    const rect = child(pathElement, 'fillToRect')
    // fillToRect insets the gradient's focus rectangle from each edge (missing insets are 0).
    const l = (numAttr(rect, 'l') ?? 0) / 100000
    const t = (numAttr(rect, 't') ?? 0) / 100000
    const r = (numAttr(rect, 'r') ?? 0) / 100000
    const b = (numAttr(rect, 'b') ?? 0) / 100000
    const kind = attr(pathElement, 'path')
    return {
      type: 'gradient',
      path: kind === 'rect' || kind === 'shape' ? kind : 'circle',
      angle: 0,
      stops,
      focus: { x: (l + (1 - r)) / 2, y: (t + (1 - b)) / 2 },
    }
  }
  const angle = (numAttr(child(gradFill, 'lin'), 'ang') ?? 0) / 60000
  return { type: 'gradient', path: 'linear', angle, stops, focus: { x: 0.5, y: 0.5 } }
}

function parseBlipFill(blipFill: Element, scope: PartScope): Fill | undefined {
  const blip = child(blipFill, 'blip')
  const embed = relAttr(blip, 'embed')
  const rel = embed ? scope.pkg.rels(scope.partPath).get(embed) : undefined
  if (!rel || rel.external) return undefined
  const image = scope.media.create(rel.target, blip, child(blipFill, 'srcRect'))
  const tile = child(blipFill, 'tile')
  return {
    type: 'image',
    image,
    tile: tile
      ? {
          sx: (numAttr(tile, 'sx') ?? 100000) / 100000,
          sy: (numAttr(tile, 'sy') ?? 100000) / 100000,
          tx: (numAttr(tile, 'tx') ?? 0) / EMU_PER_PX,
          ty: (numAttr(tile, 'ty') ?? 0) / EMU_PER_PX,
        }
      : null,
  }
}

// Reads the fill a container (spPr, bgPr, tcPr, a theme style entry, ...) defines directly.
// Returns undefined when it defines none, so the caller can fall back to an inherited fill.
// `groupFill` is what a:grpFill (use the enclosing group's fill) resolves to.
export function parseFill(
  container: Element | null | undefined,
  scope: PartScope,
  phColor: Rgba | null = null,
  groupFill: Fill | null = null,
): Fill | undefined {
  const element = children(container).find((candidate) => FILL_ELEMENTS.has(candidate.localName))
  return element ? parseFillElement(element, scope, phColor, groupFill) : undefined
}

// Resolves one fill element (a:solidFill, a:gradFill, ...) itself.
export function parseFillElement(
  element: Element,
  scope: PartScope,
  phColor: Rgba | null = null,
  groupFill: Fill | null = null,
): Fill | undefined {
    switch (element.localName) {
      case 'noFill': return { type: 'none' }
      case 'solidFill': {
        const color = resolveColor(element, scope.colors, phColor)
        return color ? { type: 'solid', color: toCss(color) } : undefined
      }
      case 'gradFill': return parseGradient(element, scope, phColor)
      case 'blipFill': return parseBlipFill(element, scope)
      case 'pattFill': {
        const fg = resolveColor(child(element, 'fgClr'), scope.colors, phColor)
        const bg = resolveColor(child(element, 'bgClr'), scope.colors, phColor)
        return {
          type: 'pattern',
          preset: attr(element, 'prst') ?? 'pct50',
          fg: fg ? toCss(fg) : '#000000',
          bg: bg ? toCss(bg) : '#ffffff',
        }
      }
      default: return groupFill ?? undefined // a:grpFill
    }
}

// A theme style reference (a:fillRef / p:bgRef): idx 0 means no fill, 1-999 index the theme's
// fillStyleLst and 1001+ its bgFillStyleLst, both 1-based and by position. The reference's own
// color child supplies what the entry's "phClr" placeholder color stands for.
export function parseStyleFill(styleRef: Element | null | undefined, scope: PartScope): Fill | undefined {
  if (!styleRef) return undefined
  const idx = numAttr(styleRef, 'idx') ?? 0
  if (idx === 0) return { type: 'none' }
  const list = idx >= 1001 ? scope.theme.bgFillStyles : scope.theme.fillStyles
  const entry = list[(idx >= 1001 ? idx - 1001 : idx - 1)]
  const phColor = resolveColor(styleRef, scope.colors)
  if (!entry) return phColor ? { type: 'solid', color: toCss(phColor) } : undefined
  return parseFillElement(entry, themeScope(scope), phColor)
}

// <p:bg> holds either p:bgPr (a direct fill) or p:bgRef (a theme background style reference).
export function parseBackground(cSld: Element | null, scope: PartScope): Fill | undefined {
  const bg = child(cSld, 'bg')
  if (!bg) return undefined
  const bgPr = child(bg, 'bgPr')
  if (bgPr) return parseFill(bgPr, scope)
  return parseStyleFill(child(bg, 'bgRef'), scope)
}

const DASHES: Record<string, number[]> = {
  dash: [4, 3], dashDot: [4, 3, 1, 3], dot: [1, 3], lgDash: [8, 3], lgDashDot: [8, 3, 1, 3],
  lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDash: [3, 1], sysDot: [1, 1], sysDashDot: [3, 1, 1, 1],
  sysDashDotDot: [3, 1, 1, 1, 1, 1],
}

const LINE_END_TYPES = new Set<LineEndType>(['triangle', 'stealth', 'diamond', 'oval', 'arrow'])
const LINE_END_SIZE: Record<string, number> = { sm: 2, med: 3, lg: 5 }

function parseLineEnd(element: Element | null): LineEnd | null {
  const type = attr(element, 'type') as LineEndType | null
  if (!type || !LINE_END_TYPES.has(type)) return null
  return {
    type,
    width: LINE_END_SIZE[attr(element, 'w') ?? 'med'] ?? 3,
    length: LINE_END_SIZE[attr(element, 'len') ?? 'med'] ?? 3,
  }
}

function firstDefined<T>(sources: (Element | null)[], read: (element: Element) => T | undefined): T | undefined {
  for (const source of sources) {
    if (!source) continue
    const value = read(source)
    if (value !== undefined) return value
  }
  return undefined
}

// Resolves an outline from a:ln elements in priority order (the shape's own, then inherited ones)
// plus an optional theme line style pulled in by p:style's a:lnRef: each property comes from the
// first source that sets it. Returns null when the resolved line is absent or has no fill.
export function parseLine(
  lines: (Element | null)[],
  scope: PartScope,
  styleRef: Element | null = null,
): Line | null {
  const sources = [...lines]
  const idx = numAttr(styleRef, 'idx') ?? 0
  const styleEntry = idx > 0 ? scope.theme.lineStyles[idx - 1] : undefined
  if (styleEntry) sources.push(styleEntry)
  if (sources.every((source) => source === null)) return null

  let fill: Fill | undefined
  for (const source of sources) {
    if (!source || !hasFillElement(source)) continue
    fill = source === styleEntry
      ? parseFill(source, themeScope(scope), resolveColor(styleRef, scope.colors))
      : parseFill(source, scope)
    break
  }
  if (!fill || fill.type === 'none') return null
  let color: string
  if (fill.type === 'solid') color = fill.color
  else if (fill.type === 'gradient') color = fill.stops[0].color
  else if (fill.type === 'pattern') color = fill.fg
  else color = '#000000'

  const widthEmu = firstDefined(sources, (source) => numAttr(source, 'w')) ?? 9525
  const widthPx = Math.max(widthEmu / EMU_PER_PX, 0.5)
  const dashName = firstDefined(sources, (source) => attr(child(source, 'prstDash'), 'val') ?? undefined)
  const dashPattern = dashName ? DASHES[dashName] : undefined
  const capRaw = firstDefined(sources, (source) => attr(source, 'cap') ?? undefined)
  const join = firstDefined(sources, (source) => {
    if (child(source, 'round')) return 'round' as const
    if (child(source, 'bevel')) return 'bevel' as const
    if (child(source, 'miter')) return 'miter' as const
    return undefined
  })
  return {
    color,
    gradient: fill.type === 'gradient' ? { angle: fill.path === 'linear' ? fill.angle : 90, stops: fill.stops } : null,
    widthPx,
    dash: dashPattern ? dashPattern.map((part) => part * widthPx).join(' ') : null,
    cap: capRaw === 'rnd' ? 'round' : capRaw === 'sq' ? 'square' : 'butt',
    join: join ?? 'round',
    head: firstDefined(sources, (source) => (child(source, 'headEnd') ? parseLineEnd(child(source, 'headEnd')) : undefined)) ?? null,
    tail: firstDefined(sources, (source) => (child(source, 'tailEnd') ? parseLineEnd(child(source, 'tailEnd')) : undefined)) ?? null,
  }
}

// Reduces an a:effectLst's outer shadow to a CSS drop-shadow() filter. Other effects (glow,
// reflection, soft edges) are not drawn.
export function parseShadow(
  effectLists: (Element | null)[],
  scope: PartScope,
  styleRef: Element | null = null,
): string | null {
  const sources = [...effectLists]
  let phColor: Rgba | null = null
  if (styleRef) {
    const idx = numAttr(styleRef, 'idx') ?? 0
    const entry = idx > 0 ? scope.theme.effectStyles[idx - 1] : undefined
    if (entry) {
      sources.push(child(entry, 'effectLst'))
      phColor = resolveColor(styleRef, scope.colors)
    }
  }
  const effectList = sources.find((source) => source !== null)
  const shadow = child(effectList, 'outerShdw')
  if (!shadow) return null
  const color = resolveColor(shadow, scope.colors, phColor)
  if (!color) return null
  const distance = (numAttr(shadow, 'dist') ?? 0) / EMU_PER_PX
  const direction = ((numAttr(shadow, 'dir') ?? 0) / 60000) * (Math.PI / 180)
  const blur = (numAttr(shadow, 'blurRad') ?? 0) / EMU_PER_PX
  const dx = Math.round(Math.cos(direction) * distance * 100) / 100
  const dy = Math.round(Math.sin(direction) * distance * 100) / 100
  return `drop-shadow(${dx}px ${dy}px ${Math.round(blur / 2)}px ${toCss(color)})`
}
