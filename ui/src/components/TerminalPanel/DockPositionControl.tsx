import { DockPositionIcon } from '../ui/icons'
import type { DockPosition } from '../../types'

interface DockPositionOption {
  value: DockPosition
  label: string
}

const DOCK_POSITION_OPTIONS: DockPositionOption[] = [
  { value: 'bottom', label: 'Dock terminal to bottom' },
  { value: 'left', label: 'Dock terminal to left' },
  { value: 'right', label: 'Dock terminal to right' },
]

interface DockPositionControlProps {
  value: DockPosition
  onChange: (position: DockPosition) => void
}

// FR-003/FR-004: three VS Code-style icon buttons (rather than a dropdown) let the user dock the
// terminal panel to the bottom, left, or right of the window; defaults to 'right' via
// useTerminalPanelPreference. Reused between the empty-state prompt and the panel's toolbar so
// the control is always available.
export function DockPositionControl({ value, onChange }: DockPositionControlProps) {
  return (
    <div role="group" aria-label="Terminal panel position" className="flex shrink-0 items-center gap-0.5">
      {DOCK_POSITION_OPTIONS.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={isActive}
            title={option.label}
            className={`flex shrink-0 items-center justify-center rounded-md p-1 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              isActive
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <DockPositionIcon position={option.value} />
          </button>
        )
      })}
    </div>
  )
}
