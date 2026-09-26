import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { createTerminalConnection } from './terminal-connection'
import { classifyTerminalKey, detectTerminalPlatform } from './terminal-shortcuts'

interface TerminalViewProps {
  sessionId: string
  onExit: (code: number | null, signal: string | null) => void
  onToggleShortcut?: () => void
}

export interface TerminalViewHandle {
  focus: () => void
}

// Mounts one xterm.js instance bound to one session's WebSocket. Keyed by sessionId in the
// parent (TerminalPanel) so switching tabs never tears this down — only closing a tab does.
// Exposes focus() via ref so the panel can move keyboard focus into the terminal whenever it
// becomes the visible/active tab, since opening the panel otherwise leaves focus wherever it was.
export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(function TerminalView(
  { sessionId, onExit, onToggleShortcut }: TerminalViewProps,
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const onToggleShortcutRef = useRef(onToggleShortcut)
  onToggleShortcutRef.current = onToggleShortcut

  useImperativeHandle(ref, () => ({ focus: () => terminalRef.current?.focus() }), [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // No convertEol: the PTY already sends CR LF, and converting bare LF breaks the programs that
    // use LF to move the cursor down one row (shell line editors redrawing a wrapped command line
    // while walking history with the arrow keys, pagers, editors), leaving the cursor misplaced.
    const terminal = new Terminal({ cursorBlink: true, fontSize: 13 })
    terminalRef.current = terminal
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(container)
    fitAddon.fit()

    const connection = createTerminalConnection(sessionId, {
      onOutput: (data) => terminal.write(data),
      onExit: (code, signal) => onExitRef.current(code, signal),
      onNotice: (message) => terminal.write(`\r\n\x1b[2m[${message}]\x1b[0m\r\n`),
      onReconnected: () => terminal.reset(),
    })
    connection.resize(terminal.cols, terminal.rows)

    // A container mounted mid-layout-pass (e.g. inside a side-docked panel, where the box's
    // width comes from a sibling flex chain rather than a simple explicit height) can measure
    // as 0x0 for this first synchronous fit(), leaving the terminal permanently blank until
    // something else happens to resize it. One extra fit on the next animation frame — after
    // the browser has definitely finished layout — is a cheap, standard guard against that.
    const raf = requestAnimationFrame(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        fitAddon.fit()
        connection.resize(terminal.cols, terminal.rows)
      }
    })

    const platform = detectTerminalPlatform()
    const copySelection = () => {
      const text = terminal.getSelection()
      if (!text) return
      const fallback = () => document.execCommand('copy')
      if (navigator.clipboard?.writeText) {
        void navigator.clipboard.writeText(text).catch(fallback)
      } else {
        fallback()
      }
      terminal.clearSelection()
    }

    // Keys the panel handles instead of the shell (see classifyTerminalKey). Ctrl+` must be
    // caught here too: xterm would otherwise swallow it and send it to the shell as input
    // instead of toggling the panel (matches VS Code's terminal).
    terminal.attachCustomKeyEventHandler((event) => {
      const shortcut = classifyTerminalKey(event, platform, terminal.hasSelection())
      if (shortcut === null) return true
      if (shortcut === 'toggle-panel') {
        event.preventDefault()
        onToggleShortcutRef.current?.()
      } else if (shortcut === 'copy') {
        event.preventDefault()
        copySelection()
      } else if (shortcut === 'clear') {
        event.preventDefault()
        terminal.clear()
      }
      // 'paste': no preventDefault, so the browser fires its paste event, which xterm turns into
      // input (with bracketed-paste markers when the shell asks for them).
      return false
    })

    const inputDisposable = terminal.onData((data) => connection.sendInput(data))

    // Fitting is cheap; the resize message is only sent when the column/row count actually
    // changes, so dragging the panel edge doesn't flood the shell with redraw signals.
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth === 0 || container.clientHeight === 0) return
      fitAddon.fit()
      connection.resize(terminal.cols, terminal.rows)
    })
    resizeObserver.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      inputDisposable.dispose()
      connection.dispose()
      terminal.dispose()
      terminalRef.current = null
    }
  }, [sessionId])

  return <div ref={containerRef} className="h-full w-full" data-testid="terminal-view" />
})
