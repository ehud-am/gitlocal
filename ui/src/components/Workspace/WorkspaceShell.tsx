import type { ComponentProps } from 'react'
import type { UsePaneWorkspaceResult } from '../../hooks/usePaneWorkspace'
import type { WorkspaceLayoutMode } from '../../types'
import { WORKSPACE_LAYOUT_TILE_CAPACITY } from '../../types'
import ContentPanel from '../ContentPanel/ContentPanel'
import TabStrip from './TabStrip'
import LayoutSwitcher from './LayoutSwitcher'
import PaneTile from './PaneTile'

type ContentPanelPassthroughProps = Omit<
  ComponentProps<typeof ContentPanel>,
  'selectedPath' | 'selectedPathType' | 'selectedPathLocalOnly' | 'selectedPathSyncState'
>

export interface WorkspaceShellProps {
  workspace: UsePaneWorkspaceResult
  contentPanelProps: ContentPanelPassthroughProps
  /** Layouts to hide from the switcher, e.g. 4-tile/6-tile on a narrow viewport (US2 Edge Case). */
  disabledLayouts?: WorkspaceLayoutMode[]
  /** Invoked when the user acts on an empty tile's "open a file" placeholder. */
  onOpenFileRequested?: () => void
}

/**
 * Top-level workspace surface (US1 + US2): renders the tab strip and layout switcher above
 * either a single active pane (Tabbed Mode) or a CSS-grid of tiles (tiled layouts), plus an
 * overflow list for panes beyond the active layout's tile capacity. Delegates pane rendering
 * to `PaneTile`, which mounts one `ContentPanel`/`TerminalPane` per open pane.
 */
export default function WorkspaceShell({ workspace, contentPanelProps, disabledLayouts, onOpenFileRequested }: WorkspaceShellProps) {
  const { panes, activePaneId, layoutMode, tilePaneIds, overflowPaneIds, selectPane, closePane, setLayoutMode } = workspace

  if (panes.length === 0) {
    return (
      <div className="workspace-shell workspace-shell-empty">
        <PaneTile pane={null} contentPanelProps={contentPanelProps} onOpenFileRequested={onOpenFileRequested} />
      </div>
    )
  }

  const isGrid = layoutMode !== 'tabbed'
  const capacity = WORKSPACE_LAYOUT_TILE_CAPACITY[layoutMode]
  const paneById = new Map(panes.map((pane) => [pane.id, pane]))
  const overflowPanes = overflowPaneIds.map((id) => paneById.get(id)).filter((pane): pane is NonNullable<typeof pane> => Boolean(pane))

  return (
    <div className="workspace-shell">
      <div className="workspace-toolbar">
        <TabStrip panes={panes} activePaneId={activePaneId} onSelect={selectPane} onClose={closePane} />
        <LayoutSwitcher layoutMode={layoutMode} onChange={setLayoutMode} disabledLayouts={disabledLayouts} />
      </div>

      {isGrid ? (
        <div className="workspace-grid-wrapper">
          <div className={`workspace-grid workspace-grid-${layoutMode}`} data-tile-capacity={capacity}>
            {Array.from({ length: capacity }, (_, index) => tilePaneIds[index] ?? null).map((paneId, index) => (
              <PaneTile
                key={paneId ?? `empty-${index}`}
                pane={paneId ? (paneById.get(paneId) ?? null) : null}
                contentPanelProps={contentPanelProps}
                onTerminalSessionId={workspace.setTerminalSessionId}
                onOpenFileRequested={onOpenFileRequested}
              />
            ))}
          </div>

          {overflowPanes.length > 0 ? (
            <div className="workspace-overflow" role="region" aria-label="Additional open panes not shown in the grid">
              <TabStrip panes={overflowPanes} activePaneId={activePaneId} onSelect={selectPane} onClose={closePane} />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="workspace-active-pane">
          <PaneTile
            pane={paneById.get(activePaneId ?? '') ?? null}
            contentPanelProps={contentPanelProps}
            onTerminalSessionId={workspace.setTerminalSessionId}
            onOpenFileRequested={onOpenFileRequested}
          />
        </div>
      )}
    </div>
  )
}
