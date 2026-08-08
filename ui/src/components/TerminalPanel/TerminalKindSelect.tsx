import type { TerminalKind } from '../../types'

interface TerminalKindOption {
  value: TerminalKind
  label: string
}

const KIND_OPTIONS: TerminalKindOption[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'claude', label: 'Claude' },
  { value: 'codex', label: 'Codex' },
]

interface TerminalKindSelectProps {
  value: TerminalKind
  onChange: (kind: TerminalKind) => void
  disabled?: boolean
}

// FR-007: lets the user pick which CLI a new tab launches before it's created. Kept as its own
// component so it can be reused both in the empty-state "open a terminal" prompt and the tab
// strip's "new tab" control without duplicating the option list.
export function TerminalKindSelect({ value, onChange, disabled }: TerminalKindSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TerminalKind)}
      disabled={disabled}
      aria-label="New terminal kind"
      className="shrink-0 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    >
      {KIND_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
