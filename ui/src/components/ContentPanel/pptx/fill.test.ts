import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { openPackage } from '../ooxml/package'
import { loadTheme } from '../ooxml/theme'
import { hasFillElement, parseBackground, parseFill, parseLine, parseShadow, parseStyleFill } from './fill'
import { fillStyle, imageCropStyle } from './fill-css'
import type { Fill, ImageRef } from './model'
import { el, relsXml, scopeFor, THEME_XML } from './test-support'

async function themedScope() {
  const zip = new JSZip()
  zip.file('ppt/theme/theme1.xml', THEME_XML)
  zip.file('ppt/theme/_rels/theme1.xml.rels', relsXml([{ id: 'rIdTheme', type: 'image', target: '../media/theme.png' }]))
  const theme = loadTheme(await openPackage(await zip.generateAsync({ type: 'uint8array' })), 'ppt/theme/theme1.xml')
  return scopeFor({
    'ppt/theme/theme1.xml': THEME_XML,
    'ppt/theme/_rels/theme1.xml.rels': relsXml([{ id: 'rIdTheme', type: 'image', target: '../media/theme.png' }]),
    'ppt/slides/_rels/slide1.xml.rels': relsXml([
      { id: 'rId1', type: 'image', target: '../media/a.png' },
      { id: 'rId2', type: 'image', target: 'https://example.com/x.png', external: true },
    ]),
  }, 'ppt/slides/slide1.xml', theme)
}

