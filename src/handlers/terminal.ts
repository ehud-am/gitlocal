import type { ServerType as HttpServer } from '@hono/node-server'
import type { IPty } from 'node-pty'

/**
 * Minimal shape of the pieces of the `ws` module this handler depends on, so tests can
 * inject a lightweight fake instead of spinning up a real TCP WebSocket server. The real
 * `ws` module's `WebSocketServer`/`WebSocket` satisfy this shape structurally.
 */
export interface TerminalSocketLike {
  readyState: number
  send(data: string): void
  close(code?: number, reason?: string): void
  on(event: 'message', listener: (data: unknown) => void): void
  on(event: 'close', listener: () => void): void
  on(event: 'error', listener: (err: Error) => void): void
}

export interface WebSocketServerLike {
  handleUpgrade(
    request: unknown,
    socket: unknown,
    head: unknown,
    callback: (socket: TerminalSocketLike) => void,
  ): void
}

export interface PtySpawnFn {
  (file: string, args: string[], options: {
    name: string
    cols: number
    rows: number
    cwd: string
    env: NodeJS.ProcessEnv
  }): IPty
}

export interface TerminalHandlerDeps {
  /** Creates a `WebSocketServer`-like object. Defaults to `ws`'s `WebSocketServer` with `noServer: true`. */
  createWebSocketServer: () => WebSocketServerLike
  /** Spawns a PTY process. Defaults to `node-pty`'s `spawn`. */
  spawnPty: PtySpawnFn
  /** Resolves the repository working directory a new terminal session should be scoped to (FR-007). */
  getRepoPath: () => string
}

export interface TerminalSession {
  id: string
  pty: IPty
  cwd: string
  socket: TerminalSocketLike
}

interface InboundControlMessage {
  type: 'resize'
  cols: number
  rows: number
}

const TERMINAL_WS_PATH = '/ws/terminal'

/** Exported for direct unit testing of each branch without relying on the host platform/env. */
export function resolveDefaultShell(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (platform === 'win32') return 'powershell.exe'
  return env.SHELL || '/bin/bash'
}

let sessionCounter = 0

function generateSessionId(): string {
  sessionCounter += 1
  return `term-${Date.now().toString(36)}-${sessionCounter}`
}

function parseInboundMessage(data: unknown): string | InboundControlMessage {
  const text = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf-8') : String(data)
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as { type?: string; cols?: number; rows?: number }
      if (parsed.type === 'resize' && typeof parsed.cols === 'number' && typeof parsed.rows === 'number') {
        return { type: 'resize', cols: parsed.cols, rows: parsed.rows }
      }
    } catch {
      // Not JSON — treat as literal keystroke/input text (e.g. the user typed a `{`).
    }
  }
  return text
}

/**
 * Owns the in-memory map of live terminal sessions (one `node-pty` process per session,
 * per Terminal Pane) and the WebSocket wiring that streams I/O to/from each one.
 *
 * Kept independent of any concrete `ws`/`node-pty` import so it can be exercised in tests
 * against lightweight fakes (see data-model.md's "mocked node-pty" testing decision) while
 * `createTerminalServer` below wires up the real modules for production use.
 */
export class TerminalSessionManager {
  private readonly sessions = new Map<string, TerminalSession>()

  constructor(private readonly deps: TerminalHandlerDeps) {}

  get size(): number {
    return this.sessions.size
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id)
  }

  /** Spawns a new PTY and wires it to the given socket. Returns the new session's id. */
  openSession(socket: TerminalSocketLike): string {
    const id = generateSessionId()
    const cwd = this.deps.getRepoPath() || process.cwd()
    let pty: IPty
    try {
      pty = this.deps.spawnPty(resolveDefaultShell(), [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env,
      })
    } catch (err) {
      socket.send(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : String(err) }))
      socket.close(1011, 'terminal-unavailable')
      return id
    }

    const session: TerminalSession = { id, pty, cwd, socket }
    this.sessions.set(id, session)

    pty.onData((chunk: string) => {
      if (socket.readyState !== 1 /* OPEN */) return
      socket.send(chunk)
    })

    pty.onExit(() => {
      // The shell process ended on its own (e.g. the user typed `exit`) rather than via an
      // explicit pane close — distinct from the client-initiated close path below, so the
      // client can show "session ended" instead of silently dropping the pane (Edge Cases).
      this.sessions.delete(id)
      if (socket.readyState === 1 /* OPEN */) {
        socket.close(1000, 'process-exited')
      }
    })

    socket.on('message', (data: unknown) => {
      const message = parseInboundMessage(data)
      if (typeof message === 'string') {
        pty.write(message)
        return
      }
      pty.resize(Math.max(1, message.cols), Math.max(1, message.rows))
    })

    socket.on('close', () => {
      this.closeSession(id)
    })

    socket.on('error', () => {
      this.closeSession(id)
    })

    return id
  }

  /** Kills the session's PTY (if still tracked) and removes it from the session map (FR-009). */
  closeSession(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    this.sessions.delete(id)
    try {
      session.pty.kill()
    } catch {
      // Already exited — nothing left to clean up.
    }
  }

  /** Kills every tracked session's PTY. Used on server shutdown to avoid orphaned processes. */
  closeAll(): void {
    for (const id of [...this.sessions.keys()]) {
      this.closeSession(id)
    }
  }
}

export interface TerminalServerHandle {
  manager: TerminalSessionManager
  /** Detach the WS upgrade listener and terminate every live session. */
  close(): void
}

/**
 * Registers the terminal WebSocket upgrade route on an existing Node `http.Server`
 * (as returned by `@hono/node-server`'s `serve()`), alongside the app's existing HTTP routes.
 */
export function createTerminalServer(httpServer: HttpServer, deps: TerminalHandlerDeps): TerminalServerHandle {
  const wss = deps.createWebSocketServer()
  const manager = new TerminalSessionManager(deps)

  const onUpgrade = (request: { url?: string }, socket: unknown, head: unknown): void => {
    if (!request.url || !request.url.startsWith(TERMINAL_WS_PATH)) return
    wss.handleUpgrade(request, socket, head, (ws) => {
      manager.openSession(ws)
    })
  }

  httpServer.on('upgrade', onUpgrade as never)

  return {
    manager,
    close(): void {
      httpServer.off('upgrade', onUpgrade as never)
      manager.closeAll()
    },
  }
}

export { TERMINAL_WS_PATH }
