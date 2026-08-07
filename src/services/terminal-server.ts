import type { ServerType as HttpServer } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { spawn } from 'node-pty'
import { createTerminalServer, type TerminalServerHandle } from '../handlers/terminal.js'

/**
 * Production wiring for the terminal WebSocket route: real `ws` WebSocketServer +
 * real `node-pty` process spawning. Kept as a thin separate module (rather than importing
 * `ws`/`node-pty` directly into `terminal.ts`) so `terminal.ts`'s session-management logic
 * stays fully testable against lightweight fakes, without ever needing to load the native
 * `node-pty` addon in unit tests.
 */
export function attachTerminalServer(httpServer: HttpServer, getRepoPath: () => string): TerminalServerHandle {
  return createTerminalServer(httpServer, {
    createWebSocketServer: () => new WebSocketServer({ noServer: true }),
    spawnPty: spawn,
    getRepoPath,
  })
}
