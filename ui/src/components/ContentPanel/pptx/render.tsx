import { createContext, useContext, useId, useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { ChartView } from './chart-view'
import { fillStyle, imageCropStyle } from './fill-css'
import { geometryPaths, type GeometryPath } from './geometry'
import type { Box, Geometry, GroupNode, Line, LineEnd, Link, Paragraph, PictureNode, ShapeNode, SlideModel, SlideNode, TableNode, TabStop, TextBody, TextRun } from './model'

const px = (value: number) => `${Math.round(value * 1000) / 1000}px`

function boxStyle(box: Box): CSSProperties {
  return {
    position: 'absolute',
    left: px(box.x),
    top: px(box.y),
    width: px(box.w),
    height: px(box.h),
    transform: box.rot ? `rotate(${box.rot}deg)` : undefined,
  }
}

function flipTransform(box: Box): string | undefined {
  if (!box.flipH && !box.flipV) return undefined
  return `scale(${box.flipH ? -1 : 1}, ${box.flipV ? -1 : 1})`
}

function isPlainRect(geometry: Geometry): boolean {
  return geometry.kind === 'preset' && geometry.name === 'rect'
}

function clipPathFor(geometry: Geometry, paths: GeometryPath[]): string | undefined {
  if (isPlainRect(geometry)) return undefined
  const d = paths.filter((path) => path.fill).map((path) => path.d).join(' ')
  return d ? `path(evenodd, "${d}")` : undefined
}

// ---- Links ----

// Called with a slide index when a link to another slide of the deck is followed.
export const SlideJumpContext = createContext<(index: number) => void>(() => undefined)

function linkLabel(link: Link): string {
  return link.kind === 'url' ? link.href : `Go to slide ${link.index + 1}`
}

function LinkAnchor({ link, className, style, label, children }: { link: Link; className: string; style?: CSSProperties; label?: string; children?: ReactNode }) {
  const jump = useContext(SlideJumpContext)
  if (link.kind === 'url') {
    return <a className={className} style={style} href={link.href} target="_blank" rel="noopener noreferrer" title={link.href} aria-label={label}>{children}</a>
  }
  return (
    <a
      className={className}
      style={style}
      href={`#slide-${link.index + 1}`}
      title={linkLabel(link)}
      aria-label={label}
      onClick={(event) => {
        event.preventDefault()
        jump(link.index)
      }}
    >
      {children}
    </a>
  )
}

// A link covering a whole shape or picture; PowerPoint makes the entire object clickable.
function ShapeLink({ link }: { link: Link | null }) {
  if (!link) return null
  return <LinkAnchor link={link} className="pptx-viewer-shape-link" style={{ position: 'absolute', inset: 0 }} label={linkLabel(link)} />
}

// ---- Text ----

function RunView({ run }: { run: TextRun }) {
  if (run.isBreak) return <br />
  const decorations = [run.underline ? 'underline' : '', run.strike ? 'line-through' : ''].filter(Boolean).join(' ')
  const shifted = run.baseline !== 0
  const style: CSSProperties = {
    fontSize: `${shifted ? run.sizePt * 0.67 : run.sizePt}pt`,
    fontWeight: run.bold ? 700 : 400,
    fontStyle: run.italic ? 'italic' : 'normal',
    color: run.color,
    fontFamily: run.fontFamily,
    textDecoration: decorations || undefined,
    verticalAlign: shifted ? (run.baseline > 0 ? 'super' : 'sub') : undefined,
    textTransform: run.caps === 'all' ? 'uppercase' : undefined,
    fontVariant: run.caps === 'small' ? 'small-caps' : undefined,
    letterSpacing: run.letterSpacingPt ? `${run.letterSpacingPt}pt` : undefined,
    backgroundColor: run.highlight ?? undefined,
  }
  const span = <span className="pptx-viewer-run" style={style}>{run.text}</span>
  return run.link ? <LinkAnchor link={run.link} className="pptx-viewer-link">{span}</LinkAnchor> : span
}

// How far a tab at `x` (px from the paragraph's left edge) advances: to the next custom stop past
// it, or else to the next multiple of the default interval. Right- and center-aligned stops end
// or center the following text (`segmentPx` wide) on the stop; decimal stops are treated as right.
export function tabAdvance(x: number, segmentPx: number, stops: TabStop[], defaultTabPx: number): number {
  const stop = stops.find((candidate) => candidate.posPx > x + 0.5)
  if (!stop) return (Math.floor((x + 0.5) / defaultTabPx) + 1) * defaultTabPx - x
  const shift = stop.align === 'l' ? 0 : stop.align === 'ctr' ? segmentPx / 2 : segmentPx
  return Math.max(0, stop.posPx - x - shift)
}

type ParagraphItem = { kind: 'run'; run: TextRun } | { kind: 'tab' }

// Splits runs at tab characters, which are laid out as measured gaps instead of CSS tab-size.
function paragraphItems(runs: TextRun[]): ParagraphItem[] {
  return runs.flatMap((run): ParagraphItem[] => {
    if (run.isBreak || !run.text.includes('\t')) return [{ kind: 'run', run }]
    return run.text.split('\t').flatMap((text, index): ParagraphItem[] => {
      const piece: ParagraphItem[] = text ? [{ kind: 'run', run: { ...run, text } }] : []
      return index === 0 ? piece : [{ kind: 'tab' }, ...piece]
    })
  })
}

// Sizes each tab gap in order, since every gap moves the text after it. offsetLeft is in the
// slide's own (unscaled) pixels, the same space as the tab stops.
function useTabLayout(paragraph: Paragraph, hasTabs: boolean) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || !hasTabs) return
    const measure = () => {
      const tabs = Array.from(element.querySelectorAll<HTMLElement>('[data-pptx-tab]'))
      const end = element.querySelector<HTMLElement>('[data-pptx-tab-end]')
      for (const tab of tabs) tab.style.width = '0px'
      tabs.forEach((tab, index) => {
        const next = tabs[index + 1] ?? end
        const x = tab.offsetLeft
        // The text up to the next tab (or the paragraph end); a marker left of the tab has wrapped.
        const segment = next ? Math.max(0, next.offsetLeft - x) : 0
        tab.style.width = `${tabAdvance(x, segment, paragraph.tabStops, paragraph.defaultTabPx)}px`
      })
    }
    measure()
    // Text widths change once the deck's web fonts finish loading.
    let active = true
    void document.fonts?.ready.then(() => {
      if (active) measure()
    })
    return () => {
      active = false
    }
  }, [paragraph, hasTabs])
  return ref
}

