import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GroupNode, PictureNode, ShapeNode, SlideModel, TableNode } from './model'
import { parsePresentation } from './presentation'
import { buildDeck, emf, NS, PNG_BYTES, relsXml, sp, wmf } from './test-support'

const shapes = (slide: SlideModel) => slide.nodes.filter((node): node is ShapeNode => node.kind === 'shape')
const textOf = (node: ShapeNode) => node.text?.paragraphs.map((paragraph) => paragraph.runs.map((run) => run.text).join('')).join('\n') ?? ''
const byText = (slide: SlideModel, text: string) => shapes(slide).find((node) => textOf(node) === text)

const pic = (rId: string, box = [0, 0, 952500, 952500], extra = '') => `<p:pic><p:nvPicPr><p:cNvPr id="5" name="Picture"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>
  <p:blipFill><a:blip r:embed="${rId}"/><a:stretch/></p:blipFill><p:spPr><a:xfrm><a:off x="${box[0]}" y="${box[1]}"/><a:ext cx="${box[2]}" cy="${box[3]}"/></a:xfrm>${extra}</p:spPr></p:pic>`

afterEach(() => {
  vi.restoreAllMocks()
})

describe('parsePresentation', () => {
  it('reads slide size, slide order and backgrounds through the layout and master', async () => {
    const deck = await buildDeck({
      sldSz: '<p:sldSz cx="12192000" cy="6858000"/>',
      master: { bg: '<p:bg><p:bgRef idx="1001"><a:schemeClr val="accent1"/></p:bgRef></p:bg>' },
      layouts: [{}, { bg: '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="00FF00"/></a:solidFill></p:bgPr></p:bg>' }],
      slides: [
        { shapes: sp({ text: 'one', box: [0, 0, 952500, 952500] }) },
        { layout: 1, shapes: sp({ text: 'two', box: [0, 0, 952500, 952500] }) },
        { bg: '<p:bg><p:bgPr><a:noFill/></p:bgPr></p:bg>' },
      ],
    })
    const presentation = await parsePresentation(deck)
    expect(presentation.widthPx).toBe(1280)
    expect(presentation.heightPx).toBe(720)
    expect(presentation.slides.map((slide) => slide.background)).toEqual([
      { type: 'solid', color: '#4f81bd' },
      { type: 'solid', color: '#00ff00' },
      { type: 'none' },
    ])
    expect(textOf(shapes(presentation.slides[1])[0])).toBe('two')
  })

  it('defaults the slide size and white background, and rejects broken packages', async () => {
    const plain = await parsePresentation(await buildDeck({ sldSz: null, master: null, slides: [{ layout: null, shapes: sp({ text: 'x', box: [0, 0, 1, 1] }) }] }))
    expect(plain).toMatchObject({ widthPx: 960, heightPx: 720 })
    expect(plain.slides[0].background).toEqual({ type: 'solid', color: '#ffffff' })
    await expect(parsePresentation(await buildDeck({ slides: [], files: { 'ppt/presentation.xml': '<oops' } }))).rejects.toThrow(/presentation.xml/)
    await expect(parsePresentation(await buildDeck({ slides: [], files: { 'ppt/presentation.xml': `<p:sld ${NS}/>` } }))).rejects.toThrow(/Malformed presentation/)
    await expect(parsePresentation(await buildDeck({ slides: [{}], files: { 'ppt/slides/slide1.xml': `<p:notes ${NS}/>` } }))).rejects.toThrow(/Malformed slide/)
  })

  it('finds the main part through the package relationships and skips dangling slide ids', async () => {
    const deck = await buildDeck({
      slides: [{ shapes: sp({ text: 'moved', box: [0, 0, 1, 1] }) }],
      presentationExtra: '',
      files: {
        '_rels/.rels': relsXml([{ id: 'rId1', type: 'officeDocument', target: 'ppt/presentation.xml' }]),
      },
    })
    const presentation = await parsePresentation(deck)
    expect(presentation.slides).toHaveLength(1)
    const dangling = await buildDeck({ slides: [{}], files: { 'ppt/_rels/presentation.xml.rels': relsXml([]) } })
    expect((await parsePresentation(dangling)).slides).toHaveLength(0)
    const noRootRels = await buildDeck({ slides: [{}], presentationExtra: '<p:extra/>', files: { '_rels/.rels': relsXml([]) } })
    expect((await parsePresentation(noRootRels)).slides).toHaveLength(1)
    const noRelId = await buildDeck({ slides: [{}], files: { 'ppt/presentation.xml': `<p:presentation ${NS}><p:sldIdLst><p:sldId id="256"/></p:sldIdLst></p:presentation>` } })
    expect((await parsePresentation(noRelId)).slides).toHaveLength(0)
  })

  it('yields while parsing a large deck', async () => {
    const deck = await buildDeck({ slides: Array.from({ length: 11 }, (_, index) => ({ shapes: sp({ text: `s${index}`, box: [0, 0, 1, 1] }) })) })
    expect((await parsePresentation(deck)).slides).toHaveLength(11)
  })
})

