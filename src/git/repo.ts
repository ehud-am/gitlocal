import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
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

export function getInfo(repoPath: string): RepoInfo {
  if (!repoPath) {
    return { name: '', path: '', currentBranch: '', isGitRepo: false, pickerMode: true }
  }
  const isGitRepo = validateRepo(repoPath)
  if (!isGitRepo) {
    return { name: basename(repoPath), path: repoPath, currentBranch: '', isGitRepo: false, pickerMode: false }
  }
  let currentBranch = ''
  try {
    currentBranch = spawnGit(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD')
    /* v8 ignore next 3 */
  } catch {
    currentBranch = ''
  }
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
