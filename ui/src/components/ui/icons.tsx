export function RefreshIcon({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg className={spinning ? 'toolbar-icon is-spinning' : 'toolbar-icon'} viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M13 7a5 5 0 1 0-1.45 3.54" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 3.5V7h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TerminalIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 6l2.5 2.5L4 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 11h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

export function ViewOptionsIcon() {
  return (
    <svg className="toolbar-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="5" cy="4" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11" cy="8" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="12" r="1.5" fill="var(--card)" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

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

export function GitHubIcon() {
  return (
    <svg className="footer-link-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8 0C3.58 0 0 3.67 0 8.2c0 3.62 2.29 6.7 5.47 7.79.4.08.55-.18.55-.4 0-.2-.01-.86-.01-1.56-2.01.38-2.53-.5-2.69-.96-.09-.23-.48-.96-.82-1.16-.28-.15-.68-.53-.01-.54.63-.01 1.08.59 1.23.83.72 1.24 1.87.89 2.33.68.07-.53.28-.89.51-1.1-1.78-.2-3.64-.91-3.64-4.04 0-.89.31-1.63.82-2.2-.08-.2-.36-1.05.08-2.18 0 0 .67-.22 2.2.84a7.4 7.4 0 0 1 4 0c1.53-1.06 2.2-.84 2.2-.84.44 1.13.16 1.98.08 2.18.51.57.82 1.3.82 2.2 0 3.14-1.87 3.84-3.65 4.04.29.26.54.76.54 1.53 0 1.11-.01 2-.01 2.27 0 .22.15.48.55.4A8.22 8.22 0 0 0 16 8.2C16 3.67 12.42 0 8 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function GlobeIcon() {
  return (
    <svg className="footer-link-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <ellipse cx="8" cy="8" rx="2.75" ry="6.25" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.75 8h12.5M2.6 5h10.8M2.6 11h10.8" stroke="currentColor" strokeWidth="1.1" />
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
