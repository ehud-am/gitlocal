import { serve } from '@hono/node-server'
import { createApp } from './server.js'

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

async function main(): Promise<void> {
  checkNodeVersion()

  const repoPath = process.argv[2] ?? ''
  const app = createApp(repoPath)

  const server = serve({ fetch: app.fetch, port: 0 }, async (info) => {
    const url = `http://localhost:${info.port}`
    console.log(`gitlocal listening on ${url}`)
    if (repoPath) {
      console.log(`Serving: ${repoPath}`)
    } else {
      console.log('No repository specified — opening folder picker.')
    }
    await openBrowser(url)
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
