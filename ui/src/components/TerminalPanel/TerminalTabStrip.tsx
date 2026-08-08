import type { TerminalKind, TerminalTabRef } from '../../types'
import { TerminalKindSelect } from './TerminalKindSelect'

interface TerminalTabStripProps {
  tabs: TerminalTabRef[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onNewTab: () => void
  creatingNewTab: boolean
  pendingKind?: TerminalKind
  onPendingKindChange?: (kind: TerminalKind) => void
}

// US4 acceptance scenario 5: a small glyph per kind so Regular/Claude/Codex tabs are
// visually distinguishable at a glance, without duplicating what the tab's aria-label
// (which already includes "Claude"/"Codex"/"Terminal N") tells screen readers.
function kindIcon(kind: TerminalKind): string {
  if (kind === 'claude') return '◆'
  if (kind === 'codex') return '✳'
  return '›_'
}

// Every open tab is kept mounted by the caller (TerminalPanel) regardless of which is active —
// this strip only ever reads/writes which id is active and never unmounts a TerminalView itself,
// so switching tabs can't lose scrollback (US3).
export function TerminalTabStrip({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  creatingNewTab,
  pendingKind = 'regular',
  onPendingKindChange = () => {},
}: TerminalTabStripProps) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Terminal tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={tab.label}
            tabIndex={0}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelectTab(tab.id)
            }}
            className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-0.5 text-sm ${
              isActive
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <span aria-hidden="true">{kindIcon(tab.kind)}</span>
            <span className="whitespace-nowrap">{tab.label}</span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onCloseTab(tab.id)
              }}
              aria-label={`Close ${tab.label}`}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              ✕
            </button>
          </div>
        )
      })}
      <TerminalKindSelect value={pendingKind} onChange={onPendingKindChange} disabled={creatingNewTab} />
      <button
        type="button"
        onClick={onNewTab}
        disabled={creatingNewTab}
        aria-label="New terminal tab"
        className="shrink-0 px-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      >
        {creatingNewTab ? '…' : '+'}
      </button>
    </div>
  )
}
