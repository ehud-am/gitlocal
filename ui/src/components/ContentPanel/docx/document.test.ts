import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { relsXml } from '../ooxml/test-support'
import { parseDocument } from './document'
import type { Block, Inline, ParagraphNode, TableNode } from './model'
import { buildDocx, para, parseDocx, PNG_BYTES, wrap } from './test-support'

function blocksOf(doc: Awaited<ReturnType<typeof parseDocx>>, sheet = 0): Block[] {
  return doc.sheets[sheet].groups.flatMap((group) => group.blocks)
}

function paragraphs(blocks: Block[]): ParagraphNode[] {
  return blocks.filter((block): block is ParagraphNode => block.kind === 'paragraph')
}

function text(paragraph: ParagraphNode): string {
  return paragraph.inlines.map((inline) => (inline.kind === 'text' ? inline.text : inline.kind === 'tab' ? '\t' : '')).join('')
}

function first<K extends Inline['kind']>(paragraph: ParagraphNode, kind: K): Extract<Inline, { kind: K }> {
  return paragraph.inlines.find((inline) => inline.kind === kind) as Extract<Inline, { kind: K }>
}

const inlineDrawing = (graphic: string, extra = '') => `<w:p><w:r><w:drawing><wp:inline>
  <wp:extent cx="952500" cy="476250"/><wp:docPr id="1" name="Picture" descr="Alt text"${extra}/>
  <a:graphic><a:graphicData>${graphic}</a:graphicData></a:graphic>
</wp:inline></w:drawing></w:r></w:p>`

const picture = (embed: string, srcRect = '') => `<pic:pic><pic:blipFill><a:blip r:embed="${embed}"/>${srcRect}</pic:blipFill></pic:pic>`

const anchorDrawing = (wrapElement: string, position = '<wp:positionH relativeFrom="column"><wp:posOffset>0</wp:posOffset></wp:positionH>') => `<w:p><w:r><w:drawing><wp:anchor>
  ${position}<wp:extent cx="952500" cy="952500"/>${wrapElement}<wp:docPr id="2" name="Pic"/>
  <a:graphic><a:graphicData>${picture('rIdImg')}</a:graphicData></a:graphic>
</wp:anchor></w:drawing></w:r></w:p>`

const imageParts = { parts: { 'word/media/image1.png': PNG_BYTES }, rels: [{ id: 'rIdImg', type: 'image', target: 'media/image1.png' }] }

