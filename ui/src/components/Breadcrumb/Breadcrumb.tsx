import React from 'react'

interface Props {
  path: string
  onNavigate: (path: string) => void
}

export default function Breadcrumb({ path, onNavigate }: Props) {
  const segments = path ? path.split('/').filter(Boolean) : []

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <span
        className="breadcrumb-link"
        onClick={() => onNavigate('')}
        role="link"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onNavigate('')}
      >
        root
      </span>
      {segments.map((seg, i) => {
        const partialPath = segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        return (
          <React.Fragment key={partialPath}>
            <span className="breadcrumb-sep">/</span>
            {isLast ? (
              <span className="breadcrumb-current">{seg}</span>
            ) : (
              <span
                className="breadcrumb-link"
                onClick={() => onNavigate(partialPath)}
                role="link"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && onNavigate(partialPath)}
              >
                {seg}
              </span>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
