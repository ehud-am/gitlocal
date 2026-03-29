import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

interface Props {
  content: string
  onNavigate: (path: string) => void
}

export default function MarkdownRenderer({ content, onNavigate }: Props) {
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
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
