import JSZip from 'jszip'
import { describe, expect, it, vi } from 'vitest'
import { openPackage, relsPathFor, resolvePartPath } from './package'
import { el, relsXml, THEME_XML } from './test-support'
import { cssFontFamily, DEFAULT_THEME, loadTheme, resolveTypeface } from './theme'
import { attr, boolAttr, child, children, contentChildren, numAttr, parseXml, path, relAttr } from './xml'

describe('xml helpers', () => {
  it('parses well-formed XML and rejects malformed XML', () => {
    expect(parseXml('<a><b/></a>')?.localName).toBe('a')
    expect(parseXml('<a><b></a>')).toBeNull()
    const parse = vi.spyOn(DOMParser.prototype, 'parseFromString')
    expect(parseXml('\uFEFF<?xml version="1.0"?><a/>')?.localName).toBe('a')
    expect(parse).toHaveBeenLastCalledWith('<?xml version="1.0"?><a/>', 'application/xml')
    parse.mockRestore()
  })

  it('walks children by local name', () => {
    const root = el('<a:x><a:y/><a:z/><a:y/></a:x>')
    expect(children(root)).toHaveLength(3)
    expect(children(root, 'y')).toHaveLength(2)
    expect(children(null)).toEqual([])
    expect(child(root, 'z')?.localName).toBe('z')
    expect(child(root, 'q')).toBeNull()
    expect(child(undefined, 'q')).toBeNull()
    expect(path(el('<a:x><a:y><a:z/></a:y></a:x>'), 'y', 'z')?.localName).toBe('z')
    expect(path(root, 'q', 'z')).toBeNull()
    expect(path(null)).toBeNull()
  })

  it('reads attributes by local name and relationship attributes by namespace', () => {
    const element = el('<p:sldId id="256" r:id="rId2"/>')
    expect(attr(element, 'id')).toBe('256')
    expect(relAttr(element, 'id')).toBe('rId2')
    expect(attr(el('<a:blip r:embed="rId5"/>'), 'embed')).toBe('rId5')
    expect(attr(element, 'missing')).toBeNull()
    expect(attr(null, 'id')).toBeNull()
    expect(relAttr(null, 'id')).toBeNull()
    expect(relAttr(el('<a:blip embed="x"/>'), 'embed')).toBeNull()
    // A relationship attribute under a non-standard namespace is still found by its prefix.
    expect(relAttr(el('<a:blip xmlns:q="urn:other" q:embed="rId9"/>'), 'embed')).toBe('rId9')
  })

  it('parses numeric and boolean attributes', () => {
    const element = el('<a:x n="12" bad="abc" blank=" " t="1" f="0" tt="true"/>')
    expect(numAttr(element, 'n')).toBe(12)
    expect(numAttr(element, 'bad')).toBeUndefined()
    expect(numAttr(element, 'blank')).toBeUndefined()
    expect(numAttr(element, 'none')).toBeUndefined()
    expect(boolAttr(element, 't')).toBe(true)
    expect(boolAttr(element, 'tt')).toBe(true)
    expect(boolAttr(element, 'f')).toBe(false)
    expect(boolAttr(element, 'none')).toBeUndefined()
  })

  it('resolves markup-compatibility wrappers, preferring the fallback', () => {
    const tree = el(`<p:spTree><a:one/><mc:AlternateContent><mc:Choice><a:choice/></mc:Choice><mc:Fallback><a:fallback/></mc:Fallback></mc:AlternateContent>
      <mc:AlternateContent><mc:Choice><a:onlyChoice/></mc:Choice></mc:AlternateContent><mc:AlternateContent/></p:spTree>`)
    expect(contentChildren(tree).map((element) => element.localName)).toEqual(['one', 'fallback', 'onlyChoice'])
  })
})

