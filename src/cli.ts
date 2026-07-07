import { serve } from '@hono/node-server'
import { classifyLocalPath, validateRepo } from './git/repo.js'
import { createApp, getRepoPath, getStartupOpenTarget } from './server.js'
import { rememberStartupFolder, resolveStartupFolder } from './services/startup-preferences.js'

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

async function openBrowser(url: string): Promise<void> {
  try {
    const { default: open } = await import('open')
    await open(url)
  } catch {
    // Non-fatal — user can open browser manually
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