describe('placeholder inheritance', () => {
  const master = {
    shapes: [
      sp({ ph: '<p:ph type="title"/>', box: [100, 100, 1000, 1000], body: '<a:bodyPr anchor="b"/><a:lstStyle/><a:p/>' }),
      sp({ ph: '<p:ph type="body" idx="1"/>', box: [200, 200, 2000, 2000], body: '<a:bodyPr/><a:p/>' }),
      sp({ ph: '<p:ph type="sldNum" idx="12"/>', box: [300, 300, 3000, 3000], body: '<a:bodyPr/><a:p/>' }),
      sp({ text: 'Master art', box: [0, 0, 952500, 95250], name: 'Art' }),
      sp({ text: 'Hidden art', box: [0, 0, 1, 1], hidden: true }),
      sp({ box: [0, 0, 9525, 9525], body: '<a:bodyPr/><a:p><a:r><a:t>Page </a:t></a:r><a:fld type="slidenum"><a:t>‹#›</a:t></a:fld></a:p>' }),
    ].join(''),
    txStyles: `<p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:solidFill><a:schemeClr val="tx2"/></a:solidFill></a:defRPr></a:lvl1pPr></p:titleStyle>
      <p:bodyStyle><a:lvl1pPr><a:buChar char="•"/><a:defRPr sz="2800"/></a:lvl1pPr></p:bodyStyle>
      <p:otherStyle><a:lvl1pPr><a:defRPr sz="1000"/></a:lvl1pPr></p:otherStyle>`,
  }
  const layout = {
    shapes: [
      sp({ ph: '<p:ph type="title"/>', box: [9525, 9525, 952500, 95250], body: '<a:bodyPr/><a:p/>' }),
      sp({ ph: '<p:ph idx="1"/>', body: '<a:bodyPr/><a:p/>', spPr: '<a:solidFill><a:srgbClr val="FFFF00"/></a:solidFill>' }),
      sp({ ph: '<p:ph type="pic" idx="13"/>', box: [0, 0, 95250, 95250], spPr: '<a:solidFill><a:srgbClr val="FF00FF"/></a:solidFill>' }),
      sp({ text: 'Layout art', box: [0, 0, 952500, 95250] }),
    ].join(''),
  }

  it('takes position, text style and fill from the matching layout and master placeholders', async () => {
    const deck = await buildDeck({
      master,
      layouts: [layout],
      slides: [{
        shapes: [
          sp({ ph: '<p:ph type="ctrTitle"/>', text: 'Title' }),
          sp({ ph: '<p:ph idx="1"/>', text: 'Body' }),
          sp({ ph: '<p:ph type="sldNum" idx="99"/>', body: '<a:bodyPr/><a:p><a:fld type="slidenum"><a:t>‹#›</a:t></a:fld></a:p>' }),
          sp({ ph: '<p:ph type="pic" idx="13"/>' }),
          sp({ ph: '<p:ph type="body" idx="40"/>', spPr: '<a:solidFill><a:srgbClr val="00FFFF"/></a:solidFill>' }),
          sp({ text: 'Free text', box: [0, 0, 952500, 95250] }),
        ].join(''),
      }, {}],
    })
    const [slide, second] = (await parsePresentation(deck)).slides
    const title = byText(slide, 'Title')
    expect(title?.box).toMatchObject({ x: 1, y: 1, w: 100, h: 10 })
    expect(title?.text).toMatchObject({ anchor: 'bottom' })
    expect(title?.text?.paragraphs[0].runs[0]).toMatchObject({ sizePt: 44, color: '#1f497d' })
    const body = byText(slide, 'Body')
    expect(body?.fill).toEqual({ type: 'solid', color: '#ffff00' })
    expect(body?.text?.paragraphs[0].bullet).toMatchObject({ kind: 'char', char: '•' })
    expect(body?.text?.paragraphs[0].runs[0].sizePt).toBe(28)
    const number = byText(slide, '1')
    expect(number?.text?.paragraphs[0]).toMatchObject({ bullet: null })
    expect(number?.text?.paragraphs[0].runs[0].sizePt).toBe(10)
    expect(byText(slide, 'Free text')?.text?.paragraphs[0].runs[0].sizePt).toBe(10)
    // The empty picture placeholder is not drawn; the one with its own fill is.
    expect(shapes(slide).filter((node) => node.fill?.type === 'solid' && node.fill.color === '#ff00ff')).toHaveLength(0)
    expect(shapes(slide).filter((node) => node.fill?.type === 'solid' && node.fill.color === '#00ffff')).toHaveLength(1)
    // Master and layout artwork come first, in that order; hidden artwork and placeholders are skipped.
    const texts = shapes(slide).map(textOf)
    expect(texts.slice(0, 3)).toEqual(['Master art', 'Page 1', 'Layout art'])
    expect(texts).not.toContain('Hidden art')
    expect(shapes(second).map(textOf).slice(0, 3)).toEqual(['Master art', 'Page 2', 'Layout art'])
  })

  it('honors showMasterSp on layouts and slides', async () => {
    const deck = await buildDeck({
      master,
      layouts: [{ ...layout, attrs: ' showMasterSp="0"' }],
      slides: [{}, { attrs: ' showMasterSp="false"' }],
    })
    const [first, second] = (await parsePresentation(deck)).slides
    expect(shapes(first).map(textOf)).toEqual(['Layout art'])
    expect(second.nodes).toHaveLength(0)
  })

  it('applies color map overrides from the layout and slide', async () => {
    const deck = await buildDeck({
      layouts: [{ after: '<p:clrMapOvr><a:overrideClrMapping bg1="dk1" tx1="lt1"/></p:clrMapOvr>', bg: '<p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg>' }],
      slides: [
        { shapes: sp({ text: 'light', box: [0, 0, 1, 1] }) },
        { after: '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>', bg: '<p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></p:bgPr></p:bg>' },
      ],
    })
    const [first, second] = (await parsePresentation(deck)).slides
    expect(first.background).toEqual({ type: 'solid', color: '#000000' })
    expect(shapes(first)[0].text?.paragraphs[0].runs[0].color).toBe('#ffffff')
    expect(second.background).toEqual({ type: 'solid', color: '#000000' })
  })

  it('degrades when the layout, master or theme part is missing', async () => {
    const missingLayout = await buildDeck({ slides: [{ shapes: sp({ ph: '<p:ph type="title"/>', text: 'Orphan' }) }], files: { 'ppt/slideLayouts/slideLayout1.xml': '<broken' } })
    const [orphan] = (await parsePresentation(missingLayout)).slides
    expect(byText(orphan, 'Orphan')?.box).toMatchObject({ x: 0, y: 0, w: 0, h: 0 })
    const noMaster = await buildDeck({ master: null, slides: [{ shapes: sp({ text: 'x', box: [0, 0, 1, 1] }) }] })
    expect((await parsePresentation(noMaster)).slides[0].nodes).toHaveLength(1)
    const brokenMaster = await buildDeck({ slides: [{}], files: { 'ppt/slideMasters/slideMaster1.xml': '<broken' } })
    expect((await parsePresentation(brokenMaster)).slides[0].background).toEqual({ type: 'solid', color: '#ffffff' })
    const noTheme = await buildDeck({ theme: null, slides: [{ shapes: sp({ text: 'x', box: [0, 0, 1, 1] }) }] })
    expect(shapes((await parsePresentation(noTheme)).slides[0])[0].text?.paragraphs[0].runs[0].fontFamily).toContain('Calibri')
  })
})

