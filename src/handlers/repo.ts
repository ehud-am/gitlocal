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
  summarizeChangedFiles,
  setRepoGitIdentity,
  switchBranch,
  syncCurrentBranchWithRemote,
  validateRepo,
} from '../git/repo.js'
import { setPickerPath, setRepoPath } from '../server.js'
import {
  rememberStartupFolder,
  resolveStartupFolder,
  writeStartupFolderPreference,
} from '../services/startup-preferences.js'
import type {
  BranchSwitchRequest,
  ChangedFilesResponse,
  CommitChangesRequest,
  GitIdentityUpdateRequest,
  LocalActionResponse,
  NavigationHintsResponse,
  RepoSummaryResponse,
  RepositoryOpenRequest,
  SshKeyValidationRequest,
  StartupFolderUpdateRequest,
} from '../types.js'

type Variables = { repoPath: string; pickerPath: string }

export async function infoHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  const pickerPath = c.get('pickerPath')
  if (pickerPath) {
    return c.json({
      name: '',
      path: pickerPath,
      currentBranch: '',
      isGitRepo: false,
      pickerMode: true,
      version: getAppVersion(),
      hasCommits: false,
      rootEntryCount: 0,
      gitContext: null,
    })
  }
  const info = getInfo(repoPath)
  return c.json(info)
}

export async function startupFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  return c.json(resolveStartupFolder())
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

export async function repositoryOpenHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let body: RepositoryOpenRequest
  try {
    body = await c.req.json<RepositoryOpenRequest>()
  } catch {
    const res: LocalActionResponse = { ok: false, error: 'Invalid JSON body' }
    return c.json(res)
  }

  const { path } = body
  const classification = classifyLocalPath(path ?? '')

  if (!path) {
    const res: LocalActionResponse = { ok: false, error: 'path is required' }
    return c.json(res)
  }

  if (!classification.exists || classification.openMode === 'blocked') {
    const res: LocalActionResponse = { ok: false, error: classification.message ?? `Path does not exist: ${path}` }
    return c.json(res)
  }

  const resolvedInputPath = classification.canonicalPath
  const stats = statSync(resolvedInputPath)
  if (stats.isFile()) {
    const parentPath = dirname(resolvedInputPath)
    let rootPath = parentPath
    let selectedPath = basename(path)

    if (classification.repositoryRootPath) {
      rootPath = classification.repositoryRootPath
      selectedPath = relative(rootPath, resolvedInputPath).split('\\').join('/')
    }

    setRepoPath(rootPath)
    setPickerPath('')
    rememberStartupFolder(rootPath, 'repo-open')
    const res: LocalActionResponse = {
      ok: true,
      error: '',
      path: resolvedInputPath,
      rootPath,
      selectedPath,
      selectedPathType: 'file',
      openMode: 'file',
      gitState: classification.gitState,
      ...(classification.repositoryRootPath ? { repositoryRootPath: classification.repositoryRootPath } : {}),
    }
    return c.json(res)
  }

  /* v8 ignore next 4 -- classifyLocalPath blocks unsupported existing paths before this point */
  if (!stats.isDirectory()) {
    const res: LocalActionResponse = { ok: false, error: `Not a folder or file: ${path}` }
    return c.json(res)
  }

  const rootPath = classification.gitState === 'repository-root'
    ? classification.repositoryRootPath!
    : resolvedInputPath
  setRepoPath(rootPath)
  setPickerPath('')
  rememberStartupFolder(rootPath, 'repo-open')
  const res: LocalActionResponse = {
    ok: true,
    error: '',
    path: rootPath,
    rootPath,
    selectedPath: '',
    selectedPathType: 'none',
    openMode: classification.openMode,
    gitState: classification.gitState,
    ...(classification.repositoryRootPath ? { repositoryRootPath: classification.repositoryRootPath } : {}),
  }
  return c.json(res)
}

export async function repositoryParentFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({ ok: false, error: 'No repository is currently open' })
  }

  const parentPath = dirname(repoPath)
  setRepoPath('')
  setPickerPath(parentPath)
  rememberStartupFolder(parentPath, 'picker-open')
  return c.json({ ok: true, error: '' })
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
