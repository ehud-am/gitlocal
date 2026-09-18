interface NewTerminalButtonProps {
  onClick: () => void
  creating: boolean
}

// US3: a single, identically-labeled action for opening a new terminal, shared by the
// empty-state prompt and the tab strip so there is exactly one "new terminal" affordance in
// the whole panel rather than two subtly different controls.
export function NewTerminalButton({ onClick, creating }: NewTerminalButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      aria-label={creating ? 'Starting terminal…' : 'New Terminal'}
      className="flex shrink-0 items-center gap-1 rounded-sm px-1 text-[var(--muted-foreground)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50"
    >
      {creating ? 'Starting terminal…' : '+ New Terminal'}
    </button>
  )
}
