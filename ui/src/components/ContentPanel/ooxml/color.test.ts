import { describe, expect, it } from 'vitest'
import { DEFAULT_CLR_MAP, resolveColor, toCss } from './color'
import { el } from './test-support'

const hex = (fragment: string, context = null as Parameters<typeof resolveColor>[1], ph = null as Parameters<typeof resolveColor>[2]) => {
  const color = resolveColor(el(`<a:solidFill>${fragment}</a:solidFill>`), context, ph)
  return color ? toCss(color) : null
}

describe('resolveColor', () => {
  it('returns null when the parent has no color element', () => {
    expect(resolveColor(el('<a:solidFill/>'), null)).toBeNull()
    expect(resolveColor(null, null)).toBeNull()
  })

  it('reads srgbClr, rejecting malformed values', () => {
    expect(hex('<a:srgbClr val="FF8000"/>')).toBe('#ff8000')
    expect(hex('<a:srgbClr val="XYZ"/>')).toBeNull()
    expect(hex('<a:srgbClr/>')).toBeNull()
  })

  it('reads sysClr from lastClr, or window/windowText defaults', () => {
    expect(hex('<a:sysClr val="windowText" lastClr="112233"/>')).toBe('#112233')
    expect(hex('<a:sysClr val="window"/>')).toBe('#ffffff')
    expect(hex('<a:sysClr val="windowText"/>')).toBe('#000000')
  })

  it('reads preset colors and ignores unknown ones', () => {
    expect(hex('<a:prstClr val="red"/>')).toBe('#ff0000')
    expect(hex('<a:prstClr val="notAColor"/>')).toBeNull()
    expect(hex('<a:prstClr/>')).toBeNull()
  })

  it('reads hslClr and scrgbClr', () => {
    expect(hex('<a:hslClr hue="0" sat="100000" lum="50000"/>')).toBe('#ff0000')
    expect(hex('<a:hslClr/>')).toBe('#000000')
    expect(hex('<a:scrgbClr r="100000" g="0" b="0"/>')).toBe('#ff0000')
    expect(hex('<a:scrgbClr/>')).toBe('#000000')
  })

  it('maps schemeClr through the color map and theme, with Office defaults as fallback', () => {
    const context = { scheme: { lt1: 'FAFAFA', accent1: '123456' }, clrMap: { ...DEFAULT_CLR_MAP, bg1: 'lt1' } }
    expect(hex('<a:schemeClr val="bg1"/>', context)).toBe('#fafafa')
    expect(hex('<a:schemeClr val="accent1"/>', context)).toBe('#123456')
    expect(hex('<a:schemeClr val="accent2"/>', context)).toBe('#ed7d31')
    expect(hex('<a:schemeClr val="accent2"/>')).toBe('#ed7d31')
    expect(hex('<a:schemeClr val="nope"/>')).toBeNull()
    expect(hex('<a:schemeClr/>')).toBeNull()
  })

  it('resolves phClr to the supplied placeholder color only', () => {
    expect(hex('<a:schemeClr val="phClr"/>', null, { r: 1, g: 2, b: 3, a: 1 })).toBe('#010203')
    expect(hex('<a:schemeClr val="phClr"/>')).toBeNull()
  })

  it('applies alpha modifiers', () => {
    expect(hex('<a:srgbClr val="FF0000"><a:alpha val="50000"/></a:srgbClr>')).toBe('rgba(255, 0, 0, 0.5)')
    expect(hex('<a:srgbClr val="FF0000"><a:alpha val="50000"/><a:alphaMod val="50000"/></a:srgbClr>')).toBe('rgba(255, 0, 0, 0.25)')
    expect(hex('<a:srgbClr val="FF0000"><a:alpha val="20000"/><a:alphaOff val="30000"/></a:srgbClr>')).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('applies tint and shade in linear RGB', () => {
    expect(hex('<a:srgbClr val="000000"><a:tint val="50000"/></a:srgbClr>')).toBe('#bcbcbc')
    expect(hex('<a:srgbClr val="FFFFFF"><a:shade val="50000"/></a:srgbClr>')).toBe('#bcbcbc')
    expect(hex('<a:srgbClr val="010101"><a:shade val="10000"/></a:srgbClr>')).toBe('#000000')
  })

  it('applies complement, inverse and gray', () => {
    expect(hex('<a:srgbClr val="FF0000"><a:comp/></a:srgbClr>')).toBe('#00ffff')
    expect(hex('<a:srgbClr val="FF0000"><a:inv/></a:srgbClr>')).toBe('#00ffff')
    expect(hex('<a:srgbClr val="FF0000"><a:gray/></a:srgbClr>')).toBe('#4d4d4d')
  })

  it('applies luminance, saturation and hue modifiers', () => {
    expect(hex('<a:srgbClr val="FF0000"><a:lumMod val="50000"/></a:srgbClr>')).toBe('#800000')
    expect(hex('<a:srgbClr val="FF0000"><a:lumMod val="50000"/><a:lumOff val="50000"/></a:srgbClr>')).toBe('#ff8080')
    expect(hex('<a:srgbClr val="FF0000"><a:satMod val="0"/></a:srgbClr>')).toBe('#808080')
    expect(hex('<a:srgbClr val="808080"><a:satOff val="100000"/></a:srgbClr>')).toBe('#ff0101')
    expect(hex('<a:srgbClr val="00FF00"><a:hueMod val="200000"/></a:srgbClr>')).toBe('#0000ff')
    expect(hex('<a:srgbClr val="FF0000"><a:hueOff val="7200000"/></a:srgbClr>')).toBe('#00ff00')
    expect(hex('<a:srgbClr val="0000FF"><a:hueOff val="-14400000"/></a:srgbClr>')).toBe('#ff0000')
    expect(hex('<a:srgbClr val="FF00FF"><a:lumMod/></a:srgbClr>')).toBe('#000000')
    // HSL conversion paths for each dominant channel, and light colors.
    expect(hex('<a:srgbClr val="20C040"><a:lumMod val="100000"/></a:srgbClr>')).toBe('#20c040')
    expect(hex('<a:srgbClr val="4020C0"><a:lumMod val="100000"/></a:srgbClr>')).toBe('#4020c0')
    expect(hex('<a:srgbClr val="FF8080"><a:lumMod val="100000"/></a:srgbClr>')).toBe('#ff8080')
    expect(hex('<a:srgbClr val="FF0080"><a:lumMod val="100000"/></a:srgbClr>')).toBe('#ff0080')
  })

  it('ignores unknown modifiers', () => {
    expect(hex('<a:srgbClr val="123456"><a:gamma/></a:srgbClr>')).toBe('#123456')
  })
})
