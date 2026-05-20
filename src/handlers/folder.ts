import type { Context } from 'hono'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import {
  cloneRepositoryInto,
  countWorkingTreeFolderImpact,
  createChildFolder,
  createWorkingTreeFolder,
  deleteWorkingTreeFolder,
  classifyLocalPath,
  getCurrentBranch,
  getRepoParentPath,
  initializeGitRepository,
  isWorkingTreeBranch,
  normalizeRepoRelativePath,
  validateRepo,
} from '../git/repo.js'
import { getPickerPath, setPickerPath } from '../server.js'
import type {
  FolderBrowseEntry,
  FolderBrowseResponse,
  FolderCloneRepositoryRequest,
  FolderCreateRequest,
  FolderCreateChildRequest,
  FolderDeleteRequest,
  FolderInitRepositoryRequest,
  FolderOperation,
  FolderOperationResult,
  FolderOperationStatus,
  LocalActionResponse,
} from '../types.js'

type Variables = { repoPath: string; pickerPath: string }

function getRoots(): string[] {
  /* v8 ignore next 10 */
  if (process.platform === 'win32') {
    const roots: string[] = []

    for (let code = 65; code <= 90; code += 1) {
      const root = `${String.fromCharCode(code)}:\\`
      if (existsSync(root)) roots.push(root)
    }

    return roots.length > 0 ? roots : [homedir()]
  }

  return [sep]
}

function listFolderEntries(currentPath: string): FolderBrowseEntry[] {
  try {
    return readdirSync(currentPath, { withFileTypes: true })
      .map((entry) => {
        const path = resolve(currentPath, entry.name)
        const classification = classifyLocalPath(path)
        const type = classification.pathType === 'directory' ? 'dir' as const : 'file' as const
        return {
          name: entry.name,
          path,
          type,
          isGitRepo: type === 'dir' && classification.gitState === 'repository-root',
          gitState: type === 'dir' ? classification.gitState : undefined,
          openMode: classification.openMode,
          ...(classification.repositoryRootPath ? { repositoryRootPath: classification.repositoryRootPath } : {}),
        }
      })
      .sort((a, b) => {
        /* v8 ignore next */
        if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    /* v8 ignore next 3 */
  } catch {
    return []
  }
}

function getParentPath(currentPath: string): string | null {
  const parent = dirname(currentPath)
  return parent === currentPath ? null : parent
}

function getBrowseCapabilities(currentPath: string): Pick<FolderBrowseResponse, 'isGitRepo' | 'gitState' | 'openMode' | 'repositoryRootPath' | 'canOpen' | 'canCreateChild' | 'canInitGit' | 'canCloneIntoChild'> {
  const exists = existsSync(currentPath)
  const isDirectory = exists && statSync(currentPath).isDirectory()
  const classification = exists ? classifyLocalPath(currentPath) : null
  const isGitRepo = isDirectory && classification?.gitState === 'repository-root'

  return {
    isGitRepo,
    ...(classification ? { gitState: classification.gitState, openMode: classification.openMode } : {}),
    ...(classification?.repositoryRootPath ? { repositoryRootPath: classification.repositoryRootPath } : {}),
    canOpen: isDirectory,
    canCreateChild: isDirectory,
    canInitGit: isDirectory && !isGitRepo,
    canCloneIntoChild: isDirectory,
  }
}

function getActionError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message
  /* v8 ignore next -- helpers always throw Error instances, this is defensive */
  return fallback
}

function folderMutationBlocked(
  operation: FolderOperation,
  path: string,
  message: string,
  status: number,
  parentPath = '',
  resultStatus: FolderOperationStatus = 'blocked',
): Response {
  const body: FolderOperationResult = {
    ok: false,
    operation,
    path,
    status: resultStatus,
    message,
    parentPath,
  }
  return Response.json(body, { status })
}

function isFilesystemError(error: unknown): boolean {
  return error instanceof Error && typeof (error as NodeJS.ErrnoException).code === 'string'
}

function hasDeletePreviewImpact(payload: FolderDeleteRequest): boolean {
  return Number.isInteger(payload.previewFileCount)
    && payload.previewFileCount >= 0
    && Number.isInteger(payload.previewFolderCount)
    && payload.previewFolderCount >= 0
    && typeof payload.previewImpactToken === 'string'
    && payload.previewImpactToken.length > 0
}

function buildDeleteWarning(name: string, fileCount: number, folderCount: number): string {
  const fileText = fileCount === 1 ? '1 file' : `${fileCount} files`
  const folderText = folderCount === 1 ? '1 nested folder' : `${folderCount} nested folders`
  return `This will permanently delete ${name} and all of its contents, including ${fileText} and ${folderText}.`
}

export async function folderBrowseHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const requestedPath = c.req.query('path') ?? ''
  const homePath = homedir()
  /* v8 ignore next */
  const defaultPath = getPickerPath() || homePath
  const currentPath = requestedPath ? resolve(requestedPath) : defaultPath

  if (!existsSync(currentPath)) {
    const res: FolderBrowseResponse = {
      currentPath,
      parentPath: null,
      homePath,
      roots: getRoots().map((path) => ({ name: path, path })),
      entries: [],
      error: `Path does not exist: ${currentPath}`,
      isGitRepo: false,
      gitState: 'outside-repository',
      openMode: 'blocked',
      canOpen: false,
      canCreateChild: false,
      canInitGit: false,
      canCloneIntoChild: false,
    }
    return c.json(res)
  }

  setPickerPath(currentPath)

  const res: FolderBrowseResponse = {
    currentPath,
    parentPath: getParentPath(currentPath),
    homePath,
    roots: getRoots().map((path) => ({ name: path, path })),
    entries: listFolderEntries(currentPath),
    error: '',
    ...getBrowseCapabilities(currentPath),
  }
  return c.json(res)
}

