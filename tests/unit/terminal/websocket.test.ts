import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'

// Coverage-closing tests for already-implemented Foundational code: this file has no dedicated
// test task of its own in specs/032-integrated-terminal-panel/tasks.md (it's only exercised
// end-to-end by T015's real-shell integration test, which node-pty can't run in every sandbox),
// so these tests exist purely to keep the project's global 90% coverage gate green — not to
// implement any later-phase feature.

class FakeWebSocket extends EventEmitter {
  readyState = 1
  OPEN = 1
  sent: string[] = []
  closedWith: [number, string] | null = null
  send(data: string) {
    this.sent.push(data)
  }
  close(code: number, reason: string) {
    this.closedWith = [code, reason]
  }
}

const createdSockets: FakeWebSocket[] = []
const serverConstructorOptions: unknown[] = []

vi.mock('ws', () => {
  class FakeWebSocketServer {
    constructor(options: unknown) {
      serverConstructorOptions.push(options)
    }
    handleUpgrade(_req: unknown, _socket: unknown, _head: unknown, callback: (ws: FakeWebSocket) => void) {
      const ws = new FakeWebSocket()
      createdSockets.push(ws)
      callback(ws)
    }
  }
  return { WebSocketServer: FakeWebSocketServer }
})

vi.mock('../../../src/terminal/session-manager.js', () => ({
  sessionManager: {
    subscribe: vi.fn(),
    getSession: vi.fn(),
    writeInput: vi.fn(),
    resize: vi.fn(),
  },
}))

const { attachTerminalWebSocketServer } = await import('../../../src/terminal/websocket.js')
const { sessionManager } = await import('../../../src/terminal/session-manager.js')

const mockSubscribe = sessionManager.subscribe as unknown as ReturnType<typeof vi.fn>
const mockGetSession = sessionManager.getSession as unknown as ReturnType<typeof vi.fn>
const mockWriteInput = sessionManager.writeInput as unknown as ReturnType<typeof vi.fn>
const mockResize = sessionManager.resize as unknown as ReturnType<typeof vi.fn>

function fakeHttpServer() {
  return new EventEmitter() as EventEmitter & { on: EventEmitter['on'] }
}

function emitUpgrade(httpServer: EventEmitter, path: string) {
  httpServer.emit('upgrade', { url: path }, {}, Buffer.alloc(0))
}

describe('attachTerminalWebSocketServer', () => {
  beforeEach(() => {
    createdSockets.length = 0
    serverConstructorOptions.length = 0
    mockSubscribe.mockReset()
    mockGetSession.mockReset()
    mockWriteInput.mockReset()
    mockResize.mockReset()
  })

  it('caps inbound frame size via maxPayload to bound a single client\'s memory/CPU impact', () => {
    attachTerminalWebSocketServer(fakeHttpServer() as never)
    expect(serverConstructorOptions).toEqual([{ noServer: true, maxPayload: 64 * 1024 }])
  })

  it('ignores upgrade requests whose path does not match the terminal io route', () => {
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)

    emitUpgrade(httpServer, '/api/other')

    expect(createdSockets).toHaveLength(0)
  })

  it('treats a missing request url as the root path and finds no route match', () => {
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)

    httpServer.emit('upgrade', {}, {}, Buffer.alloc(0))

    expect(createdSockets).toHaveLength(0)
  })

  it('closes the socket with 1011 when the session id is unknown', () => {
    mockSubscribe.mockReturnValue(null)
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)

    emitUpgrade(httpServer, '/api/terminal/sessions/missing/io')

    expect(mockSubscribe).toHaveBeenCalledWith('missing', expect.any(Function), expect.any(Function))
    expect(createdSockets[0]?.closedWith).toEqual([1011, 'Unknown terminal session'])
  })

  it('flushes buffered output on connect, and skips the flush when there is none buffered', () => {
    mockSubscribe.mockReturnValue({ bufferedOutput: 'hello', unsubscribe: vi.fn() })
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)
    emitUpgrade(httpServer, '/api/terminal/sessions/abc/io')
    expect(createdSockets[0]?.sent).toEqual([JSON.stringify({ type: 'output', data: 'hello' })])

    mockSubscribe.mockReturnValue({ bufferedOutput: '', unsubscribe: vi.fn() })
    emitUpgrade(httpServer, '/api/terminal/sessions/def/io')
    expect(createdSockets[1]?.sent).toEqual([])
  })

  it('forwards subscribed output and exit callbacks as frames', () => {
    mockSubscribe.mockReturnValue({ bufferedOutput: '', unsubscribe: vi.fn() })
    mockGetSession.mockReturnValue({ exitInfo: { code: 1, signal: 'SIGTERM' } })
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)
    emitUpgrade(httpServer, '/api/terminal/sessions/abc/io')

    const [, onData, onExit] = mockSubscribe.mock.calls[0]
    onData('chunk')
    onExit()

    expect(createdSockets[0]?.sent).toEqual([
      JSON.stringify({ type: 'output', data: 'chunk' }),
      JSON.stringify({ type: 'exit', code: 1, signal: 'SIGTERM' }),
    ])
  })

  it('reports a null exit code/signal when the session has no exit info', () => {
    mockSubscribe.mockReturnValue({ bufferedOutput: '', unsubscribe: vi.fn() })
    mockGetSession.mockReturnValue(undefined)
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)
    emitUpgrade(httpServer, '/api/terminal/sessions/abc/io')

    const [, , onExit] = mockSubscribe.mock.calls[0]
    onExit()

    expect(createdSockets[0]?.sent).toEqual([JSON.stringify({ type: 'exit', code: null, signal: null })])
  })

  it('routes input and resize messages to the session manager, ignoring malformed frames', () => {
    mockSubscribe.mockReturnValue({ bufferedOutput: '', unsubscribe: vi.fn() })
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)
    emitUpgrade(httpServer, '/api/terminal/sessions/abc/io')
    const ws = createdSockets[0]!

    ws.emit('message', Buffer.from(JSON.stringify({ type: 'input', data: 'ls\n' })))
    expect(mockWriteInput).toHaveBeenCalledWith('abc', 'ls\n')

    ws.emit('message', Buffer.from(JSON.stringify({ type: 'resize', cols: 80, rows: 24 })))
    expect(mockResize).toHaveBeenCalledWith('abc', 80, 24)

    ws.emit('message', Buffer.from('not json'))
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'input', data: 42 })))
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'resize', cols: 'x', rows: 24 })))
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'unknown' })))
    ws.emit('message', Buffer.from(JSON.stringify(null)))

    expect(mockWriteInput).toHaveBeenCalledTimes(1)
    expect(mockResize).toHaveBeenCalledTimes(1)
  })

  it('unsubscribes when the socket closes, without closing the underlying session', () => {
    const unsubscribe = vi.fn()
    mockSubscribe.mockReturnValue({ bufferedOutput: '', unsubscribe })
    const httpServer = fakeHttpServer()
    attachTerminalWebSocketServer(httpServer as never)
    emitUpgrade(httpServer, '/api/terminal/sessions/abc/io')
    const ws = createdSockets[0]!

    ws.emit('close')

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
