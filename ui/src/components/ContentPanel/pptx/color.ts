import { attr, children, numAttr } from './xml'

export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

// What a color reference needs to resolve: the theme palette and the active color map (which maps
// the content-level names bg1/tx1/... to palette slots, and can be overridden per layout/slide).
export interface ColorContext {
  scheme: Record<string, string>
  clrMap: Record<string, string>
}

export const DEFAULT_CLR_MAP: Record<string, string> = {
  bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3',
  accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hlink: 'hlink', folHlink: 'folHlink',
}

// The Office default palette, used when a deck has no readable theme so schemeClr references still
// produce sensible colors instead of disappearing.
export const DEFAULT_SCHEME: Record<string, string> = {
  dk1: '000000', lt1: 'FFFFFF', dk2: '44546A', lt2: 'E7E6E6',
  accent1: '4472C4', accent2: 'ED7D31', accent3: 'A5A5A5', accent4: 'FFC000',
  accent5: '5B9BD5', accent6: '70AD47', hlink: '0563C1', folHlink: '954F72',
}

const COLOR_ELEMENTS = new Set(['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'hslClr', 'scrgbClr'])

// A subset of the DrawingML preset colors (a:prstClr); the full list mirrors the CSS named colors,
// and these are the ones that show up in real decks.
const PRESET_COLORS: Record<string, string> = {
  black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF',
  yellow: 'FFFF00', cyan: '00FFFF', magenta: 'FF00FF', gray: '808080', grey: '808080',
  dkGray: 'A9A9A9', ltGray: 'D3D3D3', orange: 'FFA500', purple: '800080', navy: '000080',
  maroon: '800000', olive: '808000', teal: '008080', silver: 'C0C0C0', lime: '00FF00',
  dkBlue: '00008B', dkRed: '8B0000', dkGreen: '006400', ltBlue: 'ADD8E6', ltGreen: '90EE90',
}

function hexToRgba(hex: string): Rgba | null {
  const clean = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
    a: 1,
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function rgbToHsl({ r, g, b }: Rgba): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
  else if (max === gn) h = (bn - rn) / d + 2
  else h = (rn - gn) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number, a: number): Rgba {
  const hue = ((h % 360) + 360) % 360 / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return { r: v, g: v, b: v, a }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number): number => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }
  return {
    r: Math.round(channel(hue + 1 / 3) * 255),
    g: Math.round(channel(hue) * 255),
    b: Math.round(channel(hue - 1 / 3) * 255),
    a,
  }
}

// tint/shade are defined on linear (not gamma-encoded) RGB, which is what makes Office's "Lighter
// 40%"-style theme variants match PowerPoint rather than looking washed out.
function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function fromLinear(value: number): number {
  const v = clamp01(value)
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.round(c * 255)
}

function mapLinear(color: Rgba, fn: (linear: number) => number): Rgba {
  return {
    r: fromLinear(fn(toLinear(color.r))),
    g: fromLinear(fn(toLinear(color.g))),
    b: fromLinear(fn(toLinear(color.b))),
    a: color.a,
  }
}

