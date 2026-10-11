// The render-ready model a .pptx is parsed into. All lengths are CSS pixels at 96 DPI
// (1 px = 9525 EMU), all colors are CSS color strings, and nodes are in document (z-) order.

export const EMU_PER_PX = 9525
export const EMU_PER_PT = 12700

export interface ImageRef {
  // Zip path of the media part, used to load it once after the parse.
  mediaPath: string
  // Filled in after loading: an object/data URL, or null when the format can't be shown.
  src: string | null
  // Crop insets as fractions of the source image (a:srcRect); negative values extend it.
  crop: { l: number; t: number; r: number; b: number }
  opacity: number
  grayscale: boolean
}

export interface GradientStop {
  offset: number
  color: string
}

export type Fill =
  | { type: 'none' }
  | { type: 'solid'; color: string }
  | { type: 'gradient'; path: 'linear' | 'circle' | 'rect' | 'shape'; angle: number; stops: GradientStop[]; focus: { x: number; y: number } }
  | { type: 'image'; image: ImageRef; tile: { sx: number; sy: number; tx: number; ty: number } | null }
  | { type: 'pattern'; preset: string; fg: string; bg: string }

export type LineEndType = 'triangle' | 'stealth' | 'diamond' | 'oval' | 'arrow'

export interface LineEnd {
  type: LineEndType
  width: number
  length: number
}

export interface Line {
  color: string
  // A gradient outline (drawn with a linear SVG gradient); `color` holds its first stop.
  gradient: { angle: number; stops: GradientStop[] } | null
  widthPx: number
  dash: string | null
  cap: 'butt' | 'round' | 'square'
  join: 'miter' | 'round' | 'bevel'
  head: LineEnd | null
  tail: LineEnd | null
}

export type GeometryCommand =
  | { op: 'M' | 'L'; pts: [string, string][] }
  | { op: 'C' | 'Q'; pts: [string, string][] }
  | { op: 'A'; wR: string; hR: string; stAng: string; swAng: string }
  | { op: 'Z' }

export interface CustomPath {
  w: number | null
  h: number | null
  fill: boolean
  stroke: boolean
  commands: GeometryCommand[]
}

export type Geometry =
  | { kind: 'preset'; name: string; adj: Record<string, number> }
  | { kind: 'custom'; guides: { name: string; fmla: string }[]; adj: Record<string, number>; paths: CustomPath[] }

export interface Box {
  x: number
  y: number
  w: number
  h: number
  rot: number
  flipH: boolean
  flipV: boolean
}

export interface TextRun {
  text: string
  isBreak: boolean
  sizePt: number
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  color: string
  fontFamily: string
  baseline: number
  caps: 'none' | 'all' | 'small'
  letterSpacingPt: number
  highlight: string | null
}

export type Bullet =
  | { kind: 'char'; char: string; fontFamily: string | null; color: string | null; sizePct: number }
  | { kind: 'number'; text: string; fontFamily: string | null; color: string | null; sizePct: number }

export interface Paragraph {
  align: 'left' | 'center' | 'right' | 'justify'
  marginLeftPx: number
  indentPx: number
  // Line height as a multiple of the font size (spcPct) or an exact point size (spcPts).
  lineSpacing: { kind: 'pct'; value: number } | { kind: 'pts'; value: number }
  spaceBeforePt: number
  spaceAfterPt: number
  bullet: Bullet | null
  runs: TextRun[]
  // Font size used for an empty paragraph's line height and as the bullet's size base.
  baseSizePt: number
  rtl: boolean
}

export interface TextBody {
  paragraphs: Paragraph[]
  insets: { l: number; t: number; r: number; b: number }
  anchor: 'top' | 'middle' | 'bottom'
  anchorCenter: boolean
  wrap: boolean
  vertical: 'horz' | 'vert' | 'vert270'
  fontScale: number
  lineSpacingReduction: number
}

export interface ShapeNode {
  kind: 'shape'
  box: Box
  geometry: Geometry
  fill: Fill | null
  line: Line | null
  text: TextBody | null
  // SmartArt drawings position text in a box of its own (dsp:txXfrm), relative to the shape box.
  textBox: Box | null
  shadow: string | null
}

export interface PictureNode {
  kind: 'picture'
  box: Box
  geometry: Geometry
  image: ImageRef
  line: Line | null
  shadow: string | null
}

export interface GroupNode {
  kind: 'group'
  box: Box
  // Child boxes are relative to the group's own top-left, already scaled into its pixel size.
  children: SlideNode[]
}

export interface TableCell {
  text: TextBody | null
  fill: Fill | null
  borders: { left: Line | null; right: Line | null; top: Line | null; bottom: Line | null }
  colSpan: number
  rowSpan: number
  // Covered by a neighbor's span; not rendered.
  merged: boolean
}

export interface TableNode {
  kind: 'table'
  box: Box
  columns: number[]
  rows: { heightPx: number; cells: TableCell[] }[]
}

export interface ChartSeries {
  name: string
  color: string
  values: (number | null)[]
  // Scatter charts plot against numeric x values instead of categories.
  xValues: (number | null)[] | null
  // Per-point colors for pie/doughnut charts and charts set to vary colors by point.
  pointColors: string[] | null
}

export interface ChartModel {
  type: 'bar' | 'column' | 'line' | 'area' | 'pie' | 'doughnut' | 'scatter'
  grouping: 'clustered' | 'stacked' | 'percentStacked' | 'standard'
  title: string | null
  categories: string[]
  series: ChartSeries[]
  showLegend: boolean
  legendPosition: 'r' | 'b' | 't' | 'l'
  textColor: string
  gridColor: string
}

export interface ChartNode {
  kind: 'chart'
  box: Box
  chart: ChartModel | null
}

export type SlideNode = ShapeNode | PictureNode | GroupNode | TableNode | ChartNode

export interface SlideModel {
  index: number
  background: Fill
  nodes: SlideNode[]
  notes: string | null
}

export interface PresentationModel {
  widthPx: number
  heightPx: number
  slides: SlideModel[]
  // Object URLs created for media; revoked when the preview unmounts.
  objectUrls: string[]
}
