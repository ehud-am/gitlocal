import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import MarkdownRenderer from './MarkdownRenderer'
import CodeViewer from './CodeViewer'

interface Props {
  filePath: string
  branch: string
  onNavigate: (path: string) => void
  placeholder?: string
}

export default function ContentPanel({ filePath, branch, onNavigate, placeholder }: Props) {
  const [showRaw, setShowRaw] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['file', filePath, branch, showRaw],
    queryFn: () => api.getFile(filePath, branch, showRaw),
    enabled: !!filePath,
  })

  // Reset raw view when file changes
  React.useEffect(() => {
    setShowRaw(false)
  }, [filePath])

  if (!filePath) {
    return (
      <div className="content-panel empty">
        {placeholder ?? 'Select a file to view its contents'}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="content-panel">
        <div className="content-skeleton" aria-label="loading content" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="content-panel">
        <p style={{ color: '#cf222e' }}>Failed to load file.</p>
      </div>
    )
  }

  const canToggleRaw = data.type === 'markdown' || data.type === 'text'

  return (
    <div className="content-panel">
      {canToggleRaw && (
        <div className="content-toolbar">
          <button
            className="btn-raw"
            onClick={() => setShowRaw(r => !r)}
            aria-pressed={showRaw}
          >
            {showRaw ? 'View Rendered' : 'View Raw'}
          </button>
        </div>
      )}

      {data.type === 'binary' ? (
        <p className="binary-placeholder">Binary file — preview not available.</p>
      ) : data.type === 'image' ? (
        <img
          className="content-image"
          src={`data:image/*;base64,${data.content}`}
          alt={filePath}
        />
      ) : data.type === 'markdown' && !showRaw ? (
        <MarkdownRenderer content={data.content} onNavigate={onNavigate} />
      ) : (
        <CodeViewer content={data.content} language={showRaw ? '' : data.language} />
      )}
    </div>
  )
}
