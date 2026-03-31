import { spawnSync } from 'node:child_process'
import { basename, dirname, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import type { RepoInfo, Branch, Commit } from '../types.js'

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

export function getInfo(repoPath: string): RepoInfo {
  if (!repoPath) {
    return { name: '', path: '', currentBranch: '', isGitRepo: false, pickerMode: true }
  }
  const isGitRepo = validateRepo(repoPath)
  if (!isGitRepo) {
    return { name: basename(repoPath), path: repoPath, currentBranch: '', isGitRepo: false, pickerMode: false }
  }
  let currentBranch = ''
  currentBranch = getCurrentBranch(repoPath)
  return { name: basename(repoPath), path: repoPath, currentBranch, isGitRepo: true, pickerMode: false }
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

export function getPathType(repoPath: string, filePath: string): 'file' | 'dir' | 'missing' | 'none' {
  if (!filePath) return 'none'
  const fullPath = resolveRepoPath(repoPath, filePath)
  if (!existsSync(fullPath)) return 'missing'
  const stats = statSync(fullPath)
  return stats.isDirectory() ? 'dir' : 'file'
}

export function nearestExistingRepoPath(repoPath: string, filePath: string): string {
  if (!filePath) return ''

  let current = resolveRepoPath(repoPath, filePath)
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

function walkWorkingTree(repoPath: string, root = repoPath): string[] {
  const entries = readdirSync(root, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name === '.git') continue
    const fullPath = resolve(root, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkWorkingTree(repoPath, fullPath))
      continue
    }
    const rel = relative(repoPath, fullPath)
    if (rel) files.push(rel.split('\\').join('/'))
  }

  return files.sort()
}

export function getWorkingTreeRevision(repoPath: string): string {
  const hash = createHash('sha1')
  hash.update(getCurrentBranch(repoPath))

  for (const relPath of walkWorkingTree(repoPath)) {
    const fullPath = resolveRepoPath(repoPath, relPath)
    const stats = statSync(fullPath)
    hash.update(relPath)
    hash.update(String(stats.size))
    hash.update(String(stats.mtimeMs))
  }

  return hash.digest('hex')
}

export function readWorkingTreeFile(repoPath: string, filePath: string): Buffer | null {
  const fullPath = resolveRepoPath(repoPath, filePath)
  if (!existsSync(fullPath)) return null
  const stats = statSync(fullPath)
  if (stats.isDirectory()) return null
  return readFileSync(fullPath)
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
