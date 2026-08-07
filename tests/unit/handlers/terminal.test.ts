import { describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import {
  createTerminalServer,
  resolveDefaultShell,
  TerminalSessionManager,
  TERMINAL_WS_PATH,
  type PtySpawnFn,
  type TerminalHandlerDeps,
  type TerminalSocketLike,
  type WebSocketServerLike,
} from '../../../src/handlers/terminal.js'

const OPEN = 1
const CLOSED = 3

class FakeSocket extends EventEmitter implements TerminalSocketLike {
  readyState = OPEN
  sent: string[] = []
  closed: { code?: number; reason?: string } | null = null

  send(data: string): void {
    this.sent.push(data)
  }

  close(code?: number, reason?: string): void {
    this.readyState = CLOSED
    this.closed = { code, reason }
  }
}

class FakePty extends EventEmitter {
  killed = false
  killedWithSignal: string | undefined
  written: (string | Buffer)[] = []
  cols = 80
  rows = 24
  resizeCalls: Array<{ cols: number; rows: number }> = []
  private dataListeners: Array<(chunk: string) => void> = []
  private exitListeners: Array<(e: { exitCode: number; signal?: number }) => void> = []

  onData = (listener: (chunk: string) => void) => {
    this.dataListeners.push(listener)
    return { dispose: () => {} }
  }

  onExit = (listener: (e: { exitCode: number; signal?: number }) => void) => {
    this.exitListeners.push(listener)
    return { dispose: () => {} }
  }

  emitData(chunk: string): void {
    for (const listener of this.dataListeners) listener(chunk)
  }

  emitExit(exitCode = 0): void {
    for (const listener of this.exitListeners) listener({ exitCode })
  }

  write(data: string | Buffer): void {
    this.written.push(data)
  }

  resize(cols: number, rows: number): void {
    this.resizeCalls.push({ cols, rows })
  }

  kill(signal?: string): void {
    this.killed = true
    this.killedWithSignal = signal
  }

  pause(): void {}
  resume(): void {}
}

function makeDeps(overrides: Partial<TerminalHandlerDeps> = {}): { deps: TerminalHandlerDeps; ptys: FakePty[] } {
  const ptys: FakePty[] = []
  const spawnPty: PtySpawnFn = vi.fn((_file, _args, _options) => {
    const pty = new FakePty()
    ptys.push(pty)
    return pty as unknown as ReturnType<PtySpawnFn>
  })

  const deps: TerminalHandlerDeps = {
    createWebSocketServer: () => ({
      handleUpgrade: vi.fn(),
    }),
    spawnPty,
    getRepoPath: () => '/repo/root',
    ...overrides,
  }
  return { deps, ptys }
}

describe('resolveDefaultShell', () => {
  it('uses powershell.exe on win32', () => {
    expect(resolveDefaultShell('win32', {})).toBe('powershell.exe')
  })

  it('uses the SHELL env var on non-win32 platforms when set', () => {
    expect(resolveDefaultShell('linux', { SHELL: '/usr/bin/zsh' })).toBe('/usr/bin/zsh')
  })

  it('falls back to /bin/bash on non-win32 platforms when SHELL is unset', () => {
    expect(resolveDefaultShell('darwin', {})).toBe('/bin/bash')
  })
})

describe('TerminalSessionManager', () => {
  it('spawns a pty scoped to the repository root on session open (FR-007)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()

    const id = manager.openSession(socket)

    expect(id).toBeTruthy()
    expect(ptys).toHaveLength(1)
    expect(deps.spawnPty).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ cwd: '/repo/root' }),
    )
    expect(manager.size).toBe(1)
    expect(manager.getSession(id)?.cwd).toBe('/repo/root')
  })

  it('falls back to process.cwd() when no repository is loaded', () => {
    const { deps } = makeDeps({ getRepoPath: () => '' })
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()

    const id = manager.openSession(socket)

    expect(manager.getSession(id)?.cwd).toBe(process.cwd())
  })

  it('streams pty output to the socket (FR-008)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    ptys[0].emitData('hello from shell\r\n')

    expect(socket.sent).toEqual(['hello from shell\r\n'])
  })

  it('does not attempt to send once the socket is no longer open', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)
    socket.readyState = CLOSED

    ptys[0].emitData('late output')

    expect(socket.sent).toEqual([])
  })

  it('forwards input keystrokes from the socket to the pty (FR-008)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', 'ls -la\r')

    expect(ptys[0].written).toEqual(['ls -la\r'])
  })

  it('forwards Buffer input as decoded text to the pty', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', Buffer.from('echo hi\r', 'utf-8'))

    expect(ptys[0].written).toEqual(['echo hi\r'])
  })

  it('interprets a resize control message as a resize call, not literal input', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', JSON.stringify({ type: 'resize', cols: 120, rows: 40 }))

    expect(ptys[0].resizeCalls).toEqual([{ cols: 120, rows: 40 }])
    expect(ptys[0].written).toEqual([])
  })

  it('clamps resize dimensions to at least 1', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', JSON.stringify({ type: 'resize', cols: 0, rows: -5 }))

    expect(ptys[0].resizeCalls).toEqual([{ cols: 1, rows: 1 }])
  })

  it('treats malformed JSON-looking input as literal text rather than throwing', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', '{not valid json')

    expect(ptys[0].written).toEqual(['{not valid json'])
  })

  it('treats JSON without a recognized type as literal text', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('message', JSON.stringify({ type: 'unknown' }))

    expect(ptys[0].written).toEqual([JSON.stringify({ type: 'unknown' })])
  })

  it('two concurrent sessions are fully independent (SC-004)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socketA = new FakeSocket()
    const socketB = new FakeSocket()
    manager.openSession(socketA)
    manager.openSession(socketB)

    expect(manager.size).toBe(2)

    socketA.emit('message', 'only for A')
    ptys[1].emitData('only for B output')

    expect(ptys[0].written).toEqual(['only for A'])
    expect(ptys[1].written).toEqual([])
    expect(socketA.sent).toEqual([])
    expect(socketB.sent).toEqual(['only for B output'])
  })

  it('kills the pty and removes the session when the socket closes (FR-009)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    const id = manager.openSession(socket)

    socket.emit('close')

    expect(ptys[0].killed).toBe(true)
    expect(manager.size).toBe(0)
    expect(manager.getSession(id)).toBeUndefined()
  })

  it('kills the pty and removes the session on socket error', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)

    socket.emit('error', new Error('boom'))

    expect(ptys[0].killed).toBe(true)
    expect(manager.size).toBe(0)
  })

  it('closing an already-closed/unknown session id is a no-op', () => {
    const { deps } = makeDeps()
    const manager = new TerminalSessionManager(deps)

    expect(() => manager.closeSession('does-not-exist')).not.toThrow()
  })

  it('tolerates kill() throwing for an already-exited process', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    const id = manager.openSession(socket)
    ptys[0].kill = () => {
      throw new Error('ESRCH')
    }

    expect(() => manager.closeSession(id)).not.toThrow()
    expect(manager.getSession(id)).toBeUndefined()
  })

  it('closes the WebSocket with a distinct reason when the pty process exits on its own (Edge Case)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    const id = manager.openSession(socket)

    ptys[0].emitExit(0)

    expect(socket.closed).toEqual({ code: 1000, reason: 'process-exited' })
    expect(manager.getSession(id)).toBeUndefined()
  })

  it('does not attempt to close an already-closed socket when the pty exits', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    const socket = new FakeSocket()
    manager.openSession(socket)
    socket.readyState = CLOSED
    socket.close = vi.fn(socket.close.bind(socket))

    ptys[0].emitExit(0)

    expect(socket.close).not.toHaveBeenCalled()
  })

  it('closeAll kills every tracked session (used on server shutdown, avoids orphaned processes)', () => {
    const { deps, ptys } = makeDeps()
    const manager = new TerminalSessionManager(deps)
    manager.openSession(new FakeSocket())
    manager.openSession(new FakeSocket())

    manager.closeAll()

    expect(ptys.every((pty) => pty.killed)).toBe(true)
    expect(manager.size).toBe(0)
  })
})

