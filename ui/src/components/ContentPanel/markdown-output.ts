export type MarkdownOutputMode =
  | 'pdf'
  | 'system-share'
  | 'copy'
  | 'download'

export interface MarkdownOutputDetails {
  sourcePath: string
  title: string
  plainText: string
  markdown: string
  pdfHtml: string
  suggestedFilename: string
  includesUnsavedEdits: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function basenameOfPath(path: string): string {
  const normalized = path.replace(/\/+$/, '')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(boundary + 1) : normalized
}

export function titleFromMarkdown(content: string, path: string): string {
  const heading = content
    .split('\n')
    .map((line) => line.match(/^#\s+(.+?)\s*#*\s*$/)?.[1]?.trim())
    .find((value): value is string => Boolean(value))

  return heading || basenameOfPath(path) || 'Markdown document'
}

export function markdownToPlainText(content: string): string {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[a-zA-Z0-9_-]*\n?|\n?```/g, ''))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function textRepresentationForCopy(rawText: string, renderedText?: string): { raw: string; rendered: string } {
  return {
    raw: rawText,
    rendered: renderedText ?? markdownToPlainText(rawText),
  }
}

export function buildRenderedPdfHtml(title: string, plainText: string): string {
  const escapedTitle = escapeHtml(title)
  const body = escapeHtml(plainText)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('\n') || '<p></p>'

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapedTitle}</title>`,
    '<style>',
    'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55;margin:40px;color:#111827;}',
    'h1{font-size:24px;margin:0 0 24px;}',
    'p{margin:0 0 14px;white-space:pre-wrap;}',
    '</style>',
    '</head>',
    '<body>',
    `<h1>${escapedTitle}</h1>`,
    body,
    '</body>',
    '</html>',
  ].join('')
}

export function buildMarkdownOutputDetails(
  path: string,
  content: string,
  includesUnsavedEdits: boolean,
): MarkdownOutputDetails {
  const title = titleFromMarkdown(content, path)
  const filenameBase = (basenameOfPath(path) || title)
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'markdown-document'

  return {
    sourcePath: path,
    title,
    plainText: markdownToPlainText(content),
    markdown: content,
    pdfHtml: buildRenderedPdfHtml(title, markdownToPlainText(content)),
    suggestedFilename: `${filenameBase}.md`,
    includesUnsavedEdits,
  }
}
