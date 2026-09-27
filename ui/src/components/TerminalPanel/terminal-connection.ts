import { terminalApi } from '../../services/terminalApi'

// The server rejects WebSocket frames over 64 KB and closes the socket when one arrives, which is
// what a large paste used to do. JSON can escape one character to at most six bytes (\u001b), so
// 8192-character frames always stay under the limit.
export const MAX_INPUT_CHARS_PER_FRAME = 8192
// Keystrokes typed while (re)connecting are sent once the socket opens, up to this much.
const MAX_PENDING_INPUT_CHARS = 64 * 1024
const RECONNECT_DELAYS_MS = [250, 1000, 2000, 4000, 8000]
// Close code the server uses when the session no longer exists; reconnecting can't help.
const UNKNOWN_SESSION_CLOSE_CODE = 1011

export function splitInput(data: string, maxChars: number = MAX_INPUT_CHARS_PER_FRAME): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < data.length) {
    let end = Math.min(start + maxChars, data.length)
    // Never split a surrogate pair: each half would reach the shell as U+FFFD.
    const lastCode = data.charCodeAt(end - 1)
    if (end < data.length && end - start > 1 && lastCode >= 0xd800 && lastCode <= 0xdbff) end -= 1
    chunks.push(data.slice(start, end))
    start = end
  }
  return chunks
}

export interface TerminalConnectionCallbacks {
  onOutput: (data: string) => void
  /**
   * The server's replay of the session's recent output, sent on every (re)connect that has any.
   * `afterReconnect` is true when the screen still shows the pre-drop output, which the replay
   * should replace rather than be appended to.
   */
  onReplay: (data: string, afterReconnect: boolean) => void
  onExit: (code: number | null, signal: string | null) => void
  /** A short status line to show (connection lost, reconnecting, gave up, input discarded). */
  onNotice: (message: string) => void
}

export interface TerminalConnectionOptions {
  connect?: (sessionId: string) => WebSocket
  schedule?: (callback: () => void, delayMs: number) => unknown
  cancel?: (handle: unknown) => void
}

export interface TerminalConnection {
  sendInput: (data: string) => void
  resize: (cols: number, rows: number) => void
  dispose: () => void
}

// One session's WebSocket, kept alive across drops (a laptop waking from sleep, the server
// briefly unreachable): input typed meanwhile is queued, and after reconnecting the server's replay
// of recent output redraws the screen instead of being appended twice. The screen is only replaced
// once a replay actually arrives, so reconnecting to a session that has since ended (the server
// accepts the socket, then closes it with 1011) leaves the last output visible.
export function createTerminalConnection(
  sessionId: string,
  callbacks: TerminalConnectionCallbacks,
  options: TerminalConnectionOptions = {},
): TerminalConnection {
  const connect = options.connect ?? terminalApi.connectSessionSocket
  const schedule = options.schedule ?? ((callback, delayMs) => setTimeout(callback, delayMs))
  const cancel = options.cancel ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>))

  let socket: WebSocket
  let disposed = false
  let exited = false
  let failedAttempts = 0
  let reconnectHandle: unknown = null
  let pendingInput: string[] = []
  let pendingChars = 0
  // Set once queued input overflows: everything after it is dropped too until the socket reopens,
  // so a later Enter can't run a half-typed line whose middle was discarded.
  let discardingInput = false
  let reconnected = false
  let size: { cols: number; rows: number } | null = null
  let sentSize = ''

  function send(data: string) {
    for (const chunk of splitInput(data)) terminalApi.sendInput(socket, chunk)
  }

  function sendSizeIfChanged() {
    if (!size || socket.readyState !== WebSocket.OPEN) return
    const key = `${size.cols}x${size.rows}`
    if (key === sentSize) return
    sentSize = key
    terminalApi.sendResize(socket, size.cols, size.rows)
  }

  function open(isReconnect: boolean) {
    socket = connect(sessionId)
    socket.addEventListener('open', () => {
      failedAttempts = 0
      reconnected = isReconnect
      sentSize = ''
      sendSizeIfChanged()
      const queued = pendingInput.join('')
      pendingInput = []
      pendingChars = 0
      discardingInput = false
      if (queued) send(queued)
    })
    socket.addEventListener('message', (event: MessageEvent) => {
      const frame = terminalApi.parseInboundFrame(String(event.data))
      if (!frame) return
      if (frame.type === 'output' && frame.data) {
        if (frame.replay) {
          callbacks.onReplay(frame.data, reconnected)
        } else {
          callbacks.onOutput(frame.data)
        }
        reconnected = false
      } else if (frame.type === 'exit') {
        exited = true
        callbacks.onExit(frame.code ?? null, frame.signal ?? null)
      }
    })
    socket.addEventListener('close', (event: CloseEvent) => {
      if (disposed || exited) return
      if (event.code === UNKNOWN_SESSION_CLOSE_CODE || failedAttempts >= RECONNECT_DELAYS_MS.length) {
        exited = true
        callbacks.onNotice('Disconnected from this terminal session. Open a new terminal to continue.')
        callbacks.onExit(null, null)
        return
      }
      if (failedAttempts === 0) callbacks.onNotice('Connection lost. Reconnecting...')
      const delay = RECONNECT_DELAYS_MS[failedAttempts]
      failedAttempts += 1
      reconnectHandle = schedule(() => {
        reconnectHandle = null
        open(true)
      }, delay)
    })
  }

  open(false)

  return {
    sendInput(data: string) {
      if (disposed || exited) return
      if (socket.readyState === WebSocket.OPEN) {
        send(data)
      } else if (discardingInput) {
        return
      } else if (pendingChars + data.length <= MAX_PENDING_INPUT_CHARS) {
        pendingInput.push(data)
        pendingChars += data.length
      } else {
        discardingInput = true
        callbacks.onNotice('Too much was typed or pasted while disconnected; input is being discarded until the terminal reconnects.')
      }
    },
    resize(cols: number, rows: number) {
      size = { cols, rows }
      sendSizeIfChanged()
    },
    dispose() {
      disposed = true
      if (reconnectHandle !== null) cancel(reconnectHandle)
      socket.close()
    },
  }
}
