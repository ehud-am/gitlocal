import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  /** Base64-encoded .pptx (OOXML zip) bytes, as delivered by the server. */
  content: string
}

interface PptxTextRun {
  text: string
  bold: boolean
  italic: boolean
  fontSizePt: number | null
  color: string | null
}

type PptxShape =
  | { kind: 'text'; xEmu: number; yEmu: number; widthEmu: number; heightEmu: number; runs: PptxTextRun[] }
  | { kind: 'image'; xEmu: number; yEmu: number; widthEmu: number; heightEmu: number; imageDataUri: string | null }

interface PptxSlide {
  index: number
  shapes: PptxShape[]
  backgroundFill: string | null
  notes: string | null
}

// A placeholder's identity (from p:ph), used to match a slide's placeholder shape to the
// corresponding placeholder on its layout/master so inherited geometry/background can be resolved.
interface PptxPlaceholderRef {
  type: string | null
  idx: string | null
}

interface PartialGeometry {
  xEmu?: number
  yEmu?: number
  widthEmu?: number
  heightEmu?: number
}

interface PlaceholderCandidate {
  ref: PptxPlaceholderRef
  geometry: PartialGeometry
}

// A slide layout or slide master reduced to just what this best-effort preview inherits from it.
interface PptxPartIndex {
  placeholders: PlaceholderCandidate[]
  backgroundFill: string | null
  // Non-placeholder shapes (logos, background graphics, decorative lines/text) defined directly on
  // this layout/master, which PowerPoint always shows through on every slide using it - unlike a
  // placeholder, these aren't "inherited" so much as just part of the layout's fixed artwork.
  decorations: PptxShape[]
}

// Resolves a content-level color reference (schemeClr, e.g. "bg1") to an actual theme color.
// clrMap translates the abstract name used in content ("bg1") to the theme's own slot name
// ("lt1"); themeColors holds the resolved hex value of each theme slot. Both come from the
// slide's master (its <p:clrMap> and its <a:theme> relationship) - see research notes below.
interface PptxThemeContext {
  clrMap: Record<string, string>
  themeColors: Record<string, string>
}

interface PptxLayoutIndex extends PptxPartIndex {
  master: PptxPartIndex | null
  theme: PptxThemeContext | null
}

interface PptxPresentation {
  slides: PptxSlide[]
  slideWidthEmu: number
  slideHeightEmu: number
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return bytes
}

function extToMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf',
  }
  return map[ext] ?? 'application/octet-stream'
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// A color reference can be a literal RGB value (a:srgbClr) or a theme-scheme reference
// (a:schemeClr, e.g. "bg1"/"accent1") that only resolves to a color via the slide's theme.
function extractSolidFillColor(
  solidFill: Record<string, unknown> | undefined,
  theme: PptxThemeContext | null,
): string | null {
  if (!solidFill) return null
  const srgbClr = solidFill['a:srgbClr'] as Record<string, unknown> | undefined
  const srgbVal = srgbClr?.['@_val']
  if (typeof srgbVal === 'string') return `#${srgbVal}`

  const schemeClr = solidFill['a:schemeClr'] as Record<string, unknown> | undefined
  const schemeVal = schemeClr?.['@_val']
  if (typeof schemeVal === 'string' && theme) {
    // A schemeClr value is usually one of the content-level names (bg1/tx1/...), mapped via
    // clrMap to an actual theme slot; it can also directly name a theme slot (dk1/lt1/accent1...).
    const slot = theme.clrMap[schemeVal] ?? schemeVal
    return theme.themeColors[slot] ?? null
  }
  return null
}

