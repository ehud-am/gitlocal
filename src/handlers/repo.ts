import type { Context } from 'hono'
import { statSync } from 'node:fs'
import { basename, dirname, relative } from 'node:path'
import {
  listSshPrivateKeys,
  validateSshPrivateKeyPath,
} from '../git/identity-settings.js'
import {
  classifyLocalPath,
  commitWorkingTreeChanges,
  getAppVersion,
  getBranches,
  buildChangedFileItems,
  buildRepositoryStatusSummary,
  getCommits,
  getCurrentBranch,
  getGitContext,
  getInfo,
  findReadme,
  findKeyDocuments,
  resolveRepoPath,
  summarizeChangedFiles,
  setRepoGitIdentity,
  switchBranch,
  syncCurrentBranchWithRemote,
  validateRepo,
} from '../git/repo.js'
import { getStartupFolderResolution, getStartupOpenTarget, setPickerPath, setRepoPath, setStartupFolderResolution } from '../server.js'
import {
  buildSafeFallbackResolution,
  isAccessibleDirectory,
  isReadableDirectory,
  readDefaultReaderPreference,
  rememberStartupFolder,
  resolveOsDefaultLocation,
  writeDefaultReaderPreference,
  writeStartupFolderPreference,
} from '../services/startup-preferences.js'
import type {
  BranchSwitchRequest,
  ChangedFilesResponse,
  CommitChangesRequest,
  DefaultReaderPreferenceUpdateRequest,
  GitIdentityUpdateRequest,
  LocalActionResponse,
  NavigationHintsResponse,
  RepoLocationResponse,
  RepoSummaryResponse,
  RepositoryOpenRequest,
  SshKeyValidationRequest,
  StartupFolderUpdateRequest,
} from '../types.js'

type Variables = { repoPath: string; pickerPath: string }

function pickerModeResponse(path: string): Record<string, unknown> {
  return {
    name: '',
    path,
    currentBranch: '',
    isGitRepo: false,
    pickerMode: true,
    version: getAppVersion(),
    hasCommits: false,
    rootEntryCount: 0,
    gitContext: null,
  }
}

// A directory that still exists but fails the readdir-based readability check (permission
// change, or a network/removable drive stalling rather than cleanly disconnecting) is a
// genuinely ambiguous signal — unlike a path that no longer exists at all (ENOENT is
// unambiguous), a single failed readdir here could just as easily be a momentary hiccup on a
// network mount. Self-healing away from a healthy, currently-open repo on one such blip would
// itself be a regression (a surprising "my repo suddenly became the picker" flicker), so this
// case alone requires the SAME repo path to fail readability on two consecutive /api/info
// checks before recovering — cheap insurance against a one-off glitch, while still recovering
// within one more /api/info fetch (a manual Refresh, or any other action that refetches it) if
// the problem is real and persists. A confirmed-nonexistent path skips this entirely and heals immediately,
// since "the folder is gone" doesn't flicker the way a permission/mount glitch can.
let unreadableRepoPathStreak = { path: '', count: 0 }

// The folder GitLocal has open can disappear at any point during a long-running session —
// deleted, renamed, or an external/network drive unmounted — not just at process startup.
// Left unchecked, the currently-open (now-missing) path would silently read back as an empty,
// non-git folder with no explanation (see getInfo's classification-based branch), which is
// exactly the "why is my file list empty" report this checks for. Recovering here, on every
// /api/info fetch, means the next refetch (the UI disables window-refocus refetching globally,
// so in practice this is a manual Refresh or another action that refetches 'info') heals it
// instead of leaving the user stuck until they notice and navigate away manually.
function recoverIfRepoPathUnavailable(repoPath: string): string {
  if (!repoPath) return ''
  const classification = classifyLocalPath(repoPath)
  if (classification.exists && classification.pathType === 'directory' && isAccessibleDirectory(repoPath)) {
    unreadableRepoPathStreak = { path: '', count: 0 }
    return ''
  }

  if (classification.exists) {
    const streak = unreadableRepoPathStreak.path === repoPath ? unreadableRepoPathStreak.count + 1 : 1
    unreadableRepoPathStreak = { path: repoPath, count: streak }
    if (streak < 2) return ''
  }
  unreadableRepoPathStreak = { path: '', count: 0 }

  const fallback = resolveOsDefaultLocation()
  setRepoPath('')
  setPickerPath(fallback.path)
  const previous = getStartupFolderResolution()
  setStartupFolderResolution(buildSafeFallbackResolution(
    fallback,
    classification.exists
      ? 'The folder you had open is no longer readable — opened a default location instead.'
      : 'The folder you had open no longer exists — opened a default location instead.',
    { lastUsedPath: previous.lastUsedPath },
  ))
  return fallback.path
}

