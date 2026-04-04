import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { join, resolve } from 'node:path'
import { infoHandler, branchesHandler, commitsHandler, readmeHandler } from './handlers/git.js'
import { treeHandler, fileHandler, createFileHandler, updateFileHandler, deleteFileHandler } from './handlers/files.js'
import { pickBrowseHandler, pickHandler, pickParentHandler } from './handlers/pick.js'
import { searchHandler } from './handlers/search.js'
import { syncHandler } from './handlers/sync.js'
import { validateRepo } from './git/repo.js'

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
    if (options.detectCurrentRepoOnEmptyPath && validateRepo(cwd)) {
      currentRepoPath = cwd
      currentPickerPath = ''
      return
    }

    currentRepoPath = ''
    currentPickerPath = cwd
    return
  }

  const resolvedPath = resolve(initialPath)
  if (validateRepo(resolvedPath)) {
    currentRepoPath = resolvedPath
    currentPickerPath = ''
    return
  }

  currentRepoPath = ''
  currentPickerPath = resolvedPath
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
  app.get('/api/commits', commitsHandler)
  app.get('/api/readme', readmeHandler)
  app.get('/api/tree', treeHandler)
  app.get('/api/file', fileHandler)
  app.post('/api/file', createFileHandler)
  app.put('/api/file', updateFileHandler)
  app.delete('/api/file', deleteFileHandler)
  app.get('/api/search', searchHandler)
  app.get('/api/sync', syncHandler)
  app.get('/api/pick/browse', pickBrowseHandler)
  app.post('/api/pick', pickHandler)
  app.post('/api/pick/parent', pickParentHandler)

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
