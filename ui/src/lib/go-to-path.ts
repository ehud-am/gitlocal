// Pure path resolution for the "Go to path" control (#118). The control accepts either a path
// relative to the open root (`src/app.ts`, `./docs/`) or an absolute path (`/Users/me/notes`,
// `~/notes`, `C:\work\repo`). Paths that land inside the open root are browsed in place; anything
// else is handed to the server's open-repository flow, the same one the folder picker uses.

export type GoToPathTarget =
  | { kind: 'empty' }
  | { kind: 'root' }
  | { kind: 'in-root'; path: string }
  | { kind: 'external'; path: string }

const ABSOLUTE_PATH = /^(?:\/|~(?:[\\/]|$)|[A-Za-z]:[\\/]|\\\\)/

export function isAbsoluteInput(value: string): boolean {
  return ABSOLUTE_PATH.test(value)
}

// Splits on both separators and resolves `.`/`..`. Returns null when `..` climbs above the start.
function normalizeSegments(value: string): string[] | null {
  const segments: string[] = []
  for (const segment of value.split(/[\\/]+/)) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (segments.length === 0) return null
      segments.pop()
      continue
    }
    segments.push(segment)
  }
  return segments
}

function trimTrailingSeparators(value: string): string {
  const trimmed = value.replace(/[\\/]+$/, '')
  return trimmed || value
}

// Windows roots compare case-insensitively; POSIX roots do not.
function sameRootPrefix(candidate: string, root: string): boolean {
  return /^[A-Za-z]:/.test(root) ? candidate.toLowerCase() === root.toLowerCase() : candidate === root
}

export function resolveGoToPath(input: string, rootPath: string): GoToPathTarget {
  const value = input.trim()
  if (!value) return { kind: 'empty' }

  const root = trimTrailingSeparators(rootPath)
  const separator = root.includes('\\') && !root.includes('/') ? '\\' : '/'

  if (isAbsoluteInput(value)) {
    if (root) {
      const normalizedValue = trimTrailingSeparators(value).replace(/[\\/]/g, separator)
      if (sameRootPrefix(normalizedValue, root)) return { kind: 'root' }
      const prefix = `${root}${separator}`
      if (sameRootPrefix(normalizedValue.slice(0, prefix.length), prefix)) {
        const segments = normalizeSegments(normalizedValue.slice(prefix.length))
        if (segments) return segments.length ? { kind: 'in-root', path: segments.join('/') } : { kind: 'root' }
      }
    }
    return { kind: 'external', path: value }
  }

  const segments = normalizeSegments(value)
  if (segments === null) {
    // A relative path that climbs out of the open root becomes an absolute one for the server.
    return { kind: 'external', path: `${root}${separator}${value}` }
  }
  return segments.length ? { kind: 'in-root', path: segments.join('/') } : { kind: 'root' }
}
