import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '../ooxml/theme'
import { parseXml } from '../ooxml/xml'
import { loadStyles } from './styles'
import { W_NS } from './test-support'

const styles = parseXml(`<w:styles ${W_NS}>
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="Calibri"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:rPr><w:color w:val="333333"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1Plain"><w:basedOn w:val="Heading1"/><w:rPr><w:b w:val="0"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="LoopA"><w:basedOn w:val="LoopB"/><w:rPr><w:i/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="LoopB"><w:basedOn w:val="LoopA"/><w:rPr><w:caps/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="Strong"><w:rPr><w:b/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="StrongRed"><w:basedOn w:val="Strong"/><w:rPr><w:color w:val="FF0000"/></w:rPr></w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:tblPr><w:tblCellMar><w:left w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>
  <w:style w:type="table" w:styleId="Grid"><w:basedOn w:val="TableNormal"/>
    <w:pPr><w:spacing w:after="0"/></w:pPr><w:rPr><w:sz w:val="20"/></w:rPr>
    <w:tblPr><w:tblBorders><w:top w:val="single"/></w:tblBorders></w:tblPr>
    <w:tcPr><w:shd w:fill="EEEEEE"/></w:tcPr>
    <w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr><w:tcPr><w:shd w:fill="000000"/></w:tcPr></w:tblStylePr>
    <w:tblStylePr><w:rPr><w:i/></w:rPr></w:tblStylePr>
  </w:style>
  <w:style w:styleId="Untyped"><w:rPr><w:i/></w:rPr></w:style>
  <w:style w:type="paragraph"><w:rPr><w:i/></w:rPr></w:style>
</w:styles>`)

describe('loadStyles', () => {
  const sheet = loadStyles(styles, DEFAULT_THEME)

  it('reads document defaults', () => {
    expect(sheet.defaults.run).toEqual({ sizePt: 11, font: 'Calibri' })
    expect(sheet.defaults.para).toEqual({ after: 160 })
  })

  it('resolves paragraph styles through basedOn, falling back to the default style', () => {
    expect(sheet.paragraph('Heading1')).toEqual({ styleId: 'Heading1', para: { outlineLevel: 0 }, run: { color: '#333333', bold: true, sizePt: 16 } })
    expect(sheet.paragraph('Heading1Plain').run.bold).toBe(false)
    expect(sheet.paragraph(null).styleId).toBe('Normal')
    expect(sheet.paragraph('Missing').styleId).toBe('Normal')
    expect(sheet.paragraph('Strong').styleId).toBe('Normal')
    // Cached.
    expect(sheet.paragraph('Heading1')).toBe(sheet.paragraph('Heading1'))
    // Cycles stop instead of looping.
    expect(sheet.paragraph('LoopA').run).toEqual({ caps: true, italic: true })
    // Untyped styles are paragraph styles.
    expect(sheet.paragraph('Untyped').run).toEqual({ italic: true })
  })

  it('resolves character styles', () => {
    expect(sheet.character(null)).toEqual({})
    expect(sheet.character('StrongRed')).toEqual({ bold: true, color: '#ff0000' })
    expect(sheet.character('StrongRed')).toBe(sheet.character('StrongRed'))
    expect(sheet.character('Normal')).toEqual({})
  })

  it('resolves table styles into regions', () => {
    const grid = sheet.table('Grid')
    expect(grid.get('wholeTable')?.run).toEqual({ sizePt: 10 })
    expect(grid.get('wholeTable')?.para).toEqual({ after: 0 })
    expect(grid.get('wholeTable')?.tblPr).toHaveLength(2)
    expect(grid.get('wholeTable')?.tcPr).toHaveLength(1)
    expect(grid.get('firstRow')?.run).toEqual({ bold: true })
    expect(sheet.table('Grid')).toBe(grid)
    expect(sheet.table(null).get('wholeTable')?.tblPr).toHaveLength(1)
    expect(sheet.table('Normal').get('wholeTable')?.tblPr).toHaveLength(1)
  })

  it('works without a styles part', () => {
    const empty = loadStyles(null, DEFAULT_THEME)
    expect(empty.defaults).toEqual({ para: {}, run: {} })
    expect(empty.paragraph('Anything')).toEqual({ styleId: null, para: {}, run: {} })
    expect(empty.table(null).size).toBe(0)
  })
})
