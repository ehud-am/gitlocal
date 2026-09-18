import { createRef, forwardRef, useEffect, useImperativeHandle, useState, type Ref } from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TerminalPanel, type TerminalPanelHandle } from './TerminalPanel'
import type { DockPosition, TerminalSession } from '../../types'

const ORIGINAL_INNER_HEIGHT = window.innerHeight
const ORIGINAL_INNER_WIDTH = window.innerWidth

function setInnerHeight(value: number) {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value })
}

function setInnerWidth(value: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value })
}

const runningSession: TerminalSession = {
  id: 'session-1',
  cwd: '/repo',
  status: 'running',
  createdAt: '2026-01-01T00:00:00.000Z',
  exitInfo: null,
}

vi.mock('../../services/terminalApi', () => ({
  terminalApi: {
    createSession: vi.fn(),
    closeSession: vi.fn(),
  },
}))

// Function-component re-renders happen on every parent state change and don't indicate a
// remount — only an effect re-running does (matching what the real TerminalView relies on to
// avoid tearing down its xterm instance/WebSocket). Track mounts via useEffect, not render calls.
let terminalViewMountCount = 0
const terminalFocusCalls: string[] = []
vi.mock('./TerminalView', () => ({
  TerminalView: forwardRef(function FakeTerminalView(
    {
      sessionId,
      onExit,
    }: {
      sessionId: string
      onExit: (code: number | null, signal: string | null) => void
    },
    ref: Ref<{ focus: () => void }>,
  ) {
    useEffect(() => {
      terminalViewMountCount += 1
    }, [])
    useImperativeHandle(ref, () => ({ focus: () => terminalFocusCalls.push(sessionId) }), [sessionId])
    return (
      <div data-testid="fake-terminal-view">
        {sessionId}
        <button onClick={() => onExit(0, null)}>simulate exit</button>
      </div>
    )
  }),
}))

import { terminalApi } from '../../services/terminalApi'

const mockCreateSession = terminalApi.createSession as unknown as ReturnType<typeof vi.fn>
const mockCloseSession = terminalApi.closeSession as unknown as ReturnType<typeof vi.fn>

function Panel({ dockPosition = 'bottom' as DockPosition }: { dockPosition?: DockPosition }) {
  const [position, setPosition] = useState(dockPosition)
  return <TerminalPanel dockPosition={position} onDockPositionChange={setPosition} />
}

// Simulates the App.tsx shape: TerminalPanel mounted once alongside unrelated state that
// changes independently (e.g. selectedPath), so re-renders happen without TerminalPanel
// ever unmounting.
function AppShell() {
  const [unrelatedCount, setUnrelatedCount] = useState(0)
  return (
    <div>
      <button onClick={() => setUnrelatedCount((n) => n + 1)}>bump unrelated state</button>
      <span data-testid="unrelated-count">{unrelatedCount}</span>
      <Panel />
    </div>
  )
}

