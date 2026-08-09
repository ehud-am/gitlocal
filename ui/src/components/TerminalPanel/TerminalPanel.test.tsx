import { createRef, forwardRef, useEffect, useImperativeHandle, useState, type Ref } from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TerminalPanel, type TerminalPanelHandle } from './TerminalPanel'
import type { TerminalSession } from '../../types'

const ORIGINAL_INNER_HEIGHT = window.innerHeight

function setInnerHeight(value: number) {
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value })
}

const runningSession: TerminalSession = {
  id: 'session-1',
  kind: 'regular',
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
      session,
      onExit,
    }: {
      session: TerminalSession
      onExit: (code: number | null, signal: string | null) => void
    },
    ref: Ref<{ focus: () => void }>,
  ) {
    useEffect(() => {
      terminalViewMountCount += 1
    }, [])
    useImperativeHandle(ref, () => ({ focus: () => terminalFocusCalls.push(session.id) }), [session.id])
    return (
      <div data-testid="fake-terminal-view">
        {session.id}:{session.status}
        <button onClick={() => onExit(0, null)}>simulate exit</button>
      </div>
    )
  }),
}))

import { terminalApi } from '../../services/terminalApi'

const mockCreateSession = terminalApi.createSession as unknown as ReturnType<typeof vi.fn>
const mockCloseSession = terminalApi.closeSession as unknown as ReturnType<typeof vi.fn>

