import { useEffect, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TerminalPanel } from './TerminalPanel'
import type { TerminalSession } from '../../types'

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
vi.mock('./TerminalView', () => ({
  TerminalView: ({
    session,
    onExit,
  }: {
    session: TerminalSession
    onExit: (code: number | null, signal: string | null) => void
  }) => {
    useEffect(() => {
      terminalViewMountCount += 1
    }, [])
    return (
      <div data-testid="fake-terminal-view">
        {session.id}:{session.status}
        <button onClick={() => onExit(0, null)}>simulate exit</button>
      </div>
    )
  },
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
    mockCreateSession.mockReset()
    mockCloseSession.mockReset()
    mockCloseSession.mockResolvedValue(undefined)
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

  it('falls back to a generic error message when the failure has none', async () => {
    const user = userEvent.setup()
    mockCreateSession.mockRejectedValue({})

    render(<TerminalPanel />)
    await user.click(screen.getByRole('button', { name: 'Open terminal' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to start a terminal session.')
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

    await user.click(screen.getByRole('button', { name: 'Close terminal' }))

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
    await user.click(screen.getByRole('button', { name: 'Close terminal' }))

    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
  })
})