describe('parseFill', () => {
  it('returns undefined when the container defines no fill', async () => {
    const scope = await themedScope()
    expect(parseFill(el('<p:spPr><a:ln/></p:spPr>'), scope)).toBeUndefined()
    expect(parseFill(null, scope)).toBeUndefined()
    expect(hasFillElement(el('<p:spPr><a:noFill/></p:spPr>'))).toBe(true)
    expect(hasFillElement(el('<p:spPr/>'))).toBe(false)
  })

  it('reads none, solid and pattern fills', async () => {
    const scope = await themedScope()
    expect(parseFill(el('<p:spPr><a:noFill/></p:spPr>'), scope)).toEqual({ type: 'none' })
    expect(parseFill(el('<p:spPr><a:solidFill><a:schemeClr val="accent1"/></a:solidFill></p:spPr>'), scope)).toEqual({ type: 'solid', color: '#4f81bd' })
    expect(parseFill(el('<p:spPr><a:solidFill/></p:spPr>'), scope)).toBeUndefined()
    expect(parseFill(el('<p:spPr><a:pattFill prst="dkHorz"><a:fgClr><a:srgbClr val="FF0000"/></a:fgClr><a:bgClr><a:srgbClr val="00FF00"/></a:bgClr></a:pattFill></p:spPr>'), scope))
      .toEqual({ type: 'pattern', preset: 'dkHorz', fg: '#ff0000', bg: '#00ff00' })
    expect(parseFill(el('<p:spPr><a:pattFill/></p:spPr>'), scope)).toEqual({ type: 'pattern', preset: 'pct50', fg: '#000000', bg: '#ffffff' })
  })

  it('reads linear and path gradients, sorting and clamping stops', async () => {
    const scope = await themedScope()
    const linear = parseFill(el(`<p:spPr><a:gradFill><a:gsLst>
      <a:gs pos="120000"><a:srgbClr val="0000FF"/></a:gs><a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs><a:gs pos="50000"/></a:gsLst>
      <a:lin ang="2700000"/></a:gradFill></p:spPr>`), scope)
    expect(linear).toEqual({ type: 'gradient', path: 'linear', angle: 45, stops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#0000ff' }], focus: { x: 0.5, y: 0.5 } })
    const radial = parseFill(el('<p:spPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="100000" t="100000"/></a:path></a:gradFill></p:spPr>'), scope)
    expect(radial).toMatchObject({ path: 'circle', focus: { x: 1, y: 1 } })
    expect(parseFill(el('<p:spPr><a:gradFill><a:gsLst><a:gs><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst><a:path path="rect"/></a:gradFill></p:spPr>'), scope)).toMatchObject({ path: 'rect', focus: { x: 0.5, y: 0.5 } })
    expect(parseFill(el('<p:spPr><a:gradFill><a:gsLst><a:gs><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst><a:path path="shape"/></a:gradFill></p:spPr>'), scope)).toMatchObject({ path: 'shape' })
    expect(parseFill(el('<p:spPr><a:gradFill><a:gsLst/></a:gradFill></p:spPr>'), scope)).toBeUndefined()
    expect(parseFill(el('<p:spPr><a:gradFill><a:gsLst><a:gs><a:srgbClr val="FFFFFF"/></a:gs></a:gsLst></a:gradFill></p:spPr>'), scope)).toMatchObject({ angle: 0 })
  })

  it('reads picture fills with crop, transparency, grayscale and tiling', async () => {
    const scope = await themedScope()
    const stretched = parseFill(el(`<p:blipFill><a:blip r:embed="rId1"><a:alphaModFix amt="40000"/><a:grayscl/></a:blip>
      <a:srcRect l="10000" t="20000" r="30000" b="40000"/><a:stretch/></p:blipFill>`).parentElement, scope)
    expect(stretched).toMatchObject({ type: 'image', tile: null, image: { mediaPath: 'ppt/media/a.png', opacity: 0.4, grayscale: true, crop: { l: 0.1, t: 0.2, r: 0.3, b: 0.4 } } })
    const tiled = parseFill(el('<p:blipFill><a:blip r:embed="rId1"><a:alphaModFix/></a:blip><a:tile tx="9525" ty="19050"/></p:blipFill>').parentElement, scope)
    expect(tiled).toMatchObject({ tile: { sx: 1, sy: 1, tx: 1, ty: 2 }, image: { opacity: 1, grayscale: false } })
    expect(parseFill(el('<p:spPr><a:blipFill><a:blip r:embed="rId2"/></a:blipFill></p:spPr>'), scope)).toBeUndefined()
    expect(parseFill(el('<p:spPr><a:blipFill><a:blip r:embed="rId404"/></a:blipFill></p:spPr>'), scope)).toBeUndefined()
    expect(parseFill(el('<p:spPr><a:blipFill><a:blip/></a:blipFill></p:spPr>'), scope)).toBeUndefined()
    expect(scope.media.refs).toHaveLength(2)
  })

  it('resolves a:grpFill to the enclosing group fill', async () => {
    const scope = await themedScope()
    const groupFill: Fill = { type: 'solid', color: '#123456' }
    expect(parseFill(el('<p:spPr><a:grpFill/></p:spPr>'), scope, null, groupFill)).toBe(groupFill)
    expect(parseFill(el('<p:spPr><a:grpFill/></p:spPr>'), scope)).toBeUndefined()
  })
})

describe('theme style references', () => {
  it('selects fill and background styles by position, with phClr from the reference', async () => {
    const scope = await themedScope()
    expect(parseStyleFill(null, scope)).toBeUndefined()
    expect(parseStyleFill(el('<a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>'), scope)).toEqual({ type: 'none' })
    expect(parseStyleFill(el('<a:fillRef><a:schemeClr val="accent1"/></a:fillRef>'), scope)).toEqual({ type: 'none' })
    expect(parseStyleFill(el('<a:fillRef idx="1"><a:schemeClr val="accent2"/></a:fillRef>'), scope)).toEqual({ type: 'solid', color: '#c0504d' })
    expect(parseStyleFill(el('<a:fillRef idx="2"><a:srgbClr val="000000"/></a:fillRef>'), scope)).toMatchObject({ type: 'gradient', angle: 90 })
    // The third fill style is a picture; its r:embed resolves against the theme part.
    expect(parseStyleFill(el('<a:fillRef idx="3"><a:srgbClr val="000000"/></a:fillRef>'), scope)).toMatchObject({ type: 'image', image: { mediaPath: 'ppt/media/theme.png' } })
    expect(parseStyleFill(el('<p:bgRef idx="1001"><a:schemeClr val="accent3"/></p:bgRef>'), scope)).toEqual({ type: 'solid', color: '#9bbb59' })
    expect(parseStyleFill(el('<p:bgRef idx="1002"><a:srgbClr val="FF0000"/></p:bgRef>'), scope)).toMatchObject({ type: 'gradient', path: 'circle', stops: [{ color: '#ff0000' }, { color: '#000000' }] })
    // Out of range: the reference's own color, or nothing.
    expect(parseStyleFill(el('<a:fillRef idx="9"><a:srgbClr val="00FF00"/></a:fillRef>'), scope)).toEqual({ type: 'solid', color: '#00ff00' })
    expect(parseStyleFill(el('<a:fillRef idx="9"/>'), scope)).toBeUndefined()
  })

  it('reads p:bg as a direct fill or a style reference', async () => {
    const scope = await themedScope()
    expect(parseBackground(el('<p:cSld/>'), scope)).toBeUndefined()
    expect(parseBackground(null, scope)).toBeUndefined()
    expect(parseBackground(el('<p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></p:bgPr></p:bg></p:cSld>'), scope)).toEqual({ type: 'solid', color: '#abcdef' })
    expect(parseBackground(el('<p:cSld><p:bg><p:bgRef idx="1001"><a:srgbClr val="010203"/></p:bgRef></p:bg></p:cSld>'), scope)).toEqual({ type: 'solid', color: '#010203' })
  })
})

describe('parseLine', () => {
  it('returns null without a visible line', async () => {
    const scope = await themedScope()
    expect(parseLine([], scope)).toBeNull()
    expect(parseLine([null], scope)).toBeNull()
    expect(parseLine([el('<a:ln><a:noFill/></a:ln>')], scope)).toBeNull()
    expect(parseLine([el('<a:ln w="12700"/>')], scope)).toBeNull()
  })

  it('merges properties from the first source that sets each one', async () => {
    const scope = await themedScope()
    const line = parseLine([
      el('<a:ln w="19050"><a:prstDash val="sysDot"/></a:ln>'),
      el('<a:ln cap="rnd"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:bevel/><a:headEnd type="triangle" w="sm" len="lg"/><a:tailEnd type="oval"/></a:ln>'),
    ], scope)
    expect(line).toEqual({
      color: '#ff0000',
      gradient: null,
      widthPx: 2,
      dash: '2 2',
      cap: 'round',
      join: 'bevel',
      head: { type: 'triangle', width: 2, length: 5 },
      tail: { type: 'oval', width: 3, length: 3 },
    })
  })

  it('reads joins, caps, unknown dashes and line ends', async () => {
    const scope = await themedScope()
    const solid = '<a:solidFill><a:srgbClr val="000000"/></a:solidFill>'
    expect(parseLine([el(`<a:ln cap="sq">${solid}<a:miter/><a:prstDash val="unknown"/><a:headEnd type="none"/><a:tailEnd/></a:ln>`)], scope))
      .toMatchObject({ cap: 'square', join: 'miter', dash: null, head: null, tail: null, widthPx: 1 })
    expect(parseLine([el(`<a:ln w="1">${solid}<a:round/><a:headEnd type="arrow" w="huge"/></a:ln>`)], scope))
      .toMatchObject({ cap: 'butt', join: 'round', widthPx: 0.5, head: { type: 'arrow', width: 3 } })
  })

  it('uses gradient and pattern colors, and a black stand-in for picture outlines', async () => {
    const scope = await themedScope()
    expect(parseLine([el('<a:ln><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs></a:gsLst><a:lin ang="0"/></a:gradFill></a:ln>')], scope))
      .toMatchObject({ color: '#ff0000', gradient: { angle: 0, stops: [{ color: '#ff0000' }] } })
    expect(parseLine([el('<a:ln><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="00FF00"/></a:gs></a:gsLst><a:path path="circle"/></a:gradFill></a:ln>')], scope))
      .toMatchObject({ gradient: { angle: 90 } })
    expect(parseLine([el('<a:ln><a:pattFill><a:fgClr><a:srgbClr val="0000FF"/></a:fgClr></a:pattFill></a:ln>')], scope)).toMatchObject({ color: '#0000ff' })
    expect(parseLine([el('<a:ln><a:blipFill><a:blip r:embed="rId1"/></a:blipFill></a:ln>')], scope)).toMatchObject({ color: '#000000' })
  })

  it('falls back to the theme line style named by a:lnRef', async () => {
    const scope = await themedScope()
    expect(parseLine([null], scope, el('<a:lnRef idx="2"><a:schemeClr val="accent2"/></a:lnRef>'))).toMatchObject({ color: '#c0504d', widthPx: 25400 / 9525 })
    expect(parseLine([el('<a:ln w="9525"/>')], scope, el('<a:lnRef idx="2"><a:srgbClr val="00FF00"/></a:lnRef>'))).toMatchObject({ color: '#00ff00', widthPx: 1 })
    expect(parseLine([null], scope, el('<a:lnRef idx="0"/>'))).toBeNull()
    expect(parseLine([null], scope, el('<a:lnRef/>'))).toBeNull()
  })
})

describe('parseShadow', () => {
  it('turns an outer shadow into a drop-shadow filter', async () => {
    const scope = await themedScope()
    expect(parseShadow([el('<a:effectLst><a:outerShdw blurRad="95250" dist="95250" dir="0"><a:srgbClr val="000000"/></a:outerShdw></a:effectLst>')], scope))
      .toBe('drop-shadow(10px 0px 5px #000000)')
    expect(parseShadow([el('<a:effectLst><a:outerShdw/></a:effectLst>')], scope)).toBeNull()
    expect(parseShadow([el('<a:effectLst><a:glow/></a:effectLst>')], scope)).toBeNull()
    expect(parseShadow([null], scope)).toBeNull()
    expect(parseShadow([el('<a:effectLst><a:outerShdw><a:srgbClr val="000000"/></a:outerShdw></a:effectLst>')], scope)).toBe('drop-shadow(0px 0px 0px #000000)')
  })

  it('uses the theme effect style named by a:effectRef', async () => {
    const scope = await themedScope()
    expect(parseShadow([null], scope, el('<a:effectRef idx="2"><a:srgbClr val="FF0000"/></a:effectRef>'))).toBe('drop-shadow(0px 2px 2px rgba(255, 0, 0, 0.5))')
    expect(parseShadow([null], scope, el('<a:effectRef idx="0"/>'))).toBeNull()
    expect(parseShadow([null], scope, el('<a:effectRef/>'))).toBeNull()
    expect(parseShadow([null], scope, el('<a:effectRef idx="7"/>'))).toBeNull()
  })
})

describe('fill CSS', () => {
  const image = (overrides: Partial<ImageRef> = {}): ImageRef => ({ mediaPath: 'm.png', src: 'blob:x', crop: { l: 0, t: 0, r: 0, b: 0 }, opacity: 1, grayscale: false, ...overrides })

  it('draws nothing for absent or empty fills', () => {
    expect(fillStyle(null, 10, 10)).toBeNull()
    expect(fillStyle({ type: 'none' }, 10, 10)).toBeNull()
    expect(fillStyle({ type: 'image', image: image({ src: null }), tile: null }, 10, 10)).toBeNull()
  })

  it('draws solid colors and gradients', () => {
    expect(fillStyle({ type: 'solid', color: 'red' }, 1, 1)).toEqual({ backgroundColor: 'red' })
    expect(fillStyle({ type: 'gradient', path: 'linear', angle: 90, stops: [{ offset: 0, color: 'red' }, { offset: 1, color: 'blue' }], focus: { x: 0.5, y: 0.5 } }, 1, 1))
      .toEqual({ backgroundImage: 'linear-gradient(180deg, red 0%, blue 100%)' })
    expect(fillStyle({ type: 'gradient', path: 'circle', angle: 0, stops: [{ offset: 0.5, color: 'red' }], focus: { x: 0.25, y: 1 } }, 1, 1))
      .toEqual({ backgroundImage: 'radial-gradient(circle farthest-corner at 25% 100%, red 50%)' })
    expect(fillStyle({ type: 'gradient', path: 'rect', angle: 0, stops: [{ offset: 0, color: 'red' }], focus: { x: 0.5, y: 0.5 } }, 1, 1))
      .toEqual({ backgroundImage: 'radial-gradient(ellipse farthest-corner at 50% 50%, red 0%)' })
  })

  it('approximates pattern presets', () => {
    const pattern = (preset: string) => fillStyle({ type: 'pattern', preset, fg: 'black', bg: 'white' }, 1, 1)
    expect(pattern('pct25')).toEqual({ backgroundColor: 'color-mix(in srgb, black 25%, white)' })
    expect(pattern('narHorz')?.backgroundImage).toContain('0deg, black 0 1px, white 1px 3px')
    expect(pattern('ltHorz')?.backgroundImage).toContain('white 1px 5px')
    expect(pattern('narVert')?.backgroundImage).toContain('90deg, black 0 1px, white 1px 3px')
    expect(pattern('dkVert')?.backgroundImage).toContain('90deg')
    expect(pattern('dkDnDiag')?.backgroundImage).toContain('45deg')
    expect(pattern('wdUpDiag')?.backgroundImage).toContain('-45deg')
    expect(pattern('smGrid')?.backgroundImage).toContain(', repeating-linear-gradient(90deg')
    expect(pattern('weave')).toEqual({ backgroundColor: 'color-mix(in srgb, black 50%, white)' })
  })

  it('stretches, crops and tiles pictures', () => {
    expect(fillStyle({ type: 'image', image: image({ crop: { l: 0.5, t: 0, r: 0, b: 0.5 }, opacity: 0.5, grayscale: true }), tile: null }, 100, 50)).toEqual({
      backgroundImage: 'url("blob:x")',
      backgroundRepeat: 'no-repeat',
      backgroundSize: '200px 100px',
      backgroundPosition: '-100px 0px',
      opacity: 0.5,
      filter: 'grayscale(1)',
    })
    expect(fillStyle({ type: 'image', image: image({ opacity: 0.3 }), tile: { sx: 1, sy: 1, tx: 4, ty: 5 } }, 10, 10)).toEqual({
      backgroundImage: 'url("blob:x")',
      backgroundRepeat: 'repeat',
      backgroundPosition: '4px 5px',
      opacity: 0.3,
    })
    expect(fillStyle({ type: 'image', image: image(), tile: { sx: 1, sy: 1, tx: 0, ty: 0 } }, 10, 10)?.opacity).toBeUndefined()
    // A crop that leaves nothing visible keeps the box size instead of dividing by zero.
    expect(imageCropStyle(image({ crop: { l: 0.5, t: 0.5, r: 0.5, b: 0.5 } }), 10, 20)).toMatchObject({ width: '10px', height: '20px' })
  })
})
