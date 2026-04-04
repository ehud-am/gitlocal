import { spawnSync } from 'node:child_process'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import type { RepoInfo, Branch, Commit, TreeNode } from '../types.js'

let cachedAppVersion = ''

function resolvePackageVersionFromCandidates(): string | null {
  const candidatePaths = [
    new URL('../../package.json', import.meta.url),
    new URL('../package.json', import.meta.url),
  ]

  for (const packageJsonPath of candidatePaths) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as { version?: string }
      if (packageJson.version) {
        return packageJson.version
      }
    } catch {
      continue
    }
  }

  return null
}

export function getAppVersion(): string {
  if (cachedAppVersion) return cachedAppVersion

  cachedAppVersion = resolvePackageVersionFromCandidates() ?? '0.0.0'

  return cachedAppVersion
}

export function spawnGit(repoPath: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd: repoPath, encoding: 'utf-8' })
  /* v8 ignore next */
  if (result.error) throw result.error
  /* v8 ignore next */
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `git ${args[0]} failed`)
  /* v8 ignore next */
  return result.stdout?.trim() ?? ''
}

export function validateRepo(repoPath: string): boolean {
  try {
    spawnGit(repoPath, 'rev-parse', '--is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

export function getCurrentBranch(repoPath: string): string {
  try {
    return spawnGit(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD')
  } catch {
    return ''
  }
}

export function hasCommits(repoPath: string): boolean {
  const result = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
    cwd: repoPath,
    stdio: 'ignore',
  })
  return result.status === 0
}

export function getBrowseableRootEntryCount(repoPath: string): number {
  return listWorkingTreeDirectoryEntries(repoPath)
    .filter((entry) => !entry.name.startsWith('.'))
    .length
}

export function getInfo(repoPath: string): RepoInfo {
  const version = getAppVersion()
  if (!repoPath) {
    return {
      name: '',
      path: '',
      currentBranch: '',
      isGitRepo: false,
      pickerMode: true,
      version,
      hasCommits: false,
      rootEntryCount: 0,
    }
  }
  const isGitRepo = validateRepo(repoPath)
  if (!isGitRepo) {
    return {
      name: basename(repoPath),
      path: repoPath,
      currentBranch: '',
      isGitRepo: false,
      pickerMode: false,
      version,
      hasCommits: false,
      rootEntryCount: 0,
    }
  }
  let currentBranch = ''
  currentBranch = getCurrentBranch(repoPath)
  return {
    name: basename(repoPath),
    path: repoPath,
    currentBranch,
    isGitRepo: true,
    pickerMode: false,
    version,
    hasCommits: hasCommits(repoPath),
    rootEntryCount: getBrowseableRootEntryCount(repoPath),
  }
}

export function getBranches(repoPath: string): Branch[] {
  let output = ''
  try {
    output = spawnGit(repoPath, 'branch', '-a', '--format=%(refname:short)')
  } catch {
    return []
  }
  const currentBranch = getInfo(repoPath).currentBranch
  const seen = new Set<string>()
  const branches: Branch[] = []
  for (const raw of output.split('\n')) {
    const name = raw.trim()
    /* v8 ignore next */
    if (!name) continue
    // Deduplicate remote-tracking branches against local names
    const local = name.replace(/^origin\//, '')
    /* v8 ignore next */
    if (seen.has(local)) continue
    seen.add(local)
    branches.push({ name: local, isCurrent: local === currentBranch })
  }
  return branches
}

export function getCommits(repoPath: string, branch: string, limit: number = 10): Commit[] {
  const max = Math.min(limit, 100)
  let output = ''
  try {
    output = spawnGit(
      repoPath,
      'log',
      branch,
      `--max-count=${max}`,
      '--format=%H%x1f%an%x1f%aI%x1f%s',
    )
  } catch {
    return []
  }
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash, author, date, ...msgParts] = line.split('\x1f')
      /* v8 ignore next 6 */
      return {
        hash: hash ?? '',
        shortHash: (hash ?? '').slice(0, 7),
        author: author ?? '',
        date: date ?? '',
        message: msgParts.join('\x1f'),
      }
    })
}

