// The parsed form of a .docx document, independent of React. Lengths are CSS pixels (96 per inch)
// unless a name says otherwise; font sizes are points.
import type { ChartModel, ImageRef } from '../pptx/model'

export const TWIPS_PER_PX = 15 // 1440 twips per inch
export const EMU_PER_PX = 9525
// Word's "single" line spacing is roughly 1.15 times the font size for common fonts.
export const SINGLE_LINE = 1.15

export type Link = { kind: 'url'; href: string } | { kind: 'anchor'; name: string }

export interface Border {
  style: 'solid' | 'double' | 'dotted' | 'dashed'
  widthPt: number
  color: string
  // Distance between the border and the text, in points.
  spacePt: number
}

export interface Borders {
  top?: Border | null
  bottom?: Border | null
  left?: Border | null
  right?: Border | null
}

// Run formatting after the style chain is resolved. Absent means "as inherited from the page"
// (black, regular). Toggle properties keep an explicit false so a later layer can turn them off.
export interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: 'single' | 'double' | 'dotted' | 'dashed' | 'wavy' | 'none'
  underlineColor?: string
  strike?: boolean
  doubleStrike?: boolean
  caps?: boolean
  smallCaps?: boolean
  hidden?: boolean
  color?: string
  sizePt?: number
  font?: string
  highlight?: string
  shading?: string
  vertAlign?: 'superscript' | 'subscript'
  letterSpacingPt?: number
  rtl?: boolean
}

export interface TabStop {
  posPx: number
  align: 'left' | 'center' | 'right' | 'decimal'
  leader: 'none' | 'dot' | 'hyphen' | 'underscore' | 'middleDot'
}

export type Inline =
  | { kind: 'text'; text: string; style: RunStyle; link: Link | null }
  | { kind: 'tab'; style: RunStyle }
  | { kind: 'break'; type: 'line' | 'page' | 'column' }
  | { kind: 'image'; image: ImageRef; widthPx: number; heightPx: number; float: 'left' | 'right' | null; block: boolean; alt: string; link: Link | null }
  | { kind: 'chart'; chart: ChartModel | null; widthPx: number; heightPx: number; float: 'left' | 'right' | null }
  | { kind: 'textbox'; blocks: Block[]; widthPx: number | null; heightPx: number | null; float: 'left' | 'right' | null; fill: string | null; border: Border | null }
  | { kind: 'noteRef'; note: 'footnote' | 'endnote'; number: number; style: RunStyle }
  | { kind: 'bookmark'; name: string }
  | { kind: 'placeholder'; label: string }

export interface ListMarker {
  text: string
  style: RunStyle
  // How the marker is separated from the text: a tab to the hanging indent, a space, or nothing.
  suffix: 'tab' | 'space' | 'nothing'
}

export interface ParagraphNode {
  kind: 'paragraph'
  styleId: string | null
  align: 'left' | 'center' | 'right' | 'justify'
  indentLeftPx: number
  indentRightPx: number
  // Positive for a first-line indent, negative for a hanging indent.
  firstLinePx: number
  spaceBeforePt: number
  spaceAfterPt: number
  contextualSpacing: boolean
  line: { rule: 'auto'; value: number } | { rule: 'exact' | 'atLeast'; pt: number } | null
  shading: string | null
  borders: Borders
  rtl: boolean
  // Outline level (0 = Heading 1), used to expose headings to assistive technology.
  outlineLevel: number | null
  marker: ListMarker | null
  inlines: Inline[]
  // Formatting of the paragraph mark, which sets an empty paragraph's line height.
  markStyle: RunStyle
  tabStops: TabStop[]
  pageBreakBefore: boolean
}

export interface TableCell {
  blocks: Block[]
  colSpan: number
  rowSpan: number
  widthPx: number | null
  shading: string | null
  borders: Borders
  vAlign: 'top' | 'middle' | 'bottom'
  padding: { top: number; right: number; bottom: number; left: number }
}

export interface TableRow {
  cells: TableCell[]
  heightPx: number | null
  exactHeight: boolean
  header: boolean
}

export interface TableNode {
  kind: 'table'
  columnsPx: number[]
  widthPx: number | null
  align: 'left' | 'center' | 'right'
  indentPx: number
  rows: TableRow[]
}

export type Block = ParagraphNode | TableNode

export interface PageSetup {
  widthPx: number
  heightPx: number
  margin: { top: number; right: number; bottom: number; left: number }
  headerPx: number
  footerPx: number
  columns: { count: number; gapPx: number }
}

// A run of content that shares one column layout (a continuous section break can change it).
export interface ColumnGroup {
  columns: { count: number; gapPx: number }
  blocks: Block[]
}

// One sheet of paper on screen: the content between hard page or section breaks, shown with its
// section's page size, margins, header and footer. A long sheet stands for several printed pages.
export interface Sheet {
  page: PageSetup
  header: Block[] | null
  footer: Block[] | null
  groups: ColumnGroup[]
}

export interface Note {
  number: number
  blocks: Block[]
}

export interface DocumentModel {
  sheets: Sheet[]
  footnotes: Note[]
  endnotes: Note[]
  defaultTabPx: number
  objectUrls: string[]
}