export async function infoHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  const pickerPath = c.get('pickerPath')
  if (pickerPath) {
    return c.json(pickerModeResponse(pickerPath))
  }

  const recoveredPickerPath = recoverIfRepoPathUnavailable(repoPath)
  if (recoveredPickerPath) {
    // The explanation lives in the startup-folder resolution snapshot (set just above, inside
    // recoverIfRepoPathUnavailable) rather than an inline field here — the picker page already
    // reads that same snapshot via GET /api/startup-folder for every other fallback path in
    // this feature, and duplicating the message onto this response too had no reader.
    return c.json(pickerModeResponse(recoveredPickerPath))
  }

  const info = getInfo(repoPath)
  return c.json(info)
}

export async function startupFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  return c.json(getStartupFolderResolution())
}

export async function startupFolderUpdateHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: StartupFolderUpdateRequest
  try {
    payload = await c.req.json<StartupFolderUpdateRequest>()
  } catch {
    return c.json({ ok: false, path: '', message: 'Invalid JSON body.' }, 400)
  }

  try {
    const preference = writeStartupFolderPreference(payload.path ?? '', payload.source ?? 'picker-open')
    return c.json({
      ok: true,
      path: preference.path,
      message: 'Startup folder preference updated.',
    })
  } catch (error) {
    return c.json({
      ok: false,
      path: payload.path ?? '',
      message: error instanceof Error ? error.message : 'Could not update startup folder preference.',
    }, 400)
  }
}

export async function startupOpenTargetHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  return c.json({ target: getStartupOpenTarget() })
}

export async function defaultReaderPreferenceHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  return c.json({
    ok: true,
    preference: readDefaultReaderPreference(),
    message: 'Default Markdown reader preference loaded.',
  })
}

export async function defaultReaderPreferenceUpdateHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: DefaultReaderPreferenceUpdateRequest
  try {
    payload = await c.req.json<DefaultReaderPreferenceUpdateRequest>()
  } catch {
    return c.json({
      ok: false,
      preference: readDefaultReaderPreference(),
      message: 'Invalid JSON body.',
    }, 400)
  }

  try {
    const preference = writeDefaultReaderPreference(payload)
    return c.json({
      ok: true,
      preference,
      message: 'Default Markdown reader preference updated.',
    })
  } catch (error) {
    return c.json({
      ok: false,
      preference: readDefaultReaderPreference(),
      message: error instanceof Error ? error.message : 'Could not update default Markdown reader preference.',
    }, 400)
  }
}

function repoOpenBlocked(error: string): LocalActionResponse {
  return { ok: false, error }
}

function repoOpenResult(params: {
  path: string
  rootPath: string
  selectedPath: string
  selectedPathType: LocalActionResponse['selectedPathType']
  openMode: LocalActionResponse['openMode']
  gitState: LocalActionResponse['gitState']
  repositoryRootPath?: string
}): LocalActionResponse {
  return {
    ok: true,
    error: '',
    path: params.path,
    rootPath: params.rootPath,
    selectedPath: params.selectedPath,
    selectedPathType: params.selectedPathType,
    openMode: params.openMode,
    gitState: params.gitState,
    ...(params.repositoryRootPath ? { repositoryRootPath: params.repositoryRootPath } : {}),
  }
}

