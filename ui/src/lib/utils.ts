import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function parentPathOf(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(0, boundary) : ''
}

export function basenameOf(path: string): string {
  if (!path) return ''
  const normalized = path.replace(/\/+$/, '')
  const boundary = normalized.lastIndexOf('/')
  return boundary >= 0 ? normalized.slice(boundary + 1) : normalized
}

export function pluralize(count: number, singular: string, plural: string = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

// A single `.replace(/<!--[\s\S]*?-->/g, '')` pass can leave a dangling `<!--` or `-->`
// behind when comment markers overlap (e.g. `<!--<!---->`), because the lazy match closes
// on the *first* `-->` it finds rather than the one matching its own `<!--`. Looping the
// replace to a fixpoint removes any markers that pass one only partially cleaned up.
export function stripHtmlComments(value: string): string {
  let result = value
  let previous: string
  do {
    previous = result
    result = result.replace(/<!--[\s\S]*?-->/g, '')
  } while (result !== previous)
  return result
}
