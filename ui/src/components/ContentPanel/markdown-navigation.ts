export function stripHiddenMarkdownComments(content: string): string {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\[\/\/\]:\s*#\s*\(.*\)\s*$/gm, '')
    .replace(/^\[comment\]:\s*#\s*\(.*\)\s*$/gim, '')
}

export function slugifyHeading(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'section'
}

export function createUniqueHeadingId(text: string, seen: Map<string, number>): string {
  const slug = slugifyHeading(text)
  const count = seen.get(slug) ?? 0
  seen.set(slug, count + 1)
  return count === 0 ? slug : `${slug}-${count + 1}`
}

function parentPathOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(0, boundary) : ''
}

function normalizeSegments(path: string): string {
  const segments: string[] = []
  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments.join('/')
}

export function resolveMarkdownLink(href: string, currentPath = ''): string {
  const decoded = decodeURIComponent(href).replace(/^\.\//, '')
  if (!decoded || decoded.startsWith('#')) return decoded
  if (decoded.includes('://') || decoded.startsWith('mailto:')) return decoded

  const [pathPart, anchor = ''] = decoded.split('#')
  const parentPath = parentPathOf(currentPath)
  const resolvedPath = normalizeSegments(parentPath ? `${parentPath}/${pathPart}` : pathPart)
  return anchor ? `${resolvedPath}#${anchor}` : resolvedPath
}
