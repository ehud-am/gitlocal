import { useId, type CSSProperties, type ReactNode } from 'react'
import { ChartView } from './chart-view'
import { fillStyle, imageCropStyle } from './fill-css'
import { geometryPaths, type GeometryPath } from './geometry'
import type { Box, Geometry, GroupNode, Line, LineEnd, Paragraph, PictureNode, ShapeNode, SlideModel, SlideNode, TableNode, TextBody, TextRun } from './model'

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
  return <span className="pptx-viewer-run" style={style}>{run.text}</span>
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
  return (
    <div className="pptx-viewer-paragraph" style={style}>
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
      {paragraph.runs.map((run, index) => <RunView key={index} run={run} />)}
      {firstRun ? null : <span style={{ fontSize: `${paragraph.baseSizePt}pt` }}>{'​'}</span>}
    </div>
  )
}

export function TextBodyView({ body, style }: { body: TextBody; style?: CSSProperties }) {
  const justify = body.anchor === 'middle' ? 'center' : body.anchor === 'bottom' ? 'flex-end' : 'flex-start'
  const vertical = body.vertical !== 'horz'
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
      {body.paragraphs.map((paragraph, index) => <ParagraphView key={index} paragraph={paragraph} first={index === 0} />)}
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
