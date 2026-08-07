import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import type { TerminalSocketLike } from '../../../src/handlers/terminal.js'

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

/**
 * Production wiring (`attachTerminalServer`) is excluded from coverage thresholds because it
 * dynamically loads `node-pty`'s native binding, which has no prebuild for this sandbox
 * (linux-arm64) — see vitest.config.ts. That's a real constraint on *running* the module against
 * the genuine native addon, not on testing its logic: `vi.doMock` intercepts the dynamic
 * `import('node-pty')` before it ever touches the real addon, so both the happy path and the
 * native-load-failure degrade path (the one that matters most, since it's what actually
 * happens in this sandbox) are fully exercisable without it.
 */
describe('attachTerminalServer', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('node-pty')
    vi.doUnmock('ws')
  })

  it('wires the real ws WebSocketServer and node-pty spawn when node-pty loads successfully', async () => {
    const fakePty = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    }
    const spawnMock = vi.fn(() => fakePty)
    vi.doMock('node-pty', () => ({ spawn: spawnMock }))

    const handleUpgradeMock = vi.fn()
    const wssCtorMock = vi.fn(function WebSocketServer() {
      return { handleUpgrade: handleUpgradeMock }
    })
    vi.doMock('ws', () => ({ WebSocketServer: wssCtorMock }))

    const { attachTerminalServer } = await import('../../../src/services/terminal-server.js')
    const fakeHttpServer = { on: vi.fn(), off: vi.fn() }

    const handle = await attachTerminalServer(fakeHttpServer as never, () => '/repo')

    expect(wssCtorMock).toHaveBeenCalledWith({ noServer: true })
    expect(fakeHttpServer.on).toHaveBeenCalledWith('upgrade', expect.any(Function))

    const socket = new FakeSocket()
    handle.manager.openSession(socket)
    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({ cwd: '/repo' }),
    )

    handle.close()
    expect(fakeHttpServer.off).toHaveBeenCalledWith('upgrade', expect.any(Function))
    expect(fakePty.kill).toHaveBeenCalled()
  })

  it('routes real WS upgrade requests on the terminal path into the session manager', async () => {
    const fakePty = {
      onData: vi.fn(),
      onExit: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
    }
    vi.doMock('node-pty', () => ({ spawn: vi.fn(() => fakePty) }))
    let upgradeCallback: ((socket: TerminalSocketLike) => void) | undefined
    const handleUpgradeMock = vi.fn((_req, _sock, _head, callback) => {
      upgradeCallback = callback
    })
    vi.doMock('ws', () => ({
      WebSocketServer: vi.fn(function WebSocketServer() {
        return { handleUpgrade: handleUpgradeMock }
      }),
    }))

    const { attachTerminalServer } = await import('../../../src/services/terminal-server.js')
    let registeredUpgradeHandler: ((request: { url?: string }, socket: unknown, head: unknown) => void) | undefined
    const fakeHttpServer = {
      on: vi.fn((_event, handler) => {
        registeredUpgradeHandler = handler
      }),
      off: vi.fn(),
    }

    const handle = await attachTerminalServer(fakeHttpServer as never, () => '/repo')

    // A request for an unrelated path must not trigger the WS upgrade handshake at all.
    registeredUpgradeHandler?.({ url: '/api/info' }, {}, {})
    expect(handleUpgradeMock).not.toHaveBeenCalled()

    registeredUpgradeHandler?.({ url: '/ws/terminal' }, {}, {})
    expect(handleUpgradeMock).toHaveBeenCalledTimes(1)

    const socket = new FakeSocket()
    upgradeCallback?.(socket)
    expect(handle.manager.size).toBe(1)
  })

  it('degrades gracefully instead of crashing when node-pty fails to load its native binding', async () => {
    vi.doMock('node-pty', () => {
      throw new Error('Failed to load native module: pty.node')
    })
    vi.doMock('ws', () => ({
      WebSocketServer: vi.fn(function WebSocketServer() {
        return { handleUpgrade: vi.fn() }
      }),
    }))
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { attachTerminalServer } = await import('../../../src/services/terminal-server.js')
    const fakeHttpServer = { on: vi.fn(), off: vi.fn() }

    const handle = await attachTerminalServer(fakeHttpServer as never, () => '/repo')

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Terminal panes are unavailable'),
      expect.anything(),
    )

    const socket = new FakeSocket()
    handle.manager.openSession(socket)

    expect(socket.sent).toHaveLength(1)
    expect(JSON.parse(socket.sent[0] ?? '{}')).toEqual({
      type: 'error',
      message: 'Terminal panes are unavailable on this platform.',
    })
    expect(socket.closed).toEqual({ code: 1011, reason: 'terminal-unavailable' })
  })
})
