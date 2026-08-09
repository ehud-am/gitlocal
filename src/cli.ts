import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import { classifyLocalPath, validateRepo } from './git/repo.js'
import { createApp, getRepoPath, getStartupOpenTarget } from './server.js'
import { rememberStartupFolder, resolveStartupFolder } from './services/startup-preferences.js'
import { attachTerminalWebSocketServer } from './terminal/websocket.js'

function checkNodeVersion(): void {
  const [major] = process.versions.node.split('.').map(Number)
  if (major < 22) {
    console.error(
      `gitlocal requires Node.js 22 or higher. You are running Node.js ${process.versions.node}.\n` +
        'Please upgrade: https://nodejs.org',
    )
    process.exit(1)
  }
}

function reportBrowserOpenFailure(url: string): void {
  // Non-fatal, but the user needs an explicit next step — the "gitlocal listening on ..."
  // line above is easy to miss, and without this nothing else on screen tells them what to do.
  console.log(`GitLocal could not open a browser automatically. Open ${url} in your browser to continue.`)
}

async function openBrowser(url: string): Promise<void> {
  try {
    const { default: open } = await import('open')
    const subprocess = await open(url)
    // `open()`'s default (non-`wait`) mode resolves with a bare ChildProcess and attaches no
    // error listener of its own — an async spawn failure (e.g. no browser opener installed)
    // would otherwise be an unhandled 'error' event that crashes this entire server process,
    // not just a failed browser-open. This listener is what actually makes the try/catch above
    // meaningful for that failure mode, which is asynchronous and happens after `open()` returns.
    subprocess.once('error', () => reportBrowserOpenFailure(url))
  } catch {
    reportBrowserOpenFailure(url)
  }
}

function parseArgs(argv: string[]): { repoPath: string; openSystemBrowser: boolean } {
  let openSystemBrowser = true
  const positional: string[] = []

  for (const arg of argv) {
    if (arg === '--app-mode' || arg === '--no-open') {
      openSystemBrowser = false
    } else {
      positional.push(arg)
    }
  }

  return {
    repoPath: positional[0] ?? '',
    openSystemBrowser,
  }
}

async function main(): Promise<void> {
  checkNodeVersion()

  const { repoPath, openSystemBrowser } = parseArgs(process.argv.slice(2))
  const explicitClassification = repoPath ? classifyLocalPath(repoPath) : null
  const explicitFileLaunch = explicitClassification?.pathType === 'file' || (repoPath && !explicitClassification?.exists)
  const startupFolder = explicitFileLaunch ? null : resolveStartupFolder({ explicitPath: repoPath })
  const launchPath = explicitFileLaunch ? repoPath : startupFolder!.path
  const openingCurrentRepo = !repoPath && validateRepo(launchPath)
  const app = createApp(launchPath, {
    detectCurrentRepoOnEmptyPath: true,
    initialOpenSource: explicitFileLaunch ? 'explicit-launch' : undefined,
    // Captured now, before rememberStartupFolder (below) overwrites the "last used" preference
    // this resolution was computed from — otherwise /api/startup-folder would recompute fresh
    // from the already-mutated file and the fallbackReason (e.g. "your last folder is gone")
    // would be lost before the UI ever gets a chance to fetch and show it.
    startupFolderResolution: startupFolder ?? undefined,
  })
  const startupTarget = getStartupOpenTarget()
  if (startupTarget?.status === 'accepted' && getRepoPath()) {
    rememberStartupFolder(getRepoPath(), 'explicit-launch')
  } else if (startupFolder?.readable) {
    rememberStartupFolder(launchPath, repoPath ? 'explicit-launch' : 'native-open')
  }

  const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 }, async (info) => {
    const url = `http://127.0.0.1:${info.port}`
    console.log(`gitlocal listening on ${url}`)
    if (startupTarget?.status === 'accepted') {
      console.log(`Serving: ${startupTarget.rootPath}`)
      console.log(`Selected file: ${startupTarget.selectedPath}`)
    } else if (startupTarget) {
      console.log(startupTarget.message)
    } else if (repoPath) {
      console.log(`Serving: ${launchPath}`)
    } else if (openingCurrentRepo) {
      console.log(`Serving current repository: ${launchPath}`)
    } else {
      console.log(`No folder specified — opening: ${launchPath}`)
    }
    if (openSystemBrowser) {
      await openBrowser(url)
    }
  })

  // @hono/node-server's serve() always returns a plain http.Server here (no HTTPS/HTTP2
  // options are passed above), so this cast reflects the real runtime type.
  attachTerminalWebSocketServer(server as Server)

  const shutdown = (): void => {
    console.log('\nShutting down...')
    server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
