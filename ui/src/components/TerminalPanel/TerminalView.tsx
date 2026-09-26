import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import { createTerminalConnection } from './terminal-connection'
import { createTerminalKeyHandler, detectTerminalPlatform } from './terminal-shortcuts'

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
  const [notice, setNotice] = useState('')
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

    // While xterm parses a replay of old output it answers any terminal queries in it (cursor
    // position, device attributes) through onData; those answers belong to programs that asked
    // long ago and would land in the shell as typed junk, so they are dropped.
    let replaying = false
    const connection = createTerminalConnection(sessionId, {
      onOutput: (data) => terminal.write(data),
      onReplay: (data, afterReconnect) => {
        replaying = true
        // RIS in-band rather than terminal.reset(), so it applies after any output still queued
        // from before the drop instead of racing it.
        terminal.write(afterReconnect ? `\x1bc${data}` : data, () => {
          replaying = false
        })
      },
      onExit: (code, signal) => onExitRef.current(code, signal),
      onNotice: (message) => {
        terminal.write(`\r\n\x1b[2m[${message}]\x1b[0m\r\n`)
        // Text written into the terminal grid isn't announced to screen readers.
        setNotice(message)
      },
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

    // Keys the panel handles instead of the shell (see classifyTerminalKey). Ctrl+` must be
    // caught here too: xterm would otherwise swallow it and send it to the shell as input
    // instead of toggling the panel (matches VS Code's terminal).
    terminal.attachCustomKeyEventHandler(
      createTerminalKeyHandler(terminal, {
        platform: detectTerminalPlatform(),
        onTogglePanel: () => onToggleShortcutRef.current?.(),
        copyViaCommand: () => document.execCommand('copy'),
        writeClipboard: navigator.clipboard?.writeText ? (text) => navigator.clipboard.writeText(text) : undefined,
      }),
    )

    const inputDisposable = terminal.onData((data) => {
      if (!replaying) connection.sendInput(data)
    })

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

  return (
    <>
      <div ref={containerRef} className="h-full w-full" data-testid="terminal-view" />
      <div className="sr-only" role="status" aria-live="polite">
        {notice}
      </div>
    </>
  )
})
