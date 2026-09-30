// Pure helpers for the main view's file tabs (spec 049). The folder ("GitHub-like") view is not a
// tab in this list: it is the permanent first tab rendered by ContentTabStrip, so an empty list
// means "folder view only" and the strip is hidden, matching the pre-tabs landing experience.

export interface FileTab {
  path: string
  localOnly: boolean
}

export function hasTab(tabs: readonly FileTab[], path: string): boolean {
  return tabs.some((tab) => tab.path === path)
}

// Opens `path` as a tab. An already-open path keeps its position (only its localOnly flag is
// refreshed); a new one is inserted right after the currently active file tab, like VS Code, or
// appended when the folder view is active.
export function openTab(tabs: readonly FileTab[], path: string, localOnly: boolean, activePath: string): FileTab[] {
  const existingIndex = tabs.findIndex((tab) => tab.path === path)
  if (existingIndex >= 0) {
    if (tabs[existingIndex].localOnly === localOnly) return tabs as FileTab[]
    return tabs.map((tab, index) => (index === existingIndex ? { path, localOnly } : tab))
  }
  const activeIndex = tabs.findIndex((tab) => tab.path === activePath)
  const insertAt = activeIndex >= 0 ? activeIndex + 1 : tabs.length
  return [...tabs.slice(0, insertAt), { path, localOnly }, ...tabs.slice(insertAt)]
}

export function closeTab(tabs: readonly FileTab[], path: string): FileTab[] {
  if (!hasTab(tabs, path)) return tabs as FileTab[]
  return tabs.filter((tab) => tab.path !== path)
}

// The tab that becomes active when `path` (the active tab) is closed: its right neighbor, else its
// left neighbor, else null (meaning: go back to the folder view).
export function tabToActivateAfterClose(tabs: readonly FileTab[], path: string): FileTab | null {
  const index = tabs.findIndex((tab) => tab.path === path)
  if (index < 0) return null
  return tabs[index + 1] ?? tabs[index - 1] ?? null
}

// Drops every tab at or below `folderPath` (used after a folder is deleted). An empty folderPath
// means the repository root, i.e. every tab.
export function closeTabsUnder(tabs: readonly FileTab[], folderPath: string): FileTab[] {
  if (!folderPath) return []
  const prefix = `${folderPath}/`
  const next = tabs.filter((tab) => tab.path !== folderPath && !tab.path.startsWith(prefix))
  return next.length === tabs.length ? (tabs as FileTab[]) : next
}

function baseName(path: string): string {
  return path.split('/').pop() || path
}

// Tab labels are file names; when two open tabs share a name, each gets its parent folder as a
// short description (VS Code's "README.md · docs"), so they stay distinguishable.
export function describeTabs(tabs: readonly FileTab[]): Array<{ tab: FileTab; label: string; detail: string }> {
  const counts = new Map<string, number>()
  for (const tab of tabs) {
    const name = baseName(tab.path)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return tabs.map((tab) => {
    const label = baseName(tab.path)
    const parent = tab.path.includes('/') ? tab.path.slice(0, tab.path.lastIndexOf('/')) : ''
    const detail = (counts.get(label) ?? 0) > 1 ? parent || 'root' : ''
    return { tab, label, detail }
  })
}
