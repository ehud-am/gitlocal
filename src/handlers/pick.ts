import type { Context } from 'hono'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { cloneRepositoryInto, createChildFolder, initializeGitRepository, validateRepo } from '../git/repo.js'
import { getPickerPath, setPickerPath, setRepoPath } from '../server.js'
import type {
  PickCloneRequest,
  PickBrowseEntry,
  PickBrowseResponse,
  PickCreateFolderRequest,
  PickInitGitRequest,
  PickRequest,
  PickResponse,
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

function listDirectories(currentPath: string): PickBrowseEntry[] {
  try {
    return readdirSync(currentPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const path = resolve(currentPath, entry.name)
        return {
          name: entry.name,
          path,
          isGitRepo: validateRepo(path),
        }
      })
      .sort((a, b) => {
        /* v8 ignore next */
        if (a.isGitRepo !== b.isGitRepo) return a.isGitRepo ? -1 : 1
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

function getBrowseCapabilities(currentPath: string): Pick<PickBrowseResponse, 'isGitRepo' | 'canOpen' | 'canCreateChild' | 'canInitGit' | 'canCloneIntoChild'> {
  const exists = existsSync(currentPath)
  const isDirectory = exists && statSync(currentPath).isDirectory()
  const isGitRepo = isDirectory && validateRepo(currentPath)

  return {
    isGitRepo,
    canOpen: isGitRepo,
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

export async function pickBrowseHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const requestedPath = c.req.query('path') ?? ''
  const homePath = homedir()
  /* v8 ignore next */
  const defaultPath = getPickerPath() || homePath
  const currentPath = requestedPath ? resolve(requestedPath) : defaultPath

  if (!existsSync(currentPath)) {
    const res: PickBrowseResponse = {
      currentPath,
      parentPath: null,
      homePath,
      roots: getRoots().map((path) => ({ name: path, path })),
      entries: [],
      error: `Path does not exist: ${currentPath}`,
      isGitRepo: false,
      canOpen: false,
      canCreateChild: false,
      canInitGit: false,
      canCloneIntoChild: false,
    }
    return c.json(res)
  }

  setPickerPath(currentPath)

  const res: PickBrowseResponse = {
    currentPath,
    parentPath: getParentPath(currentPath),
    homePath,
    roots: getRoots().map((path) => ({ name: path, path })),
    entries: listDirectories(currentPath),
    error: '',
    ...getBrowseCapabilities(currentPath),
  }
  return c.json(res)
}

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
  setPickerPath('')
  const res: PickResponse = { ok: true, error: '' }
  return c.json(res)
}

export async function pickParentHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  const repoPath = c.get('repoPath')
  if (!repoPath) {
    return c.json({ ok: false, error: 'No repository is currently open' })
  }

  const parentPath = dirname(repoPath)
  setRepoPath('')
  setPickerPath(parentPath)
  return c.json({ ok: true, error: '' })
}

export async function pickCreateFolderHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: PickCreateFolderRequest
  try {
    payload = await c.req.json<PickCreateFolderRequest>()
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

export async function pickInitGitHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: PickInitGitRequest
  try {
    payload = await c.req.json<PickInitGitRequest>()
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

export async function pickCloneHandler(c: Context<{ Variables: Variables }>): Promise<Response> {
  let payload: PickCloneRequest
  try {
    payload = await c.req.json<PickCloneRequest>()
  } catch {
    return c.json({ ok: false, error: 'Invalid JSON body.' })
  }

  try {
    const path = cloneRepositoryInto(
      payload.parentPath ?? '',
      payload.name ?? '',
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
