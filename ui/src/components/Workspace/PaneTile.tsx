import type { ComponentProps } from 'react'
import type { Pane } from '../../types'
import ContentPanel from '../ContentPanel/ContentPanel'
import TerminalPane from './TerminalPane'

type ContentPanelPassthroughProps = Omit<
  ComponentProps<typeof ContentPanel>,
  'selectedPath' | 'selectedPathType' | 'selectedPathLocalOnly' | 'selectedPathSyncState'
>

export interface PaneTileProps {
  /** The pane to render, or `null` for an empty/unassigned tile (FR-011). */
  pane: Pane | null
  /** Props forwarded to the mounted `ContentPanel` instance for Content Panes. */
  contentPanelProps: ContentPanelPassthroughProps
  /** Called once a Terminal Pane's server-side session id is known, to persist it via `usePaneWorkspace`. */
  onTerminalSessionId?: (paneId: string, sessionId: string) => void
  /** Optional handler invoked when the user acts on the empty-tile placeholder (e.g. "open a file"). */
  onOpenFileRequested?: () => void
}

/**
 * Renders exactly one workspace pane into a tab or grid tile (US1/US2): dispatches to a
 * `ContentPanel` instance for Content Panes or a `TerminalPane` for Terminal Panes, keyed by
 * pane id so each open pane keeps its own independent component state (data-model.md).
 * Renders an empty "open a file" placeholder when no pane is assigned to this tile (FR-011).
 */
export default function PaneTile({ pane, contentPanelProps, onTerminalSessionId, onOpenFileRequested }: PaneTileProps) {
  if (!pane) {
    return (
      <div className="workspace-tile workspace-tile-empty" role="tabpanel" aria-label="Empty tile">
        <div className="workspace-tile-empty-state">
          <p className="workspace-tile-empty-title">No pane open</p>
          <p className="workspace-tile-empty-detail">Open a file to fill this tile.</p>
          {onOpenFileRequested ? (
            <button type="button" className="btn-raw" onClick={onOpenFileRequested}>
              Open a file
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className="workspace-tile"
      role="tabpanel"
      id={`workspace-tabpanel-${pane.id}`}
      aria-labelledby={`workspace-tab-${pane.id}`}
    >
      {pane.kind === 'terminal' ? (
        <TerminalPane
          key={pane.id}
          paneId={pane.id}
          title={pane.title}
          onSessionId={(sessionId) => onTerminalSessionId?.(pane.id, sessionId)}
        />
      ) : (
        <ContentPanel
          key={pane.id}
          {...contentPanelProps}
          selectedPath={pane.contentPath ?? ''}
          selectedPathType="file"
        />
      )}
    </div>
  )
}
