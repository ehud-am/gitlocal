import { spawnSync } from 'node:child_process'
import { basename, dirname, isAbsolute, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import type {
  Branch,
  BranchSwitchRequest,
  BranchSwitchResponse,
  Commit,
  GitContext,
  GitIdentityUpdateResponse,
  GitUserIdentity,
  RepoInfo,
  RepoRemoteContext,
  TreeNode,
} from '../types.js'

interface WorkingTreeChangeSummary {
  trackedPaths: string[]
  untrackedPaths: string[]
}

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

function runGitCapture(repoPath: string, ...args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('git', args, { cwd: repoPath, encoding: 'utf-8' })
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

function readGitConfig(repoPath: string, scope: '--local' | '--global', key: string): string {
  const result = runGitCapture(repoPath, 'config', scope, key)
  return result.status === 0 ? result.stdout.trim() : ''
}

function writeGitConfig(repoPath: string, key: string, value: string): void {
  const result = runGitCapture(repoPath, 'config', '--local', key, value)
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Unable to update ${key}.`)
  }
}

function getConfiguredRemotes(repoPath: string): string[] {
  const result = runGitCapture(repoPath, 'remote')
  if (result.status !== 0 || !result.stdout) return []
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function stripGitSuffix(value: string): string {
  return value.replace(/\.git$/i, '').replace(/\/+$/, '')
}

export function convertGitRemoteToWebUrl(fetchUrl: string): string {
  const trimmed = fetchUrl.trim()
  if (!trimmed || trimmed.startsWith('file://') || trimmed.startsWith('/')) return ''

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed)
      parsed.pathname = stripGitSuffix(parsed.pathname)
      parsed.search = ''
      parsed.hash = ''
      return parsed.toString().replace(/\/$/, '')
    } catch {
      return stripGitSuffix(trimmed)
    }
  }

  const sshUrlMatch = trimmed.match(/^ssh:\/\/[^@]+@([^/]+)\/(.+)$/i)
  if (sshUrlMatch) {
    const [, host, path] = sshUrlMatch
    return `https://${host}/${stripGitSuffix(path)}`
  }

  const scpStyleMatch = trimmed.match(/^[^@]+@([^:]+):(.+)$/)
  if (scpStyleMatch) {
    const [, host, path] = scpStyleMatch
    return `https://${host}/${stripGitSuffix(path)}`
  }

  return ''
}

export function getGitUserIdentity(repoPath: string): GitUserIdentity | null {
  const localName = readGitConfig(repoPath, '--local', 'user.name')
  const localEmail = readGitConfig(repoPath, '--local', 'user.email')
  const globalName = readGitConfig(repoPath, '--global', 'user.name')
  const globalEmail = readGitConfig(repoPath, '--global', 'user.email')

  const name = localName || globalName
  const email = localEmail || globalEmail

  if (!name && !email) return null

  const source: GitUserIdentity['source'] =
    localName || localEmail
      ? ((localName && localEmail) || (!globalName && !globalEmail) ? 'local' : 'mixed')
      : 'global'

  return {
    name,
    email,
    source,
  }
}

export function setRepoGitIdentity(repoPath: string, name: string, email: string): GitIdentityUpdateResponse {
  const trimmedName = name.trim()
  const trimmedEmail = email.trim()

  if (!trimmedName) {
    throw new Error('Git name is required.')
  }

  if (!trimmedEmail) {
    throw new Error('Git email is required.')
  }

  if (!validateRepo(repoPath)) {
    throw new Error('No repository is currently open.')
  }

  writeGitConfig(repoPath, 'user.name', trimmedName)
  writeGitConfig(repoPath, 'user.email', trimmedEmail)

  const user = getGitUserIdentity(repoPath)
  /* v8 ignore next 3 -- if both local writes succeed, git must be able to read them back */
  if (!user) {
    throw new Error('GitLocal could not read the updated repository identity.')
  }

  return {
    ok: true,
    message: 'Repository git identity updated.',
    user,
  }
}

export function getGitRemoteContext(repoPath: string): RepoRemoteContext | null {
  const remotes = getConfiguredRemotes(repoPath)
  if (remotes.length === 0) return null

  const currentBranch = getCurrentBranch(repoPath)
  const upstreamRemote =
    currentBranch && currentBranch !== 'HEAD'
      ? readGitConfig(repoPath, '--local', `branch.${currentBranch}.remote`)
      : ''

  const selectedRemote =
    (upstreamRemote && remotes.includes(upstreamRemote) ? upstreamRemote : '')
    || (remotes.includes('origin') ? 'origin' : '')
    || remotes[0]

  if (!selectedRemote) return null

  const selectionReason =
    selectedRemote === upstreamRemote
      ? 'upstream'
      : selectedRemote === 'origin'
        ? 'origin'
        : 'first-configured'

  const fetchUrl = readGitConfig(repoPath, '--local', `remote.${selectedRemote}.url`)
  if (!fetchUrl) return null

  return {
    name: selectedRemote,
    fetchUrl,
    webUrl: convertGitRemoteToWebUrl(fetchUrl),
    selectionReason,
  }
}

export function getGitContext(repoPath: string): GitContext {
  return {
    user: getGitUserIdentity(repoPath),
    remote: getGitRemoteContext(repoPath),
  }
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
      gitContext: null,
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
      gitContext: null,
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
    gitContext: getGitContext(repoPath),
  }
}