function ParagraphView({ paragraph, first }: { paragraph: Paragraph; first: boolean }) {
  const firstRun = paragraph.runs.find((run) => !run.isBreak)
  const hanging = paragraph.indentPx < 0
  const lineHeight = paragraph.lineSpacing.kind === 'pct'
    ? String(Math.round(paragraph.lineSpacing.value * 1.2 * 1000) / 1000)
    : `${paragraph.lineSpacing.value}pt`
  const style: CSSProperties = {
    textAlign: paragraph.align,
    paddingLeft: px(paragraph.marginLeftPx),
    textIndent: px(paragraph.indentPx),
    lineHeight,
    // PowerPoint doesn't add "space before" above a text box's first paragraph.
    marginTop: first ? 0 : `${paragraph.spaceBeforePt}pt`,
    marginBottom: `${paragraph.spaceAfterPt}pt`,
    direction: paragraph.rtl ? 'rtl' : undefined,
  }
  const { bullet } = paragraph
  const items = paragraphItems(paragraph.runs)
  const hasTabs = items.some((item) => item.kind === 'tab')
  const ref = useTabLayout(paragraph, hasTabs)
  return (
    <div className="pptx-viewer-paragraph" style={hasTabs ? { ...style, position: 'relative' } : style} ref={ref}>
      {bullet ? (
        <span
          aria-hidden="true"
          className="pptx-viewer-bullet"
          style={{
            display: 'inline-block',
            textIndent: 0,
            minWidth: hanging ? px(-paragraph.indentPx) : undefined,
            paddingRight: hanging ? undefined : '0.4em',
            fontFamily: bullet.fontFamily ?? firstRun?.fontFamily,
            color: bullet.color ?? firstRun?.color,
            fontSize: `${(firstRun?.sizePt ?? paragraph.baseSizePt) * bullet.sizePct}pt`,
          }}
        >
          {bullet.kind === 'char' ? bullet.char : bullet.text}
        </span>
      ) : null}
      {items.map((item, index) => (item.kind === 'run'
        ? <RunView key={index} run={item.run} />
        : <span key={index} data-pptx-tab="" className="pptx-viewer-tab" style={{ display: 'inline-block', width: px(paragraph.defaultTabPx) }} />))}
      {hasTabs ? <span data-pptx-tab-end="" /> : null}
      {firstRun ? null : <span style={{ fontSize: `${paragraph.baseSizePt}pt` }}>{'​'}</span>}
    </div>
  )
}

