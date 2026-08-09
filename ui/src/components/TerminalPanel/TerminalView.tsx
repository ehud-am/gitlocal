import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { terminalApi } from '../../services/terminalApi'
import type { TerminalSession } from '../../types'

interface TerminalViewProps {
  session: TerminalSession
  onExit: (code: number | null, signal: string | null) => void
  onToggleShortcut?: () => void
}

// Mounts one xterm.js instance bound to one session's WebSocket. Keyed by session.id in the
// parent (TerminalPanel) so switching tabs never tears this down — only closing a tab does.
export function TerminalView({ session, onExit, onToggleShortcut }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const onToggleShortcutRef = useRef(onToggleShortcut)
  onToggleShortcutRef.current = onToggleShortcut

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const terminal = new Terminal({ convertEol: true, cursorBlink: true })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitAddon.fit()

    // Without this, Ctrl+` while the terminal has focus is swallowed by xterm and sent to the
    // shell as literal input instead of toggling the panel (matches VS Code's terminal, where
    // the shortcut works the same whether or not the terminal is focused).
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown' || event.key !== '`' || !event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
        return true
      }
      event.preventDefault()
      onToggleShortcutRef.current?.()
      return false
    })

    const socket = terminalApi.connectSessionSocket(session.id)

    const handleOpen = () => terminalApi.sendResize(socket, terminal.cols, terminal.rows)
    const handleMessage = (event: MessageEvent) => {
      const frame = terminalApi.parseInboundFrame(String(event.data))
      if (!frame) return
      if (frame.type === 'output' && frame.data) {
        terminal.write(frame.data)
      } else if (frame.type === 'exit') {
        onExitRef.current(frame.code ?? null, frame.signal ?? null)
      }
    }
    socket.addEventListener('open', handleOpen)
    socket.addEventListener('message', handleMessage)

    const inputDisposable = terminal.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        terminalApi.sendInput(socket, data)
      }
    })

    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      fitAddon.fit()
      if (socket.readyState === WebSocket.OPEN) {
        terminalApi.sendResize(socket, terminal.cols, terminal.rows)
      }
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      inputDisposable.dispose()
      socket.removeEventListener('open', handleOpen)
      socket.removeEventListener('message', handleMessage)
      socket.close()
      terminal.dispose()
    }
  }, [session.id])

  return <div ref={containerRef} className="h-full w-full" data-testid="terminal-view" />
}