export function getBranches(repoPath: string): Branch[] {
  const currentBranch = getCurrentBranch(repoPath)
  const localResult = runGitCapture(repoPath, 'for-each-ref', '--format=%(refname:short)%00%(upstream:short)', 'refs/heads')
  const remoteResult = runGitCapture(repoPath, 'for-each-ref', '--format=%(refname:short)', 'refs/remotes')
  if (localResult.status !== 0 && remoteResult.status !== 0) return []

  const branches: Branch[] = []
  const localNames = new Set<string>()

  for (const raw of localResult.stdout.split('\n').filter(Boolean)) {
    const [name, trackingRef = ''] = raw.split('\0')
    const remoteName = trackingRef.includes('/') ? trackingRef.split('/')[0] : undefined
    localNames.add(name)
    branches.push({
      name,
      displayName: name,
      scope: 'local',
      remoteName,
      trackingRef: trackingRef || undefined,
      hasLocalCheckout: true,
      isCurrent: name === currentBranch,
    })
  }

  for (const raw of remoteResult.stdout.split('\n').filter(Boolean)) {
    const ref = raw.trim()
    if (!ref || ref.endsWith('/HEAD')) continue

    const boundary = ref.indexOf('/')
    if (boundary < 0) continue

    const remoteName = ref.slice(0, boundary)
    const shortName = ref.slice(boundary + 1)
    if (!shortName || localNames.has(shortName)) continue

    branches.push({
      name: shortName,
      displayName: `${shortName} (${remoteName})`,
      scope: 'remote',
      remoteName,
      trackingRef: ref,
      hasLocalCheckout: false,
      isCurrent: false,
    })
  }

  return branches.sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
    if ((a.scope ?? 'local') !== (b.scope ?? 'local')) return (a.scope ?? 'local') === 'local' ? -1 : 1
    return (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name)
  })
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

