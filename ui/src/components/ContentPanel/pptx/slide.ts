import { DEFAULT_CLR_MAP, type ColorContext } from './color'
import { parseChart } from './chart'
import { MediaRegistry, parseBackground, parseFill, parseLine, parseShadow, parseStyleFill, type PartScope } from './fill'
import type { Box, CustomPath, Fill, Geometry, GeometryCommand, ImageRef, SlideModel, SlideNode } from './model'
import { EMU_PER_PX } from './model'
import type { OpcPackage } from './package'
import { parseTable } from './table'
import { parseTextBody, type TextStyleChain } from './text'
import { loadTheme, type Theme } from './theme'
import { attr, boolAttr, child, children, contentChildren, numAttr, path, relAttr } from './xml'

interface Placeholder {
  type: string | null
  idx: string | null
  element: Element
}

interface PartInfo {
  path: string
  root: Element
  scope: PartScope
  placeholders: Placeholder[]
  background: Fill | undefined
  // Whether this part shows the shapes of the part(s) it is based on (p:sld/p:sldLayout @showMasterSp).
  showMasterShapes: boolean
  nodes: SlideNode[] | null
}

interface MasterInfo extends PartInfo {
  titleStyle: Element | null
  bodyStyle: Element | null
  otherStyle: Element | null
}

interface LayoutInfo extends PartInfo {
  master: MasterInfo | null
}

// Shared state for one presentation's parse.
export interface DeckContext {
  pkg: OpcPackage
  media: MediaRegistry
  defaultTextStyle: Element | null
  tableStyles: Element | null
  layouts: Map<string, LayoutInfo | null>
  masters: Map<string, MasterInfo | null>
  themes: Map<string, Theme>
}

// What shape parsing needs beyond the part scope: placeholder inheritance sources (slides only -
// a layout's or master's own placeholders are editing prompts and never drawn) and text styles.
interface ShapeContext {
  deck: DeckContext
  scope: PartScope
  slideNumber: number
  layout: LayoutInfo | null
  master: MasterInfo | null
  // Masters and layouts draw only their non-placeholder artwork.
  skipPlaceholders: boolean
  groupFill: Fill | null
}

const emuToPx = (value: number | undefined) => (value ?? 0) / EMU_PER_PX

function placeholderOf(element: Element): Placeholder | null {
  const nvPr = children(element).find((candidate) => candidate.localName.startsWith('nv'))
  const ph = path(nvPr, 'nvPr', 'ph')
  if (!ph) return null
  return { type: attr(ph, 'type'), idx: attr(ph, 'idx'), element }
}

function isHidden(element: Element): boolean {
  const nvPr = children(element).find((candidate) => candidate.localName.startsWith('nv'))
  return attr(child(nvPr, 'cNvPr'), 'hidden') === '1' || attr(child(nvPr, 'cNvPr'), 'hidden') === 'true'
}

// Placeholder types fall into the master's three text style families.
function placeholderFamily(type: string | null): 'title' | 'body' | 'dt' | 'ftr' | 'sldNum' | 'hdr' {
  if (type === 'title' || type === 'ctrTitle') return 'title'
  if (type === 'dt' || type === 'ftr' || type === 'sldNum' || type === 'hdr') return type
  return 'body'
}

// Matches a placeholder against a layout's placeholders: the same idx first, then the same type,
// then the same family (a slide's ctrTitle can inherit from a layout's title and vice versa).
function matchLayoutPlaceholder(ref: Placeholder, candidates: Placeholder[]): Placeholder | undefined {
  if (ref.idx !== null) {
    const byIdx = candidates.find((candidate) => candidate.idx === ref.idx)
    if (byIdx) return byIdx
  }
  if (ref.type === null) return undefined
  return candidates.find((candidate) => candidate.type === ref.type)
    ?? candidates.find((candidate) => candidate.type !== null && placeholderFamily(candidate.type) === placeholderFamily(ref.type))
}

// A master has one placeholder per family; layouts and slides inherit from it by family.
function matchMasterPlaceholder(type: string | null, candidates: Placeholder[]): Placeholder | undefined {
  const family = placeholderFamily(type)
  return candidates.find((candidate) => placeholderFamily(candidate.type) === family)
}

