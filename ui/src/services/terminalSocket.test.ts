import { describe, expect, it, vi } from 'vitest'
import { TerminalSocket, type BrowserWebSocketLike } from './terminalSocket'

class FakeWebSocket implements BrowserWebSocketLike {
  readyState = 0
  sent: string[] = []
  closed = false
  private listeners: Record<string, Array<(event: unknown) => void>> = {}

  addEventListener(type: 'open', listener: () => void): void
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  addEventListener(type: 'close', listener: (event: { code: number }) => void): void
  addEventListener(type: 'error', listener: () => void): void
  addEventListener(type: string, listener: (event: never) => void): void {
    this.listeners[type] = [...(this.listeners[type] ?? []), listener as (event: unknown) => void]
  }

  emit(type: string, event: unknown = {}): void {
    for (const listener of this.listeners[type] ?? []) listener(event)
  }

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }
}

describe('TerminalSocket', () => {
  it('connects using the provided factory and forwards open events', () => {
    const fake = new FakeWebSocket()
    const onOpen = vi.fn()
    const socket = new TerminalSocket({ onOpen }, () => fake, 'ws://test/ws/terminal')

    socket.connect()
    fake.emit('open')

    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('forwards string output chunks to onOutput', () => {
    const fake = new FakeWebSocket()
    const onOutput = vi.fn()
    const socket = new TerminalSocket({ onOutput }, () => fake, 'ws://test/ws/terminal')

    socket.connect()
    fake.emit('message', { data: 'hello$ ' })

    expect(onOutput).toHaveBeenCalledWith('hello$ ')
  })

  it('coerces non-string message data to a string', () => {
    const fake = new FakeWebSocket()
    const onOutput = vi.fn()
    const socket = new TerminalSocket({ onOutput }, () => fake, 'ws://test/ws/terminal')

    socket.connect()
    fake.emit('message', { data: 42 })

    expect(onOutput).toHaveBeenCalledWith('42')
  })

  it('reports a clean close (code 1000) distinctly from an unexpected close', () => {
    const fake = new FakeWebSocket()
    const onClose = vi.fn()
    const socket = new TerminalSocket({ onClose }, () => fake, 'ws://test/ws/terminal')

    socket.connect()
    fake.emit('close', { code: 1000 })
    expect(onClose).toHaveBeenCalledWith(true)

    fake.emit('close', { code: 1006 })
    expect(onClose).toHaveBeenCalledWith(false)
  })

  it('forwards error events to onError', () => {
    const fake = new FakeWebSocket()
    const onError = vi.fn()
    const socket = new TerminalSocket({ onError }, () => fake, 'ws://test/ws/terminal')

    socket.connect()
    fake.emit('error')

    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('sends input only when the socket is open', () => {
    const fake = new FakeWebSocket()
    const socket = new TerminalSocket({}, () => fake, 'ws://test/ws/terminal')
    socket.connect()

    socket.sendInput('ls\n')
    expect(fake.sent).toEqual([])

    fake.readyState = 1
    socket.sendInput('ls\n')
    expect(fake.sent).toEqual(['ls\n'])
  })

  it('sends a resize control message as JSON when the socket is open', () => {
    const fake = new FakeWebSocket()
    fake.readyState = 1
    const socket = new TerminalSocket({}, () => fake, 'ws://test/ws/terminal')
    socket.connect()

    socket.sendResize(120, 40)
    expect(fake.sent).toEqual([JSON.stringify({ type: 'resize', cols: 120, rows: 40 })])
  })

  it('is a no-op to send input/resize before connect() has been called', () => {
    const socket = new TerminalSocket({})
    expect(() => socket.sendInput('x')).not.toThrow()
    expect(() => socket.sendResize(80, 24)).not.toThrow()
  })

  it('closes the underlying socket', () => {
    const fake = new FakeWebSocket()
    const socket = new TerminalSocket({}, () => fake, 'ws://test/ws/terminal')
    socket.connect()
    socket.close()
    expect(fake.closed).toBe(true)
  })

  it('is a no-op to close before connect() has been called', () => {
    const socket = new TerminalSocket({})
    expect(() => socket.close()).not.toThrow()
  })

  it('does not reconnect on its own after an unexpected close or an error (by design — TerminalPane surfaces a "Connection lost" banner instead)', () => {
    const factory = vi.fn(() => new FakeWebSocket())
    const onClose = vi.fn()
    const onError = vi.fn()
    const socket = new TerminalSocket({ onClose, onError }, factory, 'ws://test/ws/terminal')

    socket.connect()
    expect(factory).toHaveBeenCalledTimes(1)
    const fake = factory.mock.results[0].value as FakeWebSocket

    fake.emit('close', { code: 1006 })
    fake.emit('error')

    expect(onClose).toHaveBeenCalledWith(false)
    expect(onError).toHaveBeenCalledTimes(1)
    expect(factory).toHaveBeenCalledTimes(1)
  })
})
