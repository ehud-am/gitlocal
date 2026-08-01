import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { basename, dirname, join, relative, resolve } from 'node:path'
import {
  infoHandler,
  branchesHandler,
  branchSwitchHandler,
  commitChangesHandler,
  commitsHandler,
  gitContextHandler,
  gitIdentitySshKeysHandler,
  gitIdentitySshKeyValidateHandler,
  gitIdentityUpdateHandler,
  readmeHandler,
  remoteSyncHandler,
  repositoryOpenHandler,
  repositoryParentFolderHandler,
  repositoryChangesHandler,
  repositoryLocationHandler,
  repositoryNavigationHintsHandler,
  repositorySummaryHandler,
  defaultReaderPreferenceHandler,
  defaultReaderPreferenceUpdateHandler,
  startupOpenTargetHandler,
  startupFolderHandler,
  startupFolderUpdateHandler,
} from './handlers/repo.js'
import {
  treeHandler,
  fileHandler,
  createFileHandler,
  updateFileHandler,
  deleteFileHandler,
} from './handlers/file.js'
import {
  folderBrowseHandler,
  folderCloneRepositoryHandler,
  createFolderHandler,
  folderCreateChildHandler,
  folderDeletePreviewHandler,
  folderInitRepositoryHandler,
  deleteFolderHandler,
} from './handlers/folder.js'
import { searchHandler } from './handlers/search.js'
import { syncHandler } from './handlers/sync.js'
import { classifyLocalPath } from './git/repo.js'
import { resolveStartupFolder } from './services/startup-preferences.js'
import type { StartupFolderResolution, StartupOpenSource, StartupOpenTarget, ViewerPathType } from './types.js'

type AppVariables = { repoPath: string; pickerPath: string }
type CreateAppOptions = {
  detectCurrentRepoOnEmptyPath?: boolean
  initialOpenSource?: StartupOpenSource
  startupFolderResolution?: StartupFolderResolution
}

// Mutable server state — single-threaded Node.js, no mutex needed
let currentRepoPath = ''
let currentPickerPath = ''
let currentStartupOpenTarget: StartupOpenTarget | null = null
let currentStartupFolderResolution: StartupFolderResolution | null = null

export function setRepoPath(path: string): void {
  currentRepoPath = path
}

export function setPickerPath(path: string): void {
  currentPickerPath = path
}

export function getRepoPath(): string {
  return currentRepoPath
}

export function getPickerPath(): string {
  return currentPickerPath
}

export function setStartupOpenTarget(target: StartupOpenTarget | null): void {
  currentStartupOpenTarget = target
}

export function getStartupOpenTarget(): StartupOpenTarget | null {
  return currentStartupOpenTarget
}

// The CLI/native launcher resolves the startup folder once, synchronously, before this
// server starts — and then immediately persists the resolved folder as the new "last used"
// preference, which would otherwise erase the very fallbackReason (e.g. "your last folder
// is gone") this endpoint exists to report. Returning the captured snapshot preserves that
// one-time information for the lifetime of this server process; only fall back to computing
// fresh when no snapshot was captured (e.g. direct handler/unit tests).
export function getStartupFolderResolution(): StartupFolderResolution {
  return currentStartupFolderResolution ?? resolveStartupFolder()
}

const FS_ERROR_CODE_MAP: Record<string, string> = {
  ENOENT: 'NOT_FOUND',
  EACCES: 'PERMISSION_DENIED',
  EPERM: 'PERMISSION_DENIED',
  ENOTDIR: 'UNAVAILABLE',
  EBUSY: 'UNAVAILABLE',
  ESTALE: 'UNAVAILABLE',
}

const FS_ERROR_MESSAGE_MAP: Record<string, string> = {
  NOT_FOUND: 'The requested path could not be found.',
  PERMISSION_DENIED: 'Permission was denied while accessing this path.',
  UNAVAILABLE: 'This path is currently unavailable.',
}

export function classifyServerError(err: unknown): { error: string; code: string } {
  const nodeCode = (err as NodeJS.ErrnoException | undefined)?.code
  const code = (nodeCode && FS_ERROR_CODE_MAP[nodeCode]) || 'UNKNOWN'
  return { error: FS_ERROR_MESSAGE_MAP[code] ?? 'An unexpected error occurred.', code }
}

function createStartupOpenTargetFailure(
  inputPath: string,
  source: StartupOpenSource,
  message: string,
  status: StartupOpenTarget['status'] = 'failed',
): StartupOpenTarget {
  return {
    source,
    inputPath: inputPath ? resolve(inputPath) : '',
    rootPath: '',
    selectedPath: '',
    selectedPathType: 'none',
    status,
    message,
    receivedAt: new Date().toISOString(),
  }
}

function isSupportedMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path)
}

export function resolveOpenTarget(inputPath: string, source: StartupOpenSource): StartupOpenTarget {
  const classification = classifyLocalPath(inputPath)
  if (!inputPath) {
    return createStartupOpenTargetFailure(inputPath, source, 'path is required', 'blocked')
  }

  if (!classification.exists || classification.openMode === 'blocked') {
    return createStartupOpenTargetFailure(
      inputPath,
      source,
      classification.message ?? `Path does not exist: ${inputPath}`,
      classification.pathType === 'missing' ? 'failed' : 'blocked',
    )
  }

  if (classification.pathType !== 'file') {
    return createStartupOpenTargetFailure(
      inputPath,
      source,
      `Only Markdown files can be opened directly: ${classification.canonicalPath}`,
      'blocked',
    )
  }

  if (!isSupportedMarkdownPath(classification.canonicalPath)) {
    return createStartupOpenTargetFailure(
      inputPath,
      source,
      `Unsupported file type: ${classification.canonicalPath}. GitLocal can open Markdown files.`,
      'blocked',
    )
  }

  const rootPath = classification.repositoryRootPath ?? dirname(classification.canonicalPath)
  const selectedPath = classification.repositoryRootPath
    ? relative(rootPath, classification.canonicalPath).split('\\').join('/')
    : basename(classification.canonicalPath)
  const selectedPathType: ViewerPathType = 'file'

  return {
    source,
    inputPath: classification.canonicalPath,
    rootPath,
    selectedPath,
    selectedPathType,
    status: 'accepted',
    message: `Opened ${selectedPath}.`,
    receivedAt: new Date().toISOString(),
    gitState: classification.gitState,
    openMode: classification.openMode,
    ...(classification.repositoryRootPath ? { repositoryRootPath: classification.repositoryRootPath } : {}),
  }
}

