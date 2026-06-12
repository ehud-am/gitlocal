import ReactMarkdown from 'react-markdown'
import type { ReactNode } from 'react'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import CopyButton from './CopyButton'
import CodeViewer from './CodeViewer'
import { createUniqueHeadingId, resolveMarkdownLink, stripHiddenMarkdownComments } from './markdown-navigation'
import { flattenRenderableText, hasMarkdownFindQuery, splitMarkdownFindSegments } from './markdown-find'

interface Props {
  content: string
  currentPath?: string
  findQuery?: string
  findCaseSensitive?: boolean
  onNavigate: (path: string) => void
}

export default function MarkdownRenderer({
  content,
  currentPath = '',
  findQuery = '',
  findCaseSensitive = false,
  onNavigate,
}: Props) {
  const renderContent = stripHiddenMarkdownComments(content)
  const headingIds = new Map<string, number>()
  const shouldHighlight = hasMarkdownFindQuery(findQuery)

  function renderHighlightedText(text: string): ReactNode {
    if (!shouldHighlight) return text
    return splitMarkdownFindSegments(text, findQuery, findCaseSensitive).map((segment, index) =>
      segment.match ? (
        <mark key={`${segment.text}:${index}`} className="markdown-find-highlight">
          {segment.text}
        </mark>
      ) : (
        segment.text
      ),
    )
  }

  function renderHighlightedChildren(children: ReactNode): ReactNode {
    if (!shouldHighlight) return children
    if (typeof children === 'string' || typeof children === 'number') return renderHighlightedText(String(children))
    if (Array.isArray(children)) {
      return children.map((child, index) => (
        <span key={index}>{renderHighlightedChildren(child)}</span>
      ))
    }
    return children
  }

  function renderHeading(level: 1 | 2 | 3 | 4 | 5 | 6, children: ReactNode): ReactNode {
    const HeadingTag = `h${level}` as const
    const text = flattenRenderableText(children)
    const id = createUniqueHeadingId(text, headingIds)
    return <HeadingTag id={id}>{renderHighlightedChildren(children)}</HeadingTag>
  }

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
                    onNavigate(resolveMarkdownLink(href, currentPath))
                  }}
                >
                  {children}
                </a>
              )
            }
            return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
          },
          p: ({ children }) => <p>{renderHighlightedChildren(children)}</p>,
          li: ({ children }) => <li>{renderHighlightedChildren(children)}</li>,
          h1: ({ children }) => renderHeading(1, children),
          h2: ({ children }) => renderHeading(2, children),
          h3: ({ children }) => renderHeading(3, children),
          h4: ({ children }) => renderHeading(4, children),
          h5: ({ children }) => renderHeading(5, children),
          h6: ({ children }) => renderHeading(6, children),
          code: ({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: ReactNode }) => {
            const rawText = flattenRenderableText(children)
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
