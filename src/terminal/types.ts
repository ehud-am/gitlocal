// Shared types for the integrated terminal panel feature. Kept in `src/terminal/` (rather than
// the app-wide `src/types.ts`) per `plan.md`'s Project Structure — this feature's types are only
// consumed by `src/terminal/*`, `src/handlers/terminal.ts`, and the UI's terminal components.

export type TerminalKind = 'regular' | 'claude' | 'codex'

export type TerminalSessionStatus = 'starting' | 'running' | 'exited' | 'unavailable'

export interface TerminalExitInfo {
  code: number | null
  signal: string | null
}

export interface TerminalSession {
  id: string
  kind: TerminalKind
  cwd: string
  status: TerminalSessionStatus
  createdAt: string
  exitInfo: TerminalExitInfo | null
}

export type TerminalContextType = 'file' | 'dir' | 'none'

export interface CreateTerminalSessionRequest {
  kind: TerminalKind
  contextPath?: string
  contextType?: TerminalContextType
}

type TerminalUnavailableErrorCode = 'cli_not_found' | 'pty_unavailable' | 'session_limit_reached'

export interface TerminalUnavailableResponse {
  error: TerminalUnavailableErrorCode
  message: string
}

export interface TerminalCapabilities {
  available: boolean
  claudeCliFound: boolean
  codexCliFound: boolean
}