// PowerPoint fills columns one after the other within the box's height (CSS column-fill: auto).
// Text that doesn't fit would spill into extra columns beside the box in CSS, where PowerPoint
// lets it run past the bottom instead, so overflowing text falls back to balanced columns.
function TextColumns({ body, children }: { body: TextBody; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = '100%'
    element.style.columnFill = 'auto'
    if (element.scrollWidth > element.clientWidth + 1) {
      element.style.height = 'auto'
      element.style.columnFill = 'balance'
    }
  }, [body])
  return (
    <div ref={ref} className="pptx-viewer-columns" style={{ columnCount: body.columns, columnGap: px(body.columnSpacingPx) }}>
      {children}
    </div>
  )
}

export function TextBodyView({ body, style }: { body: TextBody; style?: CSSProperties }) {
  const justify = body.anchor === 'middle' ? 'center' : body.anchor === 'bottom' ? 'flex-end' : 'flex-start'
  const vertical = body.vertical !== 'horz'
  const paragraphs = body.paragraphs.map((paragraph, index) => <ParagraphView key={index} paragraph={paragraph} first={index === 0} />)
  return (
    <div
      className="pptx-viewer-text"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: justify,
        alignItems: body.anchorCenter ? 'center' : 'stretch',
        padding: `${px(body.insets.t)} ${px(body.insets.r)} ${px(body.insets.b)} ${px(body.insets.l)}`,
        whiteSpace: body.wrap ? 'pre-wrap' : 'pre',
        overflowWrap: 'break-word',
        writingMode: vertical ? 'vertical-rl' : undefined,
        transform: body.vertical === 'vert270' ? 'rotate(180deg)' : undefined,
        ...style,
      }}
    >
      {body.columns > 1 ? <TextColumns body={body}>{paragraphs}</TextColumns> : paragraphs}
    </div>
  )
}

// ---- Outlines ----

function markerShape(end: LineEnd, color: string): ReactNode {
  switch (end.type) {
    case 'oval': return <ellipse cx="5" cy="5" rx="5" ry="5" fill={color} />
    case 'diamond': return <path d="M0 5 L5 0 L10 5 L5 10 Z" fill={color} />
    case 'stealth': return <path d="M0 0 L10 5 L0 10 L3 5 Z" fill={color} />
    case 'arrow': return <path d="M1 1 L9 5 L1 9" fill="none" stroke={color} strokeWidth="1.5" />
    default: return <path d="M0 0 L10 5 L0 10 Z" fill={color} />
  }
}