// Simulates the App.tsx shape: TerminalPanel mounted once alongside unrelated state that
// changes independently (e.g. selectedPath), so re-renders happen without TerminalPanel
// ever unmounting.
function AppShell() {
  const [unrelatedCount, setUnrelatedCount] = useState(0)
  return (
    <div>
      <button onClick={() => setUnrelatedCount((n) => n + 1)}>bump unrelated state</button>
      <span data-testid="unrelated-count">{unrelatedCount}</span>
      <TerminalPanel />
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
  })

  async function openTerminal(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
  }

  it('starts with no tabs and the collapsed "open terminal" affordance', () => {
    render(<TerminalPanel />)
    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
  })

  it('never reads terminal state from localStorage or the URL on mount (FR-016)', () => {
    localStorage.setItem('terminalPanelState', JSON.stringify({ visible: true, tabs: [{ id: 'stale' }] }))
    localStorage.setItem('gitlocal.terminal.tabs', JSON.stringify([{ id: 'stale' }]))
    const originalSearch = window.location.search
    window.history.replaceState({}, '', '?terminal=stale-tab-id')

    try {
      render(<TerminalPanel />)
      expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
      expect(screen.queryByTestId('fake-terminal-view')).not.toBeInTheDocument()
    } finally {
      localStorage.clear()
      window.history.replaceState({}, '', originalSearch || '/')
    }
  })

  it('keeps a running session mounted and untouched when unrelated App-level state changes', async () => {
    const user = userEvent.setup()
    const session: TerminalSession = {
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    }
    mockCreateSession.mockResolvedValue(session)

    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'Open terminal' }))
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

    render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No PTY on this platform.')
    expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
  })

  it('opens a Claude tab from the kind picker, sending kind and rendering the running session (FR-007, T037)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'claude-1',
      kind: 'claude',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
    await user.selectOptions(screen.getByLabelText('New terminal kind'), 'claude')
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Claude' })).toBeInTheDocument())
    expect(mockCreateSession).toHaveBeenCalledWith(expect.objectContaining({ kind: 'claude' }))
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('claude-1:running')
  })

  it('synthesizes a local "unavailable" tab with the server message when the CLI is missing (FR-010)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({
      error: 'cli_not_found',
      message: 'The Claude Code CLI ("claude") was not found on PATH.',
    })

    render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByText('The Claude Code CLI ("claude") was not found on PATH.')).toBeInTheDocument()
    expect(screen.queryByTestId('fake-terminal-view')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('falls back to a generic error message when the failure has none', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({})

    render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start a terminal session.')
  })

  it('falls back to a generic unavailable message when a cli_not_found response has none', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({ error: 'cli_not_found' })

    render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByText('This CLI was not found.')).toBeInTheDocument()
  })

  it('shows a failure to open a second tab as a banner alongside the still-open first tab', async () => {
    const user = userEvent.setup()
    mockCreateSession
      .mockResolvedValueOnce({
        id: 'session-1',
        kind: 'regular',
        cwd: '/repo',
        status: 'running',
        createdAt: '2026-01-01T00:00:00.000Z',
        exitInfo: null,
      } satisfies TerminalSession)
      .mockRejectedValueOnce({ error: 'pty_unavailable', message: 'No PTY available for a second session.' })

    render(<TerminalPanel />)
    await openTerminal(user)

    await user.click(screen.getByRole('button', { name: 'New terminal tab' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No PTY available for a second session.')
    expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument()
  })

  it('toggles the panel between expanded and collapsed', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
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

    render(<TerminalPanel />)
    await openTerminal(user)

    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))
  })

  it('moves focus into the active terminal again when the panel is re-shown after being hidden', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))
    terminalFocusCalls.length = 0
    await user.click(screen.getByRole('button', { name: 'Show terminal' }))

    await waitFor(() => expect(terminalFocusCalls).toEqual(['session-1']))
  })

  it('hiding the panel closes no session and keeps output visible on show again (US2)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    expect(terminalViewMountCount).toBe(1)

    await user.click(screen.getByRole('button', { name: 'Hide terminal' }))

    // Hiding must never end the session: no server-side close call, and the
    // TerminalView instance (and its WebSocket) stays mounted rather than being torn down.
    expect(mockCloseSession).not.toHaveBeenCalled()
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('fake-terminal-view')).toBeInTheDocument()
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'none' })
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1:running')

    await user.click(screen.getByRole('button', { name: 'Show terminal' }))

    // Same instance reappears with its state intact — output produced while hidden wasn't lost.
    expect(mockCloseSession).not.toHaveBeenCalled()
    expect(terminalViewMountCount).toBe(1)
    expect(screen.getByTestId('terminal-panel-content')).toHaveStyle({ display: 'block' })
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1:running')
  })

  it('keeps panel visibility unchanged across unrelated App state changes until explicitly toggled (US2)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<AppShell />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))
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
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)

    await user.click(screen.getByRole('button', { name: 'Close Terminal 1' }))

    expect(mockCloseSession).toHaveBeenCalledWith('session-1')
    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
  })

  it('marks a tab exited when its TerminalView reports the underlying shell exited', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1:running')

    await user.click(screen.getByRole('button', { name: 'simulate exit' }))

    expect(screen.getByTestId('fake-terminal-view')).toHaveTextContent('session-1:exited')
  })

  it('closing a tab does not surface a rejected server-side close as an error', async () => {
    const user = userEvent.setup()
    mockCloseSession.mockRejectedValue(new Error('already gone'))
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    await user.click(screen.getByRole('button', { name: 'Close Terminal 1' }))

    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
  })

  it('has no accessibility violations in the empty (collapsed) state (FR-014, SC-006, T043)', async () => {
    const { container } = render(<TerminalPanel />)
    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('has no accessibility violations once a tab is open (FR-014, SC-006, T043)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue({
      id: 'session-1',
      kind: 'regular',
      cwd: '/repo',
      status: 'running',
      createdAt: '2026-01-01T00:00:00.000Z',
      exitInfo: null,
    } satisfies TerminalSession)

    const { container } = render(<TerminalPanel />)
    await openTerminal(user)

    expect((await axe(container)).violations).toHaveLength(0)
  })

  it('exposes toggleTerminal via ref: opens the first tab when none exist, then toggles visibility once one does', async () => {
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)
    const ref = createRef<TerminalPanelHandle>()

    render(<TerminalPanel ref={ref} />)

    act(() => ref.current?.toggleTerminal())
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()

    act(() => ref.current?.toggleTerminal())
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()

    act(() => ref.current?.toggleTerminal())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()
  })

  it('never forces the collapsed panel below its own content height, and never shrinks below the fold', async () => {
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)
    const ref = createRef<TerminalPanelHandle>()

    render(<TerminalPanel ref={ref} />)

    act(() => ref.current?.toggleTerminal())
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())

    act(() => ref.current?.toggleTerminal())
    const panel = screen.getByTestId('terminal-panel')
    expect(panel).toHaveStyle({ height: 'auto' })
    expect(panel.className).toContain('shrink-0')
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeVisible()
  })

  it('Ctrl+` opens the first tab when none exist, and toggles visibility once one does (matches VS Code default binding)', async () => {
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)

    render(<TerminalPanel />)

    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Hide terminal' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: '`', ctrlKey: true })
    expect(screen.getByRole('button', { name: 'Show terminal' })).toBeInTheDocument()
  })

  it('ignores Ctrl+` variants that do not exactly match the shortcut', () => {
    render(<TerminalPanel />)

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
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)

    render(<TerminalPanel />)
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
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)
    setInnerHeight(1000)

    render(<TerminalPanel />)
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
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.mouseDown(handle, { clientY: 0 })
    fireEvent.mouseMove(window, { clientY: 1000 })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })

    fireEvent.mouseUp(window)
  })

  it('resizes the panel with ArrowUp/ArrowDown on the handle, clamped to the same min/max bounds', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)
    setInnerHeight(400)

    render(<TerminalPanel />)
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
    mockCreateSession.mockResolvedValue(runningSession satisfies TerminalSession)

    render(<TerminalPanel />)
    await openTerminal(user)
    const handle = screen.getByTestId('terminal-panel-resize-handle')

    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '344px' })

    setInnerHeight(100)
    fireEvent(window, new Event('resize'))

    expect(screen.getByTestId('terminal-panel')).toHaveStyle({ height: '120px' })
  })

  it('has no accessibility violations for a synthesized "unavailable" tab (FR-014, SC-006, T043)', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({
      error: 'cli_not_found',
      message: 'The Claude Code CLI ("claude") was not found on PATH.',
    })

    const { container } = render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))
    await waitFor(() => expect(screen.getByTestId('terminal-panel')).toBeInTheDocument())

    expect((await axe(container)).violations).toHaveLength(0)
  })
})
