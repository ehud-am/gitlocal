import { randomUUID } from 'node:crypto'
import { isPtySupported } from './pty-support.js'
import type { TerminalExitInfo, TerminalSession, TerminalSessionStatus } from './types.js'

const MAX_BUFFERED_OUTPUT_CHARS = 200_000
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24
const MAX_CONCURRENT_SESSIONS = 20
const MIN_DIMENSION = 1
const MAX_DIMENSION = 1000

export interface PtyLike {
  onData(callback: (data: string) => void): void
  onExit(callback: (event: { exitCode: number; signal?: number | null }) => void): void
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

interface SpawnPtyOptions {
  shell: string
  cwd: string
  cols: number
  rows: number
}

export type PtyFactory = (options: SpawnPtyOptions) => Promise<PtyLike>

// `node-pty` ships a native (compiled) addon. It must never be statically imported: esbuild
// cannot bundle it (it's marked --external in package.json), and a static import would force
// every consumer of this module — including unit tests that inject a fake PtyFactory — to load
// the native binary. The dynamic import here confines that requirement to real PTY spawns only.
/* v8 ignore start -- native node-pty binary is not loadable in unit tests by design; only exercised via a real shell in integration tests */
const spawnRealPty: PtyFactory = async ({ shell, cwd, cols, rows }) => {
  const nodePty = await import('node-pty')
  return nodePty.spawn(shell, [], {
    name: TERMINAL_NAME,
    cols,
    rows,
    cwd,
    env: buildPtyEnv(process.env),
  })
}
/* v8 ignore stop */

// xterm.js implements xterm-256color; the older `xterm-color` terminfo entry advertises 8 colors
// and a smaller key/capability set, which makes line editors and full-screen programs fall back
// to less reliable cursor handling.
const TERMINAL_NAME = 'xterm-256color'
const FALLBACK_LOCALE = 'en_US.UTF-8'

// The macOS app starts GitLocal from launchd, which sets no locale; a shell without one treats
// input as single bytes, so pasted or typed non-ASCII text is mangled and the line editor loses
// track of the cursor. Same fallback VS Code's terminal applies.
export function buildPtyEnv(baseEnv: NodeJS.ProcessEnv): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value !== undefined) env[key] = value
  }
  env.TERM = TERMINAL_NAME
  env.COLORTERM = 'truecolor'
  if (!env.LANG && !env.LC_ALL && !env.LC_CTYPE) env.LANG = FALLBACK_LOCALE
  return env
}

function defaultShellCommand(): string {
  return process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/sh'
}

export interface CreateSessionOptions {
  cwd: string
}

export type CreateSessionResult =
  | { ok: true; session: TerminalSession }
  | { ok: false; error: 'pty_unavailable' | 'session_limit_reached'; message: string }

interface ManagedSession {
  id: string
  cwd: string
  status: TerminalSessionStatus
  createdAt: string
  exitInfo: TerminalExitInfo | null
  pty: PtyLike | null
  // Recent output kept for replay when a client (re)connects, as whole chunks so trimming it is
  // cheap: re-slicing one 200 KB string on every chunk made heavy output (a build log, `cat` of a
  // large file) cost a 200 KB copy per chunk on the event loop that also carries keystrokes.
  outputChunks: string[]
  outputLength: number
  outputListeners: Set<(chunk: string) => void>
  exitListeners: Set<() => void>
}

function toPublicSession(session: ManagedSession): TerminalSession {
  return {
    id: session.id,
    cwd: session.cwd,
    status: session.status,
    createdAt: session.createdAt,
    exitInfo: session.exitInfo,
  }
}

