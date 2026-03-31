import { useState } from 'react'

interface Props {
  getText: () => string
  className?: string
  label?: string
}

export default function CopyButton({ getText, className = 'copy-button', label = 'Copy' }: Props) {
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

  const text = status === 'copied' ? 'Copied' : status === 'failed' ? 'Retry copy' : label

  return (
    <button
      type="button"
      className={className}
      onClick={() => handleCopy().catch(() => {})}
      aria-label={text}
      title={text}
    >
      {text}
    </button>
  )
}
