import type { Context } from 'hono'
import { readdirSync, statSync, type Dirent } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'
import { expandHomePath } from './repo.js'
import type { PathCompletion, PathCompletionResponse } from '../types.js'

type Variables = { repoPath: string; pickerPath: string }

export const PATH_COMPLETION_LIMIT = 20

function isDirectoryEntry(dir: string, entry: Dirent): boolean {
  if (entry.isDirectory()) return true
  if (!entry.isSymbolicLink()) return false
  try {
    return statSync(join(dir, entry.name)).isDirectory()
  } catch {
    return false
  }
}

// Completions for the "Go to path" input (#134). The input is split at its last separator: the
// part before it names the folder to list (relative to the open root, or absolute, with `~`
// meaning home), the part after it filters entries by a case-insensitive name prefix. Each
// suggestion keeps the typed folder part verbatim, so accepting one never rewrites what the
// user typed. Read-only: unlike /api/folder/browse it changes no server state.
export function completePath(input: string, basePath: string): PathCompletion[] {
  const lastSeparator = Math.max(input.lastIndexOf('/'), input.lastIndexOf('\\'))
  const typedDir = lastSeparator >= 0 ? input.slice(0, lastSeparator + 1) : ''
  const prefix = (lastSeparator >= 0 ? input.slice(lastSeparator + 1) : input).toLowerCase()
  const separator = lastSeparator >= 0 ? input[lastSeparator] : '/'

  if (input === '~') {
    return [{ value: '~/', name: '~', type: 'dir' }]
  }
  let dir: string
  const expandedDir = typedDir ? expandHomePath(typedDir) : ''
  if (!expandedDir) dir = basePath
  else if (isAbsolute(expandedDir)) dir = resolve(expandedDir)
  else dir = resolve(basePath, expandedDir)

  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const showHidden = prefix.startsWith('.')
  return entries
    .filter((entry) => entry.name !== '.git')
    .filter((entry) => showHidden || !entry.name.startsWith('.'))
    .filter((entry) => entry.name.toLowerCase().startsWith(prefix))
    .map((entry) => {
      const type: PathCompletion['type'] = isDirectoryEntry(dir, entry) ? 'dir' : 'file'
      return {
        value: `${typedDir}${entry.name}${type === 'dir' ? separator : ''}`,
        name: entry.name,
        type,
      }
    })
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1))
    .slice(0, PATH_COMPLETION_LIMIT)
}

export async function pathCompleteHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const input = c.req.query('input') ?? ''
  const basePath = c.get('repoPath') || c.get('pickerPath') || homedir()
  const response: PathCompletionResponse = { suggestions: completePath(input, basePath) }
  return c.json(response)
}
