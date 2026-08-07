import type { ServerType as HttpServer } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { createTerminalServer, type PtySpawnFn, type TerminalServerHandle } from '../handlers/terminal.js'

/**
 * Production wiring for the terminal WebSocket route: real `ws` WebSocketServer +
 * real `node-pty` process spawning. Kept as a thin separate module (rather than importing
 * `ws`/`node-pty` directly into `terminal.ts`) so `terminal.ts`'s session-management logic
 * stays fully testable against lightweight fakes, without ever needing to load the native
 * `node-pty` addon in unit tests.
 *
 * `node-pty` is loaded dynamically (not statically imported) because its native binding load
 * is a real, environment-dependent failure mode (missing prebuild for the platform/arch, no
 * build toolchain to compile one) — a static import would run that load during module graph
 * evaluation, before the HTTP server even starts, taking down the entire app over a feature
 * (terminal panes) that the rest of GitLocal doesn't depend on.
 */
export async function attachTerminalServer(
  httpServer: HttpServer,
  getRepoPath: () => string,
): Promise<TerminalServerHandle> {
  let spawnPty: PtySpawnFn
  try {
    ;({ spawn: spawnPty } = await import('node-pty'))
  } catch (err) {
    console.error(
      'Terminal panes are unavailable: node-pty failed to load its native binding for this platform.',
      /* v8 ignore next -- module resolution/native-binding load failures always throw Error instances */
      err instanceof Error ? err.message : err,
    )
    spawnPty = () => {
      throw new Error('Terminal panes are unavailable on this platform.')
    }
  }

  return createTerminalServer(httpServer, {
    createWebSocketServer: () => new WebSocketServer({ noServer: true }),
    spawnPty,
    getRepoPath,
  })
}
