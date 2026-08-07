import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import TabStrip from './TabStrip'
import type { Pane } from '../../types'

/** A thin stateful wrapper so closing a tab actually removes it and re-derives activePaneId,
 * mirroring how `usePaneWorkspace.closePane` drives `TabStrip` in the real app. */
function StatefulTabStrip({ initialPanes, initialActivePaneId }: { initialPanes: Pane[]; initialActivePaneId: string | null }) {
  const [panes, setPanes] = useState(initialPanes)
  const [activePaneId, setActivePaneId] = useState(initialActivePaneId)

  function handleClose(paneId: string): void {
    const closedIndex = panes.findIndex((pane: Pane) => pane.id === paneId)
    const nextPanes = panes.filter((pane: Pane) => pane.id !== paneId)
    setPanes(nextPanes)
    setActivePaneId((previous: string | null) => {
      if (previous !== paneId) return previous
      if (nextPanes.length === 0) return null
      const nextIndex = Math.min(closedIndex, nextPanes.length - 1)
      return nextPanes[nextIndex].id
    })
  }

  return <TabStrip panes={panes} activePaneId={activePaneId} onSelect={setActivePaneId} onClose={handleClose} />
}

function makePane(overrides: Partial<Pane> & { id: string }): Pane {
  return {
    kind: 'content',
    contentPath: `${overrides.id}.md`,
    title: overrides.id,
    ...overrides,
  }
}

describe('TabStrip', () => {
  it('renders nothing when there are no open panes', () => {
    const { container } = render(
      <TabStrip panes={[]} activePaneId={null} onSelect={vi.fn()} onClose={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a tab per open pane with an accessible tablist', () => {
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={vi.fn()} onClose={vi.fn()} />)

    const tablist = screen.getByRole('tablist', { name: 'Open panes (2)' })
    expect(within(tablist).getAllByRole('tab')).toHaveLength(2)
  })

  it('marks the active pane as selected and others as not selected', () => {
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="b" onSelect={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByRole('tab', { name: 'a' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'b' })).toHaveAttribute('aria-selected', 'true')
  })

  it('calls onSelect with the pane id when a tab is clicked (US1 AS2)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={onSelect} onClose={vi.fn()} />)

    await user.click(screen.getByRole('tab', { name: 'b' }))
    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('calls onClose with the pane id when its close button is clicked, without also selecting it (US1 AS3)', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={onSelect} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Close b' }))
    expect(onClose).toHaveBeenCalledWith('b')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('handles ArrowRight/ArrowLeft navigation and Delete/Backspace close via fireEvent', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' }), makePane({ id: 'c' })]
    render(<TabStrip panes={panes} activePaneId="b" onSelect={onSelect} onClose={onClose} />)

    const tabB = screen.getByRole('tab', { name: 'b' })
    fireEvent.keyDown(tabB, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('c')

    fireEvent.keyDown(tabB, { key: 'ArrowLeft' })
    expect(onSelect).toHaveBeenCalledWith('a')

    const tabC = screen.getByRole('tab', { name: 'c' })
    fireEvent.keyDown(tabC, { key: 'ArrowRight' })
    expect(onSelect).toHaveBeenCalledWith('a')

    fireEvent.keyDown(tabB, { key: 'Delete' })
    expect(onClose).toHaveBeenCalledWith('b')

    fireEvent.keyDown(tabB, { key: 'Backspace' })
    expect(onClose).toHaveBeenCalledWith('b')
  })

  it('ignores unrelated key presses', async () => {
    const { fireEvent } = await import('@testing-library/react')
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={onSelect} onClose={onClose} />)

    fireEvent.keyDown(screen.getByRole('tab', { name: 'a' }), { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows a terminal icon for terminal-kind panes', () => {
    const panes = [makePane({ id: 'term-1', kind: 'terminal', contentPath: undefined, title: 'Terminal 1' })]
    render(<TabStrip panes={panes} activePaneId="term-1" onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('>_')).toBeInTheDocument()
  })

  it('falls back to "Untitled" when a pane has an empty title', () => {
    const panes = [makePane({ id: 'a', title: '' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Untitled')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close Untitled' })).toBeInTheDocument()
  })

  it('stays usable with 20+ open tabs (Edge Case)', () => {
    const panes = Array.from({ length: 24 }, (_, index) => makePane({ id: `p${index}` }))
    render(<TabStrip panes={panes} activePaneId="p0" onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getAllByRole('tab')).toHaveLength(24)
    expect(screen.getByRole('tablist', { name: 'Open panes (24)' })).toBeInTheDocument()
  })

  it('only the active tab is in the tab order (roving tabindex)', () => {
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' })]
    render(<TabStrip panes={panes} activePaneId="a" onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('tab', { name: 'a' })).toHaveAttribute('tabIndex', '0')
    expect(screen.getByRole('tab', { name: 'b' })).toHaveAttribute('tabIndex', '-1')
  })

  it('moves keyboard focus to the new active tab after closing the active tab (a11y)', async () => {
    const user = userEvent.setup()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' }), makePane({ id: 'c' })]
    render(<StatefulTabStrip initialPanes={panes} initialActivePaneId="b" />)

    await user.click(screen.getByRole('button', { name: 'Close b' }))

    expect(screen.queryByRole('tab', { name: 'b' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'c' })).toHaveFocus()
  })

  it('does not steal focus when closing a tab other than the active one (a11y)', async () => {
    const user = userEvent.setup()
    const panes = [makePane({ id: 'a' }), makePane({ id: 'b' }), makePane({ id: 'c' })]
    render(<StatefulTabStrip initialPanes={panes} initialActivePaneId="a" />)

    const closeB = screen.getByRole('button', { name: 'Close b' })
    closeB.focus()
    await user.click(closeB)

    expect(screen.queryByRole('tab', { name: 'b' })).not.toBeInTheDocument()
    // Closing a background tab must not redirect focus to the (unrelated) active tab.
    expect(screen.getByRole('tab', { name: 'a' })).not.toHaveFocus()
  })

  it('does not throw when closing the last remaining tab leaves no active pane to focus', async () => {
    const user = userEvent.setup()
    const panes = [makePane({ id: 'a' })]
    render(<StatefulTabStrip initialPanes={panes} initialActivePaneId="a" />)

    await user.click(screen.getByRole('button', { name: 'Close a' }))

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
  })
})
