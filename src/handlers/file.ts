import type { Context } from 'hono'
import { spawnSync } from 'node:child_process'
import {
  applyFileSyncStates,
  deleteWorkingTreeFile,
  detectFileType,
  getEditableState,
  getCurrentBranch,
  getFileRevisionToken,
  getPathType,
  isWorkingTreeBranch,
  normalizeRepoRelativePath,
  readWorkingTreeFile,
  validateRepo,
  writeWorkingTreeTextFile,
} from '../git/repo.js'
import { listDir, listWorkingTreeDir } from '../git/tree.js'
import type {
  FileContent,
  ManualFileMutationRequest,
  ManualFileOperationResult,
} from '../types.js'

type Variables = { repoPath: string }

function mutationBlocked(operation: 'create' | 'update' | 'delete', path: string, message: string, status: number): Response {
  const body: ManualFileOperationResult = {
    ok: false,
    operation,
    path,
    status: status === 409 ? 'conflict' : 'blocked',
    message,
  }
  return Response.json(body, { status })
}

function parsePath(payload: ManualFileMutationRequest): string {
  return normalizeRepoRelativePath(payload.path ?? '')
}

export async function treeHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'
  const isGitRepo = validateRepo(repoPath)
  const nodes = !isGitRepo || isWorkingTreeBranch(repoPath, branch) ? listWorkingTreeDir(repoPath, path) : listDir(repoPath, branch, path)
  const responseNodes = isGitRepo && isWorkingTreeBranch(repoPath, branch) ? applyFileSyncStates(repoPath, nodes) : nodes
  return c.json(responseNodes)
}

export async function fileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'
  const isGitRepo = validateRepo(repoPath)

  if (!path) return c.json({ error: 'path is required' }, 400)

  const { type, language } = detectFileType(path)

  if (isWorkingTreeBranch(repoPath, branch) && getPathType(repoPath, path) !== 'file') {
    return c.json({ error: 'File not found' }, 404)
  }

  const rawBytes = !isGitRepo || isWorkingTreeBranch(repoPath, branch)
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

  const editableState = getEditableState(repoPath, path, branch)

  if (type === 'image') {
    const response: FileContent = {
      path,
      content: rawBytes.toString('base64'),
      encoding: 'base64',
      type: 'image',
      language: '',
      editable: false,
      revisionToken: editableState.revisionToken,
    }
    return c.json(response)
  }

  if (type === 'binary') {
    const response: FileContent = {
      path,
      content: '',
      encoding: 'none',
      type: 'binary',
      language: '',
      editable: false,
      revisionToken: editableState.revisionToken,
    }
    return c.json(response)
  }

  const response: FileContent = {
    path,
    content: rawBytes.toString('utf-8'),
    encoding: 'utf-8',
    type,
    language,
    editable: editableState.editable,
    revisionToken: editableState.revisionToken,
  }
  return c.json(response)
}

export async function createFileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const isGitRepo = validateRepo(repoPath)
  const branch = isGitRepo ? getCurrentBranch(repoPath) : ''
  /* v8 ignore next 3 -- create requests always target the current working tree */
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return mutationBlocked('create', '', 'File creation is only available on the current working tree.', 409)
  }

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('create', path, 'A folder-relative file path is required.', 400)
  }

  if (payload.content !== undefined && typeof payload.content !== 'string') {
    return mutationBlocked('create', path, 'File content must be text.', 400)
  }

  const pathType = getPathType(repoPath, path)
  if (pathType !== 'missing') {
    return mutationBlocked('create', path, 'That path already exists in the folder.', 409)
  }

  try {
    writeWorkingTreeTextFile(repoPath, path, payload.content ?? '')
    const result: ManualFileOperationResult = {
      ok: true,
      operation: 'create',
      path,
      status: 'created',
      message: 'File created successfully.',
    }
    return c.json(result, 201)
  } catch (error) {
    return mutationBlocked('create', path, error instanceof Error ? error.message : 'Failed to create the file.', 400)
  }
}

export async function updateFileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('update', path, 'A folder-relative file path is required.', 400)
  }

  if (typeof payload.content !== 'string') {
    return mutationBlocked('update', path, 'Updated file content is required.', 400)
  }

  if (!payload.revisionToken) {
    return mutationBlocked('update', path, 'A file revision token is required to save changes.', 409)
  }

  const isGitRepo = validateRepo(repoPath)
  const branch = isGitRepo ? c.req.query('branch') ?? getCurrentBranch(repoPath) : ''
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return mutationBlocked('update', path, 'File updates are only available on the current working tree.', 409)
  }

  const pathType = getPathType(repoPath, path)
  if (pathType !== 'file') {
    return mutationBlocked('update', path, 'The selected file is no longer available.', 404)
  }

  const { type } = detectFileType(path)
  if (type !== 'markdown' && type !== 'text') {
    return mutationBlocked('update', path, 'Only text files can be edited inline.', 400)
  }

  const currentToken = getFileRevisionToken(repoPath, path)
  if (!currentToken || currentToken !== payload.revisionToken) {
    return mutationBlocked('update', path, 'The file changed on disk before your save completed.', 409)
  }

  try {
    writeWorkingTreeTextFile(repoPath, path, payload.content)
  } catch (error) {
    return mutationBlocked('update', path, error instanceof Error ? error.message : 'Failed to update the file.', 400)
  }
  const result: ManualFileOperationResult = {
    ok: true,
    operation: 'update',
    path,
    status: 'updated',
    message: 'File updated successfully.',
  }
  return c.json(result)
}

export async function deleteFileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('delete', path, 'A folder-relative file path is required.', 400)
  }

  if (!payload.revisionToken) {
    return mutationBlocked('delete', path, 'A file revision token is required to delete a file.', 409)
  }

  const isGitRepo = validateRepo(repoPath)
  const branch = isGitRepo ? c.req.query('branch') ?? getCurrentBranch(repoPath) : ''
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return mutationBlocked('delete', path, 'File deletion is only available on the current working tree.', 409)
  }

  const pathType = getPathType(repoPath, path)
  if (pathType !== 'file') {
    return mutationBlocked('delete', path, 'The selected file is no longer available.', 404)
  }

  const currentToken = getFileRevisionToken(repoPath, path)
  if (!currentToken || currentToken !== payload.revisionToken) {
    return mutationBlocked('delete', path, 'The file changed on disk before your delete completed.', 409)
  }

  try {
    deleteWorkingTreeFile(repoPath, path)
    const result: ManualFileOperationResult = {
      ok: true,
      operation: 'delete',
      path,
      status: 'deleted',
      message: 'File deleted successfully.',
    }
    return c.json(result)
  } catch (error) {
    /* v8 ignore next -- filesystem helpers throw Error instances */
    return mutationBlocked('delete', path, error instanceof Error ? error.message : 'Failed to delete the file.', 400)
  }
}