function initializePaths(initialPath: string, options: CreateAppOptions = {}): void {
  currentStartupOpenTarget = null
  currentStartupFolderResolution = options.startupFolderResolution ?? null
  if (!initialPath) {
    const cwd = process.cwd()
    const cwdClassification = classifyLocalPath(cwd)
    if (options.detectCurrentRepoOnEmptyPath && cwdClassification.gitState === 'repository-root') {
      currentRepoPath = cwdClassification.repositoryRootPath!
      currentPickerPath = ''
      return
    }

    currentRepoPath = ''
    currentPickerPath = cwd
    return
  }

  const resolvedPath = resolve(initialPath)
  const classification = classifyLocalPath(resolvedPath)
  if (classification.pathType === 'file' || options.initialOpenSource) {
    const target = resolveOpenTarget(resolvedPath, options.initialOpenSource ?? 'explicit-launch')
    currentStartupOpenTarget = target
    if (target.status === 'accepted' && target.rootPath) {
      currentRepoPath = target.rootPath
      currentPickerPath = ''
      return
    }
    if (options.initialOpenSource) {
      currentRepoPath = ''
      currentPickerPath = process.cwd()
      return
    }
  }

  if (classification.gitState === 'repository-root') {
    currentRepoPath = classification.repositoryRootPath!
    currentPickerPath = ''
    return
  }

  currentRepoPath = classification.canonicalPath || resolvedPath
  currentPickerPath = ''
}

export function createApp(initialRepoPath: string, options: CreateAppOptions = {}): Hono<{ Variables: AppVariables }> {
  initializePaths(initialRepoPath, options)

  const app = new Hono<{ Variables: AppVariables }>()

  app.onError((err, c) => {
    const body = classifyServerError(err)
    return c.json(body, 500)
  })

  // Inject repoPath and pickerPath into context for all handlers
  app.use('*', async (c, next) => {
    c.set('repoPath', currentRepoPath)
    c.set('pickerPath', currentPickerPath)
    await next()
  })

  // API routes
  app.get('/api/info', infoHandler)
  app.get('/api/startup-folder', startupFolderHandler)
  app.put('/api/startup-folder', startupFolderUpdateHandler)
  app.get('/api/startup-open-target', startupOpenTargetHandler)
  app.get('/api/default-reader-preference', defaultReaderPreferenceHandler)
  app.put('/api/default-reader-preference', defaultReaderPreferenceUpdateHandler)
  app.get('/api/branches', branchesHandler)
  app.post('/api/branches/switch', branchSwitchHandler)
  app.post('/api/git/commit', commitChangesHandler)
  app.get('/api/git/context', gitContextHandler)
  app.get('/api/git/identity/ssh-keys', gitIdentitySshKeysHandler)
  app.post('/api/git/identity/ssh-key/validate', gitIdentitySshKeyValidateHandler)
  app.put('/api/git/identity', gitIdentityUpdateHandler)
  app.post('/api/git/sync', remoteSyncHandler)
  app.get('/api/commits', commitsHandler)
  app.get('/api/readme', readmeHandler)
  app.get('/api/tree', treeHandler)
  app.get('/api/file', fileHandler)
  app.post('/api/file', createFileHandler)
  app.put('/api/file', updateFileHandler)
  app.delete('/api/file', deleteFileHandler)
  app.post('/api/folder', createFolderHandler)
  app.get('/api/folder/delete-preview', folderDeletePreviewHandler)
  app.delete('/api/folder', deleteFolderHandler)
  app.get('/api/folder/browse', folderBrowseHandler)
  app.post('/api/folder/create-child', folderCreateChildHandler)
  app.post('/api/folder/init-repository', folderInitRepositoryHandler)
  app.post('/api/folder/clone-repository', folderCloneRepositoryHandler)
  app.post('/api/repo/open', repositoryOpenHandler)
  app.post('/api/repo/parent-folder', repositoryParentFolderHandler)
  app.get('/api/repo/summary', repositorySummaryHandler)
  app.get('/api/repo/changes', repositoryChangesHandler)
  app.get('/api/repo/location', repositoryLocationHandler)
  app.get('/api/repo/navigation-hints', repositoryNavigationHintsHandler)
  app.get('/api/search', searchHandler)
  app.get('/api/sync', syncHandler)

  // Static file serving with SPA fallback
  const uiDir = join(import.meta.dirname, '../ui/dist')
  app.use(
    '/*',
    serveStatic({
      root: uiDir,
    }),
  )
  // SPA fallback — serve index.html for any unmatched path
  app.get('/*', async (c) => {
    return c.html(
      await import('node:fs').then((fs) => {
        try {
          return fs.readFileSync(join(uiDir, 'index.html'), 'utf-8')
          /* v8 ignore next 3 */
        } catch {
          return '<html><body><p>UI not built. Run <code>npm run build:ui</code></p></body></html>'
        }
      }),
    )
  })

  return app
}
