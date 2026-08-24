export function ParentFolderIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M8 3.5 3.5 8h3v4.5h3V8h3L8 3.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ThemeIcon({ darkMode }: { darkMode: boolean }) {
  return darkMode ? (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M9.5 2.25A5.75 5.75 0 1 0 13.75 10A4.75 4.75 0 0 1 9.5 2.25z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M12.6 3.4l-.9.9M4.3 11.7l-.9.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
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
