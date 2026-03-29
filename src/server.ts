import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { join } from 'node:path'
import { infoHandler, branchesHandler, commitsHandler, readmeHandler } from './handlers/git.js'
import { treeHandler, fileHandler } from './handlers/files.js'
import { pickHandler } from './handlers/pick.js'

type AppVariables = { repoPath: string }

// Mutable server state — single-threaded Node.js, no mutex needed
let currentRepoPath = ''

export function setRepoPath(path: string): void {
  currentRepoPath = path
}

export function getRepoPath(): string {
  return currentRepoPath
}

export function createApp(initialRepoPath: string): Hono<{ Variables: AppVariables }> {
  currentRepoPath = initialRepoPath

  const app = new Hono<{ Variables: AppVariables }>()

  // Inject repoPath into context for all handlers
  app.use('*', async (c, next) => {
    c.set('repoPath', currentRepoPath)
    await next()
  })

  // API routes
  app.get('/api/info', infoHandler)
  app.get('/api/branches', branchesHandler)
  app.get('/api/commits', commitsHandler)
  app.get('/api/readme', readmeHandler)
  app.get('/api/tree', treeHandler)
  app.get('/api/file', fileHandler)
  app.post('/api/pick', pickHandler)

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
