// Test helpers for the PPTX preview: parse XML fragments with the usual OOXML prefixes declared,
// and assemble small in-memory .pptx packages part by part.
import JSZip from 'jszip'
import { DEFAULT_CLR_MAP, type ColorContext } from './color'
import { MediaRegistry, type PartScope } from './fill'
import { openPackage, type OpcPackage } from './package'
import { DEFAULT_THEME, type Theme } from './theme'
import { parseXml } from './xml'

export const NS = [
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:dsp="http://schemas.microsoft.com/office/drawing/2008/diagram"',
  'xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram"',
].join(' ')

// The first element of an XML fragment, parsed with the OOXML namespaces in scope.
export function el(fragment: string): Element {
  const root = parseXml(`<root ${NS}>${fragment}</root>`)
  const first = root?.firstElementChild
  if (!first) throw new Error(`Bad test fragment: ${fragment}`)
  return first
}

const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const TYPE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

export interface Rel {
  id: string
  type: string
  target: string
  external?: boolean
}

export function relsXml(rels: Rel[]): string {
  const items = rels.map((rel) => `<Relationship Id="${rel.id}" Type="${TYPE}/${rel.type}" Target="${rel.target}"${rel.external ? ' TargetMode="External"' : ''}/>`)
  return `<?xml version="1.0"?><Relationships xmlns="${REL_NS}">${items.join('')}</Relationships>`
}

export const THEME_XML = `<a:theme ${NS} name="Test"><a:themeElements>
  <a:clrScheme name="Test">
    <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window"/></a:lt1>
    <a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
    <a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2>
    <a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4>
    <a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6>
    <a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink>
  </a:clrScheme>
  <a:fontScheme name="Test"><a:majorFont><a:latin typeface="Georgia"/><a:ea typeface="MS Gothic"/></a:majorFont><a:minorFont><a:latin typeface="Arial"/></a:minorFont></a:fontScheme>
  <a:fmtScheme name="Test">
    <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"/></a:gs></a:gsLst><a:lin ang="5400000"/></a:gradFill><a:blipFill><a:blip r:embed="rIdTheme"/><a:tile sx="50000" sy="50000"/></a:blipFill></a:fillStyleLst>
    <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="25400"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="dash"/></a:ln></a:lnStyleLst>
    <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst><a:outerShdw blurRad="38100" dist="19050" dir="5400000"><a:schemeClr val="phClr"><a:alpha val="50000"/></a:schemeClr></a:outerShdw></a:effectLst></a:effectStyle></a:effectStyleLst>
    <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:gradFill><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"/></a:gs><a:gs pos="100000"><a:srgbClr val="000000"/></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill><a:blipFill><a:blip r:embed="rIdTheme"/><a:stretch/></a:blipFill></a:bgFillStyleLst>
  </a:fmtScheme>
</a:themeElements></a:theme>`

export function spTree(content: string): string {
  return `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${content}</p:spTree>`
}

// A text shape, optionally a placeholder, with an optional position.
export function sp(options: { text?: string; ph?: string; box?: [number, number, number, number]; spPr?: string; body?: string; extra?: string; name?: string; hidden?: boolean }): string {
  const ph = options.ph ? `<p:nvPr>${options.ph}</p:nvPr>` : '<p:nvPr/>'
  const xfrm = options.box ? `<a:xfrm><a:off x="${options.box[0]}" y="${options.box[1]}"/><a:ext cx="${options.box[2]}" cy="${options.box[3]}"/></a:xfrm>` : ''
  const body = options.body ?? (options.text !== undefined ? `<a:bodyPr/><a:p><a:r><a:t>${options.text}</a:t></a:r></a:p>` : null)
  return `<p:sp><p:nvSpPr><p:cNvPr id="2" name="${options.name ?? 'Shape'}"${options.hidden ? ' hidden="1"' : ''}/><p:cNvSpPr/>${ph}</p:nvSpPr>`
    + `<p:spPr>${xfrm}${options.spPr ?? ''}</p:spPr>${options.extra ?? ''}${body !== null ? `<p:txBody>${body}</p:txBody>` : ''}</p:sp>`
}

export interface SlideSpec {
  shapes?: string
  // Raw children of p:cSld before the shape tree (e.g. a <p:bg>).
  bg?: string
  attrs?: string
  after?: string
  layout?: number | null
  rels?: Rel[]
  notes?: string
}

