import { describe, expect, it } from 'vitest'
import type { PartScope } from './fill'
import { scopeFor, el } from './test-support'
import { formatAutoNumber, parseTextBody, symbolBullet, type TextStyleChain } from './text'
import { DEFAULT_THEME } from './theme'

const theme = { ...DEFAULT_THEME, fonts: { majorLatin: 'Georgia', minorLatin: 'Arial', majorEa: '', minorEa: '' } }
const EMPTY_CHAIN: TextStyleChain = { lstStyles: [], bodyPrs: [], fontRef: null }

async function parse(body: string, chain: TextStyleChain = EMPTY_CHAIN, slideNumber = 3) {
  const scope: PartScope = await scopeFor({}, 'ppt/slides/slide1.xml', theme)
  return parseTextBody(el(`<p:txBody>${body}</p:txBody>`), chain, { scope, slideNumber })
}

describe('parseTextBody', () => {
  it('returns null for missing or empty text', async () => {
    const scope = await scopeFor({})
    expect(parseTextBody(null, EMPTY_CHAIN, { scope, slideNumber: 1 })).toBeNull()
    expect(await parse('<a:bodyPr/><a:p><a:r><a:t>   </a:t></a:r></a:p><a:p/>')).toBeNull()
  })

  it('applies defaults for unformatted text', async () => {
    const body = await parse('<a:bodyPr/><a:p><a:r><a:t>Hello</a:t></a:r></a:p>')
    expect(body).toMatchObject({
      insets: { l: 9.6, t: 4.8, r: 9.6, b: 4.8 },
      anchor: 'top',
      anchorCenter: false,
      wrap: true,
      vertical: 'horz',
      fontScale: 1,
    })
    expect(body?.paragraphs[0]).toMatchObject({ align: 'left', marginLeftPx: 0, indentPx: 0, lineSpacing: { kind: 'pct', value: 1 }, bullet: null, rtl: false })
    expect(body?.paragraphs[0].runs[0]).toMatchObject({ text: 'Hello', sizePt: 18, bold: false, italic: false, underline: false, strike: false, color: '#000000', baseline: 0, caps: 'none', letterSpacingPt: 0, highlight: null })
    expect(body?.paragraphs[0].runs[0].fontFamily).toContain('"Arial"')
  })

  it('reads run properties', async () => {
    const body = await parse(`<a:bodyPr/><a:p>
      <a:r><a:rPr sz="2400" b="1" i="1" u="sng" strike="sngStrike" baseline="30000" cap="all" spc="200">
        <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:highlight><a:srgbClr val="FFFF00"/></a:highlight>
        <a:latin typeface="+mj-lt"/><a:ea typeface="MS Mincho"/></a:rPr><a:t>A</a:t></a:r>
      <a:r><a:rPr u="none" strike="noStrike" cap="small"><a:noFill/></a:rPr><a:t>B</a:t></a:r>
      <a:r><a:rPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="00FF00"/></a:gs></a:gsLst></a:gradFill></a:rPr><a:t>C</a:t></a:r>
      <a:r><a:rPr><a:pattFill><a:fgClr><a:srgbClr val="0000FF"/></a:fgClr></a:pattFill></a:rPr><a:t>D</a:t></a:r>
      <a:r><a:rPr><a:solidFill/></a:rPr><a:t>E</a:t></a:r>
      <a:br/><a:fld type="slidenum"><a:t>‹#›</a:t></a:fld><a:fld type="datetime"><a:t>today</a:t></a:fld><a:r><a:t></a:t></a:r>
    </a:p>`)
    const runs = body?.paragraphs[0].runs ?? []
    expect(runs[0]).toMatchObject({ sizePt: 24, bold: true, italic: true, underline: true, strike: true, baseline: 30, caps: 'all', letterSpacingPt: 2, color: '#ff0000', highlight: '#ffff00' })
    expect(runs[0].fontFamily).toBe('"Georgia", "MS Mincho", Gelasio, serif')
    expect(runs[1]).toMatchObject({ underline: false, strike: false, caps: 'small', color: 'transparent' })
    expect(runs[2].color).toBe('#00ff00')
    expect(runs[3].color).toBe('#0000ff')
    expect(runs[4].color).toBe('#000000')
    expect(runs[5]).toMatchObject({ isBreak: true, text: '' })
    expect(runs[6].text).toBe('3')
    expect(runs[7].text).toBe('today')
    expect(runs).toHaveLength(8)
  })

  it('inherits paragraph and run properties through the list-style chain', async () => {
    const master = el(`<p:bodyStyle><a:lvl1pPr marL="95250" indent="-95250" algn="ctr" rtl="1"><a:lnSpc><a:spcPct val="150000"/></a:lnSpc>
      <a:spcBef><a:spcPts val="1200"/></a:spcBef><a:spcAft><a:spcPct val="50000"/></a:spcAft>
      <a:defRPr sz="3200" b="1"><a:solidFill><a:srgbClr val="333333"/></a:solidFill><a:latin typeface="Verdana"/></a:defRPr></a:lvl1pPr>
      <a:lvl2pPr algn="weird"><a:lnSpc><a:spcPts val="2000"/></a:lnSpc><a:defRPr sz="2000"/></a:lvl2pPr></p:bodyStyle>`)
    const body = await parse('<a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>One</a:t></a:r></a:p><a:p><a:pPr lvl="1"/><a:r><a:t>Two</a:t></a:r></a:p><a:p><a:pPr lvl="12"/><a:r><a:t>Deep</a:t></a:r></a:p>', { lstStyles: [master], bodyPrs: [], fontRef: null })
    const [first, second, deep] = body?.paragraphs ?? []
    expect(first).toMatchObject({ align: 'center', marginLeftPx: 10, indentPx: -10, rtl: true, lineSpacing: { kind: 'pct', value: 1.5 }, spaceBeforePt: 12 })
    expect(first.spaceAfterPt).toBeCloseTo(0.5 * 32 * 1.2)
    expect(first.runs[0]).toMatchObject({ sizePt: 32, bold: true, color: '#333333' })
    expect(first.runs[0].fontFamily).toContain('Verdana')
    expect(second).toMatchObject({ align: 'left', lineSpacing: { kind: 'pts', value: 20 } })
    expect(second.runs[0].sizePt).toBe(20)
    expect(deep.runs[0].sizePt).toBe(18)
  })

  it('formats runs from the paragraph\'s own default run properties, below the run\'s own', async () => {
    const inherited = el('<a:lstStyle><a:lvl1pPr><a:defRPr sz="1000" i="1"><a:solidFill><a:srgbClr val="222222"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle>')
    const body = await parse(`<a:bodyPr/><a:p><a:pPr><a:defRPr sz="2800" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Verdana"/></a:defRPr></a:pPr>
      <a:r><a:t>Plain</a:t></a:r><a:r><a:rPr sz="1200"><a:solidFill><a:srgbClr val="20A88A"/></a:solidFill></a:rPr><a:t>Own</a:t></a:r></a:p>`,
    { lstStyles: [null, inherited], bodyPrs: [], fontRef: el('<a:fontRef idx="minor"><a:srgbClr val="333333"/></a:fontRef>') })
    const [plain, own] = body?.paragraphs[0].runs ?? []
    expect(plain).toMatchObject({ sizePt: 28, bold: true, italic: true, color: '#ffffff' })
    expect(plain.fontFamily).toContain('Verdana')
    expect(own).toMatchObject({ sizePt: 12, bold: true, color: '#20a88a' })
  })

  it('places a shape style font reference between the shape list style and inherited styles', async () => {
    const own = '<a:lstStyle><a:lvl1pPr><a:defRPr><a:solidFill><a:srgbClr val="111111"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle>'
    const inherited = el('<a:lstStyle><a:lvl1pPr><a:defRPr b="1"><a:solidFill><a:srgbClr val="222222"/></a:solidFill><a:latin typeface="Courier New"/></a:defRPr></a:lvl1pPr></a:lstStyle>')
    const fontRef = el('<a:fontRef idx="major"><a:srgbClr val="333333"/></a:fontRef>')
    const withOwn = await parse(`<a:bodyPr/>${own}<a:p><a:r><a:t>x</a:t></a:r></a:p>`, { lstStyles: [inherited], bodyPrs: [], fontRef })
    expect(withOwn?.paragraphs[0].runs[0].color).toBe('#111111')
    const viaRef = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p>', { lstStyles: [null, inherited], bodyPrs: [], fontRef })
    expect(viaRef?.paragraphs[0].runs[0]).toMatchObject({ color: '#333333', bold: true })
    expect(viaRef?.paragraphs[0].runs[0].fontFamily).toContain('Georgia')
    const minorRef = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p>', { lstStyles: [null, inherited], bodyPrs: [], fontRef: el('<a:fontRef idx="minor"/>') })
    expect(minorRef?.paragraphs[0].runs[0]).toMatchObject({ color: '#222222' })
    expect(minorRef?.paragraphs[0].runs[0].fontFamily).toContain('Arial')
    const otherRef = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p>', { lstStyles: [null, inherited], bodyPrs: [], fontRef: el('<a:fontRef idx="none"/>') })
    expect(otherRef?.paragraphs[0].runs[0].fontFamily).toContain('Courier New')
    const tableBold = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p>', { lstStyles: [], bodyPrs: [], fontRef: null, bold: false })
    expect(tableBold?.paragraphs[0].runs[0].bold).toBe(false)
  })

  it('reads body properties from the body and its inherited bodyPr', async () => {
    const body = await parse('<a:bodyPr lIns="0" anchor="ctr" anchorCtr="1" wrap="none" vert="vert270"><a:normAutofit fontScale="50000" lnSpcReduction="20000"/></a:bodyPr><a:p><a:pPr><a:spcBef><a:spcPts val="1000"/></a:spcBef></a:pPr><a:r><a:rPr sz="4000"/><a:t>x</a:t></a:r></a:p>')
    expect(body).toMatchObject({ insets: { l: 0 }, anchor: 'middle', anchorCenter: true, wrap: false, vertical: 'vert270', fontScale: 0.5, lineSpacingReduction: 0.2 })
    expect(body?.paragraphs[0].runs[0].sizePt).toBe(20)
    expect(body?.paragraphs[0].lineSpacing).toEqual({ kind: 'pct', value: 0.8 })
    expect(body?.paragraphs[0].spaceBeforePt).toBeCloseTo(8)
    const inherited = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p>', { lstStyles: [], bodyPrs: [el('<a:bodyPr anchor="b" vert="eaVert"><a:spAutoFit/></a:bodyPr>')], fontRef: null })
    expect(inherited).toMatchObject({ anchor: 'bottom', vertical: 'vert', fontScale: 1 })
    const plain = await parse('<a:bodyPr vert="horz"><a:normAutofit/></a:bodyPr><a:p><a:r><a:t>x</a:t></a:r></a:p>')
    expect(plain).toMatchObject({ vertical: 'horz', fontScale: 1, lineSpacingReduction: 0 })
  })

  it('sizes an empty paragraph from its end-of-paragraph properties', async () => {
    const body = await parse('<a:bodyPr/><a:p><a:r><a:t>x</a:t></a:r></a:p><a:p><a:endParaRPr sz="4400"/></a:p>')
    expect(body?.paragraphs[1]).toMatchObject({ runs: [], baseSizePt: 44, bullet: null })
  })
})

