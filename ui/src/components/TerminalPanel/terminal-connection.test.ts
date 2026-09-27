import { describe, expect, it, vi } from 'vitest'
import { createTerminalConnection, MAX_INPUT_CHARS_PER_FRAME, splitInput } from './terminal-connection'

class FakeSocket extends EventTarget {
  readyState: number = WebSocket.CONNECTING
  sent: Array<Record<string, unknown>> = []
  closed = false
  send(data: string) {
    this.sent.push(JSON.parse(data) as Record<string, unknown>)
  }
  close() {
    this.closed = true
  }
  open() {
    this.readyState = WebSocket.OPEN
    this.dispatchEvent(new Event('open'))
  }
  receive(frame: Record<string, unknown> | string) {
    this.dispatchEvent(new MessageEvent('message', { data: typeof frame === 'string' ? frame : JSON.stringify(frame) }))
  }
  drop(code = 1006) {
    this.readyState = WebSocket.CLOSED
    this.dispatchEvent(new CloseEvent('close', { code }))
  }
}

function setup() {
  const sockets: FakeSocket[] = []
  const scheduled: Array<{ callback: () => void; delayMs: number }> = []
  const callbacks = { onOutput: vi.fn(), onExit: vi.fn(), onNotice: vi.fn(), onReplay: vi.fn() }
  const cancel = vi.fn()
  const connection = createTerminalConnection('session-1', callbacks, {
    connect: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket as unknown as WebSocket
    },
    schedule: (callback, delayMs) => {
      scheduled.push({ callback, delayMs })
      return scheduled.length
    },
    cancel,
  })
  const runNextReconnect = () => scheduled.shift()!.callback()
  return { sockets, scheduled, callbacks, cancel, connection, runNextReconnect }
}

describe('splitInput', () => {
  it('keeps short input in one frame and splits long input into bounded frames', () => {
    expect(splitInput('ls\r')).toEqual(['ls\r'])
    expect(splitInput('')).toEqual([])
    const long = 'x'.repeat(MAX_INPUT_CHARS_PER_FRAME * 2 + 5)
    const chunks = splitInput(long)
    expect(chunks.map((chunk) => chunk.length)).toEqual([MAX_INPUT_CHARS_PER_FRAME, MAX_INPUT_CHARS_PER_FRAME, 5])
    expect(chunks.join('')).toBe(long)
  })

  it('never splits a surrogate pair across frames', () => {
    const chunks = splitInput('ab😀cd', 3)
    expect(chunks).toEqual(['ab', '😀c', 'd'])
    expect(chunks.join('')).toBe('ab😀cd')
  })

  it('still makes progress when the frame size is a single character', () => {
    expect(splitInput('😀', 1).join('')).toBe('😀')
  })
})

