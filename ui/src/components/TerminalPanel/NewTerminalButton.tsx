import { PlusIcon } from '../ui/icons'

interface NewTerminalButtonProps {
  onClick: () => void
  creating: boolean
}

// US3: a single, identically-labeled icon action for opening a new terminal (VS Code's "+"
// convention), shared by the empty-state prompt and the panel's right-side toolbar so there is
// exactly one "new terminal" affordance in the whole panel rather than two subtly different
// controls.
export function NewTerminalButton({ onClick, creating }: NewTerminalButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={creating}
      aria-label={creating ? 'Starting terminal…' : 'New Terminal'}
      title={creating ? 'Starting terminal…' : 'New Terminal'}
      className="flex shrink-0 items-center justify-center rounded-md p-1 text-[var(--muted-foreground)] outline-none transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50"
    >
      <PlusIcon />
    </button>
  )
}