export async function repositoryOpenHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let body: RepositoryOpenRequest
  try {
    body = await c.req.json<RepositoryOpenRequest>()
  } catch {
    return c.json(repoOpenBlocked('Invalid JSON body'))
  }

  const { path } = body
  const classification = classifyLocalPath(path ?? '')

  if (!path) {
    return c.json(repoOpenBlocked('path is required'))
  }

  if (!classification.exists || classification.openMode === 'blocked') {
    return c.json(repoOpenBlocked(classification.message ?? `Path does not exist: ${path}`))
  }

  const resolvedInputPath = classification.canonicalPath
  const stats = statSync(resolvedInputPath)
  if (stats.isFile()) {
    const parentPath = dirname(resolvedInputPath)
    let rootPath = parentPath
    let selectedPath = basename(resolvedInputPath)

    if (classification.repositoryRootPath) {
      rootPath = classification.repositoryRootPath
      selectedPath = relative(rootPath, resolvedInputPath).split('\\').join('/')
    }

    setRepoPath(rootPath)
    setPickerPath('')
    rememberStartupFolder(rootPath, 'repo-open')
    return c.json(repoOpenResult({
      path: resolvedInputPath,
      rootPath,
      selectedPath,
      selectedPathType: 'file',
      openMode: 'file',
      gitState: classification.gitState,
      repositoryRootPath: classification.repositoryRootPath,
    }))
  }

  /* v8 ignore next 4 -- classifyLocalPath blocks unsupported existing paths before this point */
  if (!stats.isDirectory()) {
    return c.json(repoOpenBlocked(`Not a folder or file: ${path}`))
  }

  const rootPath = classification.gitState === 'repository-root'
    ? classification.repositoryRootPath!
    : resolvedInputPath
  setRepoPath(rootPath)
  setPickerPath('')
  rememberStartupFolder(rootPath, 'repo-open')
  return c.json(repoOpenResult({
    path: rootPath,
    rootPath,
    selectedPath: '',
    selectedPathType: 'none',
    openMode: classification.openMode,
    gitState: classification.gitState,
    repositoryRootPath: classification.repositoryRootPath,
  }))
}

// A single failed readability check on a directory that otherwise looks fine could be a
// one-off scheduling hiccup (e.g. a network mount taking a moment to respond) rather than
// genuine unavailability. recoverIfRepoPathUnavailable protects against this by requiring the
// SAME path to fail across two separate /api/info requests — but a parent-folder walk only
// gets one shot per click, with no later request to lean on instead, so the closest practical
// equivalent here is an immediate same-request double-check rather than persisted state.
// This doesn't protect against a stall lasting longer than the gap between these two syscalls,
// but it does rule out the cheapest, most common false positive (a single unlucky read).
function isConfirmedUnreadable(path: string): boolean {
  return !isReadableDirectory(path) && !isReadableDirectory(path)
}

export async function repositoryParentFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({ ok: false, error: 'No repository is currently open' })
  }

  const immediateParent = dirname(repoPath)
  if (immediateParent === repoPath) {
    return c.json({ ok: false, error: 'GitLocal is already at the root of the file system.' })
  }

  // Walk up past any unreadable ancestor (permission changed, or the parent itself sits on an
  // unmounted/disconnected drive) rather than landing on it and reproducing the same "empty
  // folder, no explanation" problem one level up — the very case this navigation is often used
  // to escape from.
  let candidate = immediateParent
  while (isConfirmedUnreadable(candidate) && dirname(candidate) !== candidate) {
    candidate = dirname(candidate)
  }

  /* v8 ignore start -- reaching the filesystem root and finding it still unreadable is not practical to simulate in tests */
  if (isConfirmedUnreadable(candidate)) {
    const fallback = resolveOsDefaultLocation()
    setRepoPath('')
    setPickerPath(fallback.path)
    const previous = getStartupFolderResolution()
    // The caller (App.tsx's handleBrowseParentFolder) reloads the page on `ok: true` without
    // reading any inline message, so the explanation has to live where the reloaded picker
    // page already looks for it — the same startup-folder resolution snapshot every other
    // fallback path in this feature writes to — rather than an ad hoc response field no
    // client ever reads.
    setStartupFolderResolution(buildSafeFallbackResolution(
      fallback,
      'No readable parent folder was found — opened a default location instead.',
      { lastUsedPath: previous.lastUsedPath },
    ))
    return c.json({ ok: true, error: '' })
  }
  /* v8 ignore stop */

  setRepoPath('')
  setPickerPath(candidate)
  rememberStartupFolder(candidate, 'picker-open')
  return c.json({ ok: true, error: '' })
}