function readBox(xfrm: Element | null): Box | null {
  if (!xfrm) return null
  const off = child(xfrm, 'off')
  const ext = child(xfrm, 'ext')
  if (!off && !ext) return null
  return {
    x: emuToPx(numAttr(off, 'x')),
    y: emuToPx(numAttr(off, 'y')),
    w: emuToPx(numAttr(ext, 'cx')),
    h: emuToPx(numAttr(ext, 'cy')),
    rot: (numAttr(xfrm, 'rot') ?? 0) / 60000,
    flipH: boolAttr(xfrm, 'flipH') ?? false,
    flipV: boolAttr(xfrm, 'flipV') ?? false,
  }
}

function readAdjustments(avLst: Element | null): Record<string, number> {
  const adj: Record<string, number> = {}
  for (const gd of children(avLst, 'gd')) {
    const name = attr(gd, 'name')
    const match = /^val\s+(-?[\d.]+)/.exec(attr(gd, 'fmla') ?? '')
    if (name && match) adj[name] = Number(match[1])
  }
  return adj
}

function readCustomGeometry(custGeom: Element): Geometry {
  const point = (pt: Element | null): [string, string] => [attr(pt, 'x') ?? '0', attr(pt, 'y') ?? '0']
  const paths: CustomPath[] = children(child(custGeom, 'pathLst'), 'path').map((pathElement) => {
    const commands: GeometryCommand[] = []
    for (const command of children(pathElement)) {
      switch (command.localName) {
        case 'moveTo': commands.push({ op: 'M', pts: [point(child(command, 'pt'))] }); break
        case 'lnTo': commands.push({ op: 'L', pts: [point(child(command, 'pt'))] }); break
        case 'cubicBezTo': commands.push({ op: 'C', pts: children(command, 'pt').map(point) }); break
        case 'quadBezTo': commands.push({ op: 'Q', pts: children(command, 'pt').map(point) }); break
        case 'arcTo':
          commands.push({ op: 'A', wR: attr(command, 'wR') ?? '0', hR: attr(command, 'hR') ?? '0', stAng: attr(command, 'stAng') ?? '0', swAng: attr(command, 'swAng') ?? '0' })
          break
        case 'close': commands.push({ op: 'Z' }); break
        default: break
      }
    }
    return {
      w: numAttr(pathElement, 'w') ?? null,
      h: numAttr(pathElement, 'h') ?? null,
      fill: attr(pathElement, 'fill') !== 'none',
      stroke: attr(pathElement, 'stroke') !== 'false' && attr(pathElement, 'stroke') !== '0',
      commands,
    }
  })
  const guides = children(child(custGeom, 'gdLst'), 'gd').map((gd) => ({ name: attr(gd, 'name') ?? '', fmla: attr(gd, 'fmla') ?? 'val 0' }))
  return { kind: 'custom', guides, adj: readAdjustments(child(custGeom, 'avLst')), paths }
}

function readGeometry(spPrs: (Element | null)[]): Geometry {
  for (const spPr of spPrs) {
    const prstGeom = child(spPr, 'prstGeom')
    if (prstGeom) return { kind: 'preset', name: attr(prstGeom, 'prst') ?? 'rect', adj: readAdjustments(child(prstGeom, 'avLst')) }
    const custGeom = child(spPr, 'custGeom')
    if (custGeom) return readCustomGeometry(custGeom)
  }
  return { kind: 'preset', name: 'rect', adj: {} }
}

// The layout and master placeholder elements a slide placeholder inherits from, nearest first.
function inheritanceChain(element: Element, context: ShapeContext): { elements: Element[]; type: string | null } {
  const ref = placeholderOf(element)
  if (!ref || context.skipPlaceholders) return { elements: [], type: ref?.type ?? null }
  const elements: Element[] = []
  const layoutMatch = context.layout ? matchLayoutPlaceholder(ref, context.layout.placeholders) : undefined
  if (layoutMatch) elements.push(layoutMatch.element)
  const type = ref.type ?? layoutMatch?.type ?? null
  const masterMatch = context.master ? matchMasterPlaceholder(type, context.master.placeholders) : undefined
  if (masterMatch) elements.push(masterMatch.element)
  return { elements, type }
}