describe('parseDocument', () => {
  it('rejects packages without a Word document', async () => {
    const zip = new JSZip()
    zip.file('hello.txt', 'hi')
    await expect(parseDocument(await zip.generateAsync({ type: 'uint8array' }))).rejects.toThrow('Not a Word document')
    await expect(parseDocument(new Uint8Array([1, 2, 3]))).rejects.toThrow()
  })

  it('finds the main part through the package relationships, or at its usual path', async () => {
    const moved = await parseDocx({ body: para('Hello'), rootRels: relsXml([{ id: 'rId1', type: 'officeDocument', target: 'word/document.xml' }]) })
    expect(text(paragraphs(blocksOf(moved))[0])).toBe('Hello')
    const noRels = await parseDocx({ body: para('Fallback'), rootRels: relsXml([]) })
    expect(text(paragraphs(blocksOf(noRels))[0])).toBe('Fallback')
  })

  it('resolves run formatting through defaults, paragraph and character styles and direct formatting', async () => {
    const doc = await parseDocx({
      theme: true,
      styles: `
        <w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:rFonts w:asciiTheme="minorHAnsi"/></w:rPr></w:rPrDefault>
        <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
        <w:style w:type="paragraph" w:default="1" w:styleId="Normal"/>
        <w:style w:type="paragraph" w:styleId="Heading1"><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/><w:spacing w:before="240" w:after="0"/></w:pPr><w:rPr><w:rFonts w:asciiTheme="majorHAnsi"/><w:sz w:val="32"/><w:color w:val="2F5496" w:themeColor="accent1" w:themeShade="BF"/></w:rPr></w:style>
        <w:style w:type="character" w:styleId="Emph"><w:rPr><w:i/></w:rPr></w:style>`,
      body: `
        <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title</w:t></w:r></w:p>
        <w:p><w:r><w:t xml:space="preserve">Plain </w:t></w:r><w:r><w:rPr><w:rStyle w:val="Emph"/><w:b/></w:rPr><w:t>styled</w:t></w:r></w:p>`,
    })
    const [heading, body] = paragraphs(blocksOf(doc))
    expect(heading.outlineLevel).toBe(0)
    expect(heading.spaceBeforePt).toBe(12)
    expect(heading.spaceAfterPt).toBe(0)
    expect(heading.markStyle).toMatchObject({ font: 'Georgia', sizePt: 16, color: '#3b618e' })
    expect(body.line).toEqual({ rule: 'auto', value: 259 / 240 })
    expect(body.spaceAfterPt).toBe(8)
    const [plain, styled] = body.inlines as Extract<Inline, { kind: 'text' }>[]
    expect(plain).toMatchObject({ text: 'Plain ', style: { font: 'Arial', sizePt: 11 } })
    expect(styled).toMatchObject({ text: 'styled', style: { italic: true, bold: true } })
  })

  it('reads paragraph layout properties', async () => {
    const doc = await parseDocx({
      body: `<w:p><w:pPr><w:jc w:val="center"/><w:ind w:left="1440" w:right="720" w:firstLine="360"/>
        <w:spacing w:line="480" w:lineRule="exact"/><w:shd w:val="clear" w:fill="FFFF00"/><w:pBdr><w:bottom w:val="single" w:sz="12" w:color="0000FF"/></w:pBdr>
        <w:bidi/><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9360"/></w:tabs></w:pPr><w:r><w:t>Laid out</w:t></w:r></w:p>
        <w:p><w:pPr><w:outlineLvl w:val="9"/><w:spacing w:line="300" w:lineRule="atLeast"/></w:pPr><w:r><w:t>Body text level</w:t></w:r></w:p>`,
    })
    const [laidOut, bodyLevel] = paragraphs(blocksOf(doc))
    expect(laidOut).toMatchObject({
      align: 'center', indentLeftPx: 96, indentRightPx: 48, firstLinePx: 24,
      line: { rule: 'exact', pt: 24 }, shading: '#ffff00', rtl: true,
      borders: { bottom: { style: 'solid', widthPt: 1.5, color: '#0000ff' } },
      tabStops: [{ posPx: 624, align: 'right', leader: 'dot' }],
    })
    expect(bodyLevel.outlineLevel).toBeNull()
    expect(bodyLevel.line).toEqual({ rule: 'atLeast', pt: 15 })
  })

  it('applies contextual spacing between paragraphs of the same style', async () => {
    const doc = await parseDocx({
      styles: `<w:style w:type="paragraph" w:styleId="List"><w:pPr><w:spacing w:before="100" w:after="100"/><w:contextualSpacing/></w:pPr></w:style>`,
      body: `${para('a', '<w:pStyle w:val="List"/>')}${para('b', '<w:pStyle w:val="List"/>')}${para('c')}`,
    })
    const [a, b, c] = paragraphs(blocksOf(doc))
    expect(a.spaceAfterPt).toBe(0)
    expect(b.spaceBeforePt).toBe(0)
    expect(b.spaceAfterPt).toBe(5)
    expect(c.spaceBeforePt).toBe(0)
  })

  it('numbers list paragraphs, applying the level indent between style and direct formatting', async () => {
    const doc = await parseDocx({
      numbering: `<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr><w:rPr><w:b/></w:rPr></w:lvl>
        <w:lvl w:ilvl="1"><w:numFmt w:val="none"/><w:lvlText w:val=""/></w:lvl></w:abstractNum>
        <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`,
      styles: `<w:style w:type="paragraph" w:styleId="ListNum"><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>`,
      body: `${para('One', '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>', '<w:i/>')}
        ${para('Two', '<w:pStyle w:val="ListNum"/><w:ind w:left="1000"/>')}
        ${para('Hidden marker', '<w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr>')}
        ${para('Not listed', '<w:pStyle w:val="ListNum"/><w:numPr><w:numId w:val="0"/></w:numPr>')}`,
    })
    const [one, two, hidden, notListed] = paragraphs(blocksOf(doc))
    expect(one.marker).toEqual({ text: '1.', suffix: 'tab', style: { bold: true } })
    expect(one.indentLeftPx).toBe(48)
    expect(one.firstLinePx).toBe(-24)
    expect(two.marker?.text).toBe('2.')
    expect(two.indentLeftPx).toBeCloseTo(1000 / 15)
    expect(hidden.marker).toBeNull()
    expect(notListed.marker).toBeNull()
  })

  it('reads runs: tabs, breaks, hyphens, symbols, hidden text and tracked changes', async () => {
    const doc = await parseDocx({
      body: `<w:p>
        <w:r><w:t>A</w:t><w:tab/><w:t>B</w:t><w:ptab/><w:br/><w:cr/><w:br w:type="column"/><w:noBreakHyphen/><w:softHyphen/></w:r>
        <w:r><w:sym w:font="Wingdings" w:char="F0E0"/><w:sym w:char="0041"/><w:sym w:char="zz"/></w:r>
        <w:r><w:rPr><w:vanish/></w:rPr><w:t>secret</w:t></w:r>
        <w:ins><w:r><w:t>inserted</w:t></w:r></w:ins><w:del><w:r><w:delText>deleted</w:delText></w:r></w:del>
        <w:moveFrom><w:r><w:t>moved away</w:t></w:r></w:moveFrom><w:moveTo><w:r><w:t>moved here</w:t></w:r></w:moveTo>
        <w:smartTag><w:r><w:t>tag</w:t></w:r></w:smartTag><w:customXml><w:r><w:t>xml</w:t></w:r></w:customXml>
        <w:sdt><w:sdtContent><w:r><w:t>control</w:t></w:r></w:sdtContent></w:sdt>
        <w:dir><w:r><w:t>dir</w:t></w:r></w:dir><w:proofErr/>
        <w:r><w:lastRenderedPageBreak/><w:separator/><w:footnoteRef/></w:r>
      </w:p>`,
    })
    const paragraph = paragraphs(blocksOf(doc))[0]
    expect(text(paragraph)).toBe('A\tB\t‑­àAinsertedmoved heretagxmlcontroldir')
    expect(paragraph.inlines.filter((inline) => inline.kind === 'break').map((inline) => (inline as { type: string }).type)).toEqual(['line', 'line', 'column'])
    const symbol = paragraph.inlines.find((inline) => inline.kind === 'text' && inline.text === 'à') as Extract<Inline, { kind: 'text' }>
    expect(symbol.style.font).toBe('Wingdings')
  })

  it('reads hyperlinks, keeping only safe external targets', async () => {
    const doc = await parseDocx({
      rels: [
        { id: 'rIdWeb', type: 'hyperlink', target: 'https://gitlocal.dev', external: true },
        { id: 'rIdBad', type: 'hyperlink', target: 'javascript:alert(1)', external: true },
        { id: 'rIdInternal', type: 'hyperlink', target: 'other.xml' },
      ],
      body: `<w:p>
        <w:hyperlink r:id="rIdWeb"><w:r><w:t>web</w:t></w:r></w:hyperlink>
        <w:hyperlink r:id="rIdBad"><w:r><w:t>bad</w:t></w:r></w:hyperlink>
        <w:hyperlink r:id="rIdInternal"><w:r><w:t>internal</w:t></w:r></w:hyperlink>
        <w:hyperlink w:anchor="Section2"><w:r><w:t>anchor</w:t></w:r></w:hyperlink>
        <w:hyperlink r:id="rIdMissing"><w:r><w:t>missing</w:t></w:r></w:hyperlink>
        <w:bookmarkStart w:id="0" w:name="Section2"/><w:bookmarkStart w:id="1"/>
      </w:p>`,
    })
    const inlines = paragraphs(blocksOf(doc))[0].inlines
    const linkOf = (label: string) => (inlines.find((inline) => inline.kind === 'text' && inline.text === label) as Extract<Inline, { kind: 'text' }>).link
    expect(linkOf('web')).toEqual({ kind: 'url', href: 'https://gitlocal.dev' })
    expect(linkOf('bad')).toBeNull()
    expect(linkOf('internal')).toBeNull()
    expect(linkOf('anchor')).toEqual({ kind: 'anchor', name: 'Section2' })
    expect(linkOf('missing')).toBeNull()
    expect(inlines.filter((inline) => inline.kind === 'bookmark')).toEqual([{ kind: 'bookmark', name: 'Section2' }])
  })

  it('shows field results, hides field codes and follows HYPERLINK fields', async () => {
    const field = (instr: string, result: string) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">${instr}</w:instrText></w:r>
      <w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>${result}</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>`
    const doc = await parseDocx({
      body: `<w:p>${field(' HYPERLINK "https://example.com/a" \\o "tip" ', 'site')}${field(' HYPERLINK \\l "_Toc1" ', 'toc')}${field(' HYPERLINK "javascript:x" ', 'unsafe')}${field(' PAGE ', '7')}</w:p>
        <w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText>TOC</w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>after</w:t></w:r></w:p>
        <w:p><w:fldSimple w:instr=" HYPERLINK https://example.org "><w:r><w:t>simple</w:t></w:r></w:fldSimple><w:fldSimple w:instr="DATE"><w:r><w:t>today</w:t></w:r></w:fldSimple></w:p>
        <w:p><w:r><w:fldChar w:fldCharType="separate"/><w:fldChar w:fldCharType="end"/><w:instrText>stray</w:instrText><w:t>stray end</w:t></w:r></w:p>`,
    })
    const [links, toc, simple, stray] = paragraphs(blocksOf(doc))
    expect(text(links)).toBe('sitetocunsafe7')
    const link = (label: string, paragraph: ParagraphNode) => (paragraph.inlines.find((inline) => inline.kind === 'text' && inline.text === label) as Extract<Inline, { kind: 'text' }>).link
    expect(link('site', links)).toEqual({ kind: 'url', href: 'https://example.com/a' })
    expect(link('toc', links)).toEqual({ kind: 'anchor', name: '_Toc1' })
    expect(link('unsafe', links)).toBeNull()
    expect(text(toc)).toBe('after')
    expect(link('simple', simple)).toEqual({ kind: 'url', href: 'https://example.org' })
    expect(link('today', simple)).toBeNull()
    expect(text(stray)).toBe('stray end')
  })

  it('reads math as italic text', async () => {
    const doc = await parseDocx({ body: '<w:p><m:oMathPara><m:oMath><m:r><m:t>x=1</m:t></m:r></m:oMath></m:oMathPara><m:oMath/></w:p>' })
    const inline = first(paragraphs(blocksOf(doc))[0], 'text')
    expect(inline).toMatchObject({ text: 'x=1', style: { italic: true, font: 'Cambria Math' } })
    expect(paragraphs(blocksOf(doc))[0].inlines).toHaveLength(1)
  })

  it('reads inline pictures with crops, links, missing media and linked images', async () => {
    const doc = await parseDocx({
      ...imageParts,
      rels: [
        ...imageParts.rels,
        { id: 'rIdLinked', type: 'image', target: 'https://example.com/x.png', external: true },
        { id: 'rIdGone', type: 'image', target: 'media/gone.png' },
        { id: 'rIdClick', type: 'hyperlink', target: 'https://gitlocal.dev', external: true },
      ],
      body: inlineDrawing(picture('rIdImg', '<a:srcRect l="10000" r="10000"/>'), '><a:hlinkClick r:id="rIdClick"/></wp:docPr><wp:cNvGraphicFramePr') .replace('<wp:cNvGraphicFramePr/>', '')
        + inlineDrawing(picture('rIdLinked'))
        + inlineDrawing(picture('rIdGone'))
        + inlineDrawing(picture('rIdImg'), ' hidden="1"'),
    })
    const [cropped, linked, gone, hidden] = paragraphs(blocksOf(doc))
    const image = first(cropped, 'image')
    expect(image).toMatchObject({ widthPx: 100, heightPx: 50, alt: 'Alt text', float: null, block: false, link: { kind: 'url', href: 'https://gitlocal.dev' } })
    expect(image.image.crop).toEqual({ l: 0.1, t: 0, r: 0.1, b: 0 })
    expect(image.image.src).toBeTruthy()
    expect(first(linked, 'placeholder').label).toBe('Linked picture not available')
    expect(first(gone, 'image').image.src).toBeNull()
    expect(hidden.inlines).toHaveLength(0)
    expect(doc.objectUrls.length + (typeof URL.createObjectURL === 'function' ? 0 : 1)).toBeGreaterThan(0)
  })

  it('places anchored pictures by their wrapping', async () => {
    const align = (value: string) => `<wp:positionH relativeFrom="column"><wp:align>${value}</wp:align></wp:positionH>`
    const doc = await parseDocx({
      ...imageParts,
      body: [
        anchorDrawing('<wp:wrapSquare wrapText="bothSides"/>'),
        anchorDrawing('<wp:wrapSquare wrapText="bothSides"/>', align('right')),
        anchorDrawing('<wp:wrapTight wrapText="left"/>'),
        anchorDrawing('<wp:wrapThrough wrapText="right"/>', align('right')),
        anchorDrawing('<wp:wrapTopAndBottom/>'),
        anchorDrawing('<wp:wrapNone/>'),
        anchorDrawing('<wp:wrapSquare/>', align('center')),
        anchorDrawing('<wp:wrapSquare/>', '<wp:positionH relativeFrom="column"><wp:posOffset>5000000</wp:posOffset></wp:positionH>'),
        anchorDrawing('<wp:wrapSquare/>', ''),
        anchorDrawing(''),
      ].join(''),
    })
    const placements = paragraphs(blocksOf(doc)).map((paragraph) => {
      const image = first(paragraph, 'image')
      return `${image.float}/${image.block}`
    })
    expect(placements).toEqual(['left/false', 'right/false', 'right/false', 'left/false', 'null/true', 'null/true', 'null/true', 'right/false', 'left/false', 'null/true'])
  })

  it('reads charts, text boxes, shape groups and placeholders for other graphics', async () => {
    const chartXml = `<?xml version="1.0"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart><c:plotArea><c:barChart><c:barDir val="col"/>
      <c:ser><c:tx><c:v>Sales</c:v></c:tx><c:cat><c:strLit><c:ptCount val="2"/><c:pt idx="0"><c:v>Q1</c:v></c:pt><c:pt idx="1"><c:v>Q2</c:v></c:pt></c:strLit></c:cat>
      <c:val><c:numLit><c:ptCount val="2"/><c:pt idx="0"><c:v>3</c:v></c:pt><c:pt idx="1"><c:v>5</c:v></c:pt></c:numLit></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`
    const doc = await parseDocx({
      ...imageParts,
      parts: { ...imageParts.parts, 'word/charts/chart1.xml': chartXml },
      rels: [...imageParts.rels, { id: 'rIdChart', type: 'chart', target: 'charts/chart1.xml' }, { id: 'rIdNoChart', type: 'chart', target: 'charts/missing.xml' }],
      body: [
        inlineDrawing('<c:chart r:id="rIdChart"/>'),
        inlineDrawing('<c:chart r:id="rIdNoChart"/>'),
        inlineDrawing(`<wps:wsp><wps:spPr><a:solidFill><a:srgbClr val="FFEEDD"/></a:solidFill><a:ln w="12700"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln></wps:spPr>
          <wps:txbx><w:txbxContent>${para('In a box')}</w:txbxContent></wps:txbx></wps:wsp>`),
        inlineDrawing('<wps:wsp><wps:spPr><a:ln><a:noFill/></a:ln></wps:spPr></wps:wsp>'),
        inlineDrawing(`<wpg:wgp><wpg:grpSpPr><a:xfrm><a:chExt cx="476250" cy="238125"/></a:xfrm></wpg:grpSpPr>
          ${picture('rIdImg').replace('</pic:pic>', '<pic:spPr><a:xfrm><a:ext cx="476250" cy="238125"/></a:xfrm></pic:spPr></pic:pic>')}
          <wps:wsp><wps:spPr/><wps:txbx><w:txbxContent>${para('Group text')}</w:txbxContent></wps:txbx></wps:wsp>
          <wps:wsp><wps:spPr/></wps:wsp>
          <wpg:grpSp><wpg:grpSpPr><a:xfrm><a:ext cx="1" cy="1"/></a:xfrm></wpg:grpSpPr>${picture('rIdLinkedNope')}</wpg:grpSp>
        </wpg:wgp>`),
        inlineDrawing('<wpg:wgp><wpg:grpSpPr/></wpg:wgp>'),
        inlineDrawing('<dgm:relIds xmlns:dgm="urn:dgm"/>'),
        inlineDrawing('<x:other xmlns:x="urn:x"/>'),
        inlineDrawing(''),
        '<w:p><w:r><w:drawing/></w:r></w:p>',
      ].join(''),
    })
    const [chart, noChart, textbox, emptyShape, group, emptyGroup, smartArt, other, empty, bare] = paragraphs(blocksOf(doc))
    const chartInline = first(chart, 'chart')
    expect(chartInline.chart?.series[0]).toMatchObject({ name: 'Sales', values: [3, 5] })
    expect(chartInline).toMatchObject({ widthPx: 100, heightPx: 50, float: null })
    expect(first(noChart, 'chart').chart).toBeNull()
    const box = first(textbox, 'textbox')
    expect(box).toMatchObject({ fill: '#ffeedd', border: { style: 'solid', widthPt: 1, color: '#000000' }, widthPx: 100 })
    expect(text(box.blocks[0] as ParagraphNode)).toBe('In a box')
    expect(emptyShape.inlines).toHaveLength(0)
    expect(group.inlines.map((inline) => inline.kind)).toEqual(['image', 'textbox', 'placeholder'])
    expect(first(group, 'image')).toMatchObject({ widthPx: 100, heightPx: 50 })
    expect(emptyGroup.inlines).toHaveLength(0)
    expect(first(smartArt, 'placeholder').label).toBe('SmartArt graphic not available')
    expect(first(other, 'placeholder').label).toBe('Embedded object not available')
    expect(empty.inlines).toHaveLength(0)
    expect(bare.inlines).toHaveLength(0)
  })

  it('prefers alternate content it understands, else the fallback', async () => {
    const doc = await parseDocx({
      body: `<w:p><w:r><mc:AlternateContent>
          <mc:Choice Requires="wps"><w:t>choice</w:t></mc:Choice><mc:Fallback><w:t>fallback</w:t></mc:Fallback>
        </mc:AlternateContent></w:r>
        <mc:AlternateContent><mc:Choice Requires="cx1"><w:r><w:t>new</w:t></w:r></mc:Choice><mc:Fallback><w:r><w:t>old</w:t></w:r><w:bookmarkStart w:name="x"/></mc:Fallback></mc:AlternateContent></w:p>
        <mc:AlternateContent><mc:Choice Requires="w14">${para('block choice')}</mc:Choice></mc:AlternateContent>
        <mc:AlternateContent><mc:Choice Requires="w99"><w:sdt><w:sdtContent>${para('ignored')}</w:sdtContent></w:sdt></mc:Choice></mc:AlternateContent>
        <mc:AlternateContent><mc:Fallback><w:sdt><w:sdtContent>${para('sdt fallback')}</w:sdtContent></w:sdt></mc:Fallback></mc:AlternateContent>`,
    })
    expect(paragraphs(blocksOf(doc)).map(text)).toEqual(['choiceold', 'block choice', 'sdt fallback'])
  })

  it('reads VML pictures and text boxes', async () => {
    const doc = await parseDocx({
      ...imageParts,
      rels: [...imageParts.rels, { id: 'rIdExt', type: 'image', target: 'https://x/y.png', external: true }],
      body: `<w:p><w:r><w:pict>
          <v:shape style="width:72pt;height:0.5in" alt="vml pic"><v:imagedata r:id="rIdImg"/></v:shape>
          <v:shape style="position:absolute;mso-position-horizontal:right;width:2cm;height:10mm"><v:imagedata r:id="rIdImg"/></v:shape>
          <v:shape style="position:absolute;mso-position-horizontal:center"><v:imagedata r:id="rIdImg"/></v:shape>
          <v:shape style="position:absolute;width:junk"><v:imagedata r:id="rIdExt"/></v:shape>
          <v:shape style="visibility:hidden"><v:imagedata r:id="rIdImg"/></v:shape>
          <v:group><v:rect style="width:100px;position:absolute" fillcolor="#ff0000"><v:textbox><w:txbxContent>${para('VML box')}</w:txbxContent></v:textbox></v:rect></v:group>
          <v:rect filled="f" fillcolor="#00ff00"><v:textbox><w:txbxContent>${para('Unfilled')}</w:txbxContent></v:textbox></v:rect>
          <v:rect fillcolor="red"><v:textbox><w:txbxContent>${para('Named color')}</w:txbxContent></v:textbox></v:rect>
          <v:rect><v:textbox><w:txbxContent/></v:textbox></v:rect>
          <v:shape style=";bad;"/>
        </w:pict></w:r><w:r><w:object><v:shape style="width:10px;height:10px"><v:imagedata r:id="rIdImg"/></v:shape></w:object></w:r></w:p>`,
    })
    const inlines = paragraphs(blocksOf(doc))[0].inlines
    expect(inlines.map((inline) => inline.kind)).toEqual(['image', 'image', 'image', 'textbox', 'textbox', 'textbox', 'image'])
    expect(inlines[0]).toMatchObject({ widthPx: 96, heightPx: 48, float: null, alt: 'vml pic' })
    expect(inlines[1]).toMatchObject({ float: 'right' })
    expect((inlines[1] as { widthPx: number }).widthPx).toBeCloseTo(75.59, 1)
    expect(inlines[2]).toMatchObject({ float: null, widthPx: 96, heightPx: 96 })
    expect(inlines[3]).toMatchObject({ fill: '#ff0000', widthPx: 100, float: 'left' })
    expect(inlines[4]).toMatchObject({ fill: null })
    expect(inlines[5]).toMatchObject({ fill: null })
  })

  it('numbers footnotes and endnotes in reference order and parses their text', async () => {
    const doc = await parseDocx({
      footnotes: `<w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>
        <w:footnote w:id="2"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> Second id</w:t></w:r></w:p></w:footnote>
        <w:footnote w:id="1"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:t xml:space="preserve"> First id</w:t></w:r></w:p></w:footnote><w:footnote/>`,
      endnotes: `<w:endnote w:id="1"><w:p><w:r><w:endnoteRef/></w:r><w:r><w:t xml:space="preserve"> End</w:t></w:r></w:p></w:endnote>`,
      body: `<w:p><w:r><w:t>a</w:t></w:r><w:r><w:footnoteReference w:id="2"/></w:r><w:r><w:footnoteReference w:id="1"/></w:r><w:r><w:footnoteReference w:id="2"/></w:r>
        <w:r><w:endnoteReference w:id="1"/></w:r><w:r><w:footnoteReference w:id="9"/></w:r><w:r><w:footnoteReference/></w:r></w:p>`,
    })
    const refs = paragraphs(blocksOf(doc))[0].inlines.filter((inline) => inline.kind === 'noteRef')
    expect(refs.map((ref) => `${ref.note}${ref.number}`)).toEqual(['footnote1', 'footnote2', 'footnote1', 'endnote1', 'footnote3'])
    expect(doc.footnotes.map((note) => `${note.number}:${text(note.blocks[0] as ParagraphNode)}`)).toEqual(['1:1 Second id', '2:2 First id'])
    expect(doc.endnotes.map((note) => text(note.blocks[0] as ParagraphNode))).toEqual(['1 End'])
  })

  it('ignores note references when the document has no notes part', async () => {
    const doc = await parseDocx({ body: '<w:p><w:r><w:footnoteReference w:id="1"/></w:r></w:p>' })
    expect(doc.footnotes).toEqual([])
  })

  it('splits sheets at hard page breaks and section breaks, with each section\'s page, columns, headers and footers', async () => {
    const header = (label: string) => wrap('hdr', para(label))
    const doc = await parseDocx({
      settings: '<w:defaultTabStop w:val="360"/>',
      parts: {
        'word/header1.xml': header('Default header'),
        'word/header2.xml': header('First header'),
        'word/footer1.xml': wrap('ftr', para('Footer')),
        'word/header3.xml': header('Landscape header'),
      },
      rels: [
        { id: 'rIdH1', type: 'header', target: 'header1.xml' },
        { id: 'rIdH2', type: 'header', target: 'header2.xml' },
        { id: 'rIdF1', type: 'footer', target: 'footer1.xml' },
        { id: 'rIdH3', type: 'header', target: 'header3.xml' },
        { id: 'rIdExt', type: 'header', target: 'https://x', external: true },
      ],
      body: `${para('Cover')}
        <w:p><w:r><w:br w:type="page"/></w:r></w:p>
        ${para('Page two')}
        <w:p><w:r><w:t>Before</w:t><w:br w:type="page"/><w:t>After</w:t></w:r></w:p>
        <w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Forced</w:t></w:r></w:p>
        <w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rIdH1"/><w:headerReference w:type="first" r:id="rIdH2"/><w:headerReference w:type="even" r:id="rIdH1"/><w:headerReference r:id="rIdExt"/>
          <w:footerReference w:type="default" r:id="rIdF1"/><w:titlePg/><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:pPr><w:r><w:t>End of section one</w:t><w:br w:type="page"/></w:r></w:p>
        ${para('Two columns')}
        <w:p><w:pPr><w:sectPr><w:type w:val="continuous"/><w:cols w:num="2" w:space="360"/></w:sectPr></w:pPr></w:p>
        ${para('Landscape')}
        <w:sectPr><w:headerReference w:type="default" r:id="rIdH3"/><w:titlePg w:val="0"/><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
          <w:pgMar w:top="-720" w:right="1080" w:bottom="720" w:left="1080" w:header="360" w:footer="360" w:gutter="360"/></w:sectPr>`,
    })
    expect(doc.defaultTabPx).toBe(24)
    const sheetTexts = doc.sheets.map((sheet) => sheet.groups.map((group) => paragraphs(group.blocks).map(text).join('|')))
    expect(sheetTexts).toEqual([
      ['Cover'],
      ['|Page two|BeforeAfter'],
      ['Forced|End of section one'],
      ['', 'Two columns|'],
      ['Landscape'],
    ])
    const headerText = (index: number) => doc.sheets[index].header?.map((block) => text(block as ParagraphNode)).join('') ?? null
    expect([0, 1, 2, 3, 4].map(headerText)).toEqual(['First header', 'Default header', 'Default header', 'Default header', 'Landscape header'])
    expect(doc.sheets[4].footer?.length).toBe(1)
    expect(doc.sheets[3].groups[1].columns).toEqual({ count: 2, gapPx: 24 })
    expect(doc.sheets[4].page).toEqual({
      widthPx: 1056, heightPx: 816, margin: { top: 48, right: 72, bottom: 48, left: 96 }, headerPx: 24, footerPx: 24, columns: { count: 1, gapPx: 48 },
    })
    // The mid-paragraph break stays inline.
    const beforeAfter = paragraphs(doc.sheets[1].groups[0].blocks)[2]
    expect(beforeAfter.inlines.some((inline) => inline.kind === 'break' && inline.type === 'page')).toBe(true)
  })

  it('keeps leading and trailing breaks with bookmarks around them, and drops a trailing empty sheet', async () => {
    const doc = await parseDocx({
      body: `${para('One')}<w:p><w:bookmarkStart w:name="b1"/><w:r><w:br w:type="page"/><w:t>Two</w:t><w:br w:type="page"/></w:r><w:bookmarkStart w:name="b2"/></w:p>`,
    })
    expect(doc.sheets).toHaveLength(2)
    expect(text(paragraphs(blocksOf(doc, 1))[0])).toBe('Two')
  })

  it('treats a document whose first paragraph forces a page break as one sheet', async () => {
    const doc = await parseDocx({ body: `<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>First</w:t></w:r></w:p>` })
    expect(doc.sheets).toHaveLength(1)
  })

  it('lays out tables: grid, spans, vertical merges, widths, alignment and margins', async () => {
    const cell = (content: string, tcPr = '') => `<w:tc>${tcPr ? `<w:tcPr>${tcPr}</w:tcPr>` : ''}${para(content)}</w:tc>`
    const doc = await parseDocx({
      body: `<w:tbl><w:tblPr><w:tblW w:w="2500" w:type="pct"/><w:jc w:val="center"/><w:tblInd w:w="144" w:type="dxa"/>
          <w:tblCellMar><w:top w:w="15" w:type="dxa"/><w:start w:w="30" w:type="dxa"/><w:right w:w="0" w:type="auto"/></w:tblCellMar></w:tblPr>
        <w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/></w:tblGrid>
        <w:tr><w:trPr><w:trHeight w:val="600" w:hRule="exact"/><w:tblHeader/></w:trPr>${cell('A', '<w:gridSpan w:val="2"/><w:tcW w:w="3000" w:type="dxa"/>')}${cell('B', '<w:vMerge w:val="restart"/><w:vAlign w:val="center"/>')}</w:tr>
        <w:tr><w:trPr><w:trHeight w:val="300"/></w:trPr>${cell('C')}${cell('D', '<w:tcMar><w:left w:w="150" w:type="dxa"/><w:end w:w="0" w:type="nil"/></w:tcMar><w:vAlign w:val="bottom"/>')}${cell('', '<w:vMerge/>')}</w:tr>
        <w:sdt><w:sdtContent><w:tr><w:trPr><w:gridBefore w:val="1"/></w:trPr>${cell('E')}<w:customXml>${cell('F', '<w:vMerge w:val="restart"/>')}</w:customXml></w:tr></w:sdtContent></w:sdt>
        <w:tr>${cell('G', '<w:tcW w:w="50%" w:type="pct"/>')}${cell('H')}${cell('I', '<w:vMerge/>')}</w:tr>
      </w:tbl>
      <w:tbl><w:tblPr><w:jc w:val="right"/><w:tblW w:w="0" w:type="auto"/></w:tblPr><w:tr>${cell('Lone')}</w:tr></w:tbl>
      <w:tbl><w:tblPr><w:tblW w:w="5%" w:type="pct"/></w:tblPr><w:tblGrid><w:gridCol w:w="0"/></w:tblGrid><w:tr>${cell('Percent')}</w:tr></w:tbl>`,
    })
    const [table, lone, percent] = blocksOf(doc) as TableNode[]
    expect(table.columnsPx).toEqual([100, 100, 100])
    expect(table.widthPx).toBe(312)
    expect(table.align).toBe('center')
    expect(table.indentPx).toBeCloseTo(9.6)
    const [row0, row1, row2, row3] = table.rows
    expect(row0).toMatchObject({ heightPx: 40, exactHeight: true, header: true })
    expect(row0.cells.map((c) => [c.colSpan, c.rowSpan])).toEqual([[2, 1], [1, 2]])
    expect(row0.cells[0].widthPx).toBe(200)
    expect(row0.cells[1].vAlign).toBe('middle')
    expect(row0.cells[0].padding).toEqual({ top: 1, right: 0, bottom: 0, left: 2 })
    expect(row1).toMatchObject({ heightPx: 20, exactHeight: false })
    expect(row1.cells).toHaveLength(2)
    expect(row1.cells[1].padding).toEqual({ top: 1, right: 0, bottom: 0, left: 10 })
    expect(row1.cells[1].vAlign).toBe('bottom')
    expect(row2.cells.map((c) => [c.colSpan, c.rowSpan, c.blocks.length])).toEqual([[1, 1, 0], [1, 1, 1], [1, 2, 1]])
    expect(row3.cells.map((c) => c.widthPx)).toEqual([312, null])
    expect(lone).toMatchObject({ align: 'right', widthPx: null, columnsPx: [] })
    expect(percent.widthPx).toBeCloseTo(31.2)
  })

  it('applies table styles: borders, conditional regions, banding and cell overrides', async () => {
    const doc = await parseDocx({
      styles: `<w:style w:type="table" w:styleId="Grid">
          <w:rPr><w:sz w:val="18"/></w:rPr>
          <w:tblPr><w:tblBorders><w:top w:val="single" w:sz="8" w:color="111111"/><w:left w:val="single"/><w:bottom w:val="single"/><w:right w:val="single"/>
            <w:insideH w:val="dotted"/><w:insideV w:val="dashed"/></w:tblBorders></w:tblPr>
          <w:tblStylePr w:type="firstRow"><w:rPr><w:b/></w:rPr><w:tcPr><w:shd w:fill="222222"/><w:tcBorders><w:bottom w:val="double"/><w:insideV w:val="nil"/></w:tcBorders></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="lastRow"><w:tcPr><w:tcBorders><w:top w:val="double"/></w:tcBorders></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="firstCol"><w:rPr><w:i/></w:rPr><w:tcPr><w:tcBorders><w:top w:val="dotted"/><w:insideH w:val="nil"/></w:tcBorders></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="band1Horz"><w:tcPr><w:shd w:fill="EEEEEE"/></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="band2Vert"><w:tcPr><w:shd w:fill="DDDDDD"/></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="nwCell"><w:tcPr><w:tcBorders><w:left w:val="nil"/></w:tcBorders></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="seCell"><w:tcPr><w:shd w:fill="999999"/></w:tcPr></w:tblStylePr>
          <w:tblStylePr w:type="wholeTable"><w:tcPr><w:tcBorders><w:insideH w:val="single" w:color="ABCDEF"/></w:tcBorders></w:tcPr></w:tblStylePr>
        </w:style>`,
      body: `<w:tbl><w:tblPr><w:tblStyle w:val="Grid"/><w:tblLook w:val="00E0" w:lastColumn="1"/></w:tblPr><w:tblGrid><w:gridCol w:w="1000"/><w:gridCol w:w="1000"/></w:tblGrid>
        <w:tr><w:tc>${para('h1')}</w:tc><w:tc>${para('h2')}</w:tc></w:tr>
        <w:tr><w:tc>${para('b1')}</w:tc><w:tc><w:tcPr><w:tcBorders><w:right w:val="nil"/></w:tcBorders><w:shd w:val="clear" w:fill="FF0000"/></w:tcPr>${para('b2')}</w:tc></w:tr>
        <w:tr><w:tc>${para('c1')}</w:tc><w:tc>${para('c2')}</w:tc></w:tr>
        <w:tr><w:tc>${para('l1')}</w:tc><w:tc>${para('l2')}</w:tc></w:tr>
      </w:tbl>
      <w:tbl><w:tblPr><w:tblStyle w:val="Grid"/><w:tblLook w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr><w:tr><w:tc>${para('plain')}</w:tc></w:tr></w:tbl>`,
    })
    const [styled, plain] = blocksOf(doc) as TableNode[]
    const [header, band1, band2, last] = styled.rows
    const h1Run = (header.cells[0].blocks[0] as ParagraphNode).markStyle
    expect(h1Run).toMatchObject({ bold: true, italic: true, sizePt: 9 })
    expect(header.cells[0].shading).toBe('#222222')
    expect(header.cells[0].borders.left).toBeNull()
    expect(header.cells[0].borders.top).toMatchObject({ style: 'dotted' })
    expect(header.cells[0].borders.bottom).toMatchObject({ style: 'double' })
    expect(header.cells[0].borders.right).toBeNull()
    expect(header.cells[1].borders.left).toBeNull()
    expect(header.cells[1].borders.top).toMatchObject({ style: 'solid', color: '#111111' })
    expect(band1.cells[0].shading).toBe('#eeeeee')
    expect(band1.cells[0].borders.top).toBeNull()
    expect(band1.cells[0].borders.bottom).toBeNull()
    expect(band1.cells[1].shading).toBe('#ff0000')
    expect(band1.cells[1].borders.right).toBeNull()
    expect(band1.cells[1].borders.bottom).toMatchObject({ style: 'solid', color: '#abcdef' })
    expect(band2.cells[0].shading).toBeNull()
    expect(band2.cells[1].shading).toBe('#dddddd')
    expect(last.cells[1].shading).toBe('#999999')
    expect(last.cells[1].borders.top).toMatchObject({ style: 'double' })
    expect(last.cells[1].borders.bottom).toMatchObject({ style: 'solid' })
    expect(plain.rows[0].cells[0].shading).toBeNull()
    expect((plain.rows[0].cells[0].blocks[0] as ParagraphNode).markStyle.bold).toBeUndefined()
  })

  it('parses nested tables without leaking the outer table style', async () => {
    const doc = await parseDocx({
      styles: '<w:style w:type="table" w:styleId="Bold"><w:rPr><w:b/></w:rPr></w:style>',
      body: `<w:tbl><w:tblPr><w:tblStyle w:val="Bold"/></w:tblPr><w:tr><w:tc><w:tbl><w:tr><w:tc>${para('inner')}</w:tc></w:tr></w:tbl>${para('outer')}</w:tc></w:tr></w:tbl>`,
    })
    const outerCell = (blocksOf(doc)[0] as TableNode).rows[0].cells[0]
    const inner = (outerCell.blocks[0] as TableNode).rows[0].cells[0].blocks[0] as ParagraphNode
    expect(inner.markStyle.bold).toBeUndefined()
    expect((outerCell.blocks[1] as ParagraphNode).markStyle.bold).toBe(true)
  })

  it('builds a package for the test helper with partRels', async () => {
    const bytes = await buildDocx({
      body: '<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/></w:sectPr>',
      parts: { 'word/header1.xml': wrap('hdr', inlineDrawing(picture('rIdPic'))), 'word/media/p.png': PNG_BYTES },
      rels: [{ id: 'rIdH', type: 'header', target: 'header1.xml' }],
      partRels: { 'word/header1.xml': [{ id: 'rIdPic', type: 'image', target: 'media/p.png' }] },
    })
    const doc = await parseDocument(bytes)
    const headerImage = first(doc.sheets[0].header?.[0] as ParagraphNode, 'image')
    expect(headerImage.image.src).toBeTruthy()
  })
})
