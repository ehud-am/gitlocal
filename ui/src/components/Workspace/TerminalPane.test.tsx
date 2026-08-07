import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TerminalPane from './TerminalPane'

const terminalInstances: Array<{
  write: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  open: ReturnType<typeof vi.fn>
  loadAddon: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
  cols: number
  rows: number
  dataHandler?: (data: string) => void
}> = []

vi.mock('@xterm/xterm', () => {
  class FakeTerminal {
    cols = 80
    rows = 24
    write = vi.fn()
    dispose = vi.fn()
    open = vi.fn()
    loadAddon = vi.fn()
    onData = vi.fn((handler: (data: string) => void) => {
      this.dataHandler = handler
      return { dispose: vi.fn() }
    })
    dataHandler?: (data: string) => void

    constructor() {
      terminalInstances.push(this)
    }
  }
  return { Terminal: FakeTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  class FakeFitAddon {
    fit = vi.fn()
  }
  return { FitAddon: FakeFitAddon }
})

const socketInstances: Array<{
  handlers: {
    onOpen?: () => void
    onOutput?: (chunk: string) => void
    onClose?: (endedCleanly: boolean) => void
    onError?: () => void
  }
  connect: ReturnType<typeof vi.fn>
  sendInput: ReturnType<typeof vi.fn>
  sendResize: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}> = []

vi.mock('../../services/terminalSocket', () => {
  class FakeTerminalSocket {
    handlers: Record<string, unknown>
    connect = vi.fn()
    sendInput = vi.fn()
    sendResize = vi.fn()
    close = vi.fn()

    constructor(handlers: Record<string, unknown>) {
      this.handlers = handlers
      socketInstances.push(this as never)
    }
  }
  return { TerminalSocket: FakeTerminalSocket }
})

describe('TerminalPane', () => {
  beforeEach(() => {
    terminalInstances.length = 0
    socketInstances.length = 0
  })

  it('starts in the connecting state', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    expect(screen.getByText('Terminal status: connecting')).toBeInTheDocument()
  })

  it('has an accessible name identifying it as a terminal session', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    expect(screen.getByRole('group', { name: 'Terminal session: Terminal 1' })).toBeInTheDocument()
  })

  it('moves to connected and reports a session id once the socket opens', () => {
    const onSessionId = vi.fn()
    render(<TerminalPane paneId="term-1" title="Terminal 1" onSessionId={onSessionId} />)

    act(() => { socketInstances[0].handlers.onOpen?.() })

    expect(screen.getByText('Terminal status: connected')).toBeInTheDocument()
    expect(onSessionId).toHaveBeenCalledWith('term-1-session')
    expect(socketInstances[0].sendResize).toHaveBeenCalled()
  })

  it('writes streamed output chunks into the terminal', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    socketInstances[0].handlers.onOutput?.('hello\n')
    expect(terminalInstances[0].write).toHaveBeenCalledWith('hello\n')
  })

  it('forwards typed input to the socket', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    terminalInstances[0].dataHandler?.('ls\n')
    expect(socketInstances[0].sendInput).toHaveBeenCalledWith('ls\n')
  })

  it('shows the "session ended" state when the shell exits on its own (clean close)', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    act(() => { socketInstances[0].handlers.onClose?.(true) })
    expect(screen.getByText('Terminal status: ended')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Session ended. The shell process exited.')
  })

  it('shows a distinct error state for an unexpected disconnect', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    act(() => { socketInstances[0].handlers.onClose?.(false) })
    expect(screen.getByText('Terminal status: error')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Connection lost.')
  })

  it('shows the error state on a socket error event', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    act(() => { socketInstances[0].handlers.onError?.() })
    expect(screen.getByText('Terminal status: error')).toBeInTheDocument()
  })

  it('closes the socket and disposes the terminal on unmount', () => {
    const { unmount } = render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    unmount()
    expect(socketInstances[0].close).toHaveBeenCalledTimes(1)
    expect(terminalInstances[0].dispose).toHaveBeenCalledTimes(1)
  })

  it('re-fits and resizes on window resize', () => {
    render(<TerminalPane paneId="term-1" title="Terminal 1" />)
    const resizeCallsBefore = socketInstances[0].sendResize.mock.calls.length
    window.dispatchEvent(new Event('resize'))
    expect(socketInstances[0].sendResize.mock.calls.length).toBeGreaterThan(resizeCallsBefore)
  })
})