function textChain(element: Element, inherited: Element[], placeholderType: string | null, isPlaceholder: boolean, context: ShapeContext): TextStyleChain {
  const master = context.master
  // Title and body placeholders take the master's title or body text style; other text (text
  // boxes, shapes, and the date/footer/slide-number placeholders) takes the presentation's default
  // text style first and the master's "other" style after it.
  const family = isPlaceholder ? placeholderFamily(placeholderType) : null
  let masterStyles: (Element | null)[]
  if (family === 'title') masterStyles = [master?.titleStyle ?? null, context.deck.defaultTextStyle]
  else if (family === 'body') masterStyles = [master?.bodyStyle ?? null, context.deck.defaultTextStyle]
  else masterStyles = [context.deck.defaultTextStyle, master?.otherStyle ?? null]
  const style = [element, ...inherited].map((source) => child(source, 'style')).find((candidate) => candidate !== null) ?? null
  return {
    lstStyles: [
      ...inherited.map((source) => child(child(source, 'txBody'), 'lstStyle')),
      ...masterStyles,
    ],
    bodyPrs: inherited.map((source) => child(child(source, 'txBody'), 'bodyPr')),
    fontRef: child(style, 'fontRef'),
  }
}

function parseShape(element: Element, context: ShapeContext): SlideNode | null {
  const isPlaceholder = placeholderOf(element) !== null
  if (isPlaceholder && context.skipPlaceholders) return null
  const { elements: inherited, type } = inheritanceChain(element, context)
  const spPr = child(element, 'spPr')
  const spPrs = [spPr, ...inherited.map((source) => child(source, 'spPr'))]
  // A shape with no position anywhere in its inheritance chain is drawn from the slide's corner.
  const box = spPrs.map((source) => readBox(child(source, 'xfrm'))).find((candidate) => candidate !== null)
    ?? { x: 0, y: 0, w: 0, h: 0, rot: 0, flipH: false, flipV: false }
  // Shape properties resolve in this order: the shape's own spPr, its own p:style, then the
  // spPr of the layout/master placeholders it inherits from and their p:style.
  const ownStyle = child(element, 'style')
  const style = ownStyle ?? inherited.map((source) => child(source, 'style')).find((candidate) => candidate !== null) ?? null
  const propertySources = ownStyle ? [spPr] : spPrs

  const fill = parseFill(spPr, context.scope, null, context.groupFill)
    ?? (ownStyle ? parseStyleFill(child(ownStyle, 'fillRef'), context.scope) : undefined)
    ?? inherited.map((source) => parseFill(child(source, 'spPr'), context.scope)).find((candidate) => candidate !== undefined)
    ?? parseStyleFill(child(style, 'fillRef'), context.scope)
    ?? null
  const line = parseLine(propertySources.map((source) => child(source, 'ln')), context.scope, child(style, 'lnRef'))
  const shadow = parseShadow(propertySources.map((source) => child(source, 'effectLst')), context.scope, child(style, 'effectRef'))

  const text = parseTextBody(child(element, 'txBody'), textChain(element, inherited, type, isPlaceholder, context), {
    scope: context.scope,
    slideNumber: context.slideNumber,
  })
  const textXfrm = readBox(child(element, 'txXfrm'))
  const textBox = textXfrm ? { ...textXfrm, x: textXfrm.x - box.x, y: textXfrm.y - box.y } : null

  // An empty placeholder is an editing prompt: the slide show doesn't draw it, including any fill
  // or outline it only inherits from its layout. Formatting set on the slide itself still shows.
  if (isPlaceholder && !text && !parseFill(spPr, context.scope) && !child(spPr, 'ln') && !ownStyle) return null
  const geometry = readGeometry(spPrs)
  if (!text && (fill === null || fill.type === 'none') && line === null) return null
  return { kind: 'shape', box, geometry, fill, line, text, textBox, shadow }
}

function parsePicture(element: Element, context: ShapeContext, frameBox: Box | null = null): SlideNode | null {
  if (placeholderOf(element) && context.skipPlaceholders) return null
  const { elements: inherited } = inheritanceChain(element, context)
  const spPr = child(element, 'spPr')
  const spPrs = [spPr, ...inherited.map((source) => child(source, 'spPr'))]
  const box = frameBox ?? spPrs.map((source) => readBox(child(source, 'xfrm'))).find((candidate) => candidate !== null)
  if (!box) return null
  const fill = parseFill(element, context.scope)
  // A picture whose image can't be resolved (missing or external relationship) still takes its
  // place on the slide, drawn as an "image not available" box.
  const image: ImageRef = fill?.type === 'image'
    ? fill.image
    : { mediaPath: '', src: null, crop: { l: 0, t: 0, r: 0, b: 0 }, opacity: 1, grayscale: false }
  const style = child(element, 'style')
  return {
    kind: 'picture',
    box,
    geometry: readGeometry(spPrs),
    image,
    line: parseLine(spPrs.map((source) => child(source, 'ln')), context.scope, child(style, 'lnRef')),
    shadow: parseShadow(spPrs.map((source) => child(source, 'effectLst')), context.scope, child(style, 'effectRef')),
  }
}

