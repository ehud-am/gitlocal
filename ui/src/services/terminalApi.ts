import type {
  CreateTerminalSessionRequest,
  TerminalCapabilities,
  TerminalSession,
  TerminalUnavailableResponse,
} from '../types'
import { getJson } from './httpClient'

const BASE = ''

async function requestJson<T>(path: string): Promise<T> {
  return getJson<T>(BASE + path, (res) => ({ error: 'pty_unavailable', message: res.statusText }))
}

export interface TerminalIoOutboundFrame {
  type: 'input' | 'resize'
  data?: string
  cols?: number
  rows?: number
}

export interface TerminalIoInboundFrame {
  type: 'output' | 'exit'
  data?: string
  code?: number | null
  signal?: string | null
}

export const terminalApi = {
  createSession: async (payload: CreateTerminalSessionRequest): Promise<TerminalSession> => {
    const res = await fetch(BASE + '/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(
      () =>
        ({
          error: 'pty_unavailable',
          message: res.statusText || 'Failed to create a terminal session.',
        }) satisfies TerminalUnavailableResponse,
    )
    if (!res.ok) {
      throw body as TerminalUnavailableResponse
    }
    return body as TerminalSession
  },

  listSessions: (): Promise<TerminalSession[]> => requestJson<TerminalSession[]>('/api/terminal/sessions'),

  closeSession: async (id: string): Promise<void> => {
    const res = await fetch(BASE + `/api/terminal/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) {
      throw await res.json().catch(() => ({ error: 'pty_unavailable', message: res.statusText }))
    }
  },

  getCapabilities: (): Promise<TerminalCapabilities> =>
    requestJson<TerminalCapabilities>('/api/terminal/capabilities'),

  connectSessionSocket: (id: string): WebSocket => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return new WebSocket(`${protocol}//${window.location.host}/api/terminal/sessions/${encodeURIComponent(id)}/io`)
  },

  sendInput: (socket: WebSocket, data: string): void => {
    socket.send(JSON.stringify({ type: 'input', data } satisfies TerminalIoOutboundFrame))
  },

  sendResize: (socket: WebSocket, cols: number, rows: number): void => {
    socket.send(JSON.stringify({ type: 'resize', cols, rows } satisfies TerminalIoOutboundFrame))
  },

  parseInboundFrame: (raw: string): TerminalIoInboundFrame | null => {
    try {
      const parsed: unknown = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as TerminalIoInboundFrame) : null
    } catch {
      return null
    }
  },
}
