import type { TerminalTabRef } from '../../types'
import { NewTerminalButton } from './NewTerminalButton'

interface TerminalTabStripProps {
  tabs: TerminalTabRef[]
  activeTabId: string | null
  onSelectTab: (id: string) => void
  onCloseTab: (id: string) => void
  onNewTab: () => void
  creatingNewTab: boolean
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
}: TerminalTabStripProps) {
  // A tablist's owned elements must all be role="tab" — a close button anywhere in its DOM
  // subtree (even nested inside a role="presentation" wrapper) fails aria-required-children,
  // since axe still counts any focusable descendant as an owned, non-tab child. aria-owns lets
  // the (empty, invisible) tablist logically own just the tab spans below, so each tab can still
  // sit beside its own close button in the visible DOM without becoming an unallowed sibling.
  const tabDomId = (id: string) => `terminal-tab-${id}`

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
      <div role="tablist" aria-label="Terminal tabs" aria-owns={tabs.map((tab) => tabDomId(tab.id)).join(' ')} />
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-sm transition-colors ${
              isActive
                ? 'bg-[var(--muted)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <span
              id={tabDomId(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.label}
              tabIndex={0}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelectTab(tab.id)
              }}
              className="flex items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <span className="whitespace-nowrap">{tab.label}</span>
            </span>
            <button
              type="button"
              onClick={() => onCloseTab(tab.id)}
              aria-label={`Close ${tab.label}`}
              className="rounded-sm text-[var(--muted-foreground)] outline-none transition-colors hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              ✕
            </button>
          </div>
        )
      })}
      <NewTerminalButton onClick={onNewTab} creating={creatingNewTab} />
    </div>
  )
}
