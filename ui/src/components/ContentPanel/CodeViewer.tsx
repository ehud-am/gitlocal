import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

interface Props {
  content: string
  language: string
}

export default function CodeViewer({ content, language }: Props) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (codeRef.current) {
      // Reset previous highlighting
      codeRef.current.removeAttribute('data-highlighted')
      codeRef.current.className = language ? `language-${language}` : ''
      codeRef.current.textContent = content
      try {
        hljs.highlightElement(codeRef.current)
      } catch {
        // Fallback: plain text if language not supported
        codeRef.current.textContent = content
      }
    }
  }, [content, language])

  return (
    <pre className="code-viewer">
      <code ref={codeRef} className={language ? `language-${language}` : ''}>
        {content}
      </code>
    </pre>
  )
}