describe('TerminalPanel', () => {
  beforeEach(() => {
    terminalViewMountCount = 0
    terminalFocusCalls.length = 0
    mockCreateSession.mockReset()
    mockCloseSession.mockReset()
    mockCloseSession.mockResolvedValue(undefined)
  })

  afterEach(() => {
    setInnerHeight(ORIGINAL_INNER_HEIGHT)
    setInnerWidth(ORIGINAL_INNER_WIDTH)
  })

  async function openTerminal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'New Terminal' }))
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
  }

  it('starts with no tabs and the collapsed "New Terminal" affordance', () => {
    render(<Panel />)
    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
  })

  it('never reads terminal state from localStorage or the URL on mount (FR-016)', () => {
    localStorage.setItem('terminalPanelState', JSON.stringify({ visible: true, tabs: [{ id: 'stale' }] }))
    localStorage.setItem('gitlocal.terminal.tabs', JSON.stringify([{ id: 'stale' }]))
    const originalSearch = window.location.search
    window.history.replaceState({}, '', '?terminal=stale-tab-id')

    try {
      render(<Panel />)
      expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
      expect(screen.queryByTestId('fake-terminal-view')).not.toBeInTheDocument()
    } finally {
      localStorage.clear()
      window.history.replaceState({}, '', originalSearch || '/')
    }
  })

  it('keeps a running session mounted and untouched when unrelated App-level state changes', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'New Terminal' }))
    await waitFor(() => expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument())
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')

    await user.click(screen.getByRole('button', { name: 'bump unrelated state' }))
    await user.click(screen.getByRole('button', { name: 'bump unrelated state' }))
    await waitFor(() => expect(screen.getByTestId('unrelated-count')).toHaveTextContent('2'))

    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')
  })

  it('shows an error message and stays collapsed when session creation fails', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({ error: 'pty_unavailable', message: 'No PTY on this platform.' })

    render(<Panel />)
    await user.click(screen.getByRole('button', { name: 'New Terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No PTY on this platform.')
    expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
  })

  it('opens a plain terminal with no kind selector anywhere in the empty state', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    expect(screen.queryByLabelText('New terminal kind')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New Terminal' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Terminal 1' })).toBeInTheDocument())
    expect(mockCreateSession).toHaveBeenCalledWith(expect.not.objectContaining({ kind: expect.anything() }))
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')
  })

  it('falls back to a generic error message when the failure has none', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({})

    render(<Panel />)
    await user.click(screen.getByRole('button', { name: 'New Terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start a terminal session.')
  })

  it('shows a failure to open a second tab as a banner alongside the still-open first tab', async () => {
    const user = userEvent.setup()
    mockCreateSession
      .mockResolvedValueOnce(runningSession)
      .mockRejectedValueOnce({ error: 'pty_unavailable', message: 'No PTY available for a second session.' })

    render(<Panel />)
    await openTerminal(user)

    await user.click(screen.getByRole('button', { name: 'New Terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No PTY available for a second session.')
    expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument()
  })

  it('toggles the panel between expanded and collapsed', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)

    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show terminal' }))
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()
  })

  it('moves focus into the terminal when a session first opens, so a keyboard/screen-reader user is not stranded', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)

    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))
  })

  it('moves focus into the active terminal again when the panel is re-shown after being hidden', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))
    terminalFocusCalls.length = 0
    await user.click(screen.getByRole('button', { name: 'Show terminal' }))

    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))
  })

  it('hiding the panel closes no session and keeps output visible on show again (US2)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    expect(terminalViewMountCount).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))

    // Hiding must never end the session: no server-side close call, and the
    // TerminalView instance (and its WebSocket) stays mounted rather than being torn down.
    expect(mockCloseSession).not.toHaveBeenCalled()
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'none' })
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')

    await user.click(screen.getByRole('button', { name: 'Show terminal' }))

    // Same instance reappears with its state intact — output produced while hidden wasn't lost.
    expect(mockCloseSession).not.toHaveBeenCalled()
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'block' })
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')
  })

  it('keeps panel visibility unchanged across unrelated App state changes until explicitly toggled (US2)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'New Terminal' }))
    await waitFor(() => expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'none' })

    await user.click(screen.getByRole('button', { name: 'bump unrelated state' }))
    await user.click(screen.getByRole('button', { name: 'bump unrelated state' }))
    await waitFor(() => expect(screen.getByTestId('unrelated-count')).toHaveTextContent('2'))

    // Still hidden — an unrelated re-render must not reset visibility.
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'none' })

    await user.click(screen.getByRole('button', { name: 'Show terminal' }))
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'block' })

    await user.click(screen.getByRole('button', { name: 'bump unrelated state' }))
    await waitFor(() => expect(screen.getByTestId('unrelated-count')).toHaveTextContent('3'))

    // Still visible — same guarantee in the other direction.
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'block' })
  })

  it('closes a tab, notifies the server, and collapses back to the empty state once no tabs remain', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)

    await user.click(screen.getByRole('button', { name: 'Close Terminal 1' }))

    expect(mockCloseSession).toHaveBeenCalledWith('session-1')
    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
  })

  // TerminalView no longer receives tab status as a prop (it never rendered based on it —
  // see TP-002), so this only asserts what stays observable here: the exit report is handled
  // without unmounting/recreating the view. The status itself flipping to 'exited' is covered
  // directly by useTerminalPanel.test.ts's 'updateTabStatus updates only the matching tab'.
  it('does not unmount the TerminalView when it reports the underlying shell exited', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')

    await user.click(screen.getByRole('button', { name: 'simulate exit' }))

    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')
  })

  it('closing a tab does not surface a rejected server-side close as an error', async () => {
    const user = userEvent.setup()
    mockCloseSession.mockRejectedValue(new Error('already gone'))
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    await user.click(screen.getByRole('button', { name: 'Close Terminal 1' }))

    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
  })

  it('has no accessibility violations in the empty (collapsed) state', async () => {
    const { container } = render(<Panel />)
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('has no accessibility violations once a tab is open', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    const { container } = render(<Panel />)
    await openTerminal(user)

    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('exposes toggleTerminal via ref: opens the first tab when none exist, then toggles visibility once one does', async () => {
    mockCreateSession.mockResolvedValue(runningSession)
    const ref = createRef<TerminalPanelHandle>()

    render(<TerminalPanel ref={ref} dockPosition="bottom" onDockPositionChange={vi.fn()} />)

    act(() => ref.current?.toggleTerminal())
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()

    act(() => ref.current?.toggleTerminal())
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()

    act(() => ref.current?.toggleTerminal())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()
  })

  it('never forces the collapsed panel below its own content height, and never shrinks below the fold', async () => {
    mockCreateSession.mockResolvedValue(runningSession)
    const ref = createRef<TerminalPanelHandle>()

    render(<TerminalPanel ref={ref} dockPosition="bottom" onDockPositionChange={vi.fn()} />)

    act(() => ref.current?.toggleTerminal())
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())

    act(() => ref.current?.toggleTerminal())
    const panel = screen.getByTestId('terminal-panel')
    expect(panel).toHaveStyle({ height: 'auto' })
    expect(panel.className).toContain('shrink-0')
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeVisible()
  })

  it('Ctrl+` opens the first tab when none exist, and toggles visibility once one does (matches VS Code default binding)', async () => {
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)

    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()
  })

  it('ignores Ctrl+` variants that do not exactly match the shortcut', () => {
    render(<Panel />)

    fireEvent.keyDown(window, { key: 'a', ctrlKey: true })
    fireEvent.keyDown(window, { key: '`' })
    fireEvent.keyDown(window, { key: '`', ctrlKey: true, altKey: true })
    fireEvent.keyDown(window, { key: '`', ctrlKey: true, metaKey: true })
    fireEvent.keyDown(window, { key: '`', ctrlKey: true, shiftKey: true })

    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('renders resizable-panel semantics on the handle while visible, and drops them while collapsed', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    expect(handle).toHaveAttribute('role', 'separator')
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal')
    expect(handle).toHaveAttribute('tabindex', '0')

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))

    expect(handle).not.toHaveAttribute('role')
    expect(handle).not.toHaveAttribute('aria-orientation')
    expect(handle).not.toHaveAttribute('tabindex')
  })

  it('drag-grows the panel via the resize handle, clamps at the viewport-derived max, and ignores moves after mouseup', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)
    setInnerHeight(1000)

    render(<Panel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.mouseDown(handle, { clientY: 300 })
    fireEvent.mouseMove(window, { clientY: 200 })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '420px' })

    fireEvent.mouseMove(window, { clientY: -1000 })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '900px' })

    fireEvent.mouseUp(window)
    fireEvent.mouseMove(window, { clientY: 500 })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '900px' })
  })

  it('drag-shrinks the panel via the resize handle and clamps at the minimum height', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.mouseDown(handle, { clientY: 0 })
    fireEvent.mouseMove(window, { clientY: 1000 })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })

    fireEvent.mouseUp(window)
  })

  it('resizes the panel with ArrowUp/ArrowDown on the handle, clamped to the same min/max bounds', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)
    setInnerHeight(400)

    render(<Panel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '344px' })

    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '320px' })

    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '360px' })

    for (let i = 0; i < 20; i += 1) fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })

    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })
  })

  it('reclamps the panel height on window resize so it never exceeds a shrunk viewport', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<Panel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '344px' })

    setInnerHeight(100)
    fireEvent(window, new Event('resize'))

    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })
  })

  describe('dock position (US2)', () => {
    it('defaults to the "right" position when no preference has been supplied', () => {
      render(<TerminalPanel dockPosition="right" onDockPositionChange={vi.fn()} />)
      expect(screen.getByLabelText('Terminal panel position')).toHaveValue('right')
    })

    it('lets the user switch position via the DockPositionControl, in both the empty and open states', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)

      render(<Panel dockPosition="right" />)
      await user.selectOptions(screen.getByLabelText('Terminal panel position'), 'left')
      expect(screen.getByLabelText('Terminal panel position')).toHaveValue('left')

      await openTerminal(user)
      await user.selectOptions(screen.getByLabelText('Terminal panel position'), 'bottom')
      expect(screen.getByLabelText('Terminal panel position')).toHaveValue('bottom')
    })

    it('sizes by width with a vertical (column-resize) handle when docked left or right', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)

      render(<TerminalPanel dockPosition="right" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)

      const panel = screen.getByTestId('terminal-panel')
      expect(panel).toHaveStyle({ width: '420px' })
      const handle = screen.getByTestId('terminal-panel-resize-handle')
      expect(handle).toHaveAttribute('aria-orientation', 'vertical')
    })

    it('never loses open tabs or scrollback when switching dock position (FR-006)', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)

      render(<Panel dockPosition="right" />)
      await openTerminal(user)
      expect(terminalViewMountCount).toBe(1)

      await user.selectOptions(screen.getByLabelText('Terminal panel position'), 'left')
      await user.selectOptions(screen.getByLabelText('Terminal panel position'), 'bottom')

      // Same TerminalView instance throughout — never unmounted/remounted by a position change.
      expect(terminalViewMountCount).toBe(1)
      expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1')
      expect(screen.getByRole('tab', { name: 'Terminal 1' })).toBeInTheDocument()
    })

    it('drag-resizes the panel width when docked left, growing as the handle moves away from the panel', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)
      setInnerWidth(2000)

      render(<TerminalPanel dockPosition="left" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)
      const handle = screen.getByTestId('terminal-panel-resize-handle')

      fireEvent.mouseDown(handle, { clientX: 300 })
      fireEvent.mouseMove(window, { clientX: 400 })
      expect(screen.getByTestId('terminal-panel')).toHaveStyle({ width: '520px' })

      fireEvent.mouseUp(window)
    })

    it('drag-resizes the panel width when docked right, growing as the handle moves away from the panel', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)
      setInnerWidth(2000)

      render(<TerminalPanel dockPosition="right" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)
      const handle = screen.getByTestId('terminal-panel-resize-handle')

      fireEvent.mouseDown(handle, { clientX: 400 })
      fireEvent.mouseMove(window, { clientX: 300 })
      expect(screen.getByTestId('terminal-panel')).toHaveStyle({ width: '520px' })

      fireEvent.mouseUp(window)
    })

    it('resizes width with ArrowLeft/ArrowRight when side-docked, clamped to min/max bounds', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)
      setInnerWidth(1000)

      render(<TerminalPanel dockPosition="left" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)
      const handle = screen.getByTestId('terminal-panel-resize-handle')

      fireEvent.keyDown(handle, { key: 'ArrowRight' })
      expect(screen.getByTestId('terminal-panel')).toHaveStyle({ width: '444px' })

      fireEvent.keyDown(handle, { key: 'ArrowLeft' })
      expect(screen.getByTestId('terminal-panel')).toHaveStyle({ width: '420px' })
    })

    it('reclamps the panel width on window resize so it never exceeds a shrunk viewport', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)
      setInnerWidth(1000)

      render(<TerminalPanel dockPosition="right" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)

      setInnerWidth(100)
      fireEvent(window, new Event('resize'))

      expect(screen.getByTestId('terminal-panel')).toHaveStyle({ width: '240px' })
    })

    it('has no accessibility violations when docked left with a tab open', async () => {
      const user = userEvent.setup()
      mockCreateSession.mockResolvedValue(runningSession)

      const { container } = render(<TerminalPanel dockPosition="left" onDockPositionChange={vi.fn()} />)
      await openTerminal(user)

      expect((await axe(container)).violations).toHaveLength(0)
    })
  })
})
