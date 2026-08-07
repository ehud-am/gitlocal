import type { WorkspaceLayoutMode } from '../../types'

export interface LayoutSwitcherProps {
  layoutMode: WorkspaceLayoutMode
  onChange: (layoutMode: WorkspaceLayoutMode) => void
  /** Layouts to omit from the control, e.g. to hide 4-tile/6-tile on a narrow viewport. */
  disabledLayouts?: WorkspaceLayoutMode[]
}

const LAYOUT_OPTIONS: Array<{ mode: WorkspaceLayoutMode; label: string }> = [
  { mode: 'tabbed', label: 'Tabbed' },
  { mode: '2-column', label: '2-column' },
  { mode: '4-tile', label: '4-tile' },
  { mode: '6-tile', label: '6-tile' },
]

const LAYOUT_LABELS: Record<WorkspaceLayoutMode, string> = {
  tabbed: 'Tabbed',
  '2-column': '2-column',
  '4-tile': '4-tile',
  '6-tile': '6-tile',
}

/**
 * Layout control (US2): lets the user switch between Tabbed Mode and the tiled grid presets.
 * Purely presentational — driving state lives in `usePaneWorkspace`'s `layoutMode`/`setLayoutMode`.
 */
export default function LayoutSwitcher({ layoutMode, onChange, disabledLayouts = [] }: LayoutSwitcherProps) {
  const disabled = new Set(disabledLayouts)

  return (
    <div
      className="workspace-layout-switcher"
      role="radiogroup"
      aria-label={`Workspace layout: ${LAYOUT_LABELS[layoutMode]}`}
    >
      {LAYOUT_OPTIONS.map(({ mode, label }) => {
        const isDisabled = disabled.has(mode)
        const isSelected = mode === layoutMode
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            disabled={isDisabled}
            className={`workspace-layout-option${isSelected ? ' workspace-layout-option-selected' : ''}`}
            onClick={() => {
              if (isDisabled || isSelected) return
              onChange(mode)
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
