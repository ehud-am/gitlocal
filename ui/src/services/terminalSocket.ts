export type TerminalSocketConnectionState = 'connecting' | 'connected' | 'ended' | 'error'

export interface TerminalSocketHandlers {
  onOpen?: () => void
  onOutput?: (chunk: string) => void
  /** `endedCleanly` is true when the server closed with code 1000 (e.g. the shell process exited on its own). */
  onClose?: (endedCleanly: boolean) => void
  onError?: () => void
}

/** Minimal shape of the browser `WebSocket` this client depends on, so tests can inject a fake. */
export interface BrowserWebSocketLike {
  readyState: number
  send(data: string): void
  close(): void
  addEventListener(type: 'open', listener: () => void): void
  addEventListener(type: 'message', listener: (event: { data: unknown }) => void): void
  addEventListener(type: 'close', listener: (event: { code: number }) => void): void
  addEventListener(type: 'error', listener: () => void): void
}

export type WebSocketFactory = (url: string) => BrowserWebSocketLike

function defaultWebSocketFactory(url: string): BrowserWebSocketLike {
  return new WebSocket(url) as unknown as BrowserWebSocketLike
}

function defaultTerminalWsUrl(path = '/ws/terminal'): string {
  const isBrowser = typeof window !== 'undefined' && typeof window.location !== 'undefined'
  const protocol = isBrowser && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = isBrowser ? window.location.host : 'localhost'
  return `${protocol}//${host}${path}`
}

const NORMAL_CLOSURE_CODE = 1000

/**
 * Thin WebSocket client wrapper for one Terminal Pane's session (US3): connects to the
 * server's terminal WS route, forwards keystrokes/resize events, and surfaces output/close/error
 * events to the caller (typically `TerminalPane.tsx`, which renders them via xterm.js).
 */
export class TerminalSocket {
  private socket: BrowserWebSocketLike | null = null

  constructor(
    private readonly handlers: TerminalSocketHandlers = {},
    private readonly createSocket: WebSocketFactory = defaultWebSocketFactory,
    private readonly url: string = defaultTerminalWsUrl(),
  ) {}

  connect(): void {
    const socket = this.createSocket(this.url)
    this.socket = socket

    socket.addEventListener('open', () => {
      this.handlers.onOpen?.()
    })

    socket.addEventListener('message', (event) => {
      const data = event.data
      const text = typeof data === 'string' ? data : String(data)
      this.handlers.onOutput?.(text)
    })

    socket.addEventListener('close', (event) => {
      this.handlers.onClose?.(event.code === NORMAL_CLOSURE_CODE)
    })

    socket.addEventListener('error', () => {
      this.handlers.onError?.()
    })
  }

  /** Sends literal keystroke/input text to the server-side PTY. */
  sendInput(data: string): void {
    if (!this.socket || this.socket.readyState !== 1 /* OPEN */) return
    this.socket.send(data)
  }

  /** Sends a terminal resize (cols/rows) to the server-side PTY. */
  sendResize(cols: number, rows: number): void {
    if (!this.socket || this.socket.readyState !== 1 /* OPEN */) return
    this.socket.send(JSON.stringify({ type: 'resize', cols, rows }))
  }

  close(): void {
    this.socket?.close()
  }
}
