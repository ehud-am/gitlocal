import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { RepoLayout, ViewerPathType } from '../types.js'

const DEFAULT_REPO_LAYOUT: RepoLayout = {
  branch: null,
  path: null,
  pathType: 'none',
  raw: false,
}

function repoLayoutPath(repoPath: string): string {
  return join(repoPath, '.gitlocal', '.layout')
}

function normalizePathType(value: unknown): ViewerPathType {
  return value === 'file' || value === 'dir' || value === 'none' ? value : 'none'
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function readRepoLayout(repoPath: string): RepoLayout {
  try {
    const parsed = JSON.parse(readFileSync(repoLayoutPath(repoPath), 'utf-8')) as Partial<RepoLayout>
    return {
      branch: normalizeNullableString(parsed.branch),
      path: normalizeNullableString(parsed.path),
      pathType: normalizePathType(parsed.pathType),
      raw: typeof parsed.raw === 'boolean' ? parsed.raw : DEFAULT_REPO_LAYOUT.raw,
    }
  } catch {
    return { ...DEFAULT_REPO_LAYOUT }
  }
}

export function writeRepoLayout(repoPath: string, layout: RepoLayout): void {
  try {
    const path = repoLayoutPath(repoPath)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${JSON.stringify(layout, null, 2)}\n`)
  } catch {
    // Persisting the layout is ergonomic state; it must not block local browsing.
  }
}
