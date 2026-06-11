import type { ReactNode } from 'react'

export interface MarkdownFindSegment {
  text: string
  match: boolean
}

export function splitMarkdownFindSegments(text: string, query: string, caseSensitive: boolean): MarkdownFindSegment[] {
  const needle = query.trim()
  if (!needle) return [{ text, match: false }]

  const haystack = caseSensitive ? text : text.toLowerCase()
  const normalizedNeedle = caseSensitive ? needle : needle.toLowerCase()
  const segments: MarkdownFindSegment[] = []
  let cursor = 0

  while (cursor <= text.length - needle.length) {
    const foundAt = haystack.indexOf(normalizedNeedle, cursor)
    if (foundAt < 0) break
    if (foundAt > cursor) {
      segments.push({ text: text.slice(cursor, foundAt), match: false })
    }
    segments.push({ text: text.slice(foundAt, foundAt + needle.length), match: true })
    cursor = foundAt + needle.length
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false })
  }

  return segments.length > 0 ? segments : [{ text, match: false }]
}

export function hasMarkdownFindQuery(query: string): boolean {
  return query.trim().length > 0
}

export function flattenRenderableText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenRenderableText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return flattenRenderableText((node as { props?: { children?: ReactNode } }).props?.children ?? '')
  }
  return ''
}
