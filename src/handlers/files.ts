import type { Context } from 'hono'
import { spawnSync } from 'node:child_process'
import {
  applyFileSyncStates,
  countWorkingTreeFolderImpact,
  createWorkingTreeFolder,
  deleteWorkingTreeFile,
  deleteWorkingTreeFolder,
  detectFileType,
  getEditableState,
  getCurrentBranch,
  getFileRevisionToken,
  getRepoParentPath,
  getPathType,
  isWorkingTreeBranch,
  normalizeRepoRelativePath,
  readWorkingTreeFile,
  writeWorkingTreeTextFile,
} from '../git/repo.js'
import { listDir, listWorkingTreeDir } from '../git/tree.js'
import type {
  FileContent,
  FolderCreateRequest,
  FolderDeleteRequest,
  FolderOperation,
  FolderOperationResult,
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

function folderMutationBlocked(
  operation: FolderOperation,
  path: string,
  message: string,
  status: number,
  parentPath = '',
): Response {
  const body: FolderOperationResult = {
    ok: false,
    operation,
    path,
    /* v8 ignore next -- current folder handlers return blocked client errors */
    status: status >= 500 ? 'failed' : 'blocked',
    message,
    parentPath,
  }
  return Response.json(body, { status })
}

function buildDeleteWarning(name: string, fileCount: number, folderCount: number): string {
  const fileText = fileCount === 1 ? '1 file' : `${fileCount} files`
  const folderText = folderCount === 1 ? '1 nested folder' : `${folderCount} nested folders`
  return `This will permanently delete ${name} and all of its contents, including ${fileText} and ${folderText}.`
}

function parsePath(payload: ManualFileMutationRequest): string {
  return normalizeRepoRelativePath(payload.path ?? '')
}

export async function treeHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json([])
  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'
  const nodes = isWorkingTreeBranch(repoPath, branch) ? listWorkingTreeDir(repoPath, path) : listDir(repoPath, branch, path)
  const responseNodes = isWorkingTreeBranch(repoPath, branch) ? applyFileSyncStates(repoPath, nodes) : nodes
  return c.json(responseNodes)
}

export async function fileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const path = c.req.query('path') ?? ''
  const branch = c.req.query('branch') ?? 'HEAD'

  if (!path) return c.json({ error: 'path is required' }, 400)

  const { type, language } = detectFileType(path)

  if (isWorkingTreeBranch(repoPath, branch) && getPathType(repoPath, path) !== 'file') {
    return c.json({ error: 'File not found' }, 404)
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
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const branch = getCurrentBranch(repoPath)
  /* v8 ignore next 3 -- create requests always target the current working tree */
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return mutationBlocked('create', '', 'File creation is only available on the current working tree.', 409)
  }

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('create', path, 'A repository-relative file path is required.', 400)
  }

  if (payload.content !== undefined && typeof payload.content !== 'string') {
    return mutationBlocked('create', path, 'File content must be text.', 400)
  }

  if (getPathType(repoPath, path) !== 'missing') {
    return mutationBlocked('create', path, 'That path already exists in the repository.', 409)
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

export async function createFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const branch = getCurrentBranch(repoPath)
  /* v8 ignore next 3 -- folder creation always targets the current working tree */
  if (!isWorkingTreeBranch(repoPath, branch)) {
    return folderMutationBlocked('create-folder', '', 'Folder creation is only available on the current working tree.', 409)
  }

  const payload = (await c.req.json().catch(() => ({}))) as FolderCreateRequest
  const parentPath = normalizeRepoRelativePath(payload.parentPath ?? '')

  try {
    const path = createWorkingTreeFolder(repoPath, parentPath, payload.name ?? '')
    const result: FolderOperationResult = {
      ok: true,
      operation: 'create-folder',
      path,
      parentPath,
      status: 'created',
      message: 'Folder created successfully.',
      name: path.split('/').at(-1) ?? path,
    }
    return c.json(result, 201)
  } catch (error) {
    return folderMutationBlocked(
      'create-folder',
      parentPath,
      error instanceof Error ? error.message : 'Failed to create the folder.',
      400,
      parentPath,
    )
  }
}

