import { useEffect } from 'react'
import type { MarkdownShareAction } from '../../types'
import type { NativeAppCommandEvent } from '../../types'
import { Button } from '../ui/button'
import {
  buildMarkdownOutputDetails,
  type MarkdownOutputDetails,
} from './markdown-output'

interface Props {
  path: string
  content: string
  hasUnsavedChanges: boolean
  onStatusMessage?: (message: string) => void
}

function canUseNavigatorShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

async function copyText(content: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false
  await navigator.clipboard.writeText(content)
  return true
}

function buildMailto(details: MarkdownOutputDetails): string {
  const subject = encodeURIComponent(details.title)
  const body = encodeURIComponent(`${details.plainText}\n\nSource: ${details.sourcePath}`)
  return `mailto:?subject=${subject}&body=${body}`
}

function actionLabel(action: MarkdownShareAction): string {
  switch (action) {
    case 'print':
      return 'Print'
    case 'save-pdf':
      return 'Save PDF'
    case 'email':
      return 'Email'
    case 'slack':
      return 'Slack'
    case 'system-share':
      return 'Share'
    case 'copy-rendered':
      return 'Copy'
    case 'download-artifact':
      return 'Download'
  }
}

export default function MarkdownShareActions({
  path,
  content,
  hasUnsavedChanges,
  onStatusMessage,
}: Props) {
  const details = buildMarkdownOutputDetails(path, content, hasUnsavedChanges)
  const contentNotice = hasUnsavedChanges
    ? 'Sharing uses the visible unsaved edits in this preview.'
    : 'Sharing uses the saved Markdown content.'

  useEffect(() => {
    const handleNativeCommand = (event: Event) => {
      const command = (event as NativeAppCommandEvent).detail?.command
      if (command === 'print-markdown') {
        event.preventDefault()
        void handleAction('print')
      }
      if (command === 'share-markdown') {
        event.preventDefault()
        void handleAction('system-share')
      }
    }

    window.addEventListener('gitlocal:native-command', handleNativeCommand)
    return () => window.removeEventListener('gitlocal:native-command', handleNativeCommand)
  })

  async function handleAction(action: MarkdownShareAction): Promise<void> {
    switch (action) {
      case 'print':
      case 'save-pdf':
        onStatusMessage?.(action === 'print'
          ? 'Opening print for rendered Markdown.'
          : 'Opening print. Choose Save as PDF in the print dialog.')
        window.setTimeout(() => window.print(), 0)
        return
      case 'email':
        window.location.href = buildMailto(details)
        onStatusMessage?.('Prepared an email with the rendered Markdown text.')
        return
      case 'slack':
      case 'system-share':
        if (canUseNavigatorShare()) {
          try {
            await navigator.share({
              title: details.title,
              text: `${details.plainText}\n\nSource: ${details.sourcePath}`,
            })
            onStatusMessage?.('Shared rendered Markdown through the system share sheet.')
            return
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
          }
        }
        if (await copyText(details.plainText)) {
          onStatusMessage?.(`${actionLabel(action)} is not directly available, so GitLocal copied the rendered Markdown text.`)
          return
        }
        downloadText(details.suggestedFilename, details.markdown, 'text/markdown;charset=utf-8')
        onStatusMessage?.(`${actionLabel(action)} is not directly available, so GitLocal downloaded the Markdown source.`)
        return
      case 'copy-rendered':
        if (await copyText(details.plainText)) {
          onStatusMessage?.('Copied rendered Markdown text.')
          return
        }
        onStatusMessage?.('Clipboard is unavailable in this browser.')
        return
      case 'download-artifact':
        downloadText(details.suggestedFilename, details.markdown, 'text/markdown;charset=utf-8')
        onStatusMessage?.('Downloaded the Markdown document.')
        return
    }
  }

  return (
    <section className="markdown-share-actions" aria-label="Markdown output actions">
      <div className="markdown-share-actions-row">
        <Button type="button" size="sm" onClick={() => { void handleAction('print') }}>
          Print
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('save-pdf') }}>
          Save PDF
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('email') }}>
          Email
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('slack') }}>
          Slack
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('system-share') }}>
          Share
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { void handleAction('copy-rendered') }}>
          Copy
        </Button>
      </div>
      <p className="markdown-share-note">{contentNotice}</p>
    </section>
  )
}