function Marker({ id, end, line }: { id: string; end: LineEnd; line: Line }) {
  const length = Math.max(end.length * line.widthPx, 6)
  const width = Math.max(end.width * line.widthPx, 6)
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX={end.type === 'oval' || end.type === 'diamond' ? 5 : 9}
      refY="5"
      markerUnits="userSpaceOnUse"
      markerWidth={length}
      markerHeight={width}
      orient="auto-start-reverse"
    >
      {markerShape(end, line.color)}
    </marker>
  )
}

// The gradient line runs through the box center at the DrawingML angle, long enough to span the
// box (the same geometry CSS uses for linear-gradient).
function LineGradient({ id, gradient, box }: { id: string; gradient: NonNullable<Line['gradient']>; box: Box }) {
  const radians = (gradient.angle * Math.PI) / 180
  const dx = Math.cos(radians)
  const dy = Math.sin(radians)
  const half = (Math.abs(box.w * dx) + Math.abs(box.h * dy)) / 2
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={box.w / 2 - dx * half}
      y1={box.h / 2 - dy * half}
      x2={box.w / 2 + dx * half}
      y2={box.h / 2 + dy * half}
    >
      {gradient.stops.map((stop, index) => <stop key={index} offset={stop.offset} stopColor={stop.color} />)}
    </linearGradient>
  )
}

function OutlineView({ paths, line, box }: { paths: GeometryPath[]; line: Line; box: Box }) {
  const id = useId().replace(/:/g, '')
  const stroked = paths.filter((path) => path.stroke)
  if (stroked.length === 0) return null
  return (
    <svg
      className="pptx-viewer-outline"
      width={Math.max(box.w, 1)}
      height={Math.max(box.h, 1)}
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      {line.head || line.tail || line.gradient ? (
        <defs>
          {line.head ? <Marker id={`${id}h`} end={line.head} line={line} /> : null}
          {line.tail ? <Marker id={`${id}t`} end={line.tail} line={line} /> : null}
          {line.gradient ? <LineGradient id={`${id}g`} gradient={line.gradient} box={box} /> : null}
        </defs>
      ) : null}
      {stroked.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill="none"
          stroke={line.gradient ? `url(#${id}g)` : line.color}
          strokeWidth={line.widthPx}
          strokeDasharray={line.dash ?? undefined}
          strokeLinecap={line.cap}
          strokeLinejoin={line.join}
          markerStart={line.head ? `url(#${id}h)` : undefined}
          markerEnd={line.tail ? `url(#${id}t)` : undefined}
        />
      ))}
    </svg>
  )
}

// ---- Nodes ----

function ShapeView({ node }: { node: ShapeNode }) {
  const { box } = node
  const paths = geometryPaths(node.geometry, box.w, box.h)
  const hasFillablePath = paths.some((path) => path.fill)
  const fill = hasFillablePath ? fillStyle(node.fill, box.w, box.h) : null
  const textBox = node.textBox
  return (
    <div className="pptx-viewer-shape" style={{ ...boxStyle(box), filter: node.shadow ?? undefined }}>
      <div style={{ position: 'absolute', inset: 0, transform: flipTransform(box) }}>
        {fill ? (
          <div className="pptx-viewer-fill" style={{ position: 'absolute', inset: 0, ...fill, clipPath: clipPathFor(node.geometry, paths) }} />
        ) : null}
        {node.line ? <OutlineView paths={paths} line={node.line} box={box} /> : null}
      </div>
      {node.text ? (
        <TextBodyView
          body={node.text}
          style={textBox ? { left: px(textBox.x), top: px(textBox.y), width: px(textBox.w), height: px(textBox.h), right: 'auto', bottom: 'auto' } : undefined}
        />
      ) : null}
      <ShapeLink link={node.link} />
    </div>
  )
}