describe('createTerminalServer', () => {
  function makeHttpServer() {
    const emitter = new EventEmitter()
    return Object.assign(emitter, {
      on: emitter.on.bind(emitter),
      off: emitter.off.bind(emitter),
    })
  }

  it('registers an upgrade listener and opens a session for terminal WS requests', () => {
    const handleUpgrade = vi.fn((_req, _socket, _head, callback: (s: TerminalSocketLike) => void) => {
      callback(new FakeSocket())
    })
    const wss: WebSocketServerLike = { handleUpgrade }
    const { deps } = makeDeps({ createWebSocketServer: () => wss })
    const httpServer = makeHttpServer()

    const handle = createTerminalServer(httpServer as never, deps)
    httpServer.emit('upgrade', { url: `${TERMINAL_WS_PATH}?x=1` }, {}, Buffer.alloc(0))

    expect(handleUpgrade).toHaveBeenCalledTimes(1)
    expect(handle.manager.size).toBe(1)
  })

  it('ignores upgrade requests for other paths', () => {
    const handleUpgrade = vi.fn()
    const wss: WebSocketServerLike = { handleUpgrade }
    const { deps } = makeDeps({ createWebSocketServer: () => wss })
    const httpServer = makeHttpServer()

    createTerminalServer(httpServer as never, deps)
    httpServer.emit('upgrade', { url: '/ws/something-else' }, {}, Buffer.alloc(0))

    expect(handleUpgrade).not.toHaveBeenCalled()
  })

  it('ignores upgrade requests with no url', () => {
    const handleUpgrade = vi.fn()
    const wss: WebSocketServerLike = { handleUpgrade }
    const { deps } = makeDeps({ createWebSocketServer: () => wss })
    const httpServer = makeHttpServer()

    createTerminalServer(httpServer as never, deps)
    httpServer.emit('upgrade', {}, {}, Buffer.alloc(0))

    expect(handleUpgrade).not.toHaveBeenCalled()
  })

  it('close() detaches the upgrade listener and kills all live sessions', () => {
    const handleUpgrade = vi.fn((_req, _socket, _head, callback: (s: TerminalSocketLike) => void) => {
      callback(new FakeSocket())
    })
    const wss: WebSocketServerLike = { handleUpgrade }
    const { deps, ptys } = makeDeps({ createWebSocketServer: () => wss })
    const httpServer = makeHttpServer()

    const handle = createTerminalServer(httpServer as never, deps)
    httpServer.emit('upgrade', { url: TERMINAL_WS_PATH }, {}, Buffer.alloc(0))
    handle.close()

    expect(ptys[0].killed).toBe(true)
    expect(handle.manager.size).toBe(0)

    // After close(), further upgrade events must not reach the (now-detached) listener.
    handleUpgrade.mockClear()
    httpServer.emit('upgrade', { url: TERMINAL_WS_PATH }, {}, Buffer.alloc(0))
    expect(handleUpgrade).not.toHaveBeenCalled()
  })
})
