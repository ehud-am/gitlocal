interface Props {
  onOpen: () => void
}

export default function SearchTrigger({ onOpen }: Props) {
  return (
    <button
      type="button"
      className="search-trigger-button"
      aria-label="Open repository search"
      title="Open repository search (Command+F / Control+F)"
      onClick={onOpen}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M10.5 10.5L14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </button>
  )
}