// A run's text lives at a:r > a:t; formatting lives on the sibling a:rPr.
function parseRuns(paragraphs: unknown, theme: PptxThemeContext | null): PptxTextRun[] {
  const runs: PptxTextRun[] = []
  for (const paragraph of asArray(paragraphs as Record<string, unknown>[] | Record<string, unknown>)) {
    for (const run of asArray((paragraph as Record<string, unknown>)['a:r'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const runRecord = run as Record<string, unknown>
      const text = runRecord['a:t']
      if (typeof text !== 'string' || text.length === 0) continue
      const rPr = (runRecord['a:rPr'] ?? {}) as Record<string, unknown>
      const bold = rPr['@_b'] === '1'
      const italic = rPr['@_i'] === '1'
      const szRaw = rPr['@_sz']
      const fontSizePt = typeof szRaw === 'string' ? Number(szRaw) / 100 : null
      const color = extractSolidFillColor(rPr['a:solidFill'] as Record<string, unknown> | undefined, theme)
      runs.push({ text, bold, italic, fontSizePt: fontSizePt !== null && Number.isFinite(fontSizePt) ? fontSizePt : null, color })
    }
  }
  return runs
}

// Reads only the geometry a shape defines directly; a component this shape doesn't specify is
// left absent (not defaulted to 0) so mergeGeometry can tell "unset" apart from "set to zero".
function parseXfrmPartial(spPr: Record<string, unknown> | undefined): PartialGeometry {
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined
  if (!xfrm) return {}
  const off = xfrm['a:off'] as Record<string, unknown> | undefined
  const ext = xfrm['a:ext'] as Record<string, unknown> | undefined
  const toNumber = (value: unknown): number | undefined => (typeof value === 'string' && Number.isFinite(Number(value)) ? Number(value) : undefined)
  const geometry: PartialGeometry = {}
  const x = toNumber(off?.['@_x']); if (x !== undefined) geometry.xEmu = x
  const y = toNumber(off?.['@_y']); if (y !== undefined) geometry.yEmu = y
  const w = toNumber(ext?.['@_cx']); if (w !== undefined) geometry.widthEmu = w
  const h = toNumber(ext?.['@_cy']); if (h !== undefined) geometry.heightEmu = h
  return geometry
}

// Merges geometry component-wise across layers in precedence order (earliest layer wins per
// component), matching OOXML's slide -> layout -> master placeholder inheritance (research.md §3).
function mergeGeometry(...layers: PartialGeometry[]): { xEmu: number; yEmu: number; widthEmu: number; heightEmu: number } {
  const pick = (key: keyof PartialGeometry): number => {
    for (const layer of layers) {
      const value = layer[key]
      if (value !== undefined) return value
    }
    return 0
  }
  return { xEmu: pick('xEmu'), yEmu: pick('yEmu'), widthEmu: pick('widthEmu'), heightEmu: pick('heightEmu') }
}

// A slide/layout/master shape's placeholder identity, or null if the shape isn't a placeholder
// (in which case it never inherits geometry/background from a layout or master).
function readPlaceholderRef(sp: Record<string, unknown>): PptxPlaceholderRef | null {
  const nvSpPr = sp['p:nvSpPr'] as Record<string, unknown> | undefined
  const nvPr = nvSpPr?.['p:nvPr'] as Record<string, unknown> | undefined
  const phEl = nvPr?.['p:ph'] as Record<string, unknown> | undefined
  if (!phEl) return null
  const type = phEl['@_type']
  const idx = phEl['@_idx']
  return {
    type: typeof type === 'string' ? type : null,
    idx: typeof idx === 'string' ? idx : null,
  }
}

// A shape hidden in PowerPoint (e.g. a design-grid guide layer) carries hidden="1" on its cNvPr -
// it must never render, on a slide or on a layout/master's own decorative content alike.
function isHiddenShape(sp: Record<string, unknown>, nvPrKey: 'p:nvSpPr' | 'p:nvPicPr'): boolean {
  const nv = sp[nvPrKey] as Record<string, unknown> | undefined
  const cNvPr = nv?.['p:cNvPr'] as Record<string, unknown> | undefined
  return cNvPr?.['@_hidden'] === '1'
}

// Matches a slide placeholder to its layout's/master's corresponding placeholder: prefer the same
// @idx when both specify one, otherwise fall back to the same @type (research.md §2). Best-effort -
// an unmatched placeholder simply renders with no inherited geometry/background (FR-008).
function matchPlaceholder(ref: PptxPlaceholderRef, candidates: PlaceholderCandidate[]): PlaceholderCandidate | undefined {
  if (ref.idx !== null) {
    const byIdx = candidates.find((candidate) => candidate.ref.idx === ref.idx)
    if (byIdx) return byIdx
  }
  return candidates.find((candidate) => candidate.ref.type === ref.type)
}

function parseBgFill(cSld: Record<string, unknown> | undefined, theme: PptxThemeContext | null): string | null {
  const bg = cSld?.['p:bg'] as Record<string, unknown> | undefined
  const bgPr = bg?.['p:bgPr'] as Record<string, unknown> | undefined
  return extractSolidFillColor(bgPr?.['a:solidFill'] as Record<string, unknown> | undefined, theme)
}

// Relationship targets are relative to the referencing part's own directory (e.g. ppt/slides/).
function resolveRelativePath(basePath: string, relativeTarget: string): string {
  const baseDir = basePath.slice(0, basePath.lastIndexOf('/'))
  const parts = `${baseDir}/${relativeTarget}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.' && part !== '') resolved.push(part)
  }
  return resolved.join('/')
}

function relsPathFor(partPath: string): string {
  const dir = partPath.slice(0, partPath.lastIndexOf('/'))
  const file = partPath.slice(partPath.lastIndexOf('/') + 1)
  return `${dir}/_rels/${file}.rels`
}

// Finds the resolved target path of the first relationship of a part whose Type ends with
// typeSuffix (e.g. "/slideMaster"), or null if the part has no rels file or no matching one.
async function findRelTarget(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  partPath: string,
  typeSuffix: string,
): Promise<string | null> {
  const relsXml = await zip.file(relsPathFor(partPath))?.async('text')
  if (!relsXml) return null
  const parsed = parser.parse(relsXml) as Record<string, unknown>
  const relationships = parsed['Relationships'] as Record<string, unknown> | undefined
  for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
    const type = rel['@_Type']
    const target = rel['@_Target']
    if (typeof type === 'string' && type.endsWith(typeSuffix) && typeof target === 'string') {
      return resolveRelativePath(partPath, target)
    }
  }
  return null
}

// The content-level names (bg1/tx1/...) a schemeClr can reference, mapped by default to their
// theme slot - a slide master's own <p:clrMap> can override this mapping (rare; not supported
// here - see PptxThemeContext). accent1-6/hlink/folHlink name their theme slot directly already.
const DEFAULT_CLR_MAP: Record<string, string> = {
  bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
  accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hlink: 'hlink', folHlink: 'folHlink',
}
const CLR_MAP_KEYS = Object.keys(DEFAULT_CLR_MAP)
const THEME_SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']

// A theme slot's color is either a literal RGB value or a reference to the OS window/text color
// (a:sysClr), which always carries a "last known" RGB fallback we can use directly.
function extractDirectColor(container: Record<string, unknown> | undefined): string | null {
  if (!container) return null
  const srgbClr = container['a:srgbClr'] as Record<string, unknown> | undefined
  if (typeof srgbClr?.['@_val'] === 'string') return `#${srgbClr['@_val']}`
  const sysClr = container['a:sysClr'] as Record<string, unknown> | undefined
  if (typeof sysClr?.['@_lastClr'] === 'string') return `#${sysClr['@_lastClr']}`
  return null
}

// Resolves the color theme (clrMap + palette) for a slide master: <p:clrMap> lives on the master
// itself, and the palette lives in a separate theme part reached via the master's own rels
// (type ".../theme"). Every slide, its layout, and its master all share this one theme context.
async function loadThemeContext(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  masterPath: string,
): Promise<PptxThemeContext | null> {
  try {
    const masterXml = await zip.file(masterPath)?.async('text')
    if (masterXml === undefined) return null
    const parsed = parser.parse(masterXml) as Record<string, unknown>
    const root = parsed['p:sldMaster'] as Record<string, unknown> | undefined
    if (!root) return null

    const clrMap = { ...DEFAULT_CLR_MAP }
    const clrMapEl = root['p:clrMap'] as Record<string, unknown> | undefined
    if (clrMapEl) {
      for (const key of CLR_MAP_KEYS) {
        const value = clrMapEl[`@_${key}`]
        if (typeof value === 'string') clrMap[key] = value
      }
    }

    const themeColors: Record<string, string> = {}
    const themePath = await findRelTarget(zip, parser, masterPath, '/theme')
    const themeXml = themePath ? await zip.file(themePath)?.async('text') : undefined
    if (themeXml) {
      const themeParsed = parser.parse(themeXml) as Record<string, unknown>
      const themeRoot = themeParsed['a:theme'] as Record<string, unknown> | undefined
      const themeElements = themeRoot?.['a:themeElements'] as Record<string, unknown> | undefined
      const clrScheme = themeElements?.['a:clrScheme'] as Record<string, unknown> | undefined
      for (const slot of THEME_SLOTS) {
        const hex = extractDirectColor(clrScheme?.[`a:${slot}`] as Record<string, unknown> | undefined)
        if (hex) themeColors[slot] = hex
      }
    }

    return { clrMap, themeColors }
  } catch {
    return null
  }
}

// Reads a slideLayout or slideMaster part down to just its placeholder shapes (identity +
// geometry) and background fill - everything this preview inherits from it. Returns null on any
// read/parse failure so a missing/malformed layout or master degrades gracefully (FR-008).
async function loadPartIndex(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  partPath: string,
  theme: PptxThemeContext | null,
): Promise<PptxPartIndex | null> {
  try {
    const xml = await zip.file(partPath)?.async('text')
    if (xml === undefined) return null
    const parsed = parser.parse(xml) as Record<string, unknown>
    const root = (parsed['p:sldLayout'] ?? parsed['p:sldMaster']) as Record<string, unknown> | undefined
    if (!root) return null
    const cSld = root['p:cSld'] as Record<string, unknown> | undefined
    const spTree = cSld?.['p:spTree'] as Record<string, unknown> | undefined

    // This part's own rels are needed to resolve its own decorative pics' r:embed -> media path
    // (independent of whatever rels the slide that ends up using this layout/master happens to have).
    const relsXml = await zip.file(relsPathFor(partPath))?.async('text')
    const relTargets = new Map<string, string>()
    if (relsXml) {
      const relsParsed = parser.parse(relsXml) as Record<string, unknown>
      const relationships = relsParsed['Relationships'] as Record<string, unknown> | undefined
      for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
        const id = rel['@_Id']
        const target = rel['@_Target']
        if (typeof id === 'string' && typeof target === 'string') relTargets.set(id, target)
      }
    }

    const placeholders: PlaceholderCandidate[] = []
    const decorations: PptxShape[] = []

    for (const sp of asArray(spTree?.['p:sp'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const ref = readPlaceholderRef(sp)
      if (ref) {
        placeholders.push({ ref, geometry: parseXfrmPartial(sp['p:spPr'] as Record<string, unknown> | undefined) })
        continue
      }
      // A non-placeholder shape (a logo, a decorative line, static text) is part of the layout's
      // or master's fixed artwork - PowerPoint always shows it, on every slide using that part.
      if (isHiddenShape(sp, 'p:nvSpPr')) continue
      const txBody = sp['p:txBody'] as Record<string, unknown> | undefined
      const runs = txBody ? parseRuns(txBody['a:p'], theme) : []
      if (runs.length === 0) continue
      const { xEmu, yEmu, widthEmu, heightEmu } = mergeGeometry(parseXfrmPartial(sp['p:spPr'] as Record<string, unknown> | undefined))
      decorations.push({ kind: 'text', xEmu, yEmu, widthEmu, heightEmu, runs })
    }

    for (const pic of asArray(spTree?.['p:pic'] as Record<string, unknown>[] | Record<string, unknown>)) {
      if (isHiddenShape(pic, 'p:nvPicPr')) continue
      const spPr = pic['p:spPr'] as Record<string, unknown> | undefined
      const { xEmu, yEmu, widthEmu, heightEmu } = mergeGeometry(parseXfrmPartial(spPr))
      const blipFill = pic['p:blipFill'] as Record<string, unknown> | undefined
      const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined
      const embedId = blip?.['@_r:embed']
      const target = typeof embedId === 'string' ? relTargets.get(embedId) : undefined
      const imageDataUri = target ? await resolveImageDataUri(zip, target, partPath) : null
      decorations.push({ kind: 'image', xEmu, yEmu, widthEmu, heightEmu, imageDataUri })
    }

    return { placeholders, decorations, backgroundFill: parseBgFill(cSld, theme) }
  } catch {
    return null
  }
}

// Loads (and caches, per presentation load) a slide's layout together with that layout's own
// master and theme, so decks whose slides share layouts/masters only parse each layout/master/
// theme part once.
async function loadLayoutIndex(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  layoutPath: string,
  layoutCache: Map<string, PptxLayoutIndex | null>,
  masterCache: Map<string, PptxPartIndex | null>,
  themeCache: Map<string, PptxThemeContext | null>,
): Promise<PptxLayoutIndex | null> {
  const cached = layoutCache.get(layoutPath)
  if (cached !== undefined) return cached

  let master: PptxPartIndex | null = null
  let theme: PptxThemeContext | null = null
  try {
    const masterPath = await findRelTarget(zip, parser, layoutPath, '/slideMaster')
    if (masterPath) {
      if (!themeCache.has(masterPath)) {
        themeCache.set(masterPath, await loadThemeContext(zip, parser, masterPath))
      }
      theme = themeCache.get(masterPath) ?? null
      if (!masterCache.has(masterPath)) {
        masterCache.set(masterPath, await loadPartIndex(zip, parser, masterPath, theme))
      }
      master = masterCache.get(masterPath) ?? null
    }
  } catch {
    master = null
  }

  const layoutPart = await loadPartIndex(zip, parser, layoutPath, theme)
  if (!layoutPart) {
    layoutCache.set(layoutPath, null)
    return null
  }

  const result: PptxLayoutIndex = { ...layoutPart, master, theme }
  layoutCache.set(layoutPath, result)
  return result
}

async function resolveImageDataUri(zip: import('jszip'), relTarget: string, slidePath: string): Promise<string | null> {
  try {
    const mediaPath = resolveRelativePath(slidePath, relTarget)
    const mime = extToMime(mediaPath)
    // EMF/WMF are vector metafile formats with no browser-native decoder - embedding them as an
    // <img> data URI would just show a broken-image icon, so treat them as unavailable up front
    // (same "not available in this preview" placeholder as an unresolvable image reference).
    if (mime === 'image/x-emf' || mime === 'image/x-wmf') return null
    const file = zip.file(mediaPath)
    if (!file) return null
    const base64 = await file.async('base64')
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

async function parseSlide(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  slidePath: string,
  slideIndex: number,
  layoutCache: Map<string, PptxLayoutIndex | null>,
  masterCache: Map<string, PptxPartIndex | null>,
  themeCache: Map<string, PptxThemeContext | null>,
): Promise<PptxSlide> {
  const slideXml = await zip.file(slidePath)?.async('text')
  if (slideXml === undefined) throw new Error(`Missing slide part: ${slidePath}`)
  const parsed = parser.parse(slideXml) as Record<string, unknown>
  const sld = parsed['p:sld'] as Record<string, unknown> | undefined
  if (!sld) throw new Error(`Malformed slide XML: ${slidePath}`)
  const cSld = sld['p:cSld'] as Record<string, unknown> | undefined
  const spTree = cSld?.['p:spTree'] as Record<string, unknown> | undefined

  // Read the slide's relationship file up front: p:pic > a:blip r:embed resolves to media via it,
  // and it's also how we find this slide's layout (which in turn points to its master).
  const relsXml = await zip.file(relsPathFor(slidePath))?.async('text')
  const relTargets = new Map<string, string>()
  let notesTarget: string | null = null
  let layoutTarget: string | null = null
  if (relsXml) {
    const relsParsed = parser.parse(relsXml) as Record<string, unknown>
    const relationships = relsParsed['Relationships'] as Record<string, unknown> | undefined
    for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const id = rel['@_Id']
      const target = rel['@_Target']
      const type = rel['@_Type']
      if (typeof id === 'string' && typeof target === 'string') {
        if (typeof type === 'string' && type.endsWith('/notesSlide')) {
          notesTarget = target
        } else if (typeof type === 'string' && type.endsWith('/slideLayout')) {
          layoutTarget = resolveRelativePath(slidePath, target)
        } else {
          relTargets.set(id, target)
        }
      }
    }
  }

  let layoutIndex: PptxLayoutIndex | null = null
  if (layoutTarget) {
    try {
      layoutIndex = await loadLayoutIndex(zip, parser, layoutTarget, layoutCache, masterCache, themeCache)
    } catch {
      layoutIndex = null
    }
  }
  const masterIndex = layoutIndex?.master ?? null
  const theme = layoutIndex?.theme ?? null

  const slideBackgroundFill = parseBgFill(cSld, theme)
  const backgroundFill = slideBackgroundFill ?? layoutIndex?.backgroundFill ?? masterIndex?.backgroundFill ?? null

  // Stacking order matches PowerPoint's own composited rendering: the master's fixed artwork is
  // the bottom-most layer, the layout's own artwork draws over that, and the slide's own content
  // (including any placeholder text, positioned via inheritance above) draws on top of both.
  const shapes: PptxShape[] = [...(masterIndex?.decorations ?? []), ...(layoutIndex?.decorations ?? [])]

  for (const sp of asArray(spTree?.['p:sp'] as Record<string, unknown>[] | Record<string, unknown>)) {
    if (isHiddenShape(sp, 'p:nvSpPr')) continue
    const spPr = sp['p:spPr'] as Record<string, unknown> | undefined
    const txBody = sp['p:txBody'] as Record<string, unknown> | undefined
    const runs = txBody ? parseRuns(txBody['a:p'], theme) : []
    if (runs.length === 0) continue
    // Text content always comes from the slide's own runs (never inherited placeholder prompt
    // text) - only geometry is resolved slide -> layout -> master (research.md §3).
    const placeholderRef = readPlaceholderRef(sp)
    const layoutMatch = placeholderRef && layoutIndex ? matchPlaceholder(placeholderRef, layoutIndex.placeholders) : undefined
    const masterMatch = placeholderRef && masterIndex ? matchPlaceholder(placeholderRef, masterIndex.placeholders) : undefined
    const { xEmu, yEmu, widthEmu, heightEmu } = mergeGeometry(
      parseXfrmPartial(spPr),
      layoutMatch?.geometry ?? {},
      masterMatch?.geometry ?? {},
    )
    shapes.push({ kind: 'text', xEmu, yEmu, widthEmu, heightEmu, runs })
  }

  for (const pic of asArray(spTree?.['p:pic'] as Record<string, unknown>[] | Record<string, unknown>)) {
    if (isHiddenShape(pic, 'p:nvPicPr')) continue
    const spPr = pic['p:spPr'] as Record<string, unknown> | undefined
    const { xEmu, yEmu, widthEmu, heightEmu } = mergeGeometry(parseXfrmPartial(spPr))
    const blipFill = pic['p:blipFill'] as Record<string, unknown> | undefined
    const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined
    const embedId = blip?.['@_r:embed']
    const target = typeof embedId === 'string' ? relTargets.get(embedId) : undefined
    const imageDataUri = target ? await resolveImageDataUri(zip, target, slidePath) : null
    shapes.push({ kind: 'image', xEmu, yEmu, widthEmu, heightEmu, imageDataUri })
  }

  let notes: string | null = null
  if (notesTarget) {
    const notesPath = resolveRelativePath(slidePath, notesTarget)
    const notesXml = await zip.file(notesPath)?.async('text')
    if (notesXml) {
      const notesParsed = parser.parse(notesXml) as Record<string, unknown>
      const notesRoot = notesParsed['p:notes'] as Record<string, unknown> | undefined
      const notesSpTree = (notesRoot?.['p:cSld'] as Record<string, unknown> | undefined)?.['p:spTree'] as Record<string, unknown> | undefined
      const notesRuns: string[] = []
      for (const sp of asArray(notesSpTree?.['p:sp'] as Record<string, unknown>[] | Record<string, unknown>)) {
        const txBody = sp['p:txBody'] as Record<string, unknown> | undefined
        if (!txBody) continue
        for (const run of parseRuns(txBody['a:p'], null)) notesRuns.push(run.text)
      }
      const joined = notesRuns.join(' ').trim()
      notes = joined.length > 0 ? joined : null
    }
  }

  return { index: slideIndex, shapes, backgroundFill, notes }
}

async function parsePresentation(bytes: Uint8Array): Promise<PptxPresentation> {
  const [{ default: JSZip }, { XMLParser }] = await Promise.all([
    import('jszip'),
    import('fast-xml-parser'),
  ])

  const zip = await JSZip.loadAsync(bytes)
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text')
  if (presentationXml === undefined) throw new Error('Missing ppt/presentation.xml')
  const presentationParsed = parser.parse(presentationXml) as Record<string, unknown>
  const presentationRoot = presentationParsed['p:presentation'] as Record<string, unknown> | undefined
  if (!presentationRoot) throw new Error('Malformed presentation.xml')
  const sldSz = presentationRoot['p:sldSz'] as Record<string, unknown> | undefined
  const slideWidthEmu = Number(sldSz?.['@_cx']) || 9144000
  const slideHeightEmu = Number(sldSz?.['@_cy']) || 6858000

  const sldIdLst = presentationRoot['p:sldIdLst'] as Record<string, unknown> | undefined
  const sldIds = asArray(sldIdLst?.['p:sldId'] as Record<string, unknown>[] | Record<string, unknown>)
  const relIds = sldIds.map((sldId) => sldId['@_r:id']).filter((id): id is string => typeof id === 'string')

  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text')
  const relTargets = new Map<string, string>()
  if (relsXml) {
    const relsParsed = parser.parse(relsXml) as Record<string, unknown>
    const relationships = relsParsed['Relationships'] as Record<string, unknown> | undefined
    for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const id = rel['@_Id']
      const target = rel['@_Target']
      if (typeof id === 'string' && typeof target === 'string') relTargets.set(id, target)
    }
  }

  const slidePaths = relIds
    .map((id) => relTargets.get(id))
    .filter((target): target is string => typeof target === 'string')
    .map((target) => `ppt/${target}`)

  const slides: PptxSlide[] = []
  const layoutCache = new Map<string, PptxLayoutIndex | null>()
  const masterCache = new Map<string, PptxPartIndex | null>()
  const themeCache = new Map<string, PptxThemeContext | null>()
  // Parse one slide at a time, yielding to the event loop, so a large deck doesn't block the UI thread.
  for (let index = 0; index < slidePaths.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop -- intentional: sequential + yielding for large decks
    const slide = await parseSlide(zip, parser, slidePaths[index], index, layoutCache, masterCache, themeCache)
    slides.push(slide)
    if (index % 3 === 2) {
      // eslint-disable-next-line no-await-in-loop -- yield point, not a data dependency
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return { slides, slideWidthEmu, slideHeightEmu }
}

const EMU_PER_PX = 9525 // OOXML English Metric Units per CSS pixel at 96 DPI

interface SlideCanvasProps {
  slide: PptxSlide
  widthPx: number
  heightPx: number
  scale: number
}

// The slide is laid out at its natural (EMU-derived) pixel size, using the same absolute-position
// math as PowerPoint's own coordinate system, then scaled down to fit the visible panel width via
// a CSS transform on an outer frame sized to the scaled result - so the preview stays responsive
// (fills the panel, no fixed-width overflow/scrollbar) without having to redo any shape math.
function PptxSlideCanvas({ slide, widthPx, heightPx, scale }: SlideCanvasProps) {
  return (
    <div className="pptx-viewer-slide-frame" style={{ height: `${heightPx * scale}px` }}>
      <div
        className="pptx-viewer-slide"
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          backgroundColor: slide.backgroundFill ?? '#ffffff',
          transform: `scale(${scale})`,
        }}
      >
        {slide.shapes.map((shape, shapeIndex) => (
        <div
          key={shapeIndex}
          className="pptx-viewer-shape"
          style={{
            position: 'absolute',
            left: `${shape.xEmu / EMU_PER_PX}px`,
            top: `${shape.yEmu / EMU_PER_PX}px`,
            width: `${shape.widthEmu / EMU_PER_PX}px`,
            height: `${shape.heightEmu / EMU_PER_PX}px`,
          }}
        >
          {shape.kind === 'text' ? (
            <p>
              {shape.runs.map((run, runIndex) => (
                <span
                  key={runIndex}
                  style={{
                    fontWeight: run.bold ? 'bold' : undefined,
                    fontStyle: run.italic ? 'italic' : undefined,
                    fontSize: run.fontSizePt ? `${run.fontSizePt}pt` : undefined,
                    color: run.color ?? undefined,
                  }}
                >
                  {run.text}
                </span>
              ))}
            </p>
          ) : shape.imageDataUri ? (
            <img src={shape.imageDataUri} alt="" className="pptx-viewer-image" />
          ) : (
            <div className="pptx-viewer-image-placeholder">Image not available in this preview</div>
          )}
        </div>
        ))}
      </div>
    </div>
  )
}

interface SlideItemProps {
  slide: PptxSlide
  widthPx: number
  heightPx: number
  scale: number
  onVisibilityChange: (index: number, isVisible: boolean) => void
}

// One entry in the continuous-scroll slide list. Shape rendering is deferred until the slide
// nears the viewport (so a large deck stays scroll-responsive, FR-013/SC-004); a second observer
// reports which slide is currently in view to drive the "Slide N of M" position indicator.
// IntersectionObserver's `root: null` means the top-level document viewport, NOT "whatever
// scrolls" - the preview panel actually scrolls inside an ancestor div (ContentPanel's own
// scroll wrapper), so without an explicit root here every slide reads as "always intersecting"
// against the full page instead of the small visible panel.
function findScrollableAncestor(element: Element): HTMLElement | null {
  let node = element.parentElement
  while (node) {
    if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node
    node = node.parentElement
  }
  return null
}

function PptxSlideItem({ slide, widthPx, heightPx, scale, onVisibilityChange }: SlideItemProps) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    if (typeof IntersectionObserver === 'undefined') {
      // No IntersectionObserver support in this environment: render immediately rather than
      // showing an empty slide forever. Position tracking simply stays at its initial value.
      setShouldRender(true)
      return
    }

    const root = findScrollableAncestor(element)
    const renderObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setShouldRender(true)
      },
      { root, rootMargin: '200% 0px' },
    )
    // threshold 0 (any pixel visible) rather than e.g. 0.5: a slide taller than the visible panel
    // can never reach 50% of its OWN area visible, so a ratio threshold would never fire for it.
    // The parent picks the topmost of all currently-intersecting slides as "current" instead.
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) onVisibilityChange(slide.index, entry.isIntersecting)
      },
      { root, threshold: 0 },
    )
    renderObserver.observe(element)
    visibilityObserver.observe(element)

    return () => {
      renderObserver.disconnect()
      visibilityObserver.disconnect()
      onVisibilityChange(slide.index, false)
    }
  }, [slide.index, onVisibilityChange])

  return (
    <div ref={elementRef} className="pptx-viewer-slide-item" data-slide-index={slide.index}>
      {shouldRender ? (
        <PptxSlideCanvas slide={slide} widthPx={widthPx} heightPx={heightPx} scale={scale} />
      ) : (
        <div
          className="pptx-viewer-slide-frame pptx-viewer-slide-pending"
          style={{ height: `${heightPx * scale}px` }}
          aria-hidden="true"
        />
      )}
      {slide.notes ? (
        <div className="pptx-viewer-notes" aria-label={`Speaker notes for slide ${slide.index + 1}`}>
          <h4>Notes</h4>
          <p>{slide.notes}</p>
        </div>
      ) : null}
    </div>
  )
}