export async function folderDeletePreviewHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  if (!isWorkingTreeBranch(repoPath, c.req.query('branch') ?? getCurrentBranch(repoPath))) {
    return folderMutationBlocked('preview-delete-folder', '', 'Folder deletion is only available on the current working tree.', 409)
  }

  const path = normalizeRepoRelativePath(c.req.query('path') ?? '')
  try {
    const impact = countWorkingTreeFolderImpact(repoPath, path)
    const result: FolderOperationResult = {
      ok: true,
      operation: 'preview-delete-folder',
      status: 'previewed',
      message: buildDeleteWarning(impact.name, impact.fileCount, impact.folderCount),
      ...impact,
    }
    return c.json(result)
  } catch (error) {
    return folderMutationBlocked(
      'preview-delete-folder',
      path,
      error instanceof Error ? error.message : 'Failed to inspect the folder.',
      400,
      getRepoParentPath(path),
    )
  }
}

export async function updateFileHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('update', path, 'A repository-relative file path is required.', 400)
  }

  if (typeof payload.content !== 'string') {
    return mutationBlocked('update', path, 'Updated file content is required.', 400)
  }

  if (!payload.revisionToken) {
    return mutationBlocked('update', path, 'A file revision token is required to save changes.', 409)
  }

  if (!isWorkingTreeBranch(repoPath, c.req.query('branch') ?? getCurrentBranch(repoPath))) {
    return mutationBlocked('update', path, 'File updates are only available on the current working tree.', 409)
  }

  if (getPathType(repoPath, path) !== 'file') {
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

  writeWorkingTreeTextFile(repoPath, path, payload.content)
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
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  const payload = (await c.req.json().catch(() => ({}))) as ManualFileMutationRequest
  const path = parsePath(payload)
  if (!path) {
    return mutationBlocked('delete', path, 'A repository-relative file path is required.', 400)
  }

  if (!payload.revisionToken) {
    return mutationBlocked('delete', path, 'A file revision token is required to delete a file.', 409)
  }

  if (!isWorkingTreeBranch(repoPath, c.req.query('branch') ?? getCurrentBranch(repoPath))) {
    return mutationBlocked('delete', path, 'File deletion is only available on the current working tree.', 409)
  }

  if (getPathType(repoPath, path) !== 'file') {
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

export async function deleteFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No repository loaded' }, 400)

  if (!isWorkingTreeBranch(repoPath, c.req.query('branch') ?? getCurrentBranch(repoPath))) {
    return folderMutationBlocked('delete-folder', '', 'Folder deletion is only available on the current working tree.', 409)
  }

  const payload = (await c.req.json().catch(() => ({}))) as FolderDeleteRequest
  const path = normalizeRepoRelativePath(payload.path ?? '')
  /* v8 ignore next -- split().at(-1) always returns a string for normalized paths */
  const expectedName = path.split('/').at(-1) ?? ''
  if (!expectedName || payload.confirmationName !== expectedName) {
    return folderMutationBlocked(
      'delete-folder',
      path,
      'Type the exact folder name to confirm deletion.',
      409,
      getRepoParentPath(path),
    )
  }

  try {
    const impact = deleteWorkingTreeFolder(repoPath, path)
    const result: FolderOperationResult = {
      ok: true,
      operation: 'delete-folder',
      status: 'deleted',
      message: 'Folder deleted successfully.',
      ...impact,
    }
    return c.json(result)
  } catch (error) {
    return folderMutationBlocked(
      'delete-folder',
      path,
      /* v8 ignore next -- filesystem helpers throw Error instances */
      error instanceof Error ? error.message : 'Failed to delete the folder.',
      400,
      getRepoParentPath(path),
    )
  }
}
