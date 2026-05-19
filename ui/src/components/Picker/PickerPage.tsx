import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { writeViewerState } from '../../services/viewerState'
import type { FolderBrowseEntry } from '../../types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { MetaTag } from '../ui/meta-tag'

function KebabIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="3.5" r="1.25" fill="currentColor" />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return collapsed ? (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M6 3.5L10.5 8L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M10 3.5L5.5 8L10 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M1.75 2.5h4.5l1 1.5H14.25c.966 0 1.75.784 1.75 1.75v7A1.75 1.75 0 0 1 14.25 14.5H1.75A1.75 1.75 0 0 1 0 12.75v-8.5C0 3.284.784 2.5 1.75 2.5z" fill="currentColor" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 1.75A1.75 1.75 0 0 1 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75z" fill="currentColor" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function PickerPage() {
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [browseLoading, setBrowseLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<FolderBrowseEntry[]>([])
  const [canOpen, setCanOpen] = useState(false)
  const [canCreateChild, setCanCreateChild] = useState(false)
  const [canInitGit, setCanInitGit] = useState(false)
  const [canCloneIntoChild, setCanCloneIntoChild] = useState(false)

  const currentLabel = useMemo(() => currentPath || 'Choose a folder to begin', [currentPath])
  const hasFolderActions = canCreateChild || canInitGit || canCloneIntoChild || canOpen

  async function loadPath(nextPath?: string) {
    setBrowseLoading(true)
    setError('')
    try {
      const result = await api.getFolderBrowse(nextPath)
      setCurrentPath(result.currentPath)
      setParentPath(result.parentPath)
      setEntries(result.entries)
      setPath(result.currentPath)
      setCanOpen(Boolean(result.canOpen))
      setCanCreateChild(Boolean(result.canCreateChild))
      setCanInitGit(Boolean(result.canInitGit))
      setCanCloneIntoChild(Boolean(result.canCloneIntoChild))
      setError(result.error)
    } catch {
      setError('Failed to load this folder from the GitLocal server.')
    } finally {
      setBrowseLoading(false)
    }
  }

  useEffect(() => {
    void loadPath()
  }, [])

  function reloadAfterOpen(result: { rootPath?: string; path?: string; selectedPath?: string; selectedPathType?: 'file' | 'dir' | 'none' }, fallbackPath: string): void {
    writeViewerState({
      repoPath: result.rootPath ?? result.path ?? fallbackPath,
      branch: '',
      path: result.selectedPath ?? '',
      pathType: result.selectedPathType ?? 'none',
      raw: false,
      searchPresentation: 'collapsed',
      searchQuery: '',
      searchMode: 'both',
      searchCaseSensitive: false,
    })
    window.location.reload()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!path.trim()) {
      setError('Please choose or enter a folder path.')
      return
    }

    setLoading(true)
    try {
      const result = await api.openRepository(path.trim())
      if (result.ok) {
        reloadAfterOpen(result, path.trim())
      } else {
        setError(result.error || 'An error occurred. Please try again.')
      }
    } catch {
      setError('Failed to connect to GitLocal server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenPath(nextPath: string) {
    setPath(nextPath)
    setError('')
    setLoading(true)
    try {
      const result = await api.openRepository(nextPath)
      if (result.ok) {
        reloadAfterOpen(result, nextPath)
      } else {
        setError(result.error || 'An error occurred. Please try again.')
      }
    } catch {
      setError('Failed to connect to GitLocal server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateFolder() {
    const name = window.prompt('New subfolder name')
    if (!name?.trim()) return

    setError('')
    setLoading(true)
    try {
      const result = await api.createChildFolder({ parentPath: currentPath, name: name.trim() })
      if (result.ok) {
        await loadPath(currentPath)
      } else {
        setError(result.error || 'Could not create the folder.')
      }
    } catch {
      setError('Failed to create the folder from GitLocal.')
    } finally {
      setLoading(false)
    }
  }

  async function handleInitGit() {
    setError('')
    setLoading(true)
    try {
      const result = await api.initFolderRepository({ path: currentPath })
      if (result.ok && result.path) {
        await handleOpenPath(result.path)
      } else {
        setError(result.error || 'Could not initialize git in this folder.')
      }
    } catch {
      setError('Failed to initialize git from GitLocal.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCloneIntoChild() {
    const repositoryUrl = window.prompt('Repository URL to clone')
    if (!repositoryUrl?.trim()) return

    const urlSegments = repositoryUrl.trim().split('/')
    const lastSegment = urlSegments[urlSegments.length - 1] ?? ''
    const suggestedName = lastSegment.replace(/\.git$/i, '') || 'cloned-repo'
    const name = window.prompt('Clone into subfolder', suggestedName)
    if (!name?.trim()) return

    setError('')
    setLoading(true)
    try {
      const result = await api.cloneRepositoryIntoFolder({
        parentPath: currentPath,
        name: name.trim(),
        repositoryUrl: repositoryUrl.trim(),
      })
      if (result.ok && result.path) {
        await handleOpenPath(result.path)
      } else {
        setError(result.error || 'Could not clone into this folder.')
      }
    } catch {
      setError('Failed to clone the repository from GitLocal.')
    } finally {
      setLoading(false)
    }
  }

  const rows = [
    ...(parentPath
      ? [{ name: '..', path: parentPath, type: 'dir' as const, isGitRepo: false, isParent: true as const }]
      : []),
    ...entries.map((entry) => ({ ...entry, isParent: false as const })),
  ]

  return (
    <div className="picker-shell">
      <header className="app-header">
        <span className="logo">GitLocal</span>
        <span className="repo-name">Open local folder</span>
      </header>
      <div className="picker-layout">
        {sidebarCollapsed ? (
          <aside className="sidebar-rail picker-sidebar-rail" aria-label="collapsed navigation">
            <div className="sidebar-rail-toolbar">
              <button
                type="button"
                className="panel-icon-button sidebar-toggle-button"
                aria-label="Expand navigation"
                title="Expand navigation"
                onClick={() => setSidebarCollapsed(false)}
              >
                <PanelToggleIcon collapsed />
              </button>
            </div>
          </aside>
        ) : (
          <aside className="picker-sidebar">
            <div className="sidebar-toolbar">
              <button
                type="button"
                className="panel-icon-button sidebar-toggle-button"
                aria-label="Collapse navigation"
                title="Collapse navigation"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelToggleIcon collapsed={false} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-2 pb-3">
              <div className="file-tree picker-file-tree" role="tree" aria-label="folder contents navigation">
                {browseLoading ? (
                  <div className="file-tree-skeleton border-0 bg-transparent" aria-label="loading">
                    {[70, 90, 65, 80, 55].map((width, index) => (
                      <div key={index} className="skeleton-row" style={{ width: `${width}%` }} />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <p className="picker-helper px-3 py-2">This folder is empty.</p>
                ) : (
                  rows.map((entry) => (
                    <div
                      key={`sidebar:${entry.isParent ? 'parent:' : ''}${entry.path}`}
                      className={`file-tree-node${path === entry.path ? ' selected' : ''}`}
                      style={{ paddingLeft: '8px' }}
                      role="treeitem"
                      aria-expanded={entry.type === 'dir' ? false : undefined}
                      aria-selected={path === entry.path}
                      onClick={() => setPath(entry.path)}
                      onDoubleClick={() => {
                        if (entry.isParent) {
                          void loadPath(entry.path)
                          return
                        }

                        if (!entry.isParent && entry.type === 'dir' && !entry.isGitRepo && entry.openMode !== 'repository') {
                          void loadPath(entry.path)
                          return
                        }

                        if (!entry.isParent) {
                          void handleOpenPath(entry.path)
                        }
                      }}
                    >
                      {entry.type === 'dir' ? (
                        <span className="text-[var(--muted-foreground)]">
                          <ChevronIcon />
                        </span>
                      ) : null}
                      <span className={entry.type === 'dir' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}>
                        {entry.type === 'dir' ? <FolderIcon /> : <FileIcon />}
                      </span>
                      <div className="file-tree-node-label">
                        <span className="file-tree-node-name" title={entry.name}>{entry.name}</span>
                        {entry.isParent || !entry.isGitRepo ? null : <MetaTag label="git" icon="git" tone="neutral" compact />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="picker-main">
          <section className="picker-hero">
            <p className="picker-eyebrow">Local folder</p>
            <h1>Choose what GitLocal should open</h1>
            <p>
              Browse your machine, select a folder, and open it in GitLocal. Git repositories include branch, remote, and identity details.
            </p>
          </section>

          <section className="picker-browser">
            <div className="picker-browser-toolbar">
              <div className="picker-current-path" aria-label="current folder">
                {currentLabel}
              </div>
              {hasFolderActions ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="panel-icon-button picker-actions-trigger" aria-label={`Folder actions for ${currentLabel}`}>
                      <KebabIcon />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled={!canCreateChild || loading} onSelect={() => { void handleCreateFolder() }}>
                      Create subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canInitGit || loading} onSelect={() => { void handleInitGit() }}>
                      Run git init
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canCloneIntoChild || loading} onSelect={() => { void handleCloneIntoChild() }}>
                      Clone into subfolder
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!canOpen || loading} onSelect={() => { void handleOpenPath(currentPath) }}>
                      Open this folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="picker-browser-table-wrap">
              {browseLoading ? (
                <p className="picker-helper">Loading folder contents...</p>
              ) : rows.length === 0 ? (
                <p className="picker-helper">This folder is empty.</p>
              ) : (
                <table className="picker-browser-table" aria-label="folder contents">
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Kind</th>
                      <th scope="col">Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((entry) => (
                      <tr
                        key={`${entry.isParent ? 'parent:' : ''}${entry.path}`}
                        className={`picker-entry${path === entry.path ? ' selected' : ''}`}
                        onDoubleClick={() => {
                          if (entry.isParent) {
                            void loadPath(entry.path)
                            return
                          }

                          if (entry.type === 'dir' && !entry.isGitRepo && entry.openMode !== 'repository') {
                            void loadPath(entry.path)
                            return
                          }

                          void handleOpenPath(entry.path)
                        }}
                      >
                        <td className="picker-entry-cell picker-entry-cell-name">
                          <button
                            type="button"
                            className="picker-entry-main"
                            aria-label={
                              entry.isParent
                                ? 'Open parent folder'
                                : `${entry.name} ${entry.isGitRepo ? 'git repository' : entry.type === 'dir' ? 'folder' : 'file'}`
                            }
                            onClick={() => setPath(entry.path)}
                          >
                            <span className="picker-entry-copy">
                              <span className="picker-entry-name">{entry.name}</span>
                              <span className={`picker-entry-badge${entry.isGitRepo ? ' is-repo' : ''}`}>
                                {entry.isParent ? 'Parent' : entry.isGitRepo ? 'Git repository' : entry.type === 'dir' ? 'Folder' : 'File'}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="picker-entry-cell">
                          <span className="picker-entry-kind">
                            {entry.isParent ? 'Parent' : entry.isGitRepo ? 'Repository' : entry.type === 'dir' ? 'Directory' : 'File'}
                          </span>
                        </td>
                        <td className="picker-entry-cell picker-entry-cell-path">
                          <span className="picker-entry-path">{entry.path}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <form onSubmit={handleSubmit} className="picker-form">
            <label htmlFor="repository-path" className="picker-input-label">Selected path</label>
            <input
              id="repository-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/projects"
              aria-label="folder path"
              className="picker-input"
            />
            <div className="picker-form-actions">
              <button type="submit" disabled={loading} className="picker-submit">
                {loading ? 'Opening...' : 'Open'}
              </button>
            </div>
          </form>

          {error && (
            <p role="alert" className="picker-error">
              {error}
            </p>
          )}
        </main>
      </div>
    </div>
  )
}
