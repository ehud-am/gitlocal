// Test helpers shared by the OOXML previews: parse XML fragments with the usual prefixes declared,
// write relationship parts, and a small theme part.
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
