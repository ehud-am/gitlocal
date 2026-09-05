import { useEffect, useMemo, useState } from 'react'

interface Props {
  /** Base64-encoded .pptx (OOXML zip) bytes, as delivered by the server. */
  content: string
}

interface PptxTextRun {
  text: string
  bold: boolean
  italic: boolean
  fontSizePt: number | null
  color: string | null
}

type PptxShape =
  | { kind: 'text'; xEmu: number; yEmu: number; widthEmu: number; heightEmu: number; runs: PptxTextRun[] }
  | { kind: 'image'; xEmu: number; yEmu: number; widthEmu: number; heightEmu: number; imageDataUri: string | null }

interface PptxSlide {
  index: number
  shapes: PptxShape[]
  backgroundFill: string | null
  notes: string | null
}

interface PptxPresentation {
  slides: PptxSlide[]
  slideWidthEmu: number
  slideHeightEmu: number
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return bytes
}

function extToMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    bmp: 'image/bmp', webp: 'image/webp', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf',
  }
  return map[ext] ?? 'application/octet-stream'
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

// A run's text lives at a:r > a:t; formatting lives on the sibling a:rPr.
function parseRuns(paragraphs: unknown): PptxTextRun[] {
  const runs: PptxTextRun[] = []
  for (const paragraph of asArray(paragraphs as Record<string, unknown>[] | Record<string, unknown>)) {
    for (const run of asArray((paragraph as Record<string, unknown>)['a:r'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const runRecord = run as Record<string, unknown>
      const text = runRecord['a:t']
      if (typeof text !== 'string' || text.length === 0) continue
      const rPr = (runRecord['a:rPr'] ?? {}) as Record<string, unknown>
      const bold = rPr['@_b'] === '1'
      const italic = rPr['@_i'] === '1'
      const szRaw = rPr['@_sz']
      const fontSizePt = typeof szRaw === 'string' ? Number(szRaw) / 100 : null
      const solidFill = rPr['a:solidFill'] as Record<string, unknown> | undefined
      const srgbClr = solidFill?.['a:srgbClr'] as Record<string, unknown> | undefined
      const colorVal = srgbClr?.['@_val']
      const color = typeof colorVal === 'string' ? `#${colorVal}` : null
      runs.push({ text, bold, italic, fontSizePt: fontSizePt !== null && Number.isFinite(fontSizePt) ? fontSizePt : null, color })
    }
  }
  return runs
}

function parseXfrm(spPr: Record<string, unknown> | undefined): { xEmu: number; yEmu: number; widthEmu: number; heightEmu: number } {
  const xfrm = spPr?.['a:xfrm'] as Record<string, unknown> | undefined
  const off = xfrm?.['a:off'] as Record<string, unknown> | undefined
  const ext = xfrm?.['a:ext'] as Record<string, unknown> | undefined
  const toNumber = (value: unknown): number => (typeof value === 'string' && Number.isFinite(Number(value)) ? Number(value) : 0)
  return {
    xEmu: toNumber(off?.['@_x']),
    yEmu: toNumber(off?.['@_y']),
    widthEmu: toNumber(ext?.['@_cx']),
    heightEmu: toNumber(ext?.['@_cy']),
  }
}

// Relationship targets are relative to the referencing part's own directory (e.g. ppt/slides/).
function resolveRelativePath(basePath: string, relativeTarget: string): string {
  const baseDir = basePath.slice(0, basePath.lastIndexOf('/'))
  const parts = `${baseDir}/${relativeTarget}`.split('/')
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '..') resolved.pop()
    else if (part !== '.' && part !== '') resolved.push(part)
  }
  return resolved.join('/')
}

async function resolveImageDataUri(zip: import('jszip'), relTarget: string, slidePath: string): Promise<string | null> {
  try {
    const mediaPath = resolveRelativePath(slidePath, relTarget)
    const file = zip.file(mediaPath)
    if (!file) return null
    const base64 = await file.async('base64')
    return `data:${extToMime(mediaPath)};base64,${base64}`
  } catch {
    return null
  }
}

