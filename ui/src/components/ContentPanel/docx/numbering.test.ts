import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME } from '../pptx/theme'
import { parseXml } from '../pptx/xml'
import { bulletText, formatNumber, loadNumbering } from './numbering'
import { W_NS } from './test-support'

const root = (tag: string, content: string) => parseXml(`<w:${tag} ${W_NS}>${content}</w:${tag}>`)

const lvl = (ilvl: number, format: string, text: string, extra = '') =>
  `<w:lvl w:ilvl="${ilvl}"><w:start w:val="1"/><w:numFmt w:val="${format}"/><w:lvlText w:val="${text}"/>${extra}<w:pPr><w:ind w:left="${720 * (ilvl + 1)}" w:hanging="360"/></w:pPr></w:lvl>`

describe('formatNumber', () => {
  it('formats every supported number style', () => {
    expect(formatNumber(4, 'decimal')).toBe('4')
    expect(formatNumber(4, 'none')).toBe('')
    expect(formatNumber(14, 'upperRoman')).toBe('XIV')
    expect(formatNumber(1994, 'lowerRoman')).toBe('mcmxciv')
    expect(formatNumber(0, 'lowerRoman')).toBe('0')
    expect(formatNumber(4000, 'upperRoman')).toBe('4000')
    expect(formatNumber(3, 'upperLetter')).toBe('C')
    expect(formatNumber(28, 'lowerLetter')).toBe('bb')
    expect(formatNumber(0, 'lowerLetter')).toBe('0')
    expect(formatNumber(7, 'decimalZero')).toBe('07')
    expect(formatNumber(12, 'decimalZero')).toBe('12')
    expect(formatNumber(1, 'ordinal')).toBe('1st')
    expect(formatNumber(2, 'ordinal')).toBe('2nd')
    expect(formatNumber(3, 'ordinal')).toBe('3rd')
    expect(formatNumber(11, 'ordinal')).toBe('11th')
    expect(formatNumber(24, 'ordinal')).toBe('24th')
    expect(formatNumber(2, 'decimalEnclosedCircle')).toBe('②')
    expect(formatNumber(30, 'decimalEnclosedCircle')).toBe('30')
    expect(formatNumber(5, 'cardinalText')).toBe('5')
  })
})

describe('bulletText', () => {
  it('maps Symbol and Wingdings private-use bullets to Unicode', () => {
    expect(bulletText('')).toEqual({ text: '•', symbolic: true })
    expect(bulletText('')).toEqual({ text: '▪', symbolic: true })
    expect(bulletText('')).toEqual({ text: '•', symbolic: true })
    expect(bulletText('o')).toEqual({ text: 'o', symbolic: false })
    expect(bulletText('')).toEqual({ text: '', symbolic: false })
  })
})

describe('loadNumbering', () => {
  const numbering = root('numbering', `
    <w:abstractNum w:abstractNumId="0">
      ${lvl(0, 'decimal', '%1.')}
      ${lvl(1, 'lowerLetter', '%1.%2)')}
      ${lvl(2, 'lowerRoman', '%3.', '<w:suff w:val="space"/>')}
      ${lvl(3, 'upperRoman', '%1.%4', '<w:isLgl/><w:suff w:val="nothing"/>')}
    </w:abstractNum>
    <w:abstractNum w:abstractNumId="1">
      <w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val=""/><w:rPr><w:rFonts w:ascii="Symbol"/><w:color w:val="FF0000"/></w:rPr></w:lvl>
      <w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:rPr><w:rFonts w:ascii="Courier New"/></w:rPr></w:lvl>
    </w:abstractNum>
    <w:abstractNum w:abstractNumId="2"><w:numStyleLink w:val="LinkedList"/></w:abstractNum>
    <w:abstractNum w:abstractNumId="3"><w:numStyleLink w:val="Missing"/>${lvl(0, 'upperLetter', '%1')}</w:abstractNum>
    <w:abstractNum><w:lvl/></w:abstractNum>
    <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
    <w:num w:numId="2"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="10"/></w:lvlOverride></w:num>
    <w:num w:numId="3"><w:abstractNumId w:val="1"/></w:num>
    <w:num w:numId="4"><w:abstractNumId w:val="2"/></w:num>
    <w:num w:numId="5"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="1">${lvl(1, 'upperLetter', '(%2)')}</w:lvlOverride><w:lvlOverride/></w:num>
    <w:num w:numId="6"><w:abstractNumId w:val="3"/></w:num>
    <w:num w:numId="7"><w:abstractNumId w:val="99"/></w:num>
    <w:num><w:abstractNumId w:val="0"/></w:num>
  `)
  const styles = root('styles', `
    <w:style w:type="numbering" w:styleId="LinkedList"><w:pPr><w:numPr><w:numId w:val="3"/></w:numPr></w:pPr></w:style>
  `)

  it('numbers levels, restarts deeper levels and fills multi-level templates', () => {
    const list = loadNumbering(numbering, styles, DEFAULT_THEME)
    expect(list.next('1', 0)?.text).toBe('1.')
    expect(list.next('1', 1)?.text).toBe('1.a)')
    expect(list.next('1', 1)?.text).toBe('1.b)')
    const third = list.next('1', 2)
    expect(third).toMatchObject({ text: 'i.', suffix: 'space' })
    expect(list.next('1', 0)?.text).toBe('2.')
    expect(list.next('1', 1)?.text).toBe('2.a)')
    // A legal-style level shows every level in decimal.
    expect(list.next('1', 3)).toMatchObject({ text: '2.1', suffix: 'nothing' })
    expect(list.next('1', 0)?.para).toEqual({ indLeft: 720, firstLine: -360 })
  })

  it('shares counters between instances of one list unless an instance restarts it', () => {
    const list = loadNumbering(numbering, styles, DEFAULT_THEME)
    expect(list.next('1', 0)?.text).toBe('1.')
    expect(list.next('5', 0)?.text).toBe('2.')
    expect(list.next('5', 1)?.text).toBe('(A)')
    expect(list.next('2', 0)?.text).toBe('10.')
    expect(list.next('2', 0)?.text).toBe('11.')
    // A level referenced before it was used shows its start value.
    expect(list.next('1', 2)?.text).toBe('i.')
  })

  it('maps symbol bullets and keeps ordinary bullet fonts', () => {
    const list = loadNumbering(numbering, styles, DEFAULT_THEME)
    const symbol = list.next('3', 0)
    expect(symbol?.text).toBe('•')
    expect(symbol?.run.font).toBeUndefined()
    expect(symbol?.run.color).toBe('#ff0000')
    expect(list.next('3', 1)).toMatchObject({ text: 'o', run: { font: 'Courier New' } })
  })

  it('follows numbering style links and handles missing definitions', () => {
    const list = loadNumbering(numbering, styles, DEFAULT_THEME)
    expect(list.next('4', 0)?.text).toBe('•')
    expect(list.next('6', 0)?.text).toBe('A')
    expect(list.next('7', 0)).toBeNull()
    expect(list.next('0', 0)).toBeNull()
    expect(list.next('1', 8)).toBeNull()
    expect(list.next('404', 0)).toBeNull()
    expect(list.levelPara('1', 1)).toEqual({ indLeft: 1440, firstLine: -360 })
    expect(list.levelPara('404', 0)).toBeNull()
  })

  it('works without a numbering part', () => {
    const list = loadNumbering(null, null, DEFAULT_THEME)
    expect(list.next('1', 0)).toBeNull()
  })
})
