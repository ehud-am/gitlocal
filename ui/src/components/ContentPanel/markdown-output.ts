export type MarkdownOutputMode =
  | 'print'
  | 'pdf'
  | 'email'
  | 'slack'
  | 'system-share'
  | 'copy'
  | 'download'

export interface MarkdownOutputDetails {
  sourcePath: string
  title: string
  plainText: string
  markdown: string
  suggestedFilename: string
  includesUnsavedEdits: boolean
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
    suggestedFilename: `${filenameBase}.md`,
    includesUnsavedEdits,
  }
}