async function parseSlide(
  zip: import('jszip'),
  parser: { parse: (xml: string) => unknown },
  slidePath: string,
  slideIndex: number,
): Promise<PptxSlide> {
  const slideXml = await zip.file(slidePath)?.async('text')
  if (slideXml === undefined) throw new Error(`Missing slide part: ${slidePath}`)
  const parsed = parser.parse(slideXml) as Record<string, unknown>
  const sld = parsed['p:sld'] as Record<string, unknown> | undefined
  if (!sld) throw new Error(`Malformed slide XML: ${slidePath}`)
  const cSld = sld['p:cSld'] as Record<string, unknown> | undefined
  const spTree = cSld?.['p:spTree'] as Record<string, unknown> | undefined

  const bg = cSld?.['p:bg'] as Record<string, unknown> | undefined
  const bgPr = bg?.['p:bgPr'] as Record<string, unknown> | undefined
  const bgSolidFill = bgPr?.['a:solidFill'] as Record<string, unknown> | undefined
  const bgSrgbClr = bgSolidFill?.['a:srgbClr'] as Record<string, unknown> | undefined
  const bgVal = bgSrgbClr?.['@_val']
  const backgroundFill = typeof bgVal === 'string' ? `#${bgVal}` : null

  const shapes: PptxShape[] = []

  for (const sp of asArray(spTree?.['p:sp'] as Record<string, unknown>[] | Record<string, unknown>)) {
    const spPr = sp['p:spPr'] as Record<string, unknown> | undefined
    const { xEmu, yEmu, widthEmu, heightEmu } = parseXfrm(spPr)
    const txBody = sp['p:txBody'] as Record<string, unknown> | undefined
    const runs = txBody ? parseRuns(txBody['a:p']) : []
    if (runs.length > 0) {
      shapes.push({ kind: 'text', xEmu, yEmu, widthEmu, heightEmu, runs })
    }
  }

  // Read the slide's relationship file up front so p:pic > a:blip r:embed can resolve to media.
  const relsPath = `${slidePath.slice(0, slidePath.lastIndexOf('/'))}/_rels/${slidePath.slice(slidePath.lastIndexOf('/') + 1)}.rels`
  const relsXml = await zip.file(relsPath)?.async('text')
  const relTargets = new Map<string, string>()
  let notesTarget: string | null = null
  if (relsXml) {
    const relsParsed = parser.parse(relsXml) as Record<string, unknown>
    const relationships = relsParsed['Relationships'] as Record<string, unknown> | undefined
    for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const id = rel['@_Id']
      const target = rel['@_Target']
      const type = rel['@_Type']
      if (typeof id === 'string' && typeof target === 'string') {
        if (typeof type === 'string' && type.endsWith('/notesSlide')) {
          notesTarget = target
        } else {
          relTargets.set(id, target)
        }
      }
    }
  }

  for (const pic of asArray(spTree?.['p:pic'] as Record<string, unknown>[] | Record<string, unknown>)) {
    const spPr = pic['p:spPr'] as Record<string, unknown> | undefined
    const { xEmu, yEmu, widthEmu, heightEmu } = parseXfrm(spPr)
    const blipFill = pic['p:blipFill'] as Record<string, unknown> | undefined
    const blip = blipFill?.['a:blip'] as Record<string, unknown> | undefined
    const embedId = blip?.['@_r:embed']
    const target = typeof embedId === 'string' ? relTargets.get(embedId) : undefined
    const imageDataUri = target ? await resolveImageDataUri(zip, target, slidePath) : null
    shapes.push({ kind: 'image', xEmu, yEmu, widthEmu, heightEmu, imageDataUri })
  }

  let notes: string | null = null
  if (notesTarget) {
    const notesPath = resolveRelativePath(slidePath, notesTarget)
    const notesXml = await zip.file(notesPath)?.async('text')
    if (notesXml) {
      const notesParsed = parser.parse(notesXml) as Record<string, unknown>
      const notesRoot = notesParsed['p:notes'] as Record<string, unknown> | undefined
      const notesSpTree = (notesRoot?.['p:cSld'] as Record<string, unknown> | undefined)?.['p:spTree'] as Record<string, unknown> | undefined
      const notesRuns: string[] = []
      for (const sp of asArray(notesSpTree?.['p:sp'] as Record<string, unknown>[] | Record<string, unknown>)) {
        const txBody = sp['p:txBody'] as Record<string, unknown> | undefined
        if (!txBody) continue
        for (const run of parseRuns(txBody['a:p'])) notesRuns.push(run.text)
      }
      const joined = notesRuns.join(' ').trim()
      notes = joined.length > 0 ? joined : null
    }
  }

  return { index: slideIndex, shapes, backgroundFill, notes }
}

