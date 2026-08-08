import { useEffect } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { TerminalPanel } from './TerminalPanel'
import { TerminalTabStrip } from './TerminalTabStrip'
import type { TerminalSession, TerminalTabRef } from '../../types'

vi.mock('../../services/terminalApi', () => ({
  terminalApi: {
    createSession: vi.fn(),
    closeSession: vi.fn(),
  },
}))

// Tracks which sessions currently have a mounted TerminalView, mirroring what a real
// TerminalView/WebSocket pair would be doing — used to prove closing/switching tabs only
// affects the tab acted on (US3's independent-tabs guarantee).
let mountedIds: string[] = []
vi.mock('./TerminalView', () => ({
  TerminalView: ({ session }: { session: TerminalSession }) => {
    useEffect(() => {
      mountedIds.push(session.id)
      return () => {
        mountedIds = mountedIds.filter((id) => id !== session.id)
      }
    }, [session.id])
    return (
      <div data-testid="fake-terminal-view" data-session-id={session.id}>
        {session.id}:{session.status}
      </div>
    )
  },
}))

import { terminalApi } from '../../services/terminalApi'

const mockCreateSession = terminalApi.createSession as unknown as ReturnType<typeof vi.fn>
const mockCloseSession = terminalApi.closeSession as unknown as ReturnType<typeof vi.fn>

function session(id: string): TerminalSession {
  return {
    id,
    kind: 'regular',
    cwd: '/repo',
    status: 'running',
    createdAt: '2026-01-01T00:00:00.000Z',
    exitInfo: null,
  }
}

async function openThreeTabs(user: ReturnType<typeof userEvent.setup>) {
  mockCreateSession
    .mockResolvedValueOnce(session('s1'))
    .mockResolvedValueOnce(session('s2'))
    .mockResolvedValueOnce(session('s3'))

  render(<TerminalPanel />)

  await user.click(screen.getByRole('button', { name: 'Open terminal' }))
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Terminal 1' })).toBeInTheDocument())

  await user.click(screen.getByRole('button', { name: 'New terminal tab' }))
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Terminal 2' })).toBeInTheDocument())

  await user.click(screen.getByRole('button', { name: 'New terminal tab' }))
  await waitFor(() => expect(screen.getByRole('tab', { name: 'Terminal 3' })).toBeInTheDocument())
}

describe('TerminalTabStrip', () => {
  beforeEach(() => {
    mountedIds = []
    mockCreateSession.mockReset()
    mockCloseSession.mockReset()
    mockCloseSession.mockResolvedValue(undefined)
  })

  it('opens 3 independent tabs, closes the middle one, and leaves the other two unaffected (SC-003)', async () => {
    const user = userEvent.setup()
    await openThreeTabs(user)

    expect(mountedIds).toEqual(['s1', 's2', 's3'])
    expect(screen.getAllByTestId('fake-terminal-view')).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Close Terminal 2' }))

    await waitFor(() => expect(screen.queryByRole('tab', { name: 'Terminal 2' })).not.toBeInTheDocument())
    expect(mockCloseSession).toHaveBeenCalledTimes(1)
    expect(mockCloseSession).toHaveBeenCalledWith('s2')
    expect(mountedIds).toEqual(['s1', 's3'])
    expect(screen.getAllByTestId('fake-terminal-view')).toHaveLength(2)
    expect(screen.getByRole('tab', { name: 'Terminal 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Terminal 3' })).toBeInTheDocument()
  })

  it('switches the active tab without unmounting any TerminalView, so scrollback is preserved', async () => {
    const user = userEvent.setup()
    await openThreeTabs(user)
    expect(mountedIds).toEqual(['s1', 's2', 's3'])

    await user.click(screen.getByRole('tab', { name: 'Terminal 1' }))

    expect(mountedIds).toEqual(['s1', 's2', 's3'])
    expect(screen.getAllByTestId('fake-terminal-view')).toHaveLength(3)
    expect(screen.getByRole('tab', { name: 'Terminal 1' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Terminal 2' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Terminal 3' })).toHaveAttribute('aria-selected', 'false')
  })

  it('closing all tabs one by one returns the panel to its empty state', async () => {
    const user = userEvent.setup()
    await openThreeTabs(user)

    await user.click(screen.getByRole('button', { name: 'Close Terminal 1' }))
    await user.click(screen.getByRole('button', { name: 'Close Terminal 2' }))
    expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close Terminal 3' }))

    expect(screen.getByTestId('terminal-panel-empty')).toBeInTheDocument()
    expect(mountedIds).toEqual([])
  })

  describe('in isolation', () => {
    const tabs: TerminalTabRef[] = [
      { id: 't1', kind: 'regular', label: 'Terminal 1', cwd: '/repo', status: 'running' },
      { id: 't2', kind: 'regular', label: 'Terminal 2', cwd: '/repo', status: 'running' },
    ]

    it('activates a tab via Enter or Space, and ignores other keys', async () => {
      const user = userEvent.setup()
      const onSelectTab = vi.fn()
      render(
        <TerminalTabStrip
          tabs={tabs}
          activeTabId="t1"
          onSelectTab={onSelectTab}
          onCloseTab={vi.fn()}
          onNewTab={vi.fn()}
          creatingNewTab={false}
        />,
      )

      const tab2 = screen.getByRole('tab', { name: 'Terminal 2' })
      tab2.focus()
      await user.keyboard('{Enter}')
      expect(onSelectTab).toHaveBeenCalledWith('t2')

      onSelectTab.mockClear()
      await user.keyboard(' ')
      expect(onSelectTab).toHaveBeenCalledWith('t2')

      onSelectTab.mockClear()
      await user.keyboard('{Escape}')
      expect(onSelectTab).not.toHaveBeenCalled()
    })

    it('shows a busy indicator and disables the new-tab control while a tab is being created', () => {
      render(
        <TerminalTabStrip
          tabs={tabs}
          activeTabId="t1"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onNewTab={vi.fn()}
          creatingNewTab
        />,
      )

      const newTabButton = screen.getByRole('button', { name: 'New terminal tab' })
      expect(newTabButton).toBeDisabled()
      expect(newTabButton).toHaveTextContent('…')
    })
  })
})
