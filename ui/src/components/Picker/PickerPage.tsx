import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import type { PickBrowseEntry, PickBrowseRoot } from '../../types'

export default function PickerPage() {
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [browseLoading, setBrowseLoading] = useState(true)
  const [currentPath, setCurrentPath] = useState('')
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [homePath, setHomePath] = useState('')
  const [entries, setEntries] = useState<PickBrowseEntry[]>([])
  const [roots, setRoots] = useState<PickBrowseRoot[]>([])

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
      setError(result.error)
    } catch {
      setError('Failed to load folders from the GitLocal server.')
    } finally {
      setBrowseLoading(false)
    }
  }

  useEffect(() => {
    loadPath().catch(() => {})
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

  return (
    <div className="picker-shell">
      <header className="app-header">
        <span className="logo">GitLocal</span>
        <span className="repo-name">Folder selector</span>
      </header>
      <div className="picker-layout">
        <aside className="picker-sidebar">
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
              <button
                type="button"
                className="picker-nav-button"
                disabled={!parentPath || browseLoading}
                onClick={() => parentPath && loadPath(parentPath)}
              >
                Up one level
              </button>
              <div className="picker-current-path" aria-label="current folder">
                {currentLabel}
              </div>
            </div>

            <div className="picker-browser-list" role="list" aria-label="folders">
              {browseLoading ? (
                <p className="picker-helper">Loading folders…</p>
              ) : entries.length === 0 ? (
                <p className="picker-helper">No folders are available here.</p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.path}
                    className={`picker-entry${path === entry.path ? ' selected' : ''}`}
                    role="listitem"
                  >
                    <button
                      type="button"
                      className="picker-entry-main"
                      aria-label={`${entry.name} ${entry.isGitRepo ? 'git repository' : 'folder'}`}
                      onClick={() => setPath(entry.path)}
                    >
                      <span className="picker-entry-copy">
                        <span className="picker-entry-name">{entry.name}</span>
                        <span
                          className={`picker-entry-badge${entry.isGitRepo ? ' is-repo' : ''}`}
                        >
                          {entry.isGitRepo ? 'Git repository' : 'Folder'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`picker-entry-action${entry.isGitRepo ? ' is-primary' : ''}`}
                      aria-label={`${entry.isGitRepo ? 'Open' : 'Browse'} ${entry.name}`}
                      onClick={() => {
                        if (entry.isGitRepo) {
                          handleOpenRepository(entry.path).catch(() => {})
                        } else {
                          loadPath(entry.path).catch(() => {})
                        }
                      }}
                    >
                      {entry.isGitRepo ? 'Open' : 'Browse'}
                    </button>
                  </div>
                ))
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
