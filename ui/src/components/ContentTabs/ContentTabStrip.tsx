import { useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { describeTabs, type FileTab } from '../../lib/file-tabs'
import { CloseIcon, FileTabIcon, FolderTabIcon } from '../ui/icons'

interface ContentTabStripProps {
  tabs: FileTab[]
  // null when the folder view is the active tab.
  activePath: string | null
  folderLabel: string
  folderTitle: string
  // The active file tab has unsaved inline edits.
  dirty?: boolean
  onSelectFolder: () => void
  onSelectTab: (path: string) => void
  onCloseTab: (path: string) => void
  onCloseAll: () => void
}

const FOLDER_TAB_ID = 'content-tab-folder'

function fileTabDomId(index: number): string {
  return `content-tab-file-${index}`
}

// VS Code-style tab strip for the main view (spec 049). The first tab is the folder ("GitHub-like")
// view and can't be closed; every opened file gets its own closable tab after it. The caller only
// renders this strip while at least one file tab is open, so the landing experience is unchanged.
export function ContentTabStrip({
  tabs,
  activePath,
  folderLabel,
  folderTitle,
  dirty = false,
  onSelectFolder,
  onSelectTab,
  onCloseTab,
  onCloseAll,
}: ContentTabStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const described = describeTabs(tabs)
  const domIds = [FOLDER_TAB_ID, ...described.map((_, index) => fileTabDomId(index))]

  function focusTabAt(index: number): void {
    const count = domIds.length
    const target = ((index % count) + count) % count
    stripRef.current?.querySelector<HTMLElement>(`#${domIds[target]}`)?.focus()
  }

  // Roving focus across tabs (arrow keys, Home/End); Enter/Space activates; Delete/Backspace
  // closes a file tab. Ctrl/Cmd+W is not used because browsers reserve it for closing the page.
  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>, index: number, activate: () => void, close?: () => void): void {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        focusTabAt(index + 1)
        return
      case 'ArrowLeft':
        event.preventDefault()
        focusTabAt(index - 1)
        return
      case 'Home':
        event.preventDefault()
        focusTabAt(0)
        return
      case 'End':
        event.preventDefault()
        focusTabAt(domIds.length - 1)
        return
      case 'Enter':
      case ' ':
        event.preventDefault()
        activate()
        return
      case 'Delete':
      case 'Backspace':
        if (!close) return
        event.preventDefault()
        close()
        focusTabAt(Math.max(0, index - 1))
        return
    }
  }

  function tabClassName(isActive: boolean): string {
    return `content-tab group flex shrink-0 items-center gap-1 border-r border-[var(--border)] border-t-2 px-3 text-sm transition-colors ${
      isActive
        ? 'border-t-[var(--primary)] bg-[var(--card)] font-medium text-[var(--foreground)]'
        : 'border-t-transparent bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted-strong)] hover:text-[var(--foreground)]'
    }`
  }

  const folderActive = activePath === null

  return (
    <div
      ref={stripRef}
      className="content-tab-strip flex h-9 shrink-0 items-stretch overflow-hidden rounded-t-lg border border-b-0 border-[var(--border)] bg-[var(--muted)]"
      data-testid="content-tab-strip"
    >
      {/* aria-owns: see TerminalTabStrip — lets each tab sit beside its close button without the
          button becoming an invalid tablist child. */}
      <div role="tablist" aria-label="Open views" aria-owns={domIds.join(' ')} />
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        <div className={tabClassName(folderActive)}>
          <span
            id={FOLDER_TAB_ID}
            role="tab"
            aria-selected={folderActive}
            aria-label={`Folder view: ${folderLabel}`}
            title={folderTitle}
            tabIndex={folderActive ? 0 : -1}
            onClick={onSelectFolder}
            onKeyDown={(event) => handleKeyDown(event, 0, onSelectFolder)}
            className="flex h-full cursor-pointer items-center gap-1.5 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <FolderTabIcon />
            {folderLabel}
          </span>
        </div>
        {described.map(({ tab, label, detail }, index) => {
          const isActive = tab.path === activePath
          const showDirty = isActive && dirty
          const close = () => onCloseTab(tab.path)
          return (
            <div
              key={tab.path}
              className={tabClassName(isActive)}
              onAuxClick={(event: MouseEvent) => {
                if (event.button !== 1) return
                event.preventDefault()
                close()
              }}
            >
              <span
                id={fileTabDomId(index)}
                role="tab"
                aria-selected={isActive}
                aria-label={detail ? `${label} (${detail})` : label}
                title={tab.path}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onSelectTab(tab.path)}
                onKeyDown={(event) => handleKeyDown(event, index + 1, () => onSelectTab(tab.path), close)}
                className="flex h-full cursor-pointer items-center gap-1.5 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <FileTabIcon />
                <span>{label}</span>
                {detail ? <span className="text-xs font-normal text-[var(--muted-foreground)]">{detail}</span> : null}
              </span>
              <button
                type="button"
                onClick={close}
                aria-label={`Close ${label}`}
                title={showDirty ? `${label} has unsaved changes. Close ${label}` : `Close ${label}`}
                className={`ml-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-[var(--muted-foreground)] outline-none transition hover:bg-[var(--muted-strong)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  isActive || showDirty ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                }`}
              >
                {showDirty ? (
                  <>
                    <span className="group-hover:hidden" data-testid="content-tab-dirty">●</span>
                    <span className="hidden group-hover:inline-flex"><CloseIcon /></span>
                  </>
                ) : (
                  <CloseIcon />
                )}
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center px-1">
        <button
          type="button"
          onClick={onCloseAll}
          aria-label="Close all file tabs"
          title="Close all file tabs and return to the folder view"
          className="inline-flex h-7 items-center rounded-md px-2 text-xs text-[var(--muted-foreground)] outline-none transition hover:bg-[var(--muted-strong)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Close all
        </button>
      </div>
    </div>
  )
}
