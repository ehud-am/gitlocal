import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '../ooxml/theme'
import { parseXml } from '../ooxml/xml'
import { mergePara, mergeRun, onOff, parseBorder, parseParaProps, parseRunProps, shadingColor, wordColor } from './properties'
import { W_NS } from './test-support'

function w(fragment: string): Element {
  const root = parseXml(`<root ${W_NS}>${fragment}</root>`)
  return root?.firstElementChild as Element
}

const theme = { ...DEFAULT_THEME, scheme: { ...DEFAULT_THEME.scheme, accent1: '4472C4', dk1: '000000' } }

describe('onOff', () => {
  it('reads toggle properties', () => {
    expect(onOff(null)).toBeUndefined()
    expect(onOff(w('<w:b/>'))).toBe(true)
    expect(onOff(w('<w:b w:val="1"/>'))).toBe(true)
    expect(onOff(w('<w:b w:val="true"/>'))).toBe(true)
    expect(onOff(w('<w:b w:val="0"/>'))).toBe(false)
    expect(onOff(w('<w:b w:val="false"/>'))).toBe(false)
    expect(onOff(w('<w:b w:val="off"/>'))).toBe(false)
  })
})

describe('wordColor', () => {
  it('reads hex, auto and theme colors with tint and shade', () => {
    expect(wordColor(null, theme)).toBeNull()
    expect(wordColor(w('<w:color w:val="FF0000"/>'), theme)).toBe('#ff0000')
    expect(wordColor(w('<w:color w:val="auto"/>'), theme)).toBeNull()
    expect(wordColor(w('<w:color/>'), theme)).toBeNull()
    expect(wordColor(w('<w:color w:val="nothex"/>'), theme)).toBeNull()
    expect(wordColor(w('<w:color w:val="000000" w:themeColor="accent1"/>'), theme)).toBe('#4472c4')
    expect(wordColor(w('<w:color w:val="000000" w:themeColor="text1" w:themeTint="80"/>'), theme)).toBe('#7f7f7f')
    expect(wordColor(w('<w:color w:val="000000" w:themeColor="accent1" w:themeShade="80"/>'), theme)).toBe('#223962')
    // An unknown theme color falls back to the literal value.
    expect(wordColor(w('<w:color w:val="00FF00" w:themeColor="mystery"/>'), theme)).toBe('#00ff00')
    // Tint/shade only apply to theme colors and must be hex bytes.
    expect(wordColor(w('<w:color w:val="00FF00" w:themeTint="80"/>'), theme)).toBe('#00ff00')
    expect(wordColor(w('<w:color w:val="000000" w:themeColor="accent1" w:themeTint="zz"/>'), theme)).toBe('#4472c4')
  })

  it('reads fill colors and theme fills', () => {
    expect(wordColor(w('<w:shd w:fill="DDDDDD"/>'), theme, 'fill')).toBe('#dddddd')
    expect(wordColor(w('<w:shd w:fill="auto" w:themeFill="accent1" w:themeFillTint="00"/>'), theme, 'fill')).toBe('#ffffff')
    expect(wordColor(w('<w:shd w:fill="auto" w:themeFill="accent1" w:themeFillShade="00"/>'), theme, 'fill')).toBe('#000000')
  })

  it('uses the default palette when the theme lacks a slot', () => {
    const sparse = { ...DEFAULT_THEME, scheme: {} }
    expect(wordColor(w('<w:color w:themeColor="hyperlink"/>'), sparse)).toBe('#0563c1')
  })
})

describe('shadingColor', () => {
  it('distinguishes solid patterns, nil and fills', () => {
    expect(shadingColor(null, theme)).toBeUndefined()
    expect(shadingColor(w('<w:shd w:val="solid" w:color="FF0000"/>'), theme)).toBe('#ff0000')
    expect(shadingColor(w('<w:shd w:val="solid" w:color="auto"/>'), theme)).toBe('#000000')
    expect(shadingColor(w('<w:shd w:val="nil"/>'), theme)).toBeNull()
    expect(shadingColor(w('<w:shd w:val="clear" w:fill="FFFF00"/>'), theme)).toBe('#ffff00')
    expect(shadingColor(w('<w:shd w:val="clear" w:fill="auto"/>'), theme)).toBeNull()
  })
})