// Re-expresses a subtree laid out in a group's child coordinate space in the group's own pixels.
function scaleNode(node: SlideNode, sx: number, sy: number, dx: number, dy: number): SlideNode {
  const box = { ...node.box, x: (node.box.x - dx) * sx, y: (node.box.y - dy) * sy, w: node.box.w * sx, h: node.box.h * sy }
  if (node.kind === 'group') {
    return { ...node, box, children: node.children.map((childNode) => scaleNode(childNode, sx, sy, 0, 0)) }
  }
  if (node.kind === 'shape' && node.textBox) {
    return { ...node, box, textBox: { ...node.textBox, x: node.textBox.x * sx, y: node.textBox.y * sy, w: node.textBox.w * sx, h: node.textBox.h * sy } }
  }
  if (node.kind === 'table') {
    return { ...node, box, columns: node.columns.map((width) => width * sx), rows: node.rows.map((row) => ({ ...row, heightPx: row.heightPx * sy })) }
  }
  return { ...node, box }
}

function parseGroup(element: Element, context: ShapeContext): SlideNode | null {
  const grpSpPr = child(element, 'grpSpPr')
  const xfrm = child(grpSpPr, 'xfrm')
  const groupFill = parseFill(grpSpPr, context.scope, null, context.groupFill) ?? context.groupFill
  const childNodes = parseShapeTree(element, { ...context, groupFill })
  const box = readBox(xfrm)
  // A group without a transform leaves its children where they are.
  if (!box) return { kind: 'group', box: { x: 0, y: 0, w: 0, h: 0, rot: 0, flipH: false, flipV: false }, children: childNodes }
  const chOff = child(xfrm, 'chOff')
  const chExt = child(xfrm, 'chExt')
  const chW = emuToPx(numAttr(chExt, 'cx')) || box.w || 1
  const chH = emuToPx(numAttr(chExt, 'cy')) || box.h || 1
  const sx = box.w / chW
  const sy = box.h / chH
  return {
    kind: 'group',
    box,
    children: childNodes.map((node) => scaleNode(node, sx, sy, emuToPx(numAttr(chOff, 'x')), emuToPx(numAttr(chOff, 'y')))),
  }
}

function parseDiagram(graphicData: Element, box: Box, context: ShapeContext): SlideNode | null {
  const { pkg } = context.deck
  const dataRelId = relAttr(child(graphicData, 'relIds'), 'dm')
  const dataPath = dataRelId ? pkg.rels(context.scope.partPath).get(dataRelId)?.target : undefined
  // The data part names the pre-rendered drawing (dsp:dataModelExt relId) by a relationship id of
  // the slide; fall back to the slide's only diagram drawing when that link is missing.
  const dataRoot = dataPath ? pkg.xml(dataPath) : null
  const drawingRelId = dataRoot ? attr(dataRoot.getElementsByTagNameNS('*', 'dataModelExt')[0] ?? null, 'relId') : null
  const drawingPath = (drawingRelId ? pkg.rels(context.scope.partPath).get(drawingRelId)?.target : undefined)
    ?? pkg.relByType(context.scope.partPath, '/diagramDrawing')?.target
  const drawing = drawingPath ? pkg.xml(drawingPath) : null
  if (!drawingPath || !drawing) return null
  const drawingScope: PartScope = { ...context.scope, partPath: drawingPath }
  const nodes = parseShapeTree(child(drawing, 'spTree'), { ...context, scope: drawingScope, skipPlaceholders: false, layout: null })
  return { kind: 'group', box, children: nodes }
}