describe('package', () => {
  it('resolves relationship targets against the source part', () => {
    expect(resolvePartPath('ppt/slides/slide1.xml', '../media/image1.png')).toBe('ppt/media/image1.png')
    expect(resolvePartPath('ppt/slides/slide1.xml', './a.xml')).toBe('ppt/slides/a.xml')
    expect(resolvePartPath('ppt/slides/slide1.xml', '/ppt/x.xml')).toBe('ppt/x.xml')
    expect(relsPathFor('ppt/slides/slide1.xml')).toBe('ppt/slides/_rels/slide1.xml.rels')
    expect(relsPathFor('')).toBe('_rels/.rels')
  })

  it('reads parts and relationships, skipping incomplete relationship entries', async () => {
    const zip = new JSZip()
    zip.file('ppt/a.xml', '<root/>')
    zip.file('ppt/_rels/a.xml.rels', `${relsXml([
      { id: 'r1', type: 'image', target: 'media/x.png' },
      { id: 'r2', type: 'hyperlink', target: 'https://example.com', external: true },
    ]).replace('</Relationships>', '<Relationship Id="r3"/></Relationships>')}`)
    const pkg = await openPackage(await zip.generateAsync({ type: 'uint8array' }))
    expect(pkg.xml('ppt/a.xml')?.localName).toBe('root')
    expect(pkg.xml('ppt/a.xml')).toBe(pkg.xml('ppt/a.xml'))
    expect(pkg.xml('ppt/missing.xml')).toBeNull()
    const rels = pkg.rels('ppt/a.xml')
    expect(rels.get('r1')?.target).toBe('ppt/media/x.png')
    expect(rels.get('r2')).toMatchObject({ external: true, target: 'https://example.com' })
    expect(rels.has('r3')).toBe(false)
    expect(pkg.rels('ppt/a.xml')).toBe(rels)
    expect(pkg.relByType('ppt/a.xml', '/image')?.id).toBe('r1')
    expect(pkg.relByType('ppt/a.xml', '/chart')).toBeUndefined()
    expect(pkg.hasPart('ppt/a.xml')).toBe(true)
    expect(pkg.hasPart('ppt/b.xml')).toBe(false)
  })
})

describe('theme', () => {
  it('loads palette, fonts and ordered style lists', async () => {
    const zip = new JSZip()
    zip.file('ppt/theme/theme1.xml', THEME_XML)
    const pkg = await openPackage(await zip.generateAsync({ type: 'uint8array' }))
    const theme = loadTheme(pkg, 'ppt/theme/theme1.xml')
    expect(theme.scheme.dk1).toBe('000000')
    expect(theme.scheme.lt1).toBe('FFFFFF')
    expect(theme.scheme.accent1).toBe('4F81BD')
    expect(theme.fonts).toEqual({ majorLatin: 'Georgia', minorLatin: 'Arial', majorEa: 'MS Gothic', minorEa: '' })
    expect(theme.fillStyles.map((element) => element.localName)).toEqual(['solidFill', 'gradFill', 'blipFill'])
    expect(theme.bgFillStyles).toHaveLength(3)
    expect(theme.lineStyles).toHaveLength(2)
    expect(theme.effectStyles).toHaveLength(2)
    expect(loadTheme(pkg, null)).toBe(DEFAULT_THEME)
    expect(loadTheme(pkg, 'ppt/theme/missing.xml')).toBe(DEFAULT_THEME)
  })

  it('falls back for missing palette slots and fonts', async () => {
    const zip = new JSZip()
    zip.file('t.xml', '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:clrScheme><a:dk1><a:sysClr val="windowText"/></a:dk1><a:lt1><a:prstClr val="red"/></a:lt1></a:clrScheme></a:themeElements></a:theme>')
    const pkg = await openPackage(await zip.generateAsync({ type: 'uint8array' }))
    const theme = loadTheme(pkg, 't.xml')
    expect(theme.scheme.dk1).toBe('000000')
    expect(theme.scheme.lt1).toBe('FFFFFF')
    expect(theme.fonts.majorLatin).toBe('Calibri Light')
    expect(theme.fillStyles).toEqual([])
  })

  it('resolves theme font references', () => {
    const theme = { ...DEFAULT_THEME, fonts: { majorLatin: 'Major', minorLatin: 'Minor', majorEa: '', minorEa: 'MinorEa' } }
    expect(resolveTypeface(null, theme)).toBeNull()
    expect(resolveTypeface('+mj-lt', theme)).toBe('Major')
    expect(resolveTypeface('+mn-lt', theme)).toBe('Minor')
    expect(resolveTypeface('+mj-ea', theme)).toBe('Major')
    expect(resolveTypeface('+mn-ea', theme)).toBe('MinorEa')
    expect(resolveTypeface('+mj-cs', theme)).toBe('Major')
    expect(resolveTypeface('+mn-cs', theme)).toBe('Minor')
    expect(resolveTypeface('Verdana', theme)).toBe('Verdana')
  })

  it('builds CSS font stacks with metric-compatible fallbacks', () => {
    expect(cssFontFamily(null)).toContain('Carlito')
    expect(cssFontFamily('Calibri')).toBe('"Calibri", Carlito, "Segoe UI", Arial, sans-serif')
    expect(cssFontFamily('My "Font"')).toBe('"My Font", Arial, sans-serif')
  })
})