async function parsePresentation(bytes: Uint8Array): Promise<PptxPresentation> {
  const [{ default: JSZip }, { XMLParser }] = await Promise.all([
    import('jszip'),
    import('fast-xml-parser'),
  ])

  const zip = await JSZip.loadAsync(bytes)
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

  const presentationXml = await zip.file('ppt/presentation.xml')?.async('text')
  if (presentationXml === undefined) throw new Error('Missing ppt/presentation.xml')
  const presentationParsed = parser.parse(presentationXml) as Record<string, unknown>
  const presentationRoot = presentationParsed['p:presentation'] as Record<string, unknown> | undefined
  if (!presentationRoot) throw new Error('Malformed presentation.xml')
  const sldSz = presentationRoot['p:sldSz'] as Record<string, unknown> | undefined
  const slideWidthEmu = Number(sldSz?.['@_cx']) || 9144000
  const slideHeightEmu = Number(sldSz?.['@_cy']) || 6858000

  const sldIdLst = presentationRoot['p:sldIdLst'] as Record<string, unknown> | undefined
  const sldIds = asArray(sldIdLst?.['p:sldId'] as Record<string, unknown>[] | Record<string, unknown>)
  const relIds = sldIds.map((sldId) => sldId['@_r:id']).filter((id): id is string => typeof id === 'string')

  const relsXml = await zip.file('ppt/_rels/presentation.xml.rels')?.async('text')
  const relTargets = new Map<string, string>()
  if (relsXml) {
    const relsParsed = parser.parse(relsXml) as Record<string, unknown>
    const relationships = relsParsed['Relationships'] as Record<string, unknown> | undefined
    for (const rel of asArray(relationships?.['Relationship'] as Record<string, unknown>[] | Record<string, unknown>)) {
      const id = rel['@_Id']
      const target = rel['@_Target']
      if (typeof id === 'string' && typeof target === 'string') relTargets.set(id, target)
    }
  }

  const slidePaths = relIds
    .map((id) => relTargets.get(id))
    .filter((target): target is string => typeof target === 'string')
    .map((target) => `ppt/${target}`)

  const slides: PptxSlide[] = []
  // Parse one slide at a time, yielding to the event loop, so a large deck doesn't block the UI thread.
  for (let index = 0; index < slidePaths.length; index += 1) {
    // eslint-disable-next-line no-await-in-loop -- intentional: sequential + yielding for large decks
    const slide = await parseSlide(zip, parser, slidePaths[index], index)
    slides.push(slide)
    if (index % 3 === 2) {
      // eslint-disable-next-line no-await-in-loop -- yield point, not a data dependency
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return { slides, slideWidthEmu, slideHeightEmu }
}

const EMU_PER_PX = 9525 // OOXML English Metric Units per CSS pixel at 96 DPI

export default function PptxViewer({ content }: Props) {
  const [presentation, setPresentation] = useState<PptxPresentation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [slideIndex, setSlideIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    setPresentation(null)
    setError(null)
    setSlideIndex(0)

    async function run(): Promise<void> {
      try {
        const bytes = base64ToUint8Array(content)
        const parsed = await parsePresentation(bytes)
        if (cancelled) return
        setPresentation(parsed)
      } catch {
        if (cancelled) return
        setError("This file can't be previewed as a PowerPoint presentation.")
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [content])

  const slide = useMemo(() => presentation?.slides[slideIndex] ?? null, [presentation, slideIndex])

  if (error) {
    return <p className="binary-placeholder" role="alert">{error}</p>
  }

  if (presentation === null) {
    return <div className="content-skeleton" aria-label="loading presentation" />
  }

  if (presentation.slides.length === 0) {
    return <p className="binary-placeholder">This presentation has no slides.</p>
  }

  const canvasWidthPx = presentation.slideWidthEmu / EMU_PER_PX
  const canvasHeightPx = presentation.slideHeightEmu / EMU_PER_PX

  return (
    <div className="pptx-viewer">
      <div className="pptx-viewer-toolbar">
        <button
          type="button"
          className="pptx-viewer-nav-button"
          aria-label="Previous slide"
          disabled={slideIndex === 0}
          onClick={() => setSlideIndex((index) => Math.max(0, index - 1))}
        >
          ‹ Previous
        </button>
        <span className="pptx-viewer-slide-counter">
          Slide {slideIndex + 1} of {presentation.slides.length}
        </span>
        <button
          type="button"
          className="pptx-viewer-nav-button"
          aria-label="Next slide"
          disabled={slideIndex === presentation.slides.length - 1}
          onClick={() => setSlideIndex((index) => Math.min(presentation.slides.length - 1, index + 1))}
        >
          Next ›
        </button>
      </div>
      <div className="pptx-viewer-body">
        <div
          className="pptx-viewer-slide"
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
            backgroundColor: slide?.backgroundFill ?? '#ffffff',
          }}
        >
          {slide?.shapes.map((shape, shapeIndex) => (
            <div
              key={shapeIndex}
              className="pptx-viewer-shape"
              style={{
                position: 'absolute',
                left: `${shape.xEmu / EMU_PER_PX}px`,
                top: `${shape.yEmu / EMU_PER_PX}px`,
                width: `${shape.widthEmu / EMU_PER_PX}px`,
                height: `${shape.heightEmu / EMU_PER_PX}px`,
              }}
            >
              {shape.kind === 'text' ? (
                <p>
                  {shape.runs.map((run, runIndex) => (
                    <span
                      key={runIndex}
                      style={{
                        fontWeight: run.bold ? 'bold' : undefined,
                        fontStyle: run.italic ? 'italic' : undefined,
                        fontSize: run.fontSizePt ? `${run.fontSizePt}pt` : undefined,
                        color: run.color ?? undefined,
                      }}
                    >
                      {run.text}
                    </span>
                  ))}
                </p>
              ) : shape.imageDataUri ? (
                <img src={shape.imageDataUri} alt="" className="pptx-viewer-image" />
              ) : (
                <div className="pptx-viewer-image-placeholder">Image not available in this preview</div>
              )}
            </div>
          ))}
        </div>
        {slide?.notes ? (
          <div className="pptx-viewer-notes" aria-label="Speaker notes">
            <h4>Notes</h4>
            <p>{slide.notes}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