// Applies DrawingML color transforms (child elements such as a:lumMod, a:tint, a:alpha) in
// document order, which is how PowerPoint applies them.
function applyModifiers(base: Rgba, colorElement: Element): Rgba {
  let color = { ...base }
  for (const modifier of children(colorElement)) {
    const value = (numAttr(modifier, 'val') ?? 0) / 100000
    switch (modifier.localName) {
      case 'alpha': color.a = clamp01(value); break
      case 'alphaMod': color.a = clamp01(color.a * value); break
      case 'alphaOff': color.a = clamp01(color.a + value); break
      case 'tint': color = mapLinear(color, (c) => c * value + (1 - value)); break
      case 'shade': color = mapLinear(color, (c) => c * value); break
      case 'comp': {
        const [h, s, l] = rgbToHsl(color)
        color = hslToRgb(h + 180, s, l, color.a)
        break
      }
      case 'inv': color = { r: 255 - color.r, g: 255 - color.g, b: 255 - color.b, a: color.a }; break
      case 'gray': {
        const v = Math.round(color.r * 0.3 + color.g * 0.59 + color.b * 0.11)
        color = { r: v, g: v, b: v, a: color.a }
        break
      }
      case 'lumMod': case 'lumOff': case 'satMod': case 'satOff': case 'hueMod': case 'hueOff': {
        const [h, s, l] = rgbToHsl(color)
        if (modifier.localName === 'lumMod') color = hslToRgb(h, s, clamp01(l * value), color.a)
        else if (modifier.localName === 'lumOff') color = hslToRgb(h, s, clamp01(l + value), color.a)
        else if (modifier.localName === 'satMod') color = hslToRgb(h, clamp01(s * value), l, color.a)
        else if (modifier.localName === 'satOff') color = hslToRgb(h, clamp01(s + value), l, color.a)
        else if (modifier.localName === 'hueMod') color = hslToRgb(h * value, s, l, color.a)
        // hueOff is in 60000ths of a degree, not percent.
        else color = hslToRgb(h + (numAttr(modifier, 'val') ?? 0) / 60000, s, l, color.a)
        break
      }
      default: break
    }
  }
  return color
}

function baseColor(colorElement: Element, context: ColorContext | null, phColor: Rgba | null): Rgba | null {
  switch (colorElement.localName) {
    case 'srgbClr': return hexToRgba(attr(colorElement, 'val') ?? '')
    case 'sysClr': {
      const last = attr(colorElement, 'lastClr')
      if (last) return hexToRgba(last)
      return attr(colorElement, 'val') === 'window' ? hexToRgba('FFFFFF') : hexToRgba('000000')
    }
    case 'prstClr': {
      const hex = PRESET_COLORS[attr(colorElement, 'val') ?? '']
      return hex ? hexToRgba(hex) : null
    }
    case 'hslClr': {
      const hue = (numAttr(colorElement, 'hue') ?? 0) / 60000
      const sat = (numAttr(colorElement, 'sat') ?? 0) / 100000
      const lum = (numAttr(colorElement, 'lum') ?? 0) / 100000
      return hslToRgb(hue, clamp01(sat), clamp01(lum), 1)
    }
    case 'scrgbClr': {
      const linear = (name: string) => fromLinear((numAttr(colorElement, name) ?? 0) / 100000)
      return { r: linear('r'), g: linear('g'), b: linear('b'), a: 1 }
    }
    default: {
      // schemeClr
      const value = attr(colorElement, 'val') ?? ''
      if (value === 'phClr') return phColor ? { ...phColor } : null
      const scheme = context?.scheme ?? DEFAULT_SCHEME
      const clrMap = context?.clrMap ?? DEFAULT_CLR_MAP
      const slot = clrMap[value] ?? value
      return hexToRgba(scheme[slot] ?? DEFAULT_SCHEME[slot] ?? '')
    }
  }
}

// Resolves the first color element (srgbClr, schemeClr, ...) directly under `parent`, or null if
// it has none. `phColor` is the "placeholder color" a theme style entry's a:schemeClr val="phClr"
// stands for (supplied by the a:fillRef/a:lnRef/a:fontRef that pulled the style in).
export function resolveColor(parent: Element | null | undefined, context: ColorContext | null, phColor: Rgba | null = null): Rgba | null {
  const colorElement = children(parent).find((element) => COLOR_ELEMENTS.has(element.localName))
  if (!colorElement) return null
  const base = baseColor(colorElement, context, phColor)
  return base ? applyModifiers(base, colorElement) : null
}

export function toCss(color: Rgba): string {
  if (color.a >= 1) {
    const hex = (value: number) => Math.round(value).toString(16).padStart(2, '0')
    return `#${hex(color.r)}${hex(color.g)}${hex(color.b)}`
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Number(color.a.toFixed(3))})`
}