function parseGraphicFrame(element: Element, context: ShapeContext): SlideNode | null {
  if (placeholderOf(element) && context.skipPlaceholders) return null
  const { elements: inherited } = inheritanceChain(element, context)
  const box = [element, ...inherited].map((source) => readBox(child(source, 'xfrm') ?? path(source, 'spPr', 'xfrm'))).find((candidate) => candidate !== null)
  if (!box) return null
  const graphicData = path(element, 'graphic', 'graphicData')
  const uri = attr(graphicData, 'uri') ?? ''
  if (uri.endsWith('/table')) {
    const table = parseTable(child(graphicData, 'tbl'), box, {
      scope: context.scope,
      slideNumber: context.slideNumber,
      tableStyles: context.deck.tableStyles,
      defaultTextStyle: context.deck.defaultTextStyle,
    })
    return table
  }
  if (uri.endsWith('/chart')) {
    const relId = relAttr(child(graphicData, 'chart'), 'id')
    const chartPath = relId ? context.deck.pkg.rels(context.scope.partPath).get(relId)?.target : undefined
    const chartRoot = chartPath ? context.deck.pkg.xml(chartPath) : null
    return { kind: 'chart', box, chart: chartRoot ? parseChart(chartRoot, context.scope) : null }
  }
  if (uri.endsWith('/diagram')) return parseDiagram(graphicData as Element, box, context)
  // OLE objects (embedded spreadsheets, documents, ...) carry a preview picture: a p:pic inside
  // p:oleObj in newer files, or a VML shape in the slide's legacy drawing part in older ones.
  const preview = graphicData?.getElementsByTagNameNS('*', 'pic')[0]
  if (preview) return parsePicture(preview, context, box)
  const image = legacyOlePreview(attr(graphicData?.getElementsByTagNameNS('*', 'oleObj')[0] ?? null, 'spid'), context)
  return image ? { kind: 'picture', box, geometry: { kind: 'preset', name: 'rect', adj: {} }, image, line: null, shadow: null } : null
}

function legacyOlePreview(spid: string | null, context: ShapeContext): ImageRef | null {
  if (!spid) return null
  const { pkg } = context.deck
  const vmlPath = pkg.relByType(context.scope.partPath, '/vmlDrawing')?.target
  const vml = vmlPath ? pkg.xml(vmlPath) : null
  if (!vmlPath || !vml) return null
  const shape = Array.from(vml.getElementsByTagNameNS('*', 'shape')).find((candidate) => attr(candidate, 'id') === spid)
  const relId = attr(shape?.getElementsByTagNameNS('*', 'imagedata')[0] ?? null, 'relid')
  const rel = relId ? pkg.rels(vmlPath).get(relId) : undefined
  return rel && !rel.external ? context.scope.media.create(rel.target, null, null) : null
}

export function parseShapeTree(spTree: Element | null, context: ShapeContext): SlideNode[] {
  const nodes: SlideNode[] = []
  for (const element of contentChildren(spTree)) {
    if (isHidden(element)) continue
    let node: SlideNode | null = null
    switch (element.localName) {
      case 'sp':
      case 'cxnSp':
        node = parseShape(element, context)
        break
      case 'pic':
        node = parsePicture(element, context)
        break
      case 'grpSp':
        node = parseGroup(element, context)
        break
      case 'graphicFrame':
        node = parseGraphicFrame(element, context)
        break
      default:
        break
    }
    if (node) nodes.push(node)
  }
  return nodes
}

// A part's color map: a master defines p:clrMap; a layout or slide can override it with
// p:clrMapOvr > a:overrideClrMapping (a:masterClrMapping means "keep the master's").
function colorMapFor(root: Element, inherited: Record<string, string>): Record<string, string> {
  const own = child(root, 'clrMap') ?? path(root, 'clrMapOvr', 'overrideClrMapping')
  if (!own) return inherited
  const map = { ...inherited }
  for (const key of Object.keys(DEFAULT_CLR_MAP)) {
    const value = attr(own, key)
    if (value) map[key] = value
  }
  return map
}

function partInfo(deck: DeckContext, partPath: string, root: Element, theme: Theme, inheritedClrMap: Record<string, string>): PartInfo {
  const colors: ColorContext = { scheme: theme.scheme, clrMap: colorMapFor(root, inheritedClrMap) }
  const scope: PartScope = { pkg: deck.pkg, partPath, colors, theme, media: deck.media }
  const cSld = child(root, 'cSld')
  const placeholders = contentChildren(child(cSld, 'spTree'))
    .map((element) => placeholderOf(element))
    .filter((candidate): candidate is Placeholder => candidate !== null)
  return {
    path: partPath,
    root,
    scope,
    placeholders,
    background: parseBackground(cSld, scope),
    showMasterShapes: attr(root, 'showMasterSp') !== '0' && attr(root, 'showMasterSp') !== 'false',
    nodes: null,
  }
}

