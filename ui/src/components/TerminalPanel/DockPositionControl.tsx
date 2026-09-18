import type { DockPosition } from '../../types'

interface DockPositionOption {
  value: DockPosition
  label: string
}

const DOCK_POSITION_OPTIONS: DockPositionOption[] = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
]

interface DockPositionControlProps {
  value: DockPosition
  onChange: (position: DockPosition) => void
}

// FR-003/FR-004: lets the user dock the terminal panel to the bottom, left, or right of the
// window; defaults to 'right' via useTerminalPanelPreference. Reused between the empty-state
// prompt and the panel's toolbar so the control is always available.
export function DockPositionControl({ value, onChange }: DockPositionControlProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as DockPosition)}
      aria-label="Terminal panel position"
      title="Terminal panel position"
      className="shrink-0 rounded-md border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-sm text-[var(--muted-foreground)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      {DOCK_POSITION_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