export async function folderCreateChildHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: FolderCreateChildRequest
  try {
    payload = await c.req.json<FolderCreateChildRequest>()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body.' })
  }

  try {
    const path = createChildFolder(payload.parentPath ?? '', payload.name ?? '')
    return c.json({
      ok: true,
      error: '',
      path,
      message: 'Folder created successfully.',
    })
  } catch (error) {
    return c.json({
      ok: false,
      error: getActionError(error, 'Failed to create the folder.'),
    })
  }
}

export async function createFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const branch = validateRepo(repoPath) ? getCurrentBranch(repoPath) : ''
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
    const failed = isFilesystemError(error)
    return folderMutationBlocked(
      'create-folder',
      parentPath,
      /* v8 ignore next -- filesystem helpers throw Error instances */
      error instanceof Error ? error.message : 'Failed to create the folder.',
      failed ? 500 : 400,
      parentPath,
      failed ? 'failed' : 'blocked',
    )
  }
}

export async function folderDeletePreviewHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const branch = validateRepo(repoPath) ? c.req.query('branch') ?? getCurrentBranch(repoPath) : ''
  if (!isWorkingTreeBranch(repoPath, branch)) {
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
      /* v8 ignore next -- filesystem helpers throw Error instances */
      error instanceof Error ? error.message : 'Failed to inspect the folder.',
      400,
      getRepoParentPath(path),
    )
  }
}

export async function folderInitRepositoryHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: FolderInitRepositoryRequest
  try {
    payload = await c.req.json<FolderInitRepositoryRequest>()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body.' })
  }

  try {
    const path = initializeGitRepository(payload.path ?? '')
    return c.json({
      ok: true,
      error: '',
      path,
      message: 'Git repository initialized successfully.',
    })
  } catch (error) {
    return c.json({
      ok: false,
      error: getActionError(error, 'Failed to initialize the repository.'),
    })
  }
}

export async function folderCloneRepositoryHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: FolderCloneRepositoryRequest
  try {
    payload = await c.req.json<FolderCloneRepositoryRequest>()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body.' })
  }

  try {
    const path = cloneRepositoryInto(
      payload.parentPath ?? '',
      /* v8 ignore next -- request validation tests pass an object even when fields are missing */
      payload.name ?? '',
      /* v8 ignore next -- request validation tests pass an object even when fields are missing */
      payload.repositoryUrl ?? '',
    )
    return c.json({
      ok: true,
      error: '',
      path,
      message: 'Repository cloned successfully.',
    })
  } catch (error) {
    return c.json({
      ok: false,
      error: getActionError(error, 'Failed to clone the repository.'),
    })
  }
}

export async function deleteFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) return c.json({ error: 'No folder loaded' }, 400)

  const branch = validateRepo(repoPath) ? c.req.query('branch') ?? getCurrentBranch(repoPath) : ''
  if (!isWorkingTreeBranch(repoPath, branch)) {
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
    const previewImpact = countWorkingTreeFolderImpact(repoPath, path)
    if (
      !hasDeletePreviewImpact(payload)
      || payload.previewFileCount !== previewImpact.fileCount
      || payload.previewFolderCount !== previewImpact.folderCount
      || payload.previewImpactToken !== previewImpact.impactToken
    ) {
      return folderMutationBlocked(
        'delete-folder',
        path,
        'The folder contents changed after the preview. Refresh the delete confirmation before deleting.',
        409,
        previewImpact.parentPath,
      )
    }

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
    const failed = isFilesystemError(error)
    return folderMutationBlocked(
      'delete-folder',
      path,
      /* v8 ignore next -- filesystem helpers throw Error instances */
      error instanceof Error ? error.message : 'Failed to delete the folder.',
      failed ? 500 : 400,
      getRepoParentPath(path),
      failed ? 'failed' : 'blocked',
    )
  }
}