describe('shapes', () => {
  it('reads geometry, fills, outlines, shadows and theme styles', async () => {
    const style = '<p:style><a:lnRef idx="1"><a:schemeClr val="accent2"/></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef><a:effectRef idx="2"><a:srgbClr val="000000"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></p:style>'
    const deck = await buildDeck({
      slides: [{
        shapes: [
          sp({ text: 'styled', box: [0, 0, 952500, 952500], spPr: '<a:prstGeom prst="ellipse"><a:avLst><a:gd name="adj" fmla="val 1000"/><a:gd name="bad" fmla="pin 0 1 2"/></a:avLst></a:prstGeom>', extra: style }),
          sp({ box: [0, 0, 952500, 952500], spPr: '<a:custGeom><a:gdLst><a:gd name="g" fmla="*/ w 1 2"/></a:gdLst><a:pathLst><a:path w="10" h="10" fill="none" stroke="0"><a:moveTo><a:pt x="0" y="0"/></a:moveTo><a:lnTo><a:pt x="g" y="10"/></a:lnTo><a:arcTo wR="1" hR="1" stAng="0" swAng="5400000"/><a:cubicBezTo><a:pt x="1" y="1"/><a:pt x="2" y="2"/><a:pt x="3" y="3"/></a:cubicBezTo><a:quadBezTo><a:pt x="1" y="1"/><a:pt/></a:quadBezTo><a:arcTo/><a:moveTo/><a:close/><a:unknown/></a:path><a:path stroke="false"/></a:pathLst></a:custGeom><a:solidFill><a:srgbClr val="010203"/></a:solidFill>' }),
          sp({ box: [0, 0, 952500, 0], spPr: '<a:prstGeom prst="line"/><a:ln w="19050"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:tailEnd type="triangle"/></a:ln>' }).replace('p:sp>', 'p:cxnSp>').replace('</p:sp>', '</p:cxnSp>'),
          sp({ box: [0, 0, 1, 1], spPr: '<a:noFill/><a:xfrm rot="5400000" flipH="1" flipV="true"><a:off x="0" y="0"/></a:xfrm>' }),
          sp({ box: [0, 0, 1, 1], body: '<a:bodyPr/><a:p><a:r><a:t>t</a:t></a:r></a:p>', extra: '<p:txXfrm/>' }),
        ].join(''),
      }],
    })
    const slide = (await parsePresentation(deck)).slides[0]
    const [styled, custom, line] = slide.nodes as ShapeNode[]
    expect(styled.geometry).toEqual({ kind: 'preset', name: 'ellipse', adj: { adj: 1000 } })
    expect(styled.fill).toEqual({ type: 'solid', color: '#4f81bd' })
    expect(styled.line).toMatchObject({ color: '#c0504d', widthPx: 1 })
    expect(styled.shadow).toBe('drop-shadow(0px 2px 2px rgba(0, 0, 0, 0.5))')
    expect(styled.text?.paragraphs[0].runs[0].color).toBe('#ffffff')
    expect(custom.geometry).toMatchObject({ kind: 'custom', guides: [{ name: 'g', fmla: '*/ w 1 2' }] })
    expect(custom.geometry.kind === 'custom' && custom.geometry.paths[0]).toMatchObject({ w: 10, h: 10, fill: false, stroke: false })
    expect(custom.geometry.kind === 'custom' && custom.geometry.paths[0].commands.map((command) => command.op)).toEqual(['M', 'L', 'A', 'C', 'Q', 'A', 'M', 'Z'])
    expect(custom.geometry.kind === 'custom' && custom.geometry.paths[1]).toMatchObject({ w: null, fill: true, stroke: false })
    expect(line).toMatchObject({ kind: 'shape', fill: null, line: { color: '#ff0000', tail: { type: 'triangle' } } })
    // A shape with no fill, outline or text is dropped.
    expect(slide.nodes).toHaveLength(4)
    expect((slide.nodes[3] as ShapeNode).textBox).toBeNull()
  })

  it('reads pictures, including unresolvable and external ones', async () => {
    const deck = await buildDeck({
      slides: [{
        shapes: [
          pic('rIdImg', [0, 0, 952500, 952500], '<a:prstGeom prst="ellipse"/><a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>'),
          pic('rIdMissing'),
          pic('rIdExt'),
          pic('rIdImg').replace(/<p:spPr>.*<\/p:spPr>/s, '<p:spPr/>'),
        ].join(''),
        rels: [
          { id: 'rIdImg', type: 'image', target: '../media/image1.png' },
          { id: 'rIdMissing', type: 'image', target: '../media/nope.png' },
          { id: 'rIdExt', type: 'image', target: 'https://example.com/x.png', external: true },
        ],
      }],
      files: { 'ppt/media/image1.png': PNG_BYTES },
    })
    const presentation = await parsePresentation(deck)
    const [image, missing, external] = presentation.slides[0].nodes as PictureNode[]
    expect(image).toMatchObject({ kind: 'picture', geometry: { name: 'ellipse' }, line: { color: '#000000' } })
    expect(image.image.src).toMatch(/^(blob:|data:image\/png)/)
    expect(missing.image.src).toBeNull()
    expect(external.image).toMatchObject({ mediaPath: '', src: null })
    expect(presentation.slides[0].nodes).toHaveLength(3)
  })

  it('reads hidden slides, slide and web links on shapes and text, and video/audio pictures', async () => {
    const linked = (shape: string, link: string) => shape.replace('name="Shape"/>', `name="Shape">${link}</p:cNvPr>`)
    const media = (rId: string, tag: string) => pic(rId).replace('<p:nvPr/>', `<p:nvPr>${tag}</p:nvPr>`)
    const deck = await buildDeck({
      slides: [
        {
          shapes: [
            linked(sp({ text: 'to three', box: [0, 0, 952500, 952500] }), '<a:hlinkClick r:id="rIdS3" action="ppaction://hlinksldjump"/>'),
            sp({ box: [0, 0, 952500, 952500], body: '<a:bodyPr/><a:p><a:r><a:rPr><a:hlinkClick r:id="rIdWeb"/></a:rPr><a:t>site</a:t></a:r></a:p>' }),
            media('rIdImg', '<a:videoFile r:link="rIdV"/>'),
            media('rIdImg', '<a:quickTimeFile r:link="rIdV"/>'),
            media('rIdImg', '<a:audioFile r:link="rIdA"/>'),
            media('rIdImg', '<a:wavAudioFile r:embed="rIdA"/>'),
            pic('rIdImg').replace('name="Picture"/>', 'name="Picture"><a:hlinkClick r:id="" action="ppaction://hlinkshowjump?jump=lastslide"/></p:cNvPr>'),
          ].join(''),
          rels: [
            { id: 'rIdS3', type: 'slide', target: 'slide3.xml' },
            { id: 'rIdWeb', type: 'hyperlink', target: 'https://example.com', external: true },
            { id: 'rIdImg', type: 'image', target: '../media/image1.png' },
          ],
        },
        { attrs: ' show="0"' },
        { attrs: ' show="1"' },
      ],
      files: { 'ppt/media/image1.png': PNG_BYTES },
    })
    const presentation = await parsePresentation(deck)
    expect(presentation.slides.map((slide) => slide.hidden)).toEqual([false, true, false])
    const [toThree, site, ...pictures] = presentation.slides[0].nodes
    expect((toThree as ShapeNode).link).toEqual({ kind: 'slide', index: 2 })
    expect((site as ShapeNode).link).toBeNull()
    expect((site as ShapeNode).text?.paragraphs[0].runs[0].link).toEqual({ kind: 'url', href: 'https://example.com' })
    expect((pictures as PictureNode[]).map((node) => node.media)).toEqual(['video', 'video', 'audio', 'audio', null])
    expect((pictures[4] as PictureNode).link).toEqual({ kind: 'slide', index: 2 })
  })

  it('scales group children into the group box and skips hidden members', async () => {
    const group = (inner: string, xfrm: string, hidden = false) => `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="9" name="G"${hidden ? ' hidden="1"' : ''}/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr>${xfrm}<a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></p:grpSpPr>${inner}</p:grpSp>`
    const child = sp({ text: 'child', box: [95250, 95250, 95250, 95250], spPr: '<a:grpFill/>' })
    const table = `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="3" name="T"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="0" y="0"/><a:ext cx="190500" cy="95250"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblGrid><a:gridCol w="190500"/></a:tblGrid><a:tr h="95250"><a:tc><a:txBody><a:bodyPr/><a:p><a:r><a:t>cell</a:t></a:r></a:p></a:txBody><a:tcPr/></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`
    const deck = await buildDeck({
      slides: [{
        shapes: [
          group(child + group(child, '<a:xfrm><a:off x="0" y="0"/><a:ext cx="95250" cy="95250"/><a:chOff x="0" y="0"/><a:chExt cx="190500" cy="190500"/></a:xfrm>') + table,
            '<a:xfrm rot="60000" flipH="1"><a:off x="952500" y="952500"/><a:ext cx="381000" cy="381000"/><a:chOff x="0" y="0"/><a:chExt cx="190500" cy="190500"/></a:xfrm>'),
          group(child, '<a:xfrm><a:off x="0" y="0"/><a:ext cx="95250" cy="95250"/></a:xfrm>', true),
          group(child, ''),
        ].join(''),
      }],
    })
    const [outer, plain] = (await parsePresentation(deck)).slides[0].nodes as GroupNode[]
    expect(outer.box).toMatchObject({ x: 100, y: 100, w: 40, h: 40, rot: 1, flipH: true })
    const [scaledChild, inner, scaledTable] = outer.children
    expect(scaledChild.box).toMatchObject({ x: 20, y: 20, w: 20, h: 20 })
    expect((scaledChild as ShapeNode).fill).toEqual({ type: 'solid', color: '#abcdef' })
    expect((inner as GroupNode).children[0].box).toMatchObject({ x: 10, y: 10, w: 10, h: 10 })
    expect((scaledTable as TableNode).columns).toEqual([40])
    expect((scaledTable as TableNode).rows[0].heightPx).toBe(20)
    expect(plain.box).toMatchObject({ x: 0, y: 0, w: 0, h: 0 })
    expect(plain.children[0].box).toMatchObject({ x: 10, y: 10 })
  })

  it('reads speaker notes, skipping the slide image and header placeholders', async () => {
    const deck = await buildDeck({
      slides: [
        { notes: sp({ ph: '<p:ph type="sldImg"/>', text: 'image' }) + sp({ ph: '<p:ph type="body"/>', body: '<a:bodyPr/><a:p><a:r><a:t>Line one</a:t></a:r></a:p><a:p/><a:p><a:r><a:t>Line two</a:t></a:r></a:p>' }) + sp({ ph: '<p:ph type="sldNum"/>', text: '3' }) },
        { notes: '' },
        {},
      ],
    })
    const slides = (await parsePresentation(deck)).slides
    expect(slides.map((slide) => slide.notes)).toEqual(['Line one\nLine two', null, null])
  })
})

