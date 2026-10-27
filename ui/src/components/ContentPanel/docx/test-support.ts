// Test helpers for the DOCX preview: assemble small in-memory .docx packages part by part.
import JSZip from 'jszip'
import { relsXml, THEME_XML, type Rel } from '../pptx/test-support'
import { parseDocument } from './document'
import type { DocumentModel } from './model'

export const W_NS = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
  'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"',
  'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"',
  'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"',
  'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"',
  'xmlns:v="urn:schemas-microsoft-com:vml"',
  'xmlns:o="urn:schemas-microsoft-com:office:office"',
  'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"',
].join(' ')

// A 1x1 PNG.
export const PNG_BYTES = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))

export interface DocxParts {
  // The w:body content (paragraphs, tables, sectPr).
  body: string
  styles?: string
  numbering?: string
  settings?: string
  footnotes?: string
  endnotes?: string
  theme?: boolean
  // Extra parts by zip path, e.g. headers, charts and media.
  parts?: Record<string, string | Uint8Array>
  // Extra relationships of word/document.xml.
  rels?: Rel[]
  // Relationships of other parts, by part path.
  partRels?: Record<string, Rel[]>
  // Replace the package's root relationships (for broken-package tests).
  rootRels?: string
}

export const wrap = (root: string, content: string) => `<?xml version="1.0" encoding="UTF-8"?><w:${root} ${W_NS}>${content}</w:${root}>`

export async function buildDocx(parts: DocxParts): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>')
  zip.file('_rels/.rels', parts.rootRels ?? relsXml([{ id: 'rId1', type: 'officeDocument', target: 'word/document.xml' }]))
  zip.file('word/document.xml', wrap('document', `<w:body>${parts.body}</w:body>`))
  const rels: Rel[] = [...(parts.rels ?? [])]
  const add = (name: string, type: string, content: string | undefined, root: string) => {
    if (content === undefined) return
    zip.file(`word/${name}`, wrap(root, content))
    rels.push({ id: `rIdAuto${rels.length}`, type, target: name })
  }
  add('styles.xml', 'styles', parts.styles, 'styles')
  add('numbering.xml', 'numbering', parts.numbering, 'numbering')
  add('settings.xml', 'settings', parts.settings, 'settings')
  add('footnotes.xml', 'footnotes', parts.footnotes, 'footnotes')
  add('endnotes.xml', 'endnotes', parts.endnotes, 'endnotes')
  if (parts.theme) {
    zip.file('word/theme/theme1.xml', THEME_XML)
    rels.push({ id: 'rIdTheme', type: 'theme', target: 'theme/theme1.xml' })
  }
  for (const [name, content] of Object.entries(parts.parts ?? {})) zip.file(name, content)
  zip.file('word/_rels/document.xml.rels', relsXml(rels))
  for (const [partPath, partRels] of Object.entries(parts.partRels ?? {})) {
    const slash = partPath.lastIndexOf('/')
    zip.file(`${partPath.slice(0, slash + 1)}_rels/${partPath.slice(slash + 1)}.rels`, relsXml(partRels))
  }
  return zip.generateAsync({ type: 'uint8array' })
}

export async function parseDocx(parts: DocxParts): Promise<DocumentModel> {
  return parseDocument(await buildDocx(parts))
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Shorthand for a paragraph with one plain run.
export const para = (text: string, pPr = '', rPr = '') => `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${text}</w:t></w:r></w:p>`