describe('parseRunProps', () => {
  it('returns nothing for no properties', () => {
    expect(parseRunProps(null, theme)).toEqual({})
  })

  it('reads every supported run property', () => {
    const style = parseRunProps(w(`<w:rPr>
      <w:b/><w:i w:val="0"/><w:strike/><w:dstrike/><w:caps/><w:smallCaps/><w:vanish/><w:rtl/>
      <w:u w:val="double" w:color="00FF00"/><w:color w:val="112233"/><w:sz w:val="28"/>
      <w:rFonts w:ascii="Georgia"/><w:highlight w:val="yellow"/><w:shd w:fill="EEEEEE"/>
      <w:vertAlign w:val="superscript"/><w:spacing w:val="40"/>
    </w:rPr>`), theme)
    expect(style).toEqual({
      bold: true, italic: false, strike: true, doubleStrike: true, caps: true, smallCaps: true, hidden: true, rtl: true,
      underline: 'double', underlineColor: '#00ff00', color: '#112233', sizePt: 14, font: 'Georgia',
      highlight: '#ffff00', shading: '#eeeeee', vertAlign: 'superscript', letterSpacingPt: 2,
    })
  })

  it('handles underline defaults, auto colors, theme fonts and clearing values', () => {
    expect(parseRunProps(w('<w:rPr><w:u/></w:rPr>'), theme).underline).toBe('single')
    expect(parseRunProps(w('<w:rPr><w:u w:val="weird"/></w:rPr>'), theme).underline).toBe('single')
    expect(parseRunProps(w('<w:rPr><w:u w:val="none"/></w:rPr>'), theme).underline).toBe('none')
    const cleared = parseRunProps(w('<w:rPr><w:color w:val="auto"/><w:highlight w:val="none"/><w:shd w:val="clear" w:fill="auto"/><w:vertAlign w:val="baseline"/></w:rPr>'), theme)
    expect(Object.keys(cleared).sort()).toEqual(['color', 'highlight', 'shading', 'vertAlign'])
    expect(Object.values(cleared).every((value) => value === undefined)).toBe(true)
    expect(parseRunProps(w('<w:rPr><w:sz w:val="0"/></w:rPr>'), theme).sizePt).toBeUndefined()
    expect(parseRunProps(w('<w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:ascii="Arial"/></w:rPr>'), theme).font).toBe('Calibri Light')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:asciiTheme="minorHAnsi"/></w:rPr>'), theme).font).toBe('Calibri')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:asciiTheme="majorEastAsia"/></w:rPr>'), theme).font).toBe('Calibri Light')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:asciiTheme="minorEastAsia"/></w:rPr>'), theme).font).toBe('Calibri')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:asciiTheme="other" w:hAnsi="Verdana"/></w:rPr>'), theme).font).toBe('Verdana')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:hAnsiTheme="minorHAnsi"/></w:rPr>'), theme).font).toBe('Calibri')
    expect(parseRunProps(w('<w:rPr><w:rFonts w:eastAsia="MS Mincho"/></w:rPr>'), theme).font).toBeUndefined()
    expect(parseRunProps(w('<w:rPr><w:vertAlign w:val="subscript"/></w:rPr>'), theme).vertAlign).toBe('subscript')
    expect(parseRunProps(w('<w:rPr><w:highlight w:val="darkBlue"/></w:rPr>'), theme).highlight).toBe('#000080')
  })
})

describe('mergeRun', () => {
  it('lets later layers win, including explicit clears', () => {
    expect(mergeRun({ bold: true, color: '#111111' }, undefined, { color: undefined, italic: true })).toEqual({ bold: true, color: undefined, italic: true })
  })
})

describe('parseBorder', () => {
  it('reads border styles, sizes, colors and none', () => {
    expect(parseBorder(null, theme)).toBeUndefined()
    expect(parseBorder(w('<w:top w:val="nil"/>'), theme)).toBeNull()
    expect(parseBorder(w('<w:top w:val="none"/>'), theme)).toBeNull()
    expect(parseBorder(w('<w:top w:val="single" w:sz="8" w:color="FF0000" w:space="4"/>'), theme)).toEqual({ style: 'solid', widthPt: 1, color: '#ff0000', spacePt: 4 })
    expect(parseBorder(w('<w:top/>'), theme)).toEqual({ style: 'solid', widthPt: 0.5, color: '#000000', spacePt: 0 })
    expect(parseBorder(w('<w:top w:val="double" w:sz="4"/>'), theme)?.widthPt).toBe(2.25)
    expect(parseBorder(w('<w:top w:val="dotted" w:sz="1"/>'), theme)).toMatchObject({ style: 'dotted', widthPt: 0.25 })
    expect(parseBorder(w('<w:top w:val="dashSmallGap"/>'), theme)?.style).toBe('dashed')
    expect(parseBorder(w('<w:top w:val="thinThickSmallGap"/>'), theme)?.style).toBe('double')
    expect(parseBorder(w('<w:top w:val="apples"/>'), theme)?.style).toBe('solid')
  })
})