describe('graphic frames', () => {
  const frame = (uri: string, data: string, xfrm = '<p:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="952500"/></p:xfrm>') => `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="3" name="F"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>${xfrm}<a:graphic><a:graphicData uri="${uri}">${data}</a:graphicData></a:graphic></p:graphicFrame>`

  it('reads charts from their chart parts', async () => {
    const chartXml = `<c:chartSpace ${NS}><c:chart><c:plotArea><c:pieChart><c:ser><c:val><c:numRef><c:numCache><c:pt idx="0"><c:v>1</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:pieChart></c:plotArea></c:chart></c:chartSpace>`
    const deck = await buildDeck({
      slides: [{
        shapes: frame('http://schemas.openxmlformats.org/drawingml/2006/chart', '<c:chart r:id="rIdC"/>') + frame('http://schemas.openxmlformats.org/drawingml/2006/chart', '<c:chart r:id="rIdNone"/>') + frame('http://schemas.openxmlformats.org/drawingml/2006/chart', '<c:chart/>'),
        rels: [{ id: 'rIdC', type: 'chart', target: '../charts/chart1.xml' }, { id: 'rIdNone', type: 'chart', target: '../charts/none.xml' }],
      }],
      files: { 'ppt/charts/chart1.xml': chartXml },
    })
    const nodes = (await parsePresentation(deck)).slides[0].nodes
    expect(nodes.map((node) => (node.kind === 'chart' ? node.chart?.type ?? null : node.kind))).toEqual(['pie', null, null])
  })

  it('draws SmartArt from its pre-rendered drawing part', async () => {
    const drawing = `<dsp:drawing ${NS}><dsp:spTree><dsp:nvGrpSpPr/><dsp:grpSpPr/><dsp:sp><dsp:nvSpPr><dsp:cNvPr id="1" name=""/><dsp:cNvSpPr/></dsp:nvSpPr><dsp:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="952500"/></a:xfrm><a:prstGeom prst="rect"/><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></dsp:spPr><dsp:txBody><a:bodyPr/><a:p><a:r><a:t>node</a:t></a:r></a:p></dsp:txBody><dsp:txXfrm><a:off x="95250" y="95250"/><a:ext cx="476250" cy="476250"/></dsp:txXfrm></dsp:sp></dsp:spTree></dsp:drawing>`
    const data = `<dgm:dataModel ${NS}><dgm:extLst><a:ext><dsp:dataModelExt relId="rIdD"/></a:ext></dgm:extLst></dgm:dataModel>`
    const smartArt = frame('http://schemas.openxmlformats.org/drawingml/2006/diagram', '<dgm:relIds r:dm="rIdData"/>')
    const deck = await buildDeck({
      slides: [
        { shapes: smartArt, rels: [{ id: 'rIdData', type: 'diagramData', target: '../diagrams/data1.xml' }, { id: 'rIdD', type: 'diagramDrawing', target: '../diagrams/drawing1.xml' }] },
        { shapes: smartArt, rels: [{ id: 'rIdX', type: 'diagramDrawing', target: '../diagrams/drawing1.xml' }] },
        { shapes: smartArt },
      ],
      files: { 'ppt/diagrams/data1.xml': data, 'ppt/diagrams/drawing1.xml': drawing },
    })
    const [first, second, third] = (await parsePresentation(deck)).slides
    const group = first.nodes[0] as GroupNode
    expect(group.kind).toBe('group')
    expect((group.children[0] as ShapeNode).textBox).toMatchObject({ x: 10, y: 10, w: 50, h: 50 })
    expect(second.nodes).toHaveLength(1)
    expect(third.nodes).toHaveLength(0)
  })

  it('shows OLE objects through their preview picture or legacy VML image', async () => {
    const ole = `<p:oleObj spid="_x0000_s1"><p:pic><p:nvPicPr><p:cNvPr id="0" name=""/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rIdImg"/></p:blipFill><p:spPr/></p:pic></p:oleObj>`
    const legacy = '<p:oleObj spid="_x0000_s1"/>'
    const vml = '<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"><v:shape id="_x0000_s1"><v:imagedata o:relid="rId1"/></v:shape></xml>'
    const vmlRels = relsXml([{ id: 'rId1', type: 'image', target: '../media/image1.png' }])
    const uri = 'http://schemas.openxmlformats.org/presentationml/2006/ole'
    const deck = await buildDeck({
      slides: [
        { shapes: frame(uri, ole), rels: [{ id: 'rIdImg', type: 'image', target: '../media/image1.png' }] },
        { shapes: frame(uri, legacy), rels: [{ id: 'rIdV', type: 'vmlDrawing', target: '../drawings/vmlDrawing1.vml' }] },
        { shapes: frame(uri, '<p:oleObj spid="_x0000_s9"/>') + frame(uri, '<p:oleObj/>') + frame(uri, legacy, ''), rels: [{ id: 'rIdV', type: 'vmlDrawing', target: '../drawings/vmlDrawing1.vml' }] },
        { shapes: frame(uri, legacy), rels: [{ id: 'rIdV', type: 'vmlDrawing', target: '../drawings/missing.vml' }] },
      ],
      files: { 'ppt/media/image1.png': PNG_BYTES, 'ppt/drawings/vmlDrawing1.vml': vml, 'ppt/drawings/_rels/vmlDrawing1.vml.rels': vmlRels },
    })
    const slides = (await parsePresentation(deck)).slides
    expect((slides[0].nodes[0] as PictureNode).box).toMatchObject({ w: 100, h: 100 })
    expect((slides[0].nodes[0] as PictureNode).image.src).not.toBeNull()
    expect((slides[1].nodes[0] as PictureNode).image.mediaPath).toBe('ppt/media/image1.png')
    expect(slides[2].nodes).toHaveLength(0)
    expect(slides[3].nodes).toHaveLength(0)
  })

  it('reads tables with style parts, cell overrides and spans', async () => {
    const tableStyles = `<a:tblStyleLst ${NS} def="{CUSTOM}"><a:tblStyle styleId="{CUSTOM}">
      <a:wholeTbl><a:tcTxStyle><a:schemeClr val="dk1"/></a:tcTxStyle><a:tcStyle><a:tcBdr><a:insideH><a:ln w="9525"><a:solidFill><a:srgbClr val="111111"/></a:solidFill></a:ln></a:insideH><a:left><a:lnRef idx="1"><a:srgbClr val="222222"/></a:lnRef></a:left></a:tcBdr><a:fill><a:solidFill><a:srgbClr val="EEEEEE"/></a:solidFill></a:fill></a:tcStyle></a:wholeTbl>
      <a:band1H><a:tcStyle><a:fillRef idx="1"><a:srgbClr val="DDDDDD"/></a:fillRef></a:tcStyle></a:band1H>
      <a:band2V><a:tcStyle><a:fill><a:solidFill><a:srgbClr val="CCCCCC"/></a:solidFill></a:fill></a:tcStyle></a:band2V>
      <a:firstRow><a:tcTxStyle b="on"><a:srgbClr val="FFFFFF"/></a:tcTxStyle><a:tcStyle><a:fill><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:fill></a:tcStyle></a:firstRow>
      <a:lastRow><a:tcTxStyle b="off"/></a:lastRow><a:firstCol/><a:lastCol/>
    </a:tblStyle></a:tblStyleLst>`
    const cell = (text: string, tcPr = '<a:tcPr/>', attrs = '') => `<a:tc${attrs}><a:txBody><a:bodyPr/><a:p><a:r><a:t>${text}</a:t></a:r></a:p></a:txBody>${tcPr}</a:tc>`
    const tbl = (tblPr: string, rows: string) => `<a:tbl>${tblPr}<a:tblGrid><a:gridCol w="952500"/><a:gridCol w="952500"/></a:tblGrid>${rows}</a:tbl>`
    const uri = 'http://schemas.openxmlformats.org/drawingml/2006/table'
    const deck = await buildDeck({
      tableStyles,
      slides: [{
        shapes: [
          frame(uri, tbl('<a:tblPr firstRow="1" bandRow="1" bandCol="1" lastRow="true" firstCol="1" lastCol="1"/>', [
            `<a:tr h="95250">${cell('H1', '<a:tcPr/>', ' gridSpan="2"')}${cell('', '<a:tcPr/>', ' hMerge="1"')}</a:tr>`,
            `<a:tr h="95250">${cell('A', '<a:tcPr marL="0" anchor="ctr"><a:lnB><a:noFill/></a:lnB><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></a:tcPr>', ' rowSpan="2"')}${cell('B', '<a:tcPr anchor="b"/>')}</a:tr>`,
            `<a:tr h="95250">${cell('', '<a:tcPr/>', ' vMerge="1"')}<a:tc><a:tcPr/></a:tc></a:tr>`,
          ].join(''))),
          frame(uri, tbl('<a:tblPr><a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId></a:tblPr>', `<a:tr h="95250">${cell('x')}${cell('y')}</a:tr>`)),
          frame(uri, tbl('<a:tblPr><a:tableStyleId>{UNKNOWN}</a:tableStyleId></a:tblPr>', `<a:tr>${cell('z')}</a:tr>`)),
          frame(uri, '<a:tbl><a:tblGrid/></a:tbl>'),
          frame(uri, ''),
          frame(uri, '', ''),
        ].join(''),
      }],
    })
    const nodes = (await parsePresentation(deck)).slides[0].nodes as TableNode[]
    expect(nodes).toHaveLength(3)
    const [styled, medium, fallback] = nodes
    expect(styled.columns).toEqual([100, 100])
    const [header, merged] = styled.rows[0].cells
    expect(header).toMatchObject({ colSpan: 2, fill: { type: 'solid', color: '#000000' } })
    expect(header.text?.paragraphs[0].runs[0]).toMatchObject({ bold: true, color: '#ffffff' })
    expect(merged.merged).toBe(true)
    const [a, b] = styled.rows[1].cells
    expect(a).toMatchObject({ rowSpan: 2, fill: { type: 'solid', color: '#abcdef' }, borders: { bottom: null } })
    expect(a.text).toMatchObject({ anchor: 'middle', insets: { l: 0 } })
    expect(a.borders.left).toMatchObject({ color: '#222222' })
    expect(a.borders.top).toMatchObject({ color: '#111111' })
    expect(b.text?.anchor).toBe('bottom')
    expect(styled.rows[2].cells[0].merged).toBe(true)
    expect(styled.rows[2].cells[1].text).toBeNull()
    expect(styled.rows[2].cells[1].text?.paragraphs[0].runs[0].bold).toBeUndefined()
    expect(medium.rows[0].cells[0].fill).toMatchObject({ type: 'solid' })
    expect(medium.rows[0].cells[0].borders.top).toMatchObject({ color: '#ffffff' })
    expect(fallback.rows[0].heightPx).toBe(0)
  })
})