describe('bullets', () => {
  const bulletBody = (pPr: string, count = 1) => `<a:bodyPr/>${Array.from({ length: count }, (_, index) => `<a:p><a:pPr ${pPr}</a:pPr><a:r><a:t>item${index}</a:t></a:r></a:p>`).join('')}`

  it('reads character bullets with font, color and size', async () => {
    const body = await parse(bulletBody('><a:buClr><a:srgbClr val="FF0000"/></a:buClr><a:buSzPct val="50000"/><a:buFont typeface="Courier New"/><a:buChar char="-"/>'))
    expect(body?.paragraphs[0].bullet).toEqual({ kind: 'char', char: '-', fontFamily: expect.stringContaining('Courier New'), color: '#ff0000', sizePct: 0.5 })
    const followText = await parse(bulletBody('><a:buClrTx/><a:buSzTx/><a:buFontTx/><a:buChar/>'))
    expect(followText?.paragraphs[0].bullet).toEqual({ kind: 'char', char: '•', fontFamily: null, color: null, sizePct: 1 })
    const points = await parse(bulletBody('><a:buSzPts val="900"/><a:buChar char="*"/>'))
    expect(points?.paragraphs[0].bullet).toMatchObject({ sizePct: 0.5 })
  })

  it('maps symbol-font bullets to Unicode', async () => {
    const body = await parse(bulletBody('><a:buFont typeface="Wingdings"/><a:buChar char="§"/>'))
    expect(body?.paragraphs[0].bullet).toMatchObject({ char: '▪', fontFamily: null })
    expect(symbolBullet('Wingdings', '')).toBe('▪')
    expect(symbolBullet('Wingdings', 'Z')).toBe('•')
    expect(symbolBullet('Symbol', '·')).toBe('•')
    expect(symbolBullet('Wingdings 2', 'x')).toBe('•')
    expect(symbolBullet('Webdings', 'x')).toBe('•')
    expect(symbolBullet('Arial', 'x')).toBeNull()
    expect(symbolBullet(null, 'x')).toBeNull()
  })

  it('numbers paragraphs per level, restarting deeper levels', async () => {
    const body = await parse(`<a:bodyPr/>
      <a:p><a:pPr><a:buAutoNum type="arabicPeriod"/></a:pPr><a:r><a:t>a</a:t></a:r></a:p>
      <a:p><a:pPr lvl="1"><a:buAutoNum type="alphaLcParenR"/></a:pPr><a:r><a:t>b</a:t></a:r></a:p>
      <a:p><a:pPr lvl="1"><a:buAutoNum type="alphaLcParenR"/></a:pPr><a:r><a:t>c</a:t></a:r></a:p>
      <a:p><a:pPr><a:buAutoNum type="arabicPeriod"/></a:pPr><a:r><a:t>d</a:t></a:r></a:p>
      <a:p><a:pPr lvl="1"><a:buAutoNum type="alphaLcParenR"/></a:pPr><a:r><a:t>e</a:t></a:r></a:p>
      <a:p><a:pPr><a:buNone/></a:pPr><a:r><a:t>f</a:t></a:r></a:p>
      <a:p><a:pPr><a:buAutoNum type="romanUcPeriod" startAt="4"/></a:pPr><a:r><a:t>g</a:t></a:r></a:p>
      <a:p><a:pPr><a:buAutoNum/></a:pPr></a:p>
      <a:p><a:pPr><a:buBlip/></a:pPr><a:r><a:t>h</a:t></a:r></a:p>`)
    const labels = body?.paragraphs.map((paragraph) => (paragraph.bullet?.kind === 'number' ? paragraph.bullet.text : paragraph.bullet?.kind ?? null))
    expect(labels).toEqual(['1.', 'a)', 'b)', '2.', 'a)', null, 'IV.', null, null])
  })

  it('formats every auto-number scheme family', () => {
    expect(formatAutoNumber('arabicPeriod', 3)).toBe('3.')
    expect(formatAutoNumber('arabicParenBoth', 3)).toBe('(3)')
    expect(formatAutoNumber('arabicPlain', 3)).toBe('3')
    expect(formatAutoNumber('alphaLcPeriod', 28)).toBe('ab.')
    expect(formatAutoNumber('alphaUcParenR', 2)).toBe('B)')
    expect(formatAutoNumber('romanLcPeriod', 1994)).toBe('mcmxciv.')
    expect(formatAutoNumber('romanUcPeriod', 9)).toBe('IX.')
  })
})
