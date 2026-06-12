import ReactMarkdown from 'react-markdown'
import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react'
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
  branch?: string
  findQuery?: string
  findCaseSensitive?: boolean
  onNavigate: (path: string) => void
}

interface MarkdownImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  currentPath: string
  branch?: string
}

function imageMimeTypeForPath(path: string): string {
  const ext = path.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'svg') return 'image/svg+xml'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'ico') return 'image/x-icon'
  if (ext === 'bmp') return 'image/bmp'
  return 'image/*'
}

function isLocalMarkdownResource(src: string): boolean {
  return Boolean(src)
    && !src.includes('://')
    && !src.startsWith('#')
    && !src.startsWith('data:')
    && !src.startsWith('mailto:')
}

function parseHtmlAttributes(attrs: string): Record<string, string> {
  const values: Record<string, string> = {}
  for (const match of attrs.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    values[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? ''
  }
  return values
}

function escapeMarkdownImageText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/]/g, '\\]')
}

function htmlImageToMarkdown(attrs: string): string {
  const values = parseHtmlAttributes(attrs)
  if (!values.src) return ''
  const dimensions = [
    values.width ? `width=${values.width}` : '',
    values.height ? `height=${values.height}` : '',
  ].filter(Boolean).join(' ')
  const title = dimensions ? ` "${dimensions}"` : ''
  return `![${escapeMarkdownImageText(values.alt ?? '')}](${values.src}${title})`
}

function normalizeHtmlImages(content: string): string {
  return content
    .replace(/<p\s+[^>]*align=["']center["'][^>]*>\s*<img\b([^>]*)>\s*<\/p>/gi, (_match, attrs: string) => htmlImageToMarkdown(attrs))
    .replace(/<img\b([^>]*)>/gi, (_match, attrs: string) => htmlImageToMarkdown(attrs))
}

function parseMarkdownImageDimensions(title?: string): Pick<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> {
  if (!title) return {}
  const width = title.match(/\bwidth=(\d+)\b/)?.[1]
  const height = title.match(/\bheight=(\d+)\b/)?.[1]
  return {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  }
}

function MarkdownImage({ src = '', alt = '', title, currentPath, branch, ...props }: MarkdownImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => isLocalMarkdownResource(src) ? '' : src)
  const dimensions = parseMarkdownImageDimensions(title)

  useEffect(() => {
    let active = true

    if (!isLocalMarkdownResource(src)) {
      setResolvedSrc(src)
      return () => {
        active = false
      }
    }

    const resolvedPath = resolveMarkdownLink(src, currentPath).split('#')[0]
    const params = new URLSearchParams({ path: resolvedPath })
    if (branch) params.set('branch', branch)

    fetch(`/api/file?${params.toString()}`)
      .then((response) => response.ok ? response.json() as Promise<{ content?: string; type?: string }> : null)
      .then((file) => {
        if (!active || file?.type !== 'image' || !file.content) return
        setResolvedSrc(`data:${imageMimeTypeForPath(resolvedPath)};base64,${file.content}`)
      })
      .catch(() => {
        if (active) setResolvedSrc(src)
      })

    return () => {
      active = false
    }
  }, [branch, currentPath, src])

  return <img {...props} {...dimensions} src={resolvedSrc} alt={alt} />
}

export default function MarkdownRenderer({
  content,
  currentPath = '',
  branch,
  findQuery = '',
  findCaseSensitive = false,
  onNavigate,
}: Props) {
  const renderContent = normalizeHtmlImages(stripHiddenMarkdownComments(content))
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
          img: ({ src = '', alt = '', title, ...props }) => (
            <MarkdownImage
              {...props}
              src={src}
              alt={alt}
              title={title}
              currentPath={currentPath}
              branch={branch}
            />
          ),
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
