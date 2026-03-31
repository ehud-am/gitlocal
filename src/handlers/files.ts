import type { Context } from 'hono'
import { spawnSync } from 'node:child_process'
import { detectFileType, getCurrentBranch, isWorkingTreeBranch, readWorkingTreeFile } from '../git/repo.js'
import { listDir, listWorkingTreeDir } from '../git/tree.js'

type Variables = { repoPath: string }

export async function treeHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'
  const nodes = isWorkingTreeBranch(repoPath, branch) ? listWorkingTreeDir(repoPath, path) : listDir(repoPath, branch, path)
  return c.json(nodes)
}

export async function fileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'

  if (!path) return c.json({ error: 'path is required' }, 400)

  const { type, language } = detectFileType(path)

  if (type === 'binary') {
    return c.json({ path, content: '', encoding: 'none', type: 'binary', language: '' })
  }

  const rawBytes = isWorkingTreeBranch(repoPath, branch)
    ? readWorkingTreeFile(repoPath, path)
    : (() => {
        const result = spawnSync('git', ['cat-file', 'blob', `${branch}:${path}`], {
          cwd: repoPath,
          encoding: 'buffer',
        })
        if (result.status !== 0) {
          return null
        }
        return result.stdout as Buffer
      })()

  if (!rawBytes) {
    return c.json({ error: 'File not found' }, 404)
  }

  if (type === 'image') {
    return c.json({
      path,
      content: rawBytes.toString('base64'),
      encoding: 'base64',
      type: 'image',
      language: '',
    })
  }

  return c.json({
    path,
    content: rawBytes.toString('utf-8'),
    encoding: 'utf-8',
    type,
    language,
  })
}