export function createSessionManager(ptyFactory: PtyFactory, shellCommand: string = defaultShellCommand()) {
  const sessions = new Map<string, ManagedSession>()

  function appendBuffered(session: ManagedSession, chunk: string): void {
    session.outputChunks.push(chunk)
    session.outputLength += chunk.length
    while (session.outputLength - session.outputChunks[0].length >= MAX_BUFFERED_OUTPUT_CHARS) {
      session.outputLength -= session.outputChunks.shift()!.length
    }
    const excess = session.outputLength - MAX_BUFFERED_OUTPUT_CHARS
    if (excess > 0) {
      session.outputChunks[0] = session.outputChunks[0].slice(excess)
      session.outputLength = MAX_BUFFERED_OUTPUT_CHARS
    }
  }

  // A session is only removed from the registry once nobody is listening for its output
  // (i.e. its WebSocket has disconnected), so late-arriving output/exit frames during teardown
  // are never dropped on the floor for a client that's still attached.
  function removeIfNoListeners(session: ManagedSession): void {
    if (session.status === 'exited' && session.outputListeners.size === 0) {
      sessions.delete(session.id)
    }
  }

  function markExited(session: ManagedSession, exitInfo: TerminalExitInfo): void {
    if (session.status === 'exited') return
    session.status = 'exited'
    session.exitInfo = exitInfo
    for (const listener of session.exitListeners) listener()
    removeIfNoListeners(session)
  }

  async function createSession(options: CreateSessionOptions): Promise<CreateSessionResult> {
    if (!isPtySupported()) {
      return { ok: false, error: 'pty_unavailable', message: 'Terminal sessions are not supported on this platform.' }
    }

    if (sessions.size >= MAX_CONCURRENT_SESSIONS) {
      return {
        ok: false,
        error: 'session_limit_reached',
        message: `Too many open terminal sessions (limit ${MAX_CONCURRENT_SESSIONS}). Close one and try again.`,
      }
    }

    const session: ManagedSession = {
      id: randomUUID(),
      cwd: options.cwd,
      status: 'starting',
      createdAt: new Date().toISOString(),
      exitInfo: null,
      pty: null,
      outputChunks: [],
      outputLength: 0,
      outputListeners: new Set(),
      exitListeners: new Set(),
    }
    sessions.set(session.id, session)

    let pty: PtyLike
    try {
      pty = await ptyFactory({ shell: shellCommand, cwd: options.cwd, cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
    } catch (error) {
      sessions.delete(session.id)
      console.error('Failed to spawn terminal PTY:', error)
      return { ok: false, error: 'pty_unavailable', message: 'Failed to start a terminal session on this platform.' }
    }

    session.pty = pty
    session.status = 'running'

    pty.onData((chunk) => {
      appendBuffered(session, chunk)
      for (const listener of session.outputListeners) listener(chunk)
    })
    pty.onExit((event) => {
      markExited(session, {
        code: event.exitCode ?? null,
        signal: event.signal != null ? String(event.signal) : null,
      })
    })

    return { ok: true, session: toPublicSession(session) }
  }

  function listSessions(): TerminalSession[] {
    return Array.from(sessions.values(), toPublicSession)
  }

  function getSession(id: string): TerminalSession | null {
    const session = sessions.get(id)
    return session ? toPublicSession(session) : null
  }

  function closeSession(id: string): boolean {
    const session = sessions.get(id)
    if (!session) return false
    if (session.pty && (session.status === 'running' || session.status === 'starting')) {
      session.pty.kill()
    }
    markExited(session, session.exitInfo ?? { code: null, signal: null })
    return true
  }

  function subscribe(
    id: string,
    onData: (chunk: string) => void,
    onExit: () => void,
  ): { bufferedOutput: string; unsubscribe: () => void } | null {
    const session = sessions.get(id)
    if (!session) return null
    session.outputListeners.add(onData)
    session.exitListeners.add(onExit)
    return {
      bufferedOutput: session.outputChunks.join(''),
      unsubscribe: () => {
        session.outputListeners.delete(onData)
        session.exitListeners.delete(onExit)
        removeIfNoListeners(session)
      },
    }
  }

  function writeInput(id: string, data: string): boolean {
    const session = sessions.get(id)
    if (!session || session.status !== 'running' || !session.pty) return false
    session.pty.write(data)
    return true
  }

  function clampDimension(value: number): number {
    return Math.min(MAX_DIMENSION, Math.max(MIN_DIMENSION, Math.trunc(value)))
  }

  function resize(id: string, cols: number, rows: number): boolean {
    const session = sessions.get(id)
    if (!session || session.status !== 'running' || !session.pty) return false
    session.pty.resize(clampDimension(cols), clampDimension(rows))
    return true
  }

  return { createSession, listSessions, getSession, closeSession, subscribe, writeInput, resize }
}

export type SessionManager = ReturnType<typeof createSessionManager>

export const sessionManager: SessionManager = createSessionManager(spawnRealPty)