describe('createTerminalConnection', () => {
  it('queues input typed before the socket opens and sends it, after the terminal size, once open', () => {
    const { sockets, connection } = setup()
    connection.resize(80, 24)
    connection.sendInput('ec')
    connection.sendInput('ho\r')
    expect(sockets[0].sent).toEqual([])

    sockets[0].open()
    expect(sockets[0].sent).toEqual([
      { type: 'resize', cols: 80, rows: 24 },
      { type: 'input', data: 'echo\r' },
    ])

    connection.sendInput('x')
    expect(sockets[0].sent[sockets[0].sent.length - 1]).toEqual({ type: 'input', data: 'x' })
  })

  it('splits a large paste into frames the server accepts', () => {
    const { sockets, connection } = setup()
    sockets[0].open()
    connection.sendInput('y'.repeat(MAX_INPUT_CHARS_PER_FRAME + 1))
    expect(sockets[0].sent.map((frame) => (frame.data as string).length)).toEqual([MAX_INPUT_CHARS_PER_FRAME, 1])
  })

  it('drops queued input beyond the pending limit instead of growing without bound', () => {
    const { sockets, connection } = setup()
    connection.sendInput('a'.repeat(64 * 1024))
    connection.sendInput('overflow')
    sockets[0].open()
    const sentText = sockets[0].sent.map((frame) => frame.data).join('')
    expect(sentText).toHaveLength(64 * 1024)
    expect(sentText).not.toContain('overflow')
  })

  it('keeps discarding input after an overflow until the socket reopens, with one notice', () => {
    const { sockets, callbacks, connection } = setup()
    connection.sendInput('a'.repeat(64 * 1024))
    connection.sendInput('overflow')
    connection.sendInput('\r')
    expect(callbacks.onNotice).toHaveBeenCalledTimes(1)
    expect(callbacks.onNotice.mock.calls[0][0]).toMatch(/discarded/)
    sockets[0].open()
    const sentText = sockets[0].sent.map((frame) => frame.data).join('')
    expect(sentText).not.toContain('\r')
    connection.sendInput('after')
    expect(sockets[0].sent[sockets[0].sent.length - 1]).toEqual({ type: 'input', data: 'after' })
  })

  it('sends a resize only when the grid size changes', () => {
    const { sockets, connection } = setup()
    sockets[0].open()
    connection.resize(100, 30)
    connection.resize(100, 30)
    connection.resize(101, 30)
    expect(sockets[0].sent).toEqual([
      { type: 'resize', cols: 100, rows: 30 },
      { type: 'resize', cols: 101, rows: 30 },
    ])
  })

  it('delivers output and exit frames, ignoring malformed and empty ones', () => {
    const { sockets, callbacks } = setup()
    sockets[0].open()
    sockets[0].receive({ type: 'output', data: 'hello' })
    sockets[0].receive({ type: 'output', data: '' })
    sockets[0].receive('not json')
    sockets[0].receive({ type: 'exit', code: 0, signal: null })
    sockets[0].receive({ type: 'exit' })
    expect(callbacks.onOutput).toHaveBeenCalledTimes(1)
    expect(callbacks.onOutput).toHaveBeenCalledWith('hello')
    expect(callbacks.onExit).toHaveBeenNthCalledWith(1, 0, null)
    expect(callbacks.onExit).toHaveBeenNthCalledWith(2, null, null)
  })

  it('reconnects after a dropped connection, resets the screen, and resends the size', () => {
    const { sockets, scheduled, callbacks, connection, runNextReconnect } = setup()
    connection.resize(80, 24)
    sockets[0].open()
    sockets[0].drop()

    expect(callbacks.onNotice).toHaveBeenCalledWith('Connection lost. Reconnecting...')
    expect(scheduled[0].delayMs).toBe(250)
    connection.sendInput('typed while offline')

    runNextReconnect()
    sockets[1].open()
    sockets[1].receive({ type: 'output', data: 'screen', replay: true })
    sockets[1].receive({ type: 'output', data: 'live' })
    expect(callbacks.onReplay).toHaveBeenCalledWith('screen', true)
    expect(callbacks.onOutput).toHaveBeenCalledWith('live')
    expect(sockets[1].sent).toEqual([
      { type: 'resize', cols: 80, rows: 24 },
      { type: 'input', data: 'typed while offline' },
    ])
  })

  it('marks the first replay as not after a reconnect', () => {
    const { sockets, callbacks } = setup()
    sockets[0].open()
    sockets[0].receive({ type: 'output', data: 'history', replay: true })
    expect(callbacks.onReplay).toHaveBeenCalledWith('history', false)
  })

  it('leaves the old screen alone when a reconnect finds the session gone', () => {
    const { sockets, callbacks, runNextReconnect } = setup()
    sockets[0].open()
    sockets[0].drop()
    runNextReconnect()
    sockets[1].open()
    sockets[1].drop(1011)
    expect(callbacks.onReplay).not.toHaveBeenCalled()
    expect(callbacks.onExit).toHaveBeenCalledWith(null, null)
  })

  it('backs off between failed attempts and gives up after the last one', () => {
    const { sockets, scheduled, callbacks, runNextReconnect } = setup()
    sockets[0].open()
    sockets[0].drop()
    const delays: number[] = []
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      delays.push(scheduled[0].delayMs)
      runNextReconnect()
      sockets[attempt].drop()
    }
    expect(delays).toEqual([250, 1000, 2000, 4000, 8000])
    expect(scheduled).toHaveLength(0)
    expect(callbacks.onNotice).toHaveBeenCalledTimes(2)
    expect(callbacks.onNotice).toHaveBeenLastCalledWith('Disconnected from this terminal session. Open a new terminal to continue.')
    expect(callbacks.onExit).toHaveBeenCalledWith(null, null)
  })

  it('does not reconnect to a session the server no longer has', () => {
    const { sockets, scheduled, callbacks, connection } = setup()
    sockets[0].drop(1011)
    expect(scheduled).toHaveLength(0)
    expect(callbacks.onExit).toHaveBeenCalledWith(null, null)
    connection.sendInput('ignored')
    expect(sockets).toHaveLength(1)
  })

  it('does not reconnect once the shell has exited', () => {
    const { sockets, scheduled, callbacks } = setup()
    sockets[0].open()
    sockets[0].receive({ type: 'exit', code: 0, signal: null })
    sockets[0].drop()
    expect(scheduled).toHaveLength(0)
    expect(callbacks.onNotice).not.toHaveBeenCalled()
  })

  it('closes the socket and cancels a pending reconnect on dispose', () => {
    const { sockets, cancel, connection } = setup()
    sockets[0].open()
    sockets[0].drop()
    connection.dispose()
    expect(cancel).toHaveBeenCalledWith(1)
    expect(sockets[0].closed).toBe(true)
    connection.sendInput('after dispose')
    expect(sockets[0].sent).toEqual([])
  })

  it('closes cleanly on dispose with no reconnect pending, and ignores the resulting close event', () => {
    const { sockets, scheduled, cancel, connection } = setup()
    sockets[0].open()
    connection.dispose()
    sockets[0].drop()
    expect(cancel).not.toHaveBeenCalled()
    expect(scheduled).toHaveLength(0)
  })

  it('uses real timers and the real socket factory by default', () => {
    vi.useFakeTimers()
    const created: FakeSocket[] = []
    const originalWebSocket = globalThis.WebSocket
    const FakeWebSocket = vi.fn(function () {
      const socket = new FakeSocket()
      created.push(socket)
      return socket
    })
    Object.assign(FakeWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })
    vi.stubGlobal('WebSocket', FakeWebSocket)
    try {
      const connection = createTerminalConnection('abc', { onOutput: vi.fn(), onExit: vi.fn(), onNotice: vi.fn(), onReplay: vi.fn() })
      expect(FakeWebSocket).toHaveBeenCalledWith(expect.stringContaining('/api/terminal/sessions/abc/io'))
      created[0].drop()
      vi.advanceTimersByTime(250)
      expect(created).toHaveLength(2)
      created[1].drop()
      connection.dispose()
      vi.advanceTimersByTime(10_000)
      expect(created).toHaveLength(2)
    } finally {
      vi.unstubAllGlobals()
      globalThis.WebSocket = originalWebSocket
      vi.useRealTimers()
    }
  })
})
