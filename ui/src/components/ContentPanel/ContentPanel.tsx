import React, { Suspense, lazy, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import CopyButton from './CopyButton'

const MarkdownRenderer = lazy(() => import('./MarkdownRenderer'))
const CodeViewer = lazy(() => import('./CodeViewer'))

interface Props {
  selectedPath: string
  selectedPathType: 'file' | 'dir' | 'none'
  branch: string
  onNavigate: (path: string) => void
  placeholder?: string
  raw?: boolean
  onRawChange?: (value: boolean) => void
}

export default function ContentPanel({
  selectedPath,
  selectedPathType,
  branch,
  onNavigate,
  placeholder,
  raw = false,
  onRawChange,
}: Props) {
  const [showRaw, setShowRaw] = useState(raw)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['file', selectedPath, branch, showRaw],
    queryFn: () => api.getFile(selectedPath, branch, showRaw),
    enabled: !!selectedPath && selectedPathType === 'file',
  })

  // Reset raw view when file changes
  React.useEffect(() => {
    setShowRaw(raw)
  }, [selectedPath, raw])

  if (!selectedPath) {
    return (
      <div className="content-panel empty">
        {placeholder ?? 'Select a file to view its contents'}
      </div>
    )
  }

  if (selectedPathType === 'dir') {
    return (
      <div className="content-panel empty">
        Browse files inside <code>{selectedPath}</code> from the navigation tree or search results.
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
  const loadingFallback = <div className="content-skeleton" aria-label="loading content" />

  return (
    <div className="content-panel">
      {canToggleRaw && (
        <div className="content-toolbar">
          <button
            className="btn-raw"
            onClick={() => {
              const next = !showRaw
              setShowRaw(next)
              onRawChange?.(next)
            }}
            aria-pressed={showRaw}
          >
            {showRaw ? 'View Rendered' : 'View Raw'}
          </button>
          {showRaw && (
            <CopyButton
              getText={() => data.content}
              className="copy-button raw-copy-button"
              label="Copy file"
            />
          )}
        </div>
      )}

      {data.type === 'binary' ? (
        <p className="binary-placeholder">Binary file — preview not available.</p>
      ) : data.type === 'image' ? (
        <img
          className="content-image"
          src={`data:image/*;base64,${data.content}`}
          alt={selectedPath}
        />
      ) : data.type === 'markdown' && !showRaw ? (
        <Suspense fallback={loadingFallback}>
          <MarkdownRenderer content={data.content} onNavigate={onNavigate} />
        </Suspense>
      ) : (
        <Suspense fallback={loadingFallback}>
          <CodeViewer content={data.content} language={showRaw ? '' : data.language} />
        </Suspense>
      )}
    </div>
  )
}