export function findReadme(repoPath: string, branch: string = 'HEAD'): string {
  if (isWorkingTreeBranch(repoPath, branch)) {
    const workingTreeReadme = listWorkingTreeDirectoryEntries(repoPath)
      .map((entry) => entry.path)
      .find((filePath) => /^readme(\.\w+)?$/i.test(filePath))
    if (workingTreeReadme) {
      return workingTreeReadme
    }
  }

  let output = ''
  try {
    output = spawnGit(repoPath, 'ls-tree', '--name-only', branch)
  } catch {
    return ''
  }
  const files = output.split('\n').filter(Boolean)
  const readme = files.find((f) => /^readme(\.\w+)?$/i.test(f))
  return readme ?? ''
}

export function isWorkingTreeBranch(repoPath: string, branch: string): boolean {
  if (!branch || branch === 'HEAD') return true
  return branch === getCurrentBranch(repoPath)
}

export function resolveRepoPath(repoPath: string, filePath: string): string {
  return resolve(repoPath, filePath)
}

export function normalizeRepoRelativePath(filePath: string): string {
  const normalized = filePath.replaceAll('\\', '/').trim()
  if (!normalized) return ''
  return normalized.replace(/^\.?\//, '').replace(/\/+/g, '/')
}

export function isPathInsideRepo(repoPath: string, filePath: string): boolean {
  const normalized = normalizeRepoRelativePath(filePath)
  if (!normalized) return false
  const resolvedPath = resolveRepoPath(repoPath, normalized)
  const rel = relative(repoPath, resolvedPath)
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

export function resolveSafeRepoPath(repoPath: string, filePath: string): string | null {
  if (!filePath) return repoPath
  if (!isPathInsideRepo(repoPath, filePath)) return null
  return resolveRepoPath(repoPath, normalizeRepoRelativePath(filePath))
}

export function getPathType(repoPath: string, filePath: string): 'file' | 'dir' | 'missing' | 'none' {
  if (!filePath) return 'none'
  const fullPath = resolveSafeRepoPath(repoPath, filePath)
  if (!fullPath) return 'missing'
  if (!existsSync(fullPath)) return 'missing'
  const stats = statSync(fullPath)
  return stats.isDirectory() ? 'dir' : 'file'
}

export function nearestExistingRepoPath(repoPath: string, filePath: string): string {
  if (!filePath) return ''

  let current = resolveRepoPath(repoPath, normalizeRepoRelativePath(filePath))
  while (current.startsWith(resolve(repoPath))) {
    if (existsSync(current)) {
      const rel = relative(repoPath, current)
      return rel === '' ? '' : rel.split('\\').join('/')
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  return ''
}

export function getTrackedWorkingTreeFiles(repoPath: string): string[] {
  try {
    return spawnGit(repoPath, 'ls-files')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((filePath) => getPathType(repoPath, filePath) === 'file')
      .sort()
  } catch {
    return []
  }
}

export function getTrackedPathType(repoPath: string, filePath: string): 'file' | 'dir' | 'missing' | 'none' {
  if (!filePath) return 'none'

  const files = getTrackedWorkingTreeFiles(repoPath)
  if (files.includes(filePath)) return 'file'
  return files.some((candidate) => candidate.startsWith(`${filePath}/`)) ? 'dir' : 'missing'
}

export function nearestExistingTrackedRepoPath(repoPath: string, filePath: string): string {
  if (!filePath) return ''

  let current = filePath
  while (current) {
    const currentType = getTrackedPathType(repoPath, current)
    if (currentType === 'file' || currentType === 'dir') {
      return current
    }

    const boundary = current.lastIndexOf('/')
    if (boundary < 0) break
    current = current.slice(0, boundary)
  }

  return ''
}

export function getWorkingTreeRevision(repoPath: string): string {
  const hash = createHash('sha1')
  hash.update(getCurrentBranch(repoPath))

  for (const relPath of getTrackedWorkingTreeFiles(repoPath)) {
    const fullPath = resolveRepoPath(repoPath, relPath)
    const stats = statSync(fullPath)
    hash.update(relPath)
    hash.update(String(stats.size))
    hash.update(String(stats.mtimeMs))
  }

  return hash.digest('hex')
}

export function readWorkingTreeFile(repoPath: string, filePath: string): Buffer | null {
  const fullPath = resolveSafeRepoPath(repoPath, filePath)
  if (!fullPath) return null
  if (!existsSync(fullPath)) return null
  const stats = statSync(fullPath)
  if (stats.isDirectory()) return null
  return readFileSync(fullPath)
}

export function isIgnoredPath(repoPath: string, filePath: string): boolean {
  const normalized = normalizeRepoRelativePath(filePath)
  if (!normalized) return false
  const result = spawnSync('git', ['check-ignore', '-q', normalized], { cwd: repoPath })
  return result.status === 0
}

export function getEditableState(repoPath: string, filePath: string, branch: string): { editable: boolean; revisionToken: string | null } {
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return { editable: false, revisionToken: null }
  }

  const pathType = getPathType(repoPath, filePath)
  if (pathType !== 'file') {
    return { editable: false, revisionToken: null }
  }

  const { type } = detectFileType(filePath)
  return {
    editable: type === 'markdown' || type === 'text',
    revisionToken: getFileRevisionToken(repoPath, filePath),
  }
}

export function getFileRevisionToken(repoPath: string, filePath: string): string | null {
  const rawBytes = readWorkingTreeFile(repoPath, filePath)
  if (!rawBytes) return null
  const hash = createHash('sha1')
  hash.update(normalizeRepoRelativePath(filePath))
  hash.update(rawBytes)
  return hash.digest('hex')
}

export function writeWorkingTreeTextFile(repoPath: string, filePath: string, content: string): void {
  const fullPath = resolveSafeRepoPath(repoPath, filePath)
  if (!fullPath) {
    throw new Error('Path must stay inside the opened repository.')
  }

  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

export function deleteWorkingTreeFile(repoPath: string, filePath: string): void {
  const fullPath = resolveSafeRepoPath(repoPath, filePath)
  if (!fullPath) {
    throw new Error('Path must stay inside the opened repository.')
  }

  unlinkSync(fullPath)
}

export function listWorkingTreeDirectoryEntries(repoPath: string, subpath: string = ''): TreeNode[] {
  const normalized = normalizeRepoRelativePath(subpath)
  const dirPath = normalized ? resolveSafeRepoPath(repoPath, normalized) : repoPath

  if (!dirPath || !existsSync(dirPath) || !statSync(dirPath).isDirectory()) {
    return []
  }

  return readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.name !== '.git')
    .map((entry) => {
      const path = normalized ? `${normalized}/${entry.name}` : entry.name
      return { entry, path }
    })
    .filter(({ path }) => !isIgnoredPath(repoPath, path))
    .map(({ entry, path }) => ({
      name: entry.name,
      path,
      type: entry.isDirectory() ? 'dir' as const : 'file' as const,
    }))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

export function detectFileType(filename: string): { type: 'markdown' | 'text' | 'image' | 'binary'; language: string } {
  /* v8 ignore next */
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff'])
  if (imageExts.has(ext)) return { type: 'image', language: '' }

  const markdownExts = new Set(['md', 'markdown', 'mdx', 'mdown'])
  if (markdownExts.has(ext)) return { type: 'markdown', language: '' }

  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    mjs: 'javascript', cjs: 'javascript', py: 'python', go: 'go',
    rs: 'rust', java: 'java', kt: 'kotlin', swift: 'swift',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
    rb: 'ruby', php: 'php', sh: 'bash', bash: 'bash', zsh: 'bash',
    yaml: 'yaml', yml: 'yaml', json: 'json', toml: 'toml',
    xml: 'xml', html: 'html', htm: 'html', css: 'css', scss: 'scss',
    sql: 'sql', graphql: 'graphql', proto: 'protobuf', tf: 'hcl',
    r: 'r', lua: 'lua', ex: 'elixir', exs: 'elixir',
    hs: 'haskell', clj: 'clojure', scala: 'scala', dart: 'dart',
    vue: 'html', svelte: 'html', dockerfile: 'dockerfile',
  }
  if (ext in langMap) return { type: 'text', language: langMap[ext] }

  const binaryExts = new Set([
    'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a',
    'zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'mp3', 'mp4', 'wav', 'mov', 'avi', 'mkv',
    'ttf', 'woff', 'woff2', 'eot',
    'pyc', 'class', 'jar', 'war',
  ])
  if (binaryExts.has(ext)) return { type: 'binary', language: '' }

  // Fallback: treat as text with no language hint
  return { type: 'text', language: '' }
}
