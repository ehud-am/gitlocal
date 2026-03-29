import { useState } from 'react'
import { api } from '../../services/api'

export default function PickerPage() {
  const [path, setPath] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!path.trim()) {
      setError('Please enter a repository path.')
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

  return (
    <div className="error-screen">
      <div className="error-card">
        <h2>Open a Git Repository</h2>
        <p>Enter the path to a local Git repository folder.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/projects/my-repo"
            aria-label="repository path"
            style={{ width: '100%', marginBottom: '8px', padding: '6px 8px', fontSize: '14px' }}
          />
          {error && (
            <p role="alert" style={{ color: '#cf222e', marginBottom: '8px', fontSize: '14px' }}>
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} style={{ padding: '6px 16px' }}>
            {loading ? 'Opening…' : 'Open'}
          </button>
        </form>
      </div>
    </div>
  )
}
