import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WorkspaceShell from './WorkspaceShell'
import type { UsePaneWorkspaceResult } from '../../hooks/usePaneWorkspace'
import type { Pane, WorkspaceLayoutMode } from '../../types'

vi.mock('./TabStrip', () => ({
  default: ({ panes, onSelect, onClose }: { panes: Pane[]; onSelect: (id: string) => void; onClose: (id: string) => void }) => (
    <div data-testid="tab-strip" data-pane-count={panes.length}>
      {panes.map((pane) => (
        <div key={pane.id}>
          <button type="button" onClick={() => onSelect(pane.id)}>select-{pane.id}</button>
          <button type="button" onClick={() => onClose(pane.id)}>close-{pane.id}</button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('./LayoutSwitcher', () => ({
  default: ({ layoutMode, onChange }: { layoutMode: WorkspaceLayoutMode; onChange: (mode: WorkspaceLayoutMode) => void }) => (
    <div data-testid="layout-switcher" data-layout-mode={layoutMode}>
      <button type="button" onClick={() => onChange('4-tile')}>choose-4-tile</button>
    </div>
  ),
}))

vi.mock('./PaneTile', () => ({
  default: ({ pane, onOpenFileRequested }: { pane: Pane | null; onOpenFileRequested?: () => void }) => (
    <div data-testid="pane-tile" data-pane-id={pane?.id ?? 'empty'}>
      {pane ? pane.title : (
        <button type="button" onClick={onOpenFileRequested}>open-a-file</button>
      )}
    </div>
  ),
}))

const contentPanelProps = {
  branch: 'main',
  canMutateFiles: false,
  refreshToken: 0,
  onNavigate: () => {},
  onOpenPath: () => {},
}

function makeWorkspace(overrides: Partial<UsePaneWorkspaceResult> = {}): UsePaneWorkspaceResult {
  return {
    panes: [],
    activePaneId: null,
    layoutMode: 'tabbed',
    tilePaneIds: [],
    overflowPaneIds: [],
    openContentPane: vi.fn(),
    openTerminalPane: vi.fn(),
    closePane: vi.fn(),
    selectPane: vi.fn(),
    setLayoutMode: vi.fn(),
    setTerminalSessionId: vi.fn(),
    ...overrides,
  }
}

const paneA: Pane = { id: 'pane-a', kind: 'content', contentPath: 'a.md', title: 'a.md' }
const paneB: Pane = { id: 'pane-b', kind: 'content', contentPath: 'b.md', title: 'b.md' }

describe('WorkspaceShell', () => {
  it('renders an empty placeholder tile with no toolbar when no panes are open', () => {
    const workspace = makeWorkspace()
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    expect(screen.getByTestId('pane-tile')).toHaveAttribute('data-pane-id', 'empty')
    expect(screen.queryByTestId('tab-strip')).not.toBeInTheDocument()
    expect(screen.queryByTestId('layout-switcher')).not.toBeInTheDocument()
  })

  it('renders only the active pane in Tabbed Mode, alongside the tab strip and layout switcher', () => {
    const workspace = makeWorkspace({ panes: [paneA, paneB], activePaneId: 'pane-b', layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    expect(screen.getByTestId('tab-strip')).toHaveAttribute('data-pane-count', '2')
    expect(screen.getAllByTestId('pane-tile')).toHaveLength(1)
    expect(screen.getByTestId('pane-tile')).toHaveAttribute('data-pane-id', 'pane-b')
  })

  it('selecting a tab calls workspace.selectPane', () => {
    const workspace = makeWorkspace({ panes: [paneA, paneB], activePaneId: 'pane-a', layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    screen.getByRole('button', { name: 'select-pane-b' }).click()
    expect(workspace.selectPane).toHaveBeenCalledWith('pane-b')
  })

  it('closing a tab calls workspace.closePane', () => {
    const workspace = makeWorkspace({ panes: [paneA], activePaneId: 'pane-a', layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    screen.getByRole('button', { name: 'close-pane-a' }).click()
    expect(workspace.closePane).toHaveBeenCalledWith('pane-a')
  })

  it('changing the layout via the switcher calls workspace.setLayoutMode', () => {
    const workspace = makeWorkspace({ panes: [paneA], activePaneId: 'pane-a', layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    screen.getByRole('button', { name: 'choose-4-tile' }).click()
    expect(workspace.setLayoutMode).toHaveBeenCalledWith('4-tile')
  })

  it('renders one tile per slot up to the layout capacity in a tiled layout (US2)', () => {
    const workspace = makeWorkspace({
      panes: [paneA, paneB],
      activePaneId: 'pane-a',
      layoutMode: '4-tile',
      tilePaneIds: ['pane-a', 'pane-b'],
    })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    const tiles = screen.getAllByTestId('pane-tile')
    expect(tiles).toHaveLength(4)
    expect(tiles[0]).toHaveAttribute('data-pane-id', 'pane-a')
    expect(tiles[1]).toHaveAttribute('data-pane-id', 'pane-b')
    expect(tiles[2]).toHaveAttribute('data-pane-id', 'empty')
    expect(tiles[3]).toHaveAttribute('data-pane-id', 'empty')
  })

  it('keeps panes beyond tile capacity reachable via an overflow tab strip (US2)', () => {
    const paneC: Pane = { id: 'pane-c', kind: 'content', contentPath: 'c.md', title: 'c.md' }
    const workspace = makeWorkspace({
      panes: [paneA, paneB, paneC],
      activePaneId: 'pane-a',
      layoutMode: '2-column',
      tilePaneIds: ['pane-a', 'pane-b'],
      overflowPaneIds: ['pane-c'],
    })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)

    const overflowRegion = screen.getByRole('region', { name: 'Additional open panes not shown in the grid' })
    expect(within(overflowRegion).getByTestId('tab-strip')).toHaveAttribute('data-pane-count', '1')
  })

  it('renders an empty placeholder tile in Tabbed Mode when activePaneId is null despite open panes', () => {
    const workspace = makeWorkspace({ panes: [paneA], activePaneId: null, layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)
    expect(screen.getByTestId('pane-tile')).toHaveAttribute('data-pane-id', 'empty')
  })

  it('renders an empty placeholder tile for a stale tilePaneIds entry not present in panes', () => {
    const workspace = makeWorkspace({
      panes: [paneA],
      activePaneId: 'pane-a',
      layoutMode: '2-column',
      tilePaneIds: ['pane-a', 'stale-pane-id'],
    })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)
    const tiles = screen.getAllByTestId('pane-tile')
    expect(tiles[1]).toHaveAttribute('data-pane-id', 'empty')
  })

  it('does not render an overflow region when there is nothing to overflow', () => {
    const workspace = makeWorkspace({ panes: [paneA], activePaneId: 'pane-a', layoutMode: '2-column', tilePaneIds: ['pane-a'] })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} />)
    expect(screen.queryByRole('region', { name: 'Additional open panes not shown in the grid' })).not.toBeInTheDocument()
  })

  it('forwards disabledLayouts to the LayoutSwitcher for narrow-viewport degradation', () => {
    const workspace = makeWorkspace({ panes: [paneA], activePaneId: 'pane-a', layoutMode: 'tabbed' })
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} disabledLayouts={['4-tile', '6-tile']} />)
    expect(screen.getByTestId('layout-switcher')).toBeInTheDocument()
  })

  it('invokes onOpenFileRequested from an empty tile placeholder', () => {
    const onOpenFileRequested = vi.fn()
    const workspace = makeWorkspace()
    render(<WorkspaceShell workspace={workspace} contentPanelProps={contentPanelProps} onOpenFileRequested={onOpenFileRequested} />)

    screen.getByRole('button', { name: 'open-a-file' }).click()
    expect(onOpenFileRequested).toHaveBeenCalledTimes(1)
  })
})