describe('media', () => {
  it('loads each media part once, decompressing .emz/.wmz parts and skipping formats a browser cannot show', async () => {
    const deck = await buildDeck({
      slides: [{
        shapes: [pic('r1'), pic('r1'), pic('r2'), pic('r3'), pic('r4'), pic('r5'), pic('r6'), pic('r7'), pic('r8'), pic('r9')].join(''),
        rels: [
          { id: 'r1', type: 'image', target: '../media/a.png' },
          { id: 'r2', type: 'image', target: '../media/b.jpeg' },
          { id: 'r3', type: 'image', target: '../media/c.emf' },
          { id: 'r4', type: 'image', target: '../media/d.emz' },
          { id: 'r5', type: 'image', target: '../media/e.tiff' },
          { id: 'r6', type: 'image', target: '../media/f.wmz' },
          { id: 'r7', type: 'image', target: '../media/g.emf' },
          { id: 'r8', type: 'image', target: '../media/h.wmz' },
          { id: 'r9', type: 'image', target: '../media/i.bin' },
        ],
      }],
      files: {
        'ppt/media/a.png': PNG_BYTES,
        'ppt/media/b.jpeg': Uint8Array.from([1, 2, 3]),
        'ppt/media/c.emf': new Uint8Array(64),
        'ppt/media/g.emf': emf(),
        'ppt/media/h.wmz': gzipSync(wmf()),
        'ppt/media/i.bin': Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x42, 0x4d]),
        'ppt/media/d.emz': gzipSync(PNG_BYTES),
        'ppt/media/e.tiff': Uint8Array.from([0x49, 0x49, 0x2a, 0]),
        'ppt/media/f.wmz': Uint8Array.from([1, 2, 3]),
      },
    })
    const presentation = await parsePresentation(deck)
    const sources = (presentation.slides[0].nodes as PictureNode[]).map((node) => node.image.src)
    expect(sources[0]).toBe(sources[1])
    // b.jpeg: typed by extension; c.emf: not actually a metafile; d.emz: gzip-compressed;
    // e.tiff: not a browser format; f.wmz: not valid gzip.
    // g.emf / h.wmz: real metafiles, converted to SVG; i.bin: recognized as JPEG by its signature.
    expect(sources.slice(2).map((source) => source !== null)).toEqual([true, false, true, false, false, true, true, true])
    expect(presentation.objectUrls.length).toBeGreaterThan(0)
  })

  it('falls back to data URLs without object URL support and skips gzip without a decompressor', async () => {
    const createObjectURL = URL.createObjectURL
    const decompression = globalThis.DecompressionStream
    // @ts-expect-error - simulating an environment without object URLs
    URL.createObjectURL = undefined
    // @ts-expect-error - simulating an environment without DecompressionStream
    globalThis.DecompressionStream = undefined
    try {
      const deck = await buildDeck({
        slides: [{ shapes: pic('r1') + pic('r2') + pic('r3') + pic('r4'), rels: [{ id: 'r1', type: 'image', target: '../media/a.gif' }, { id: 'r2', type: 'image', target: '../media/b.emz' }, { id: 'r3', type: 'image', target: '../media/c.svg' }, { id: 'r4', type: 'image', target: '../media/d.emf' }] }],
        files: { 'ppt/media/a.gif': Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), 'ppt/media/b.emz': gzipSync(PNG_BYTES), 'ppt/media/c.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>', 'ppt/media/d.emf': emf() },
      })
      const presentation = await parsePresentation(deck)
      const sources = (presentation.slides[0].nodes as PictureNode[]).map((node) => node.image.src)
      expect(sources[0]).toMatch(/^data:image\/gif;base64,/)
      expect(sources[1]).toBeNull()
      expect(sources[2]).toMatch(/^data:image\/svg\+xml;base64,/)
      expect(sources[3]).toMatch(/^data:image\/svg\+xml;base64,/)
      expect(presentation.objectUrls).toEqual([])
    } finally {
      URL.createObjectURL = createObjectURL
      globalThis.DecompressionStream = decompression
    }
  })

  it('treats a media part that fails to read as unavailable', async () => {
    const deck = await buildDeck({
      slides: [{ shapes: pic('r1') + pic('r2'), rels: [{ id: 'r1', type: 'image', target: '../media/a.png' }, { id: 'r2', type: 'image', target: '../media/b.png' }] }],
      files: { 'ppt/media/a.png': PNG_BYTES, 'ppt/media/b.png': Uint8Array.from([0x42, 0x4d]) },
    })
    const JSZip = (await import('jszip')).default
    const original = JSZip.prototype.file
    const spy = vi.spyOn(JSZip.prototype, 'file').mockImplementation(function (this: InstanceType<typeof JSZip>, ...args: unknown[]) {
      const result = (original as (...a: unknown[]) => unknown).apply(this, args)
      if (typeof args[0] === 'string' && args[0].endsWith('a.png') && result && typeof result === 'object') {
        return { ...(result as object), async: () => Promise.reject(new Error('read failed')) }
      }
      return result
    } as typeof original)
    const presentation = await parsePresentation(deck)
    spy.mockRestore()
    const sources = (presentation.slides[0].nodes as PictureNode[]).map((node) => node.image.src)
    expect(sources[0]).toBeNull()
    expect(sources[1]).not.toBeNull()
  })
})
