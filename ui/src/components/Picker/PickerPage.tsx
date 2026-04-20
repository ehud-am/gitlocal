import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import type { PickBrowseEntry, PickBrowseRoot } from '../../types'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu'

function CogIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        d="M6.7 1.75h2.6l.3 1.46c.42.15.82.38 1.19.66l1.42-.47 1.3 2.25-1.12.98c.05.22.08.45.08.69 0 .24-.03.47-.08.69l1.12.98-1.3 2.25-1.42-.47c-.37.28-.77.51-1.19.66l-.3 1.46H6.7l-.3-1.46a4.3 4.3 0 0 1-1.19-.66l-1.42.47-1.3-2.25 1.12-.98A3.18 3.18 0 0 1 3.53 8c0-.24.03-.47.08-.69l-1.12-.98 1.3-2.25 1.42.47c.37-.28.77-.51 1.19-.66l.3-1.46Zm1.3 4.1a2.15 2.15 0 1 0 0 4.3 2.15 2.15 0 0 0 0-4.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export default function PickerPage() {
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [browseLoading, setBrowseLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [homePath, setHomePath] = useState('')
  const [entries, setEntries] = useState<PickBrowseEntry[]>([])
  const [roots, setRoots] = useState<PickBrowseRoot[]>([])
  const [canOpen, setCanOpen] = useState(false)
  const [canCreateChild, setCanCreateChild] = useState(false)
  const [canInitGit, setCanInitGit] = useState(false)
  const [canCloneIntoChild, setCanCloneIntoChild] = useState(false)

  const currentLabel = useMemo(() => currentPath || 'Choose a folder to begin', [currentPath])

  async function loadPath(nextPath?: string) {
    setBrowseLoading(true)
    setError('')
    try {
      const result = await api.getPickBrowse(nextPath)
      setCurrentPath(result.currentPath)
      setParentPath(result.parentPath)
      setHomePath(result.homePath)
      setEntries(result.entries)
      setRoots(result.roots)
      setPath(result.currentPath)
      setCanOpen(Boolean(result.canOpen))
      setCanCreateChild(Boolean(result.canCreateChild))
      setCanInitGit(Boolean(result.canInitGit))
      setCanCloneIntoChild(Boolean(result.canCloneIntoChild))
      setError(result.error)
    } catch {
      setError('Failed to load folders from the GitLocal server.')
    } finally {
      setBrowseLoading(false)
    }
  }

  useEffect(() => {
    void loadPath()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!path.trim()) {
      setError('Please choose or enter a repository path.')
      return
    }

    setLoading(true)
    try {
      const result = await api.submitPick(path.trim())
      if (result.ok) {
        window.location.reload()
      } else {
        setError(result.error || 'An error occurred. Please try again.')
      }
    } catch {
      setError('Failed to connect to GitLocal server.')
    } finally {
      setLoading(false)
    }
  }

  async function handleOpenRepository(repoPath: string) {
    setPath(repoPath)
    setError('')
    setLoading(true)
    try {
      const result = await api.submitPick(repoPath)
      if (result.ok) {
        window.location.reload()
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
      const result = await api.createPickFolder({ parentPath: currentPath, name: name.trim() })
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
      const result = await api.initPickGit({ path: currentPath })
      if (result.ok && result.path) {
        await handleOpenRepository(result.path)
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
      const result = await api.clonePickRepo({
        parentPath: currentPath,
        name: name.trim(),
        repositoryUrl: repositoryUrl.trim(),
      })
      if (result.ok && result.path) {
        await handleOpenRepository(result.path)
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
      ? [{ name: '..', path: parentPath, isGitRepo: false, isParent: true as const }]
      : []),
    ...entries.map((entry) => ({ ...entry, isParent: false as const })),
  ]

  return (
    <div className="picker-shell">
      <header className="app-header">
        <span className="logo">GitLocal</span>
        <span className="repo-name">Folder selector</span>
      </header>
      <div className="picker-layout">
        {sidebarCollapsed ? (
          <aside className="sidebar-rail picker-sidebar-rail" aria-label="collapsed quick access">
            <div className="sidebar-rail-toolbar">
              <button
                type="button"
                className="panel-icon-button sidebar-toggle-button"
                aria-label="Expand quick access"
                title="Expand quick access"
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
                aria-label="Collapse quick access"
                title="Collapse quick access"
                onClick={() => setSidebarCollapsed(true)}
              >
                <PanelToggleIcon collapsed={false} />
              </button>
            </div>
            <div className="picker-sidebar-section">
              <p className="picker-sidebar-label">Quick access</p>
              <button type="button" className="picker-nav-button" onClick={() => loadPath(homePath)}>
                Home
              </button>
              {roots.map((root) => (
                <button
                  key={root.path}
                  type="button"
                  className="picker-nav-button"
                  onClick={() => loadPath(root.path)}
                >
                  {root.name}
                </button>
              ))}
            </div>
          </aside>
        )}

        <main className="picker-main">
          <section className="picker-hero">
            <p className="picker-eyebrow">Repository required</p>
            <h1>Choose the folder GitLocal should open</h1>
            <p>
              GitLocal was started without a repository location, so this folder selector lets you
              browse your machine and open the repository you want to inspect.
            </p>
          </section>

          <section className="picker-browser">
            <div className="picker-browser-toolbar">
              <div className="picker-current-path" aria-label="current folder">
                {currentLabel}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="panel-icon-button picker-actions-trigger" aria-label="Folder actions">
                    <CogIcon />
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
                  <DropdownMenuItem disabled={!canOpen || loading} onSelect={() => { void handleOpenRepository(currentPath) }}>
                    Open this repository
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="picker-browser-table-wrap">
              {browseLoading ? (
                <p className="picker-helper">Loading folders…</p>
              ) : rows.length === 0 ? (
                <p className="picker-helper">No folders are available here.</p>
              ) : (
                <table className="picker-browser-table" aria-label="folders">
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

                          if (entry.isGitRepo) {
                            void handleOpenRepository(entry.path)
                          } else {
                            void loadPath(entry.path)
                          }
                        }}
                      >
                        <td className="picker-entry-cell picker-entry-cell-name">
                          <button
                            type="button"
                            className="picker-entry-main"
                            aria-label={
                              entry.isParent
                                ? 'Open parent folder'
                                : `${entry.name} ${entry.isGitRepo ? 'git repository' : 'folder'}`
                            }
                            onClick={() => setPath(entry.path)}
                          >
                            <span className="picker-entry-copy">
                              <span className="picker-entry-name">{entry.name}</span>
                              <span className={`picker-entry-badge${entry.isGitRepo ? ' is-repo' : ''}`}>
                                {entry.isParent ? 'Parent' : entry.isGitRepo ? 'Git repository' : 'Folder'}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="picker-entry-cell">
                          <span className="picker-entry-kind">
                            {entry.isParent ? 'Parent' : entry.isGitRepo ? 'Repository' : 'Directory'}
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
            <label htmlFor="repository-path" className="picker-input-label">Selected folder</label>
            <input
              id="repository-path"
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/projects/my-repo"
              aria-label="repository path"
              className="picker-input"
            />
            <div className="picker-form-actions">
              <button
                type="button"
                className="picker-nav-button"
                disabled={browseLoading}
                onClick={() => loadPath(path)}
              >
                Browse selected folder
              </button>
              <button type="submit" disabled={loading} className="picker-submit">
                {loading ? 'Opening…' : 'Open repository'}
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
