import type { KeyboardEvent } from 'react'
import type { Pane } from '../../types'

interface TabStripProps {
  panes: Pane[]
  activePaneId: string | null
  onSelect: (paneId: string) => void
  onClose: (paneId: string) => void
}

/**
 * Scrollable/overflow-safe tab bar for the workspace's open panes (US1). Stays usable with
 * many tabs open (20+, per Edge Cases) via horizontal scrolling rather than wrapping/clipping.
 */
export default function TabStrip({ panes, activePaneId, onSelect, onClose }: TabStripProps) {
  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, paneId: string, index: number): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex = (index + delta + panes.length) % panes.length
      const nextPane = panes[nextIndex]
      if (nextPane) onSelect(nextPane.id)
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      onClose(paneId)
    }
  }

  if (panes.length === 0) return null

  return (
    <div className="workspace-tabstrip" role="tablist" aria-label={`Open panes (${panes.length})`}>
      {panes.map((pane, index) => {
        const isActive = pane.id === activePaneId
        return (
          <div
            key={pane.id}
            className={isActive ? 'workspace-tab workspace-tab-active' : 'workspace-tab'}
          >
            <button
              type="button"
              role="tab"
              id={`workspace-tab-${pane.id}`}
              aria-selected={isActive}
              aria-controls={`workspace-tabpanel-${pane.id}`}
              tabIndex={isActive ? 0 : -1}
              className="workspace-tab-label"
              onClick={() => onSelect(pane.id)}
              onKeyDown={(event) => handleTabKeyDown(event, pane.id, index)}
            >
              {pane.kind === 'terminal' ? (
                <span className="workspace-tab-icon" aria-hidden="true">&gt;_</span>
              ) : null}
              <span className="workspace-tab-title">{pane.title || 'Untitled'}</span>
            </button>
            <button
              type="button"
              className="workspace-tab-close"
              aria-label={`Close ${pane.title || 'Untitled'}`}
              onClick={(event) => {
                event.stopPropagation()
                onClose(pane.id)
              }}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
