import ReactMarkdown from 'react-markdown'
import type { ReactNode } from 'react'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import CopyButton from './CopyButton'
import CodeViewer from './CodeViewer'

interface Props {
  content: string
  onNavigate: (path: string) => void
}

function stripHiddenMarkdownComments(content: string): string {
  return content
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\[\/\/\]:\s*#\s*\(.*\)\s*$/gm, '')
    .replace(/^\[comment\]:\s*#\s*\(.*\)\s*$/gim, '')
}

function flattenText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(flattenText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return flattenText((node as { props?: { children?: ReactNode } }).props?.children ?? '')
  }
  return ''
}

export default function MarkdownRenderer({ content, onNavigate }: Props) {
  const renderContent = stripHiddenMarkdownComments(content)

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ href, children, ...props }) => {
            // Intercept relative links (no protocol, not starting with #)
            if (href && !href.includes('://') && !href.startsWith('#') && !href.startsWith('mailto:')) {
              return (
                <a
                  {...props}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    // Decode URI components and strip leading ./
                    const decoded = decodeURIComponent(href).replace(/^\.\//, '')
                    onNavigate(decoded)
                  }}
                >
                  {children}
                </a>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
          },
          code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: ReactNode }) => {
            const rawText = flattenText(children)
            const text = rawText.replace(/\n$/, '')
            const isBlockCode = inline === false || className?.startsWith('language-') || rawText.includes('\n')
            const languageMatch = className?.match(/language-([\w-]+)/)
            const language = languageMatch?.[1] ?? ''

            if (!isBlockCode) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <div className="markdown-code-block">
                <div className="markdown-code-toolbar">
                  <CopyButton getText={() => text} className="copy-button code-copy-button" label="Copy code block" />
                </div>
                <CodeViewer content={text} language={language} className="markdown-code-frame" />
              </div>
            )
          },
        }}
      >
        {renderContent}
      </ReactMarkdown>
    </div>
  )
}
