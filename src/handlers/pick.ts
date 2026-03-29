import type { Context } from 'hono'
import { existsSync } from 'node:fs'
import { validateRepo } from '../git/repo.js'
import { setRepoPath } from '../server.js'
import type { PickRequest, PickResponse } from '../types.js'

type Variables = { repoPath: string }

export async function pickHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let body: PickRequest
  try {
    body = await c.req.json<PickRequest>()
  } catch {
    const res: PickResponse = { ok: false, error: 'Invalid JSON body' }
    return c.json(res)
  }

  const { path } = body
  if (!path) {
    const res: PickResponse = { ok: false, error: 'path is required' }
    return c.json(res)
  }

  if (!existsSync(path)) {
    const res: PickResponse = { ok: false, error: `Path does not exist: ${path}` }
    return c.json(res)
  }

  if (!validateRepo(path)) {
    const res: PickResponse = { ok: false, error: `Not a git repository: ${path}` }
    return c.json(res)
  }

  setRepoPath(path)
  const res: PickResponse = { ok: true, error: '' }
  return c.json(res)
}
