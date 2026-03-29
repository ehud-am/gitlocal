import type { Context } from 'hono'
import { getInfo, getBranches, getCommits, findReadme } from '../git/repo.js'

type Variables = { repoPath: string }

export async function infoHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
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
  /* v8 ignore next */
  const readmeBranch = info.currentBranch || 'HEAD'
  const path = info.isGitRepo ? findReadme(repoPath, readmeBranch) : ''
  return c.json({ path })
}
