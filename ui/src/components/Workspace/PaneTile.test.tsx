import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PaneTile, { type PaneTileProps } from './PaneTile'
import type { Pane } from '../../types'

const baseContentPanelProps: PaneTileProps['contentPanelProps'] = {
  branch: 'main',
  canMutateFiles: false,
  refreshToken: 0,
  onNavigate: () => {},
  onOpenPath: () => {},
}

vi.mock('../ContentPanel/ContentPanel', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="content-panel" data-selected-path={String(props.selectedPath)} data-selected-path-type={String(props.selectedPathType)}>
      {props.selectedPath === 'deleted.md' ? <p>This local-only file is no longer available.</p> : null}
    </div>
  ),
}))

vi.mock('./TerminalPane', () => ({
  default: (props: { paneId: string; title: string; onSessionId?: (sessionId: string) => void }) => (
    <div data-testid="terminal-pane" data-pane-id={props.paneId}>
      <button type="button" onClick={() => props.onSessionId?.('session-xyz')}>
        emit-session-id
      </button>
      {props.title}
    </div>
  ),
}))

const contentPane: Pane = { id: 'pane-1', kind: 'content', contentPath: 'README.md', title: 'README.md' }
const terminalPane: Pane = { id: 'pane-2', kind: 'terminal', title: 'Terminal 1' }

describe('PaneTile', () => {
  it('renders an empty-tile placeholder when no pane is assigned (FR-011)', () => {
    render(<PaneTile pane={null} contentPanelProps={baseContentPanelProps} />)
    expect(screen.getByRole('tabpanel', { name: 'Empty tile' })).toBeInTheDocument()
    expect(screen.getByText('No pane open')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open a file' })).not.toBeInTheDocument()
  })

  it('shows an "open a file" action in the empty tile when a handler is provided', () => {
    const onOpenFileRequested = vi.fn()
    render(<PaneTile pane={null} contentPanelProps={baseContentPanelProps} onOpenFileRequested={onOpenFileRequested} />)

    screen.getByRole('button', { name: 'Open a file' }).click()
    expect(onOpenFileRequested).toHaveBeenCalledTimes(1)
  })

  it('renders a ContentPanel for a content pane, forwarding the pane path', () => {
    render(<PaneTile pane={contentPane} contentPanelProps={baseContentPanelProps} />)

    const panel = screen.getByTestId('content-panel')
    expect(panel).toHaveAttribute('data-selected-path', 'README.md')
    expect(panel).toHaveAttribute('data-selected-path-type', 'file')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'workspace-tabpanel-pane-1')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'workspace-tab-pane-1')
  })

  it('surfaces a "no longer available" state for a pane whose file was deleted/moved (US1 edge case)', () => {
    const deletedPane: Pane = { id: 'pane-4', kind: 'content', contentPath: 'deleted.md', title: 'deleted.md' }
    render(<PaneTile pane={deletedPane} contentPanelProps={baseContentPanelProps} />)
    expect(screen.getByText('This local-only file is no longer available.')).toBeInTheDocument()
  })

  it('falls back to an empty selected path when a content pane has no contentPath', () => {
    const paneWithoutPath: Pane = { id: 'pane-3', kind: 'content', title: 'Untitled' }
    render(<PaneTile pane={paneWithoutPath} contentPanelProps={baseContentPanelProps} />)
    expect(screen.getByTestId('content-panel')).toHaveAttribute('data-selected-path', '')
  })

  it('renders a TerminalPane for a terminal pane', () => {
    render(<PaneTile pane={terminalPane} contentPanelProps={baseContentPanelProps} />)
    const terminal = screen.getByTestId('terminal-pane')
    expect(terminal).toHaveAttribute('data-pane-id', 'pane-2')
    expect(terminal).toHaveTextContent('Terminal 1')
  })

  it('reports a terminal pane session id via onTerminalSessionId, tagged with the pane id', () => {
    const onTerminalSessionId = vi.fn()
    render(<PaneTile pane={terminalPane} contentPanelProps={baseContentPanelProps} onTerminalSessionId={onTerminalSessionId} />)

    screen.getByRole('button', { name: 'emit-session-id' }).click()
    expect(onTerminalSessionId).toHaveBeenCalledWith('pane-2', 'session-xyz')
  })

  it('is a no-op when a terminal pane reports a session id without a handler', () => {
    render(<PaneTile pane={terminalPane} contentPanelProps={baseContentPanelProps} />)
    expect(() => screen.getByRole('button', { name: 'emit-session-id' }).click()).not.toThrow()
  })
})
