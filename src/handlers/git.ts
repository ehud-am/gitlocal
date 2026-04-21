import type { Context } from 'hono'
import {
  commitWorkingTreeChanges,
  getAppVersion,
  getBranches,
  getCommits,
  getInfo,
  findReadme,
  setRepoGitIdentity,
  switchBranch,
  syncCurrentBranchWithRemote,
} from '../git/repo.js'
import type { BranchSwitchRequest, CommitChangesRequest, GitIdentityUpdateRequest } from '../types.js'

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

export async function branchesHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const branches = getBranches(repoPath)
  return c.json(branches)
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
  const info = getInfo(repoPath)
  const requestedPath = c.req.query('path') ?? ''
  const requestedBranch = c.req.query('branch') ?? ''
  const readmeBranch = requestedBranch || info.currentBranch || 'HEAD'
  const path = info.isGitRepo ? findReadme(repoPath, readmeBranch, requestedPath) : ''
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
      : result.status === 'confirmation-required' || result.status === 'second-confirmation-required'
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
    const result = setRepoGitIdentity(repoPath, payload.name, payload.email)
    return c.json(result)
  } catch (error) {
    return c.json({
      ok: false,
      message: error instanceof Error ? error.message : 'Could not update the repository identity.',
    }, 400)
  }
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

  await c.req.json().catch(() => ({}))
  const result = syncCurrentBranchWithRemote(repoPath)
  return c.json(result, result.ok ? 200 : 400)
}