function PictureView({ node }: { node: PictureNode }) {
  const { box, image } = node
  const paths = geometryPaths(node.geometry, box.w, box.h)
  return (
    <div className="pptx-viewer-shape" style={{ ...boxStyle(box), filter: node.shadow ?? undefined }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', transform: flipTransform(box), clipPath: clipPathFor(node.geometry, paths) }}>
        {image.src ? (
          <img src={image.src} alt="" className="pptx-viewer-image" style={imageCropStyle(image, box.w, box.h)} />
        ) : (
          <div className="pptx-viewer-image-placeholder">Image not available in this preview</div>
        )}
      </div>
      {node.line ? <OutlineView paths={paths} line={node.line} box={box} /> : null}
      {node.media ? (
        <span className="pptx-viewer-media-badge" title="Playback isn't available in this preview">
          {node.media === 'video' ? '▶ Video' : '♪ Audio'}
        </span>
      ) : null}
      <ShapeLink link={node.link} />
    </div>
  )
}

function GroupView({ node }: { node: GroupNode }) {
  return (
    <div className="pptx-viewer-group" style={{ ...boxStyle(node.box), transform: [node.box.rot ? `rotate(${node.box.rot}deg)` : '', flipTransform(node.box) ?? ''].join(' ').trim() || undefined }}>
      {node.children.map((childNode, index) => <NodeView key={index} node={childNode} />)}
    </div>
  )
}

function borderCss(line: Line | null): string | undefined {
  if (!line) return undefined
  return `${px(line.widthPx)} ${line.dash ? 'dashed' : 'solid'} ${line.color}`
}

function TableView({ node }: { node: TableNode }) {
  const totalWidth = node.columns.reduce((sum, width) => sum + width, 0)
  return (
    <div className="pptx-viewer-shape" style={{ ...boxStyle(node.box), height: 'auto' }}>
      <table className="pptx-viewer-table" style={{ width: px(totalWidth) }}>
        <colgroup>
          {node.columns.map((width, index) => <col key={index} style={{ width: px(width) }} />)}
        </colgroup>
        <tbody>
          {node.rows.map((row, rowIndex) => (
            <tr key={rowIndex} style={{ height: px(row.heightPx) }}>
              {row.cells.map((cell, cellIndex) => {
                if (cell.merged) return null
                const background = fillStyle(cell.fill, totalWidth, row.heightPx)
                return (
                  <td
                    key={cellIndex}
                    colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    style={{
                      ...background,
                      borderLeft: borderCss(cell.borders.left),
                      borderRight: borderCss(cell.borders.right),
                      borderTop: borderCss(cell.borders.top),
                      borderBottom: borderCss(cell.borders.bottom),
                      verticalAlign: cell.text?.anchor === 'middle' ? 'middle' : cell.text?.anchor === 'bottom' ? 'bottom' : 'top',
                    }}
                  >
                    {cell.text ? (
                      <div style={{ position: 'relative', padding: `${px(cell.text.insets.t)} ${px(cell.text.insets.r)} ${px(cell.text.insets.b)} ${px(cell.text.insets.l)}`, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                        {cell.text.paragraphs.map((paragraph, index) => <ParagraphView key={index} paragraph={paragraph} first={index === 0} />)}
                      </div>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function NodeView({ node }: { node: SlideNode }) {
  switch (node.kind) {
    case 'shape': return <ShapeView node={node} />
    case 'picture': return <PictureView node={node} />
    case 'group': return <GroupView node={node} />
    case 'table': return <TableView node={node} />
    default: return node.chart ? <ChartView chart={node.chart} box={node.box} /> : null
  }
}

export function SlideView({ slide, widthPx, heightPx }: { slide: SlideModel; widthPx: number; heightPx: number }) {
  return (
    <div className="pptx-viewer-slide-content" style={{ position: 'absolute', inset: 0, width: px(widthPx), height: px(heightPx), overflow: 'hidden' }}>
      <div className="pptx-viewer-background" style={{ position: 'absolute', inset: 0, ...fillStyle(slide.background, widthPx, heightPx) }} />
      {slide.nodes.map((node, index) => <NodeView key={index} node={node} />)}
    </div>
  )
}