export function findReadme(repoPath: string, branch: string = 'HEAD', folderPath: string = ''): string {
  const normalizedFolder = normalizeRepoRelativePath(folderPath)

  if (isWorkingTreeBranch(repoPath, branch)) {
    const workingTreeReadme = listWorkingTreeDirectoryEntries(repoPath, normalizedFolder)
      .find((entry) => entry.type === 'file' && /^readme(\.\w+)?$/i.test(entry.name))
    if (workingTreeReadme) {
      return workingTreeReadme.path
    }
  }

  const treeish = normalizedFolder ? `${branch}:${normalizedFolder}` : branch
  const result = runGitCapture(repoPath, 'ls-tree', '--name-only', treeish)
  if (result.status !== 0 || !result.stdout) {
    return ''
  }
  const readme = result.stdout
    .split('\n')
    .map((line) => line.trim())
    .find((fileName) => /^readme(\.\w+)?$/i.test(fileName))

  if (!readme) return ''
  return normalizedFolder ? `${normalizedFolder}/${readme}` : readme
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

function extractPorcelainPath(line: string): string {
  const candidate = line.slice(3).trim().split(' -> ').at(-1) ?? ''
  return candidate.replace(/^"/, '').replace(/"$/, '')
}

export function getWorkingTreeChanges(repoPath: string): WorkingTreeChangeSummary {
  const result = runGitCapture(repoPath, 'status', '--porcelain=v1', '-uall')
  if (result.status !== 0 || !result.stdout) {
    return { trackedPaths: [], untrackedPaths: [] }
  }

  const trackedPaths: string[] = []
  const untrackedPaths: string[] = []

  for (const line of result.stdout.split('\n').filter(Boolean)) {
    if (line.startsWith('?? ')) {
      untrackedPaths.push(extractPorcelainPath(line))
      continue
    }

    trackedPaths.push(extractPorcelainPath(line))
  }

  return { trackedPaths, untrackedPaths }
}

function resolveBranchSelection(repoPath: string, target: string): {
  localName: string
  checkoutRef: string
  trackingRef?: string
  createTrackingBranch: boolean
} {
  const normalizedTarget = target.trim()
  const match = getBranches(repoPath).find((branch) =>
    branch.name === normalizedTarget
    || branch.trackingRef === normalizedTarget
    || branch.displayName === normalizedTarget,
  )

  if (!match) {
    return {
      localName: normalizedTarget,
      checkoutRef: normalizedTarget,
      createTrackingBranch: false,
    }
  }

  if (match.scope === 'remote' && match.trackingRef) {
    return {
      localName: match.name,
      checkoutRef: match.trackingRef,
      trackingRef: match.trackingRef,
      createTrackingBranch: true,
    }
  }

  return {
    localName: match.name,
    checkoutRef: match.name,
    trackingRef: match.trackingRef,
    createTrackingBranch: false,
  }
}

function getCheckoutBlockingUntrackedPaths(
  repoPath: string,
  targetRef: string,
  untrackedPaths: string[],
): string[] {
  if (untrackedPaths.length === 0) return []

  const result = runGitCapture(repoPath, 'ls-tree', '-r', '--name-only', targetRef)
  if (result.status !== 0 || !result.stdout) return []

  const targetPaths = result.stdout.split('\n').map((line) => line.trim()).filter(Boolean)
  return untrackedPaths.filter((untrackedPath) =>
    targetPaths.some((targetPath) =>
      targetPath === untrackedPath
      || targetPath.startsWith(`${untrackedPath}/`)
      || untrackedPath.startsWith(`${targetPath}/`),
    ),
  )
}

function discardTrackedChanges(repoPath: string): void {
  if (!hasCommits(repoPath)) return
  spawnGit(repoPath, 'reset', '--hard', 'HEAD')
}

function deleteRepoPaths(repoPath: string, paths: string[]): void {
  for (const filePath of paths) {
    const fullPath = resolveSafeRepoPath(repoPath, filePath)
    if (!fullPath || !existsSync(fullPath)) continue
    rmSync(fullPath, { recursive: true, force: true })
  }
}

function performBranchCheckout(
  repoPath: string,
  target: ReturnType<typeof resolveBranchSelection>,
): { currentBranch: string; createdTrackingBranch?: string } {
  if (target.createTrackingBranch && target.trackingRef) {
    spawnGit(repoPath, 'checkout', '-b', target.localName, '--track', target.trackingRef)
    return {
      currentBranch: target.localName,
      createdTrackingBranch: target.localName,
    }
  }

  spawnGit(repoPath, 'checkout', target.checkoutRef)
  return {
    currentBranch: getCurrentBranch(repoPath),
  }
}

export function switchBranch(repoPath: string, request: BranchSwitchRequest): BranchSwitchResponse {
  if (!validateRepo(repoPath)) {
    return {
      ok: false,
      status: 'blocked',
      message: 'No git repository is currently open.',
    }
  }

  const targetName = request.target.trim()
  if (!targetName) {
    return {
      ok: false,
      status: 'blocked',
      message: 'Select a branch before switching.',
    }
  }

  if (request.resolution === 'cancel') {
    return {
      ok: false,
      status: 'cancelled',
      message: 'Branch switch canceled.',
      currentBranch: getCurrentBranch(repoPath),
    }
  }

  const target = resolveBranchSelection(repoPath, targetName)
  const currentBranch = getCurrentBranch(repoPath)
  if (!target.createTrackingBranch && target.localName === currentBranch) {
    return {
      ok: true,
      status: 'switched',
      message: `Already on ${currentBranch}.`,
      currentBranch,
    }
  }

  const changes = getWorkingTreeChanges(repoPath)
  const blockingUntrackedPaths = getCheckoutBlockingUntrackedPaths(repoPath, target.checkoutRef, changes.untrackedPaths)
  const summary: Pick<BranchSwitchResponse, 'trackedChangeCount' | 'untrackedChangeCount' | 'blockingPaths' | 'suggestedCommitMessage'> = {
    trackedChangeCount: changes.trackedPaths.length,
    untrackedChangeCount: changes.untrackedPaths.length,
    blockingPaths: [...changes.trackedPaths, ...blockingUntrackedPaths],
    suggestedCommitMessage: `WIP before switching to ${target.localName}`,
  }

  if (
    request.resolution === 'preview'
    && (changes.trackedPaths.length > 0 || changes.untrackedPaths.length > 0)
  ) {
    return {
      ok: false,
      status: 'confirmation-required',
      message: 'This branch switch needs confirmation because your working tree has uncommitted changes.',
      currentBranch,
      ...summary,
    }
  }

  try {
    if (request.resolution === 'commit') {
      const commitMessage = request.commitMessage?.trim()
      if (!commitMessage) {
        return {
          ok: false,
          status: 'blocked',
          message: 'Enter a commit message before switching branches.',
          currentBranch,
          ...summary,
        }
      }

      spawnGit(repoPath, 'add', '-A')
      spawnGit(repoPath, 'commit', '-m', commitMessage)
    }

    if (request.resolution === 'discard' || request.resolution === 'delete-untracked') {
      discardTrackedChanges(repoPath)
    }

    if (request.resolution === 'discard' && blockingUntrackedPaths.length > 0 && !request.allowDeleteUntracked) {
      return {
        ok: false,
        status: 'second-confirmation-required',
        message: 'Untracked files would block this checkout. Delete those files to continue or cancel.',
        currentBranch,
        ...summary,
        blockingPaths: blockingUntrackedPaths,
      }
    }

    if (request.resolution === 'delete-untracked' && blockingUntrackedPaths.length > 0 && !request.allowDeleteUntracked) {
      return {
        ok: false,
        status: 'blocked',
        message: 'Confirm untracked file deletion before continuing.',
        currentBranch,
        ...summary,
        blockingPaths: blockingUntrackedPaths,
      }
    }

    if (request.resolution === 'delete-untracked') {
      deleteRepoPaths(repoPath, blockingUntrackedPaths)
    }

    const checkout = performBranchCheckout(repoPath, target)
    return {
      ok: true,
      status: 'switched',
      message: `Switched to ${checkout.currentBranch}.`,
      currentBranch: checkout.currentBranch,
      createdTrackingBranch: checkout.createdTrackingBranch,
    }
  } catch (error) {
    return {
      ok: false,
      status: 'failed',
      message: error instanceof Error ? error.message : 'Branch switch failed.',
      currentBranch,
      ...summary,
    }
  }
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

function validateChildFolderName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('A folder name is required.')
  }

  if (trimmed === '.' || trimmed === '..' || /[\\/]/.test(trimmed)) {
    throw new Error('Folder names cannot contain path separators.')
  }

  return trimmed
}