export async function repositoryLocationHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  const emptyResponse: RepoLocationResponse = {
    repositoryRootPath: '',
    isRepositoryRoot: false,
    homeReadmePath: '',
    atFilesystemRoot: false,
  }
  if (!repoPath) {
    return c.json(emptyResponse)
  }

  const requestedPath = c.req.query('path') ?? ''
  const currentPath = resolveRepoPath(repoPath, requestedPath)
  const atFilesystemRoot = dirname(currentPath) === currentPath
  const classification = classifyLocalPath(currentPath)
  const repositoryRootPath = classification.repositoryRootPath ?? ''
  if (!repositoryRootPath) {
    return c.json({ ...emptyResponse, atFilesystemRoot })
  }

  const requestedBranch = c.req.query('branch') ?? ''
  const readmeBranch = requestedBranch || getCurrentBranch(repositoryRootPath) || 'HEAD'
  const homeReadmePath = findReadme(repositoryRootPath, readmeBranch, '')

  const response: RepoLocationResponse = {
    repositoryRootPath,
    isRepositoryRoot: classification.gitState === 'repository-root',
    homeReadmePath,
    atFilesystemRoot,
  }
  return c.json(response)
}

export async function branchesHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const branches = getBranches(repoPath)
  return c.json(branches)
}

export async function gitContextHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath || !validateRepo(repoPath)) return c.json(null)
  return c.json(getGitContext(repoPath))
}

export async function repositorySummaryHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath || !validateRepo(repoPath)) {
    return c.json({ error: 'No repository loaded' }, 400)
  }

  const branch = c.req.query('branch') || getCurrentBranch(repoPath) || 'HEAD'
  const summary = buildRepositoryStatusSummary(repoPath, branch)
  const response: RepoSummaryResponse = {
    repoName: summary.repoName,
    branch,
    statusSummary: {
      text: summary.syncDescription,
      tone: summary.statusTone,
      remoteLabel: summary.remoteLabel,
      syncState: summary.syncState,
      localChangeCount: summary.localChangeCount,
      untrackedChangeCount: summary.untrackedChangeCount,
    },
    keyDocuments: findKeyDocuments(repoPath),
    recentItems: [],
    visibility: {
      generatedLocalMode: 'hide',
      hiddenCount: 0,
    },
  }
  return c.json(response)
}

export async function repositoryChangesHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath || !validateRepo(repoPath)) {
    return c.json({ error: 'No repository loaded' }, 400)
  }

  const includeGeneratedLocal = c.req.query('includeGeneratedLocal') === 'true'
  const branch = c.req.query('branch') || getCurrentBranch(repoPath) || 'HEAD'
  const items = buildChangedFileItems(repoPath, includeGeneratedLocal)
  const response: ChangedFilesResponse = {
    branch,
    checkedAt: new Date().toISOString(),
    summary: summarizeChangedFiles(items),
    items,
  }
  return c.json(response)
}

export async function repositoryNavigationHintsHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath || !validateRepo(repoPath)) {
    return c.json({ error: 'No repository loaded' }, 400)
  }

  const includeGeneratedLocal = c.req.query('includeGeneratedLocal') === 'true'
  const response: NavigationHintsResponse = {
    keyDocuments: findKeyDocuments(repoPath),
    recentItems: [],
    changedItems: buildChangedFileItems(repoPath, includeGeneratedLocal).slice(0, 10),
  }
  return c.json(response)
}

