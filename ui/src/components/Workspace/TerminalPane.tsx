import { useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { TerminalSocket, type TerminalSocketConnectionState } from '../../services/terminalSocket'

export interface TerminalPaneProps {
  paneId: string
  title: string
  /** Called once the server assigns a session id for this pane's WebSocket connection. */
  onSessionId?: (sessionId: string) => void
}

/**
 * One live terminal session (US3): an `xterm.js` instance bound to a single `TerminalSocket`
 * WebSocket connection to the server's `/ws/terminal` route. Tracks `connectionState`
 * (`connecting`/`connected`/`ended`/`error`) per data-model.md so the pane can show a clear
 * "session ended" or connection-error state instead of freezing or going blank (Edge Cases).
 */
export default function TerminalPane({ paneId, title, onSessionId }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [connectionState, setConnectionState] = useState<TerminalSocketConnectionState>('connecting')

  useEffect(() => {
    const container = containerRef.current as HTMLDivElement

    const terminal = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontSize: 13,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitAddon.fit()

    const socket = new TerminalSocket({
      onOpen: () => {
        setConnectionState('connected')
        onSessionId?.(`${paneId}-session`)
        fitAddon.fit()
        socket.sendResize(terminal.cols, terminal.rows)
      },
      onOutput: (chunk) => {
        terminal.write(chunk)
      },
      onClose: (endedCleanly) => {
        setConnectionState(endedCleanly ? 'ended' : 'error')
      },
      onError: () => {
        setConnectionState('error')
      },
    })
    socket.connect()

    const inputDisposable = terminal.onData((data) => {
      socket.sendInput(data)
    })

    function handleResize(): void {
      fitAddon.fit()
      socket.sendResize(terminal.cols, terminal.rows)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      inputDisposable.dispose()
      socket.close()
      terminal.dispose()
    }
    // Intentionally re-run only when the pane identity changes — a fresh session per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneId])

  return (
    <div className="terminal-pane" role="group" aria-label={`Terminal session: ${title}`}>
      <div className="terminal-pane-status" role="status" aria-live="polite">
        Terminal status: {connectionState}
      </div>
      {connectionState === 'ended' ? (
        <div className="terminal-pane-ended" role="alert">
          Session ended. The shell process exited.
        </div>
      ) : null}
      {connectionState === 'error' ? (
        <div className="terminal-pane-error" role="alert">
          Connection lost.
        </div>
      ) : null}
      <div ref={containerRef} className="terminal-pane-surface" />
    </div>
  )
}