export function createChildFolder(parentPath: string, name: string): string {
  const normalizedName = validateChildFolderName(name)
  if (!existsSync(parentPath) || !statSync(parentPath).isDirectory()) {
    throw new Error('The selected parent folder is not available.')
  }

  const createdPath = resolve(parentPath, normalizedName)
  /* v8 ignore next -- validateChildFolderName prevents separators, so this is purely defensive */
  if (dirname(createdPath) !== resolve(parentPath)) {
    throw new Error('The new folder must stay inside the selected parent.')
  }

  if (existsSync(createdPath)) {
    throw new Error('A file or folder with that name already exists.')
  }

  mkdirSync(createdPath, { recursive: false })
  return createdPath
}

export function initializeGitRepository(path: string): string {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error('The selected folder is not available.')
  }

  if (validateRepo(path)) {
    throw new Error('This folder is already a git repository.')
  }

  const result = runGitCapture(path, 'init')
  if (result.status !== 0) {
    throw new Error(result.stderr || 'git init failed.')
  }

  return path
}

export function cloneRepositoryInto(parentPath: string, name: string, repositoryUrl: string): string {
  const normalizedName = validateChildFolderName(name)
  const trimmedUrl = repositoryUrl.trim()
  if (!trimmedUrl) {
    throw new Error('A repository URL is required.')
  }

  if (!existsSync(parentPath) || !statSync(parentPath).isDirectory()) {
    throw new Error('The selected parent folder is not available.')
  }

  const targetPath = resolve(parentPath, normalizedName)
  /* v8 ignore next -- validateChildFolderName prevents separators, so this is purely defensive */
  if (dirname(targetPath) !== resolve(parentPath)) {
    throw new Error('The clone target must stay inside the selected parent.')
  }

  if (existsSync(targetPath)) {
    throw new Error('A file or folder with that name already exists.')
  }

  const result = runGitCapture(parentPath, 'clone', trimmedUrl, normalizedName)
  if (result.status !== 0) {
    throw new Error(result.stderr || 'git clone failed.')
  }

  return targetPath
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
      return { entry, path, localOnly: isIgnoredPath(repoPath, path) }
    })
    .map(({ entry, path, localOnly }) => ({
      name: entry.name,
      path,
      type: entry.isDirectory() ? 'dir' as const : 'file' as const,
      localOnly,
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