export default function PptxViewer({ content }: Props) {
  const [presentation, setPresentation] = useState<PptxPresentation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [visibleIndices, setVisibleIndices] = useState<ReadonlySet<number>>(() => new Set())
  const [containerWidthPx, setContainerWidthPx] = useState(0)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  // Slides render at their natural (EMU-derived) pixel size, then scale down/up via CSS transform
  // to exactly fill the available panel width - keeping the preview responsive instead of a
  // fixed-size canvas that overflows (needing a horizontal scrollbar) in a narrower panel.
  // A callback ref (not useRef + useEffect) because the scroll-body element doesn't exist on the
  // very first render (parsing hasn't finished, so the loading skeleton renders instead) - a
  // plain useEffect with an empty dependency array would run once against a still-null ref and
  // never observe anything; a callback ref fires again once the real element actually mounts.
  const scrollBodyRef = useCallback((element: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect()
    resizeObserverRef.current = null
    if (!element) return

    if (typeof ResizeObserver === 'undefined') {
      setContainerWidthPx(element.clientWidth)
      return
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setContainerWidthPx(entry.contentRect.width)
    })
    observer.observe(element)
    resizeObserverRef.current = observer
  }, [])

  useEffect(() => () => resizeObserverRef.current?.disconnect(), [])

  useEffect(() => {
    let cancelled = false
    setPresentation(null)
    setError(null)
    setVisibleIndices(new Set())

    async function run(): Promise<void> {
      try {
        const bytes = base64ToUint8Array(content)
        const parsed = await parsePresentation(bytes)
        if (cancelled) return
        setPresentation(parsed)
      } catch {
        if (cancelled) return
        setError("This file can't be previewed as a PowerPoint presentation.")
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [content])

  // The "current" slide for the position indicator is the topmost of all currently-intersecting
  // slides (a scroll-spy pattern) - robust even when a slide is much taller than the visible
  // panel, where a visibility-ratio threshold could never be satisfied (see PptxSlideItem).
  const handleSlideVisibilityChange = useCallback((index: number, isVisible: boolean) => {
    setVisibleIndices((previous) => {
      const next = new Set(previous)
      if (isVisible) next.add(index)
      else next.delete(index)
      return next
    })
  }, [])

  const visibleSlideIndex = visibleIndices.size > 0 ? Math.min(...visibleIndices) : 0

  if (error) {
    return <p className="binary-placeholder" role="alert">{error}</p>
  }

  if (presentation === null) {
    return <div className="content-skeleton" aria-label="loading presentation" />
  }

  if (presentation.slides.length === 0) {
    return <p className="binary-placeholder">This presentation has no slides.</p>
  }

  const canvasWidthPx = presentation.slideWidthEmu / EMU_PER_PX
  const canvasHeightPx = presentation.slideHeightEmu / EMU_PER_PX
  const scale = containerWidthPx > 0 ? containerWidthPx / canvasWidthPx : 1

  return (
    <div className="pptx-viewer">
      <div className="pptx-viewer-toolbar">
        <span className="pptx-viewer-slide-counter">
          Slide {visibleSlideIndex + 1} of {presentation.slides.length}
        </span>
      </div>
      <div className="pptx-viewer-scroll-body" ref={scrollBodyRef}>
        {presentation.slides.map((slide) => (
          <PptxSlideItem
            key={slide.index}
            slide={slide}
            widthPx={canvasWidthPx}
            heightPx={canvasHeightPx}
            scale={scale}
            onVisibilityChange={handleSlideVisibilityChange}
          />
        ))}
      </div>
    </div>
  )
}