describe('parseParaProps', () => {
  it('returns nothing for no properties', () => {
    expect(parseParaProps(null, theme)).toEqual({})
  })

  it('reads alignment, indents, spacing, borders, numbering, tabs and mark formatting', () => {
    const props = parseParaProps(w(`<w:pPr>
      <w:pStyle w:val="Body"/><w:jc w:val="both"/>
      <w:ind w:left="720" w:right="360" w:hanging="360" w:firstLine="200"/>
      <w:spacing w:before="120" w:after="240" w:line="360" w:lineRule="auto"/>
      <w:contextualSpacing/><w:shd w:fill="CCCCCC"/>
      <w:pBdr><w:top w:val="single"/><w:start w:val="nil"/></w:pBdr>
      <w:bidi/><w:outlineLvl w:val="1"/><w:pageBreakBefore/>
      <w:numPr><w:ilvl w:val="2"/><w:numId w:val="5"/></w:numPr>
      <w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9000"/><w:tab w:val="center" w:pos="4500"/><w:tab w:val="clear" w:pos="100"/><w:tab w:val="bar"/></w:tabs>
      <w:rPr><w:b/></w:rPr>
    </w:pPr>`), theme)
    expect(props).toEqual({
      align: 'justify', indLeft: 720, indRight: 360, firstLine: -360, before: 120, after: 240,
      line: { rule: 'auto', value: 360 }, contextualSpacing: true, shading: '#cccccc',
      borders: { top: { style: 'solid', widthPt: 0.5, color: '#000000', spacePt: 0 }, left: null },
      rtl: true, outlineLevel: 1, pageBreakBefore: true, numId: '5', ilvl: 2,
      tabs: [
        { posTwips: 9000, align: 'right', leader: 'dot' },
        { posTwips: 4500, align: 'center', leader: 'none' },
        { posTwips: 100, align: 'clear', leader: 'none' },
      ],
      markStyle: { bold: true },
    })
  })

  it('reads start/end indents, first-line indents, auto spacing and exact lines', () => {
    expect(parseParaProps(w('<w:pPr><w:ind w:start="100" w:end="50" w:firstLine="200"/></w:pPr>'), theme)).toEqual({ indLeft: 100, indRight: 50, firstLine: 200 })
    expect(parseParaProps(w('<w:pPr><w:ind/></w:pPr>'), theme)).toEqual({})
    expect(parseParaProps(w('<w:pPr><w:spacing w:beforeAutospacing="1" w:afterAutospacing="1" w:before="10" w:after="10"/></w:pPr>'), theme)).toEqual({ before: 280, after: 280 })
    expect(parseParaProps(w('<w:pPr><w:spacing w:beforeAutospacing="0" w:afterAutospacing="false" w:before="10"/></w:pPr>'), theme)).toEqual({ before: 10 })
    expect(parseParaProps(w('<w:pPr><w:spacing w:line="300" w:lineRule="exact"/></w:pPr>'), theme).line).toEqual({ rule: 'exact', value: 300 })
    expect(parseParaProps(w('<w:pPr><w:spacing w:line="300" w:lineRule="atLeast"/></w:pPr>'), theme).line).toEqual({ rule: 'atLeast', value: 300 })
    expect(parseParaProps(w('<w:pPr><w:spacing w:line="0"/></w:pPr>'), theme).line).toBeUndefined()
    expect(parseParaProps(w('<w:pPr><w:jc w:val="unknown"/></w:pPr>'), theme).align).toBeUndefined()
    expect(parseParaProps(w('<w:pPr><w:jc w:val="end"/></w:pPr>'), theme).align).toBe('right')
    expect(parseParaProps(w('<w:pPr><w:numPr/></w:pPr>'), theme)).toEqual({})
    expect(parseParaProps(w('<w:pPr><w:tabs><w:tab w:val="weird" w:pos="10" w:leader="heavy"/></w:tabs></w:pPr>'), theme).tabs).toEqual([{ posTwips: 10, align: 'left', leader: 'none' }])
  })
})

describe('mergePara', () => {
  it('accumulates tab stops, clears inherited ones and merges borders and mark formatting', () => {
    const merged = mergePara(
      { tabs: [{ posTwips: 100, align: 'left', leader: 'none' }, { posTwips: 200, align: 'left', leader: 'none' }], borders: { top: null }, markStyle: { bold: true }, align: 'left' },
      undefined,
      { tabs: [{ posTwips: 100, align: 'clear', leader: 'none' }, { posTwips: 50, align: 'right', leader: 'dot' }], borders: { bottom: null }, markStyle: { italic: true }, align: 'center' },
      { indLeft: 10 },
    )
    expect(merged).toEqual({
      tabs: [{ posTwips: 50, align: 'right', leader: 'dot' }, { posTwips: 200, align: 'left', leader: 'none' }],
      borders: { top: null, bottom: null },
      markStyle: { bold: true, italic: true },
      align: 'center',
      indLeft: 10,
    })
  })

  it('handles a layer without tab stops after one with them', () => {
    expect(mergePara({ tabs: [{ posTwips: 1, align: 'left', leader: 'none' }] }, { tabs: undefined }).tabs).toEqual([{ posTwips: 1, align: 'left', leader: 'none' }])
  })
})
