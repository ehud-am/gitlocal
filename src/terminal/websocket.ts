import type { IncomingMessage, Server as HttpServer } from 'node:http'
import type { Socket } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'
import { sessionManager } from './session-manager.js'

const TERMINAL_IO_PATH = /^\/api\/terminal\/sessions\/([^/]+)\/io$/
const MAX_FRAME_BYTES = 64 * 1024

interface InboundFrame {
  type: string
  data?: string
  cols?: number
  rows?: number
}

// Attaches a WS upgrade handler to the real Node http.Server returned by @hono/node-server's
// serve(). Hono's own request/response cycle has no access to the raw upgrade event, so this
// must be wired in by the caller (src/cli.ts) once it has the real server instance — createApp()
// alone (used directly in tests via hono/testing) has no server to attach to.
export function attachTerminalWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_FRAME_BYTES })

  httpServer.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
    const pathname = new URL(request.url ?? '', 'http://localhost').pathname
    const match = TERMINAL_IO_PATH.exec(pathname)
    if (!match) {
      return
    }

    const sessionId = match[1]
    wss.handleUpgrade(request, socket, head, (ws) => {
      wireTerminalSocket(ws, sessionId)
    })
  })

  return wss
}

function wireTerminalSocket(ws: WebSocket, sessionId: string): void {
  const subscription = sessionManager.subscribe(
    sessionId,
    (chunk) => sendFrame(ws, { type: 'output', data: chunk }),
    () => {
      const session = sessionManager.getSession(sessionId)
      sendFrame(ws, { type: 'exit', code: session?.exitInfo?.code ?? null, signal: session?.exitInfo?.signal ?? null })
    },
  )

  if (!subscription) {
    ws.close(1011, 'Unknown terminal session')
    return
  }

  if (subscription.bufferedOutput) {
    sendFrame(ws, { type: 'output', data: subscription.bufferedOutput })
  }

  ws.on('message', (raw) => {
    const frame = parseFrame(raw.toString())
    if (!frame) return
    if (frame.type === 'input' && typeof frame.data === 'string') {
      sessionManager.writeInput(sessionId, frame.data)
    } else if (frame.type === 'resize' && typeof frame.cols === 'number' && typeof frame.rows === 'number') {
      sessionManager.resize(sessionId, frame.cols, frame.rows)
    }
  })

  // Closing the socket does NOT close the session (FR-003) — only DELETE does. Unsubscribing
  // just stops streaming to this now-dead socket; the PTY keeps running in the background.
  ws.on('close', () => {
    subscription.unsubscribe()
  })
}

function parseFrame(raw: string): InboundFrame | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as InboundFrame) : null
  } catch {
    return null
  }
}

function sendFrame(ws: WebSocket, frame: Record<string, unknown>): void {
  /* v8 ignore next 3 -- defensive: guards against a send racing a socket that closed a tick earlier */
  if (ws.readyState !== ws.OPEN) {
    return
  }
  ws.send(JSON.stringify(frame))
}