export interface PartSpec {
  shapes?: string
  bg?: string
  attrs?: string
  after?: string
  rels?: Rel[]
}

export interface DeckSpec {
  slides: SlideSpec[]
  layouts?: PartSpec[]
  master?: PartSpec & { txStyles?: string; clrMap?: string } | null
  theme?: string | null
  presentationExtra?: string
  sldSz?: string | null
  files?: Record<string, string | Uint8Array>
  tableStyles?: string
}

const CLR_MAP = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'

export async function buildDeck(spec: DeckSpec): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('_rels/.rels', relsXml([{ id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' }]))
  const presRels: Rel[] = []
  const sldIds = spec.slides.map((_, index) => {
    presRels.push({ id: `rIdS${index + 1}`, type: 'slide', target: `slides/slide${index + 1}.xml` })
    return `<p:sldId id="${256 + index}" r:id="rIdS${index + 1}"/>`
  }).join('')
  if (spec.tableStyles) {
    presRels.push({ id: 'rIdT', type: 'tableStyles', target: 'tableStyles.xml' })
    zip.file('ppt/tableStyles.xml', spec.tableStyles)
  }
  const sldSz = spec.sldSz === undefined ? '<p:sldSz cx="9144000" cy="6858000"/>' : (spec.sldSz ?? '')
  zip.file('ppt/presentation.xml', `<p:presentation ${NS}><p:sldIdLst>${sldIds}</p:sldIdLst>${sldSz}${spec.presentationExtra ?? ''}</p:presentation>`)
  zip.file('ppt/_rels/presentation.xml.rels', relsXml(presRels))

  const master = spec.master === undefined ? {} : spec.master
  if (master) {
    const theme = spec.theme === undefined ? THEME_XML : spec.theme
    const masterRels: Rel[] = [...(master.rels ?? [])]
    if (theme) {
      zip.file('ppt/theme/theme1.xml', theme)
      masterRels.push({ id: 'rIdTh', type: 'theme', target: '../theme/theme1.xml' })
    }
    zip.file('ppt/slideMasters/slideMaster1.xml', `<p:sldMaster ${NS}${master.attrs ?? ''}><p:cSld>${master.bg ?? ''}${spTree(master.shapes ?? '')}</p:cSld>${master.clrMap ?? CLR_MAP}${master.txStyles ? `<p:txStyles>${master.txStyles}</p:txStyles>` : ''}${master.after ?? ''}</p:sldMaster>`)
    zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', relsXml(masterRels))
  }
  const layouts = spec.layouts ?? [{}]
  layouts.forEach((layout, index) => {
    zip.file(`ppt/slideLayouts/slideLayout${index + 1}.xml`, `<p:sldLayout ${NS}${layout.attrs ?? ''}><p:cSld>${layout.bg ?? ''}${spTree(layout.shapes ?? '')}</p:cSld>${layout.after ?? ''}</p:sldLayout>`)
    const rels = [...(layout.rels ?? [])]
    if (master) rels.push({ id: 'rIdM', type: 'slideMaster', target: '../slideMasters/slideMaster1.xml' })
    zip.file(`ppt/slideLayouts/_rels/slideLayout${index + 1}.xml.rels`, relsXml(rels))
  })
  spec.slides.forEach((slide, index) => {
    zip.file(`ppt/slides/slide${index + 1}.xml`, `<p:sld ${NS}${slide.attrs ?? ''}><p:cSld>${slide.bg ?? ''}${spTree(slide.shapes ?? '')}</p:cSld>${slide.after ?? ''}</p:sld>`)
    const rels = [...(slide.rels ?? [])]
    const layout = slide.layout === undefined ? 0 : slide.layout
    if (layout !== null) rels.push({ id: 'rIdL', type: 'slideLayout', target: `../slideLayouts/slideLayout${layout + 1}.xml` })
    if (slide.notes !== undefined) {
      rels.push({ id: 'rIdN', type: 'notesSlide', target: `../notesSlides/notesSlide${index + 1}.xml` })
      zip.file(`ppt/notesSlides/notesSlide${index + 1}.xml`, `<p:notes ${NS}><p:cSld>${spTree(slide.notes)}</p:cSld></p:notes>`)
    }
    zip.file(`ppt/slides/_rels/slide${index + 1}.xml.rels`, relsXml(rels))
  })
  for (const [path, content] of Object.entries(spec.files ?? {})) zip.file(path, content)
  return zip.generateAsync({ type: 'uint8array' })
}

// A part scope over a package built from raw files, for testing fill/line/text parsing directly.
export async function scopeFor(files: Record<string, string | Uint8Array>, partPath = 'ppt/slides/slide1.xml', theme: Theme = DEFAULT_THEME, colors?: ColorContext): Promise<PartScope & { pkg: OpcPackage }> {
  const zip = new JSZip()
  for (const [path, content] of Object.entries(files)) zip.file(path, content)
  const pkg = await openPackage(await zip.generateAsync({ type: 'uint8array' }))
  return {
    pkg,
    partPath,
    colors: colors ?? { scheme: theme.scheme, clrMap: { ...DEFAULT_CLR_MAP } },
    theme,
    media: new MediaRegistry(),
  }
}

// 1x1 transparent PNG.
export const PNG_BYTES = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), (c) => c.charCodeAt(0))

// Builds a minimal EMF: header, the given records, EOF.
export function emf(records: number[][] = [rectangle()], bounds = [0, 0, 99, 49]): Uint8Array {
  const body = records.flat()
  const header = new DataView(new ArrayBuffer(108))
  const total = 108 + body.length + 20
  header.setUint32(0, 1, true)
  header.setUint32(4, 108, true)
  bounds.forEach((value, index) => header.setInt32(8 + index * 4, value, true))
  ;[0, 0, 2646, 1323].forEach((value, index) => header.setInt32(24 + index * 4, value, true))
  header.setUint32(40, 0x464d4520, true)
  header.setUint32(44, 0x10000, true)
  header.setUint32(48, total, true)
  header.setUint32(52, records.length + 2, true)
  header.setUint16(56, 1, true)
  header.setInt32(72, 1920, true)
  header.setInt32(76, 1080, true)
  header.setInt32(80, 508, true)
  header.setInt32(84, 286, true)
  const eof = new DataView(new ArrayBuffer(20))
  eof.setUint32(0, 14, true)
  eof.setUint32(4, 20, true)
  eof.setUint32(12, 16, true)
  eof.setUint32(16, 20, true)
  return Uint8Array.from([...new Uint8Array(header.buffer), ...body, ...new Uint8Array(eof.buffer)])
}

function record(type: number, payload: (view: DataView) => void, size: number): number[] {
  const view = new DataView(new ArrayBuffer(size))
  view.setUint32(0, type, true)
  view.setUint32(4, size, true)
  payload(view)
  return Array.from(new Uint8Array(view.buffer))
}

export const rectangle = () => record(43, (view) => [10, 10, 90, 40].forEach((value, index) => view.setInt32(8 + index * 4, value, true)), 24)
export const xform = (type: 35 | 36, values: number[], mode?: number) => record(type, (view) => {
  values.forEach((value, index) => view.setFloat32(8 + index * 4, value, true))
  if (mode !== undefined) view.setUint32(32, mode, true)
}, type === 35 ? 32 : 36)
export const saveDc = () => record(33, () => undefined, 8)
export const restoreDc = (relative: number) => record(34, (view) => view.setInt32(8, relative, true), 12)

// A placeable WMF with one rectangle.
export function wmf(placeable = true): Uint8Array {
  const words: number[] = []
  if (placeable) words.push(0xcdd7, 0x9ac6, 0, 0, 0, 200, 100, 1440, 0, 0, 0)
  const records = [
    [5, 0, 0x020c, 100, 200], // META_SETWINDOWEXT
    [7, 0, 0x041b, 90, 190, 10, 10], // META_RECTANGLE
    [3, 0, 0x0000], // META_EOF
  ]
  const size = 9 + records.reduce((sum, item) => sum + item.length, 0)
  words.push(1, 9, 0x0300, size & 0xffff, size >> 16, 0, 7, 0, 0, ...records.flat())
  const view = new DataView(new ArrayBuffer(words.length * 2))
  words.forEach((word, index) => view.setUint16(index * 2, word, true))
  return new Uint8Array(view.buffer)
}