function loadMaster(deck: DeckContext, masterPath: string): MasterInfo | null {
  if (deck.masters.has(masterPath)) return deck.masters.get(masterPath) ?? null
  const root = deck.pkg.xml(masterPath)
  let info: MasterInfo | null = null
  if (root) {
    const themePath = deck.pkg.relByType(masterPath, '/theme')?.target ?? null
    let theme = themePath ? deck.themes.get(themePath) : undefined
    if (!theme) {
      theme = loadTheme(deck.pkg, themePath)
      if (themePath) deck.themes.set(themePath, theme)
    }
    const txStyles = child(root, 'txStyles')
    info = {
      ...partInfo(deck, masterPath, root, theme, DEFAULT_CLR_MAP),
      titleStyle: child(txStyles, 'titleStyle'),
      bodyStyle: child(txStyles, 'bodyStyle'),
      otherStyle: child(txStyles, 'otherStyle'),
    }
  }
  deck.masters.set(masterPath, info)
  return info
}

function loadLayout(deck: DeckContext, layoutPath: string): LayoutInfo | null {
  if (deck.layouts.has(layoutPath)) return deck.layouts.get(layoutPath) ?? null
  const root = deck.pkg.xml(layoutPath)
  let info: LayoutInfo | null = null
  if (root) {
    const masterPath = deck.pkg.relByType(layoutPath, '/slideMaster')?.target
    const master = masterPath ? loadMaster(deck, masterPath) : null
    const theme = master?.scope.theme ?? loadTheme(deck.pkg, null)
    info = { ...partInfo(deck, layoutPath, root, theme, master?.scope.colors.clrMap ?? DEFAULT_CLR_MAP), master }
  }
  deck.layouts.set(layoutPath, info)
  return info
}

// A layout's or master's own artwork (logos, bands, decorative text), parsed once per part - or
// once per slide when that artwork shows the slide number.
function partNodes(deck: DeckContext, part: PartInfo, master: MasterInfo | null, slideNumber: number): SlideNode[] {
  if (part.nodes) return part.nodes
  const spTree = path(part.root, 'cSld', 'spTree')
  const nodes = parseShapeTree(spTree, {
    deck,
    scope: part.scope,
    slideNumber,
    layout: null,
    master,
    skipPlaceholders: true,
    groupFill: null,
  })
  const showsSlideNumber = Array.from(spTree?.getElementsByTagNameNS('*', 'fld') ?? []).some((field) => attr(field, 'type') === 'slidenum')
  if (!showsSlideNumber) part.nodes = nodes
  return nodes
}

function parseNotes(deck: DeckContext, slidePath: string): string | null {
  const notesPath = deck.pkg.relByType(slidePath, '/notesSlide')?.target
  const notes = notesPath ? deck.pkg.xml(notesPath) : null
  if (!notes) return null
  const lines: string[] = []
  for (const shape of contentChildren(path(notes, 'cSld', 'spTree'))) {
    // Skip the slide-image and slide-number placeholders; keep the notes body text.
    const type = placeholderOf(shape)?.type
    if (type === 'sldImg' || type === 'sldNum' || type === 'hdr' || type === 'ftr' || type === 'dt') continue
    for (const paragraph of children(child(shape, 'txBody'), 'p')) {
      const text = Array.from(paragraph.getElementsByTagNameNS('*', 't')).map((t) => t.textContent ?? '').join('')
      if (text.trim().length > 0) lines.push(text)
    }
  }
  return lines.length > 0 ? lines.join('\n') : null
}

export function parseSlide(deck: DeckContext, slidePath: string, index: number): SlideModel {
  const root = deck.pkg.xml(slidePath)
  if (!root || root.localName !== 'sld') throw new Error(`Malformed slide part: ${slidePath}`)
  const layoutPath = deck.pkg.relByType(slidePath, '/slideLayout')?.target
  const layout = layoutPath ? loadLayout(deck, layoutPath) : null
  const master = layout?.master ?? null
  const theme = master?.scope.theme ?? loadTheme(deck.pkg, null)
  const slide = partInfo(deck, slidePath, root, theme, layout?.scope.colors.clrMap ?? DEFAULT_CLR_MAP)
  const slideNumber = index + 1

  const nodes: SlideNode[] = []
  if (slide.showMasterShapes) {
    if (master && layout?.showMasterShapes) nodes.push(...partNodes(deck, master, master, slideNumber))
    if (layout) nodes.push(...partNodes(deck, layout, master, slideNumber))
  }
  nodes.push(...parseShapeTree(path(root, 'cSld', 'spTree'), {
    deck,
    scope: slide.scope,
    slideNumber,
    layout,
    master,
    skipPlaceholders: false,
    groupFill: null,
  }))

  const background = slide.background ?? layout?.background ?? master?.background ?? { type: 'solid', color: '#ffffff' }
  return { index, background, nodes, notes: parseNotes(deck, slidePath) }
}

