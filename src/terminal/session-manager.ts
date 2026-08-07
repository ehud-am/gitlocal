import { randomUUID } from 'node:crypto'
import { isPtySupported } from './cli-detection.js'
import type { TerminalExitInfo, TerminalKind, TerminalSession, TerminalSessionStatus } from './types.js'

const MAX_BUFFERED_OUTPUT_CHARS = 200_000
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24

export interface PtyLike {
  onData(callback: (data: string) => void): void
  onExit(callback: (event: { exitCode: number; signal?: number | null }) => void): void
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

export interface SpawnPtyOptions {
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
export const spawnRealPty: PtyFactory = async ({ shell, cwd, cols, rows }) => {
  const nodePty = await import('node-pty')
  return nodePty.spawn(shell, [], {
    name: 'xterm-color',
    cols,
    rows,
    cwd,
    env: process.env as Record<string, string>,
  })
}
/* v8 ignore stop */

function defaultShellCommand(): string {
  return process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/sh'
}

export interface CreateSessionOptions {
  kind: TerminalKind
  cwd: string
}

export type CreateSessionResult =
  | { ok: true; session: TerminalSession }
  | { ok: false; error: 'pty_unavailable'; message: string }

interface ManagedSession {
  id: string
  kind: TerminalKind
  cwd: string
  status: TerminalSessionStatus
  createdAt: string
  exitInfo: TerminalExitInfo | null
  pty: PtyLike | null
  outputBuffer: string
  outputListeners: Set<(chunk: string) => void>
  exitListeners: Set<() => void>
}

function toPublicSession(session: ManagedSession): TerminalSession {
  return {
    id: session.id,
    kind: session.kind,
    cwd: session.cwd,
    status: session.status,
    createdAt: session.createdAt,
    exitInfo: session.exitInfo,
  }
}

export function createSessionManager(ptyFactory: PtyFactory, shellCommand: string = defaultShellCommand()) {
  const sessions = new Map<string, ManagedSession>()

  function appendBuffered(session: ManagedSession, chunk: string): void {
    session.outputBuffer += chunk
    if (session.outputBuffer.length > MAX_BUFFERED_OUTPUT_CHARS) {
      session.outputBuffer = session.outputBuffer.slice(session.outputBuffer.length - MAX_BUFFERED_OUTPUT_CHARS)
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

    const session: ManagedSession = {
      id: randomUUID(),
      kind: options.kind,
      cwd: options.cwd,
      status: 'starting',
      createdAt: new Date().toISOString(),
      exitInfo: null,
      pty: null,
      outputBuffer: '',
      outputListeners: new Set(),
      exitListeners: new Set(),
    }
    sessions.set(session.id, session)

    let pty: PtyLike
    try {
      pty = await ptyFactory({ shell: shellCommand, cwd: options.cwd, cols: DEFAULT_COLS, rows: DEFAULT_ROWS })
    } catch {
      sessions.delete(session.id)
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
      bufferedOutput: session.outputBuffer,
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

  function resize(id: string, cols: number, rows: number): boolean {
    const session = sessions.get(id)
    if (!session || session.status !== 'running' || !session.pty) return false
    session.pty.resize(cols, rows)
    return true
  }

  return { createSession, listSessions, getSession, closeSession, subscribe, writeInput, resize }
}

export type SessionManager = ReturnType<typeof createSessionManager>

export const sessionManager: SessionManager = createSessionManager(spawnRealPty)
