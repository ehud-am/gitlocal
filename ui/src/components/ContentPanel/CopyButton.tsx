import { useState } from 'react'

interface Props {
  getText: () => string
  className?: string
  label?: string
  visibleLabel?: boolean
}

export default function CopyButton({ getText, className = 'copy-button', label = 'Copy', visibleLabel = false }: Props) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getText())
      setStatus('copied')
      window.setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setStatus('failed')
      window.setTimeout(() => setStatus('idle'), 1500)
    }
  }

  const statusSubject = label.replace(/^copy\s*/i, '').trim().toLowerCase()
  const copiedText = statusSubject ? `Copied ${statusSubject}` : 'Copied'
  const retryText = statusSubject ? `Retry copy ${statusSubject}` : 'Retry Copy'
  const text = status === 'copied' ? copiedText : status === 'failed' ? retryText : label

  return (
    <button
      type="button"
      className={className}
      onClick={() => handleCopy().catch(() => {})}
      aria-label={text}
      title={text}
    >
      <svg
        className="copy-button-icon"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path
          d="M2.75 4.5A1.75 1.75 0 0 1 4.5 2.75h5.75c.966 0 1.75.784 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75H4.5a1.75 1.75 0 0 1-1.75-1.75z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M5 2h5.5A2.5 2.5 0 0 1 13 4.5V10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
      <span className={visibleLabel ? 'copy-button-label' : 'sr-only'}>{text}</span>
    </button>
  )
}
