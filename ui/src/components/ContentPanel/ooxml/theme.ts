import { DEFAULT_SCHEME } from './color'
import type { OpcPackage } from './package'
import { attr, child, children, path } from './xml'

export interface ThemeFonts {
  majorLatin: string
  minorLatin: string
  majorEa: string
  minorEa: string
}

export interface Theme {
  partPath: string | null
  scheme: Record<string, string>
  fonts: ThemeFonts
  // The theme's style matrices, kept as ordered element lists: OOXML style references
  // (a:fillRef/a:lnRef/a:effectRef idx, p:bgRef idx) select an entry by its position, whatever
  // fill type each entry happens to be.
  fillStyles: Element[]
  bgFillStyles: Element[]
  lineStyles: Element[]
  effectStyles: Element[]
}

const SCHEME_SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink']

export const DEFAULT_THEME: Theme = {
  partPath: null,
  scheme: { ...DEFAULT_SCHEME },
  fonts: { majorLatin: 'Calibri Light', minorLatin: 'Calibri', majorEa: '', minorEa: '' },
  fillStyles: [],
  bgFillStyles: [],
  lineStyles: [],
  effectStyles: [],
}

// A theme palette slot holds a literal RGB value or a system color with its last-known RGB value.
function slotHex(slot: Element | null): string | null {
  const srgb = child(slot, 'srgbClr')
  if (srgb) return attr(srgb, 'val')
  const sys = child(slot, 'sysClr')
  if (sys) return attr(sys, 'lastClr') ?? (attr(sys, 'val') === 'window' ? 'FFFFFF' : '000000')
  return null
}

export function loadTheme(pkg: OpcPackage, themePath: string | null): Theme {
  const root = themePath ? pkg.xml(themePath) : null
  const elements = child(root, 'themeElements')
  if (!themePath || !elements) return DEFAULT_THEME

  const scheme: Record<string, string> = { ...DEFAULT_SCHEME }
  const clrScheme = child(elements, 'clrScheme')
  for (const slot of SCHEME_SLOTS) {
    const hex = slotHex(child(clrScheme, slot))
    if (hex) scheme[slot] = hex
  }

  const fontScheme = child(elements, 'fontScheme')
  const typeface = (group: string, script: string, fallback: string) =>
    attr(path(fontScheme, group, script), 'typeface') || fallback
  const fonts: ThemeFonts = {
    majorLatin: typeface('majorFont', 'latin', DEFAULT_THEME.fonts.majorLatin),
    minorLatin: typeface('minorFont', 'latin', DEFAULT_THEME.fonts.minorLatin),
    majorEa: typeface('majorFont', 'ea', ''),
    minorEa: typeface('minorFont', 'ea', ''),
  }

  const fmtScheme = child(elements, 'fmtScheme')
  return {
    partPath: themePath,
    scheme,
    fonts,
    fillStyles: children(child(fmtScheme, 'fillStyleLst')),
    bgFillStyles: children(child(fmtScheme, 'bgFillStyleLst')),
    lineStyles: children(child(fmtScheme, 'lnStyleLst')),
    effectStyles: children(child(fmtScheme, 'effectStyleLst')),
  }
}

// Resolves a theme font reference ("+mj-lt", "+mn-ea", ...) to an actual typeface name.
export function resolveTypeface(typeface: string | null, theme: Theme): string | null {
  if (!typeface) return null
  switch (typeface) {
    case '+mj-lt': return theme.fonts.majorLatin
    case '+mn-lt': return theme.fonts.minorLatin
    case '+mj-ea': return theme.fonts.majorEa || theme.fonts.majorLatin
    case '+mn-ea': return theme.fonts.minorEa || theme.fonts.minorLatin
    case '+mj-cs': return theme.fonts.majorLatin
    case '+mn-cs': return theme.fonts.minorLatin
    default: return typeface
  }
}

// Metric-compatible open fonts (bundled with LibreOffice and most Linux desktops) are listed after
// each common Office font, so line breaks land close to where PowerPoint puts them even on a
// machine without Microsoft's fonts.
const FONT_FALLBACKS: Record<string, string> = {
  calibri: 'Carlito, "Segoe UI", Arial, sans-serif',
  'calibri light': 'Calibri, Carlito, "Segoe UI Light", Arial, sans-serif',
  cambria: 'Caladea, Georgia, serif',
  arial: '"Liberation Sans", Arimo, Helvetica, sans-serif',
  helvetica: 'Arial, "Liberation Sans", sans-serif',
  'times new roman': '"Liberation Serif", Tinos, Times, serif',
  'courier new': '"Liberation Mono", Cousine, monospace',
  georgia: 'Gelasio, serif',
  verdana: '"DejaVu Sans", sans-serif',
  tahoma: '"DejaVu Sans", sans-serif',
  'century gothic': '"URW Gothic", "Avant Garde", sans-serif',
  wingdings: 'Wingdings, "Segoe UI Symbol", sans-serif',
  symbol: 'Symbol, serif',
}

export function cssFontFamily(typeface: string | null): string {
  if (!typeface) return 'Calibri, Carlito, Arial, sans-serif'
  const fallback = FONT_FALLBACKS[typeface.toLowerCase()] ?? 'Arial, sans-serif'
  return `"${typeface.replace(/"/g, '')}", ${fallback}`
}
