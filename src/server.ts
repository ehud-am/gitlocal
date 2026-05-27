import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { join, resolve } from 'node:path'
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

type AppVariables = { repoPath: string; pickerPath: string }
type CreateAppOptions = { detectCurrentRepoOnEmptyPath?: boolean }

// Mutable server state — single-threaded Node.js, no mutex needed
let currentRepoPath = ''
let currentPickerPath = ''

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

function initializePaths(initialPath: string, options: CreateAppOptions = {}): void {
  if (!initialPath) {
    const cwd = process.cwd()
    const cwdClassification = classifyLocalPath(cwd)
    if (options.detectCurrentRepoOnEmptyPath && cwdClassification.gitState === 'repository-root') {
      currentRepoPath = cwdClassification.canonicalPath
      currentPickerPath = ''
      return
    }

    currentRepoPath = ''
    currentPickerPath = cwd
    return
  }

  const resolvedPath = resolve(initialPath)
  const classification = classifyLocalPath(resolvedPath)
  if (classification.gitState === 'repository-root') {
    currentRepoPath = classification.canonicalPath
    currentPickerPath = ''
    return
  }

  currentRepoPath = classification.canonicalPath || resolvedPath
  currentPickerPath = ''
}

export function createApp(initialRepoPath: string, options: CreateAppOptions = {}): Hono<{ Variables: AppVariables }> {
  initializePaths(initialRepoPath, options)

  const app = new Hono<{ Variables: AppVariables }>()

  // Inject repoPath and pickerPath into context for all handlers
  app.use('*', async (c, next) => {
    c.set('repoPath', currentRepoPath)
    c.set('pickerPath', currentPickerPath)
    await next()
  })

  // API routes
  app.get('/api/info', infoHandler)
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