export async function commitsHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const branch = c.req.query('branch') ?? ''
  const limitStr = c.req.query('limit') ?? '10'
  const limit = Math.min(Math.max(1, parseInt(limitStr, 10) || 10), 100)
  const commits = getCommits(repoPath, branch, limit)
  return c.json(commits)
}

export async function readmeHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ path: '' })
  if (!validateRepo(repoPath)) return c.json({ path: '' })
  const requestedPath = c.req.query('path') ?? ''
  const requestedBranch = c.req.query('branch') ?? ''
  const readmeBranch = requestedBranch || getCurrentBranch(repoPath) || 'HEAD'
  const path = findReadme(repoPath, readmeBranch, requestedPath)
  return c.json({ path })
}

export async function branchSwitchHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      ok: false,
      status: 'blocked',
      message: 'No repository is currently open.',
    }, 400)
  }

  let payload: BranchSwitchRequest
  try {
    payload = await c.req.json<BranchSwitchRequest>()
  } catch {
    return c.json({
      ok: false,
      status: 'blocked',
      message: 'Invalid JSON body.',
    }, 400)
  }

  const result = switchBranch(repoPath, payload)
  const status =
    result.status === 'switched'
      ? 200
      : result.status === 'confirmation-required'
        ? 409
        : result.status === 'cancelled'
          ? 200
          : 400

  return c.json(result, status)
}

export async function gitIdentityUpdateHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      ok: false,
      message: 'No repository is currently open.',
    }, 400)
  }

  let payload: GitIdentityUpdateRequest
  try {
    payload = await c.req.json<GitIdentityUpdateRequest>()
  } catch {
    return c.json({
      ok: false,
      message: 'Invalid JSON body.',
    }, 400)
  }

  try {
    const result = setRepoGitIdentity(repoPath, payload.name, payload.email, payload.sshKeyPath)
    return c.json(result)
  } catch (error) {
    return c.json({
      ok: false,
      /* v8 ignore next -- setRepoGitIdentity only ever throws real Error instances in practice; the fallback message has no realistic trigger to test */
      message: error instanceof Error ? error.message : 'Could not update the repository-local Git identity.',
    }, 400)
  }
}

export async function gitIdentitySshKeysHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      directory: { path: '', exists: false, readable: false },
      keys: [],
      message: 'No repository is currently open.',
    }, 400)
  }

  return c.json(listSshPrivateKeys())
}

export async function gitIdentitySshKeyValidateHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      valid: false,
      path: '',
      message: 'No repository is currently open.',
    }, 400)
  }

  let payload: SshKeyValidationRequest
  try {
    payload = await c.req.json<SshKeyValidationRequest>()
  } catch {
    return c.json({
      valid: false,
      path: '',
      message: 'Invalid JSON body.',
    }, 400)
  }

  const result = validateSshPrivateKeyPath(payload.sshKeyPath ?? '')
  return c.json(result, result.valid ? 200 : 400)
}

export async function commitChangesHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      ok: false,
      status: 'blocked',
      message: 'No repository is currently open.',
    }, 400)
  }

  let payload: CommitChangesRequest
  try {
    payload = await c.req.json<CommitChangesRequest>()
  } catch {
    return c.json({
      ok: false,
      status: 'blocked',
      message: 'Invalid JSON body.',
    }, 400)
  }

  const result = commitWorkingTreeChanges(repoPath, payload.message ?? '')
  return c.json(result, result.ok ? 200 : 400)
}

export async function remoteSyncHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({
      ok: false,
      status: 'blocked',
      message: 'No repository is currently open.',
    }, 400)
  }

  const result = syncCurrentBranchWithRemote(repoPath)
  return c.json(result, result.ok ? 200 : 400)
}
