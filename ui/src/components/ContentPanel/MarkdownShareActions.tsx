import { useEffect } from 'react'
import type { MarkdownShareAction } from '../../types'
import type { NativeAppCommandEvent } from '../../types'
import { Button } from '../ui/button'
import { DropdownMenuItem } from '../ui/dropdown-menu'
import {
  buildMarkdownOutputDetails,
} from './markdown-output'
import CopyButton from './CopyButton'

interface Props {
  path: string
  content: string
  hasUnsavedChanges: boolean
  inline?: boolean
  mode?: 'toolbar' | 'menu' | 'standalone'
  actions?: MarkdownShareAction[]
  listenToNativeCommands?: boolean
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

function actionLabel(action: MarkdownShareAction): string {
  switch (action) {
    case 'save-pdf':
      return 'Save PDF'
    case 'system-share':
      return 'Share'
    case 'copy-rendered':
      return 'Copy'
    case 'download-artifact':
      return 'Download'
  }
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M6.25 5.25l3.5-2.1M6.25 10.75l3.5 2.1" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="4" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="2.75" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="13.25" r="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <path d="M4 1.75h5.25L12 4.5v9.75H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.25 1.75V4.5H12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5.75 10.75h4.5M5.75 8.25h4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export default function MarkdownShareActions({
  path,
  content,
  hasUnsavedChanges,
  inline = false,
  mode = inline ? 'toolbar' : 'standalone',
  actions: requestedActions,
  listenToNativeCommands = true,
  onStatusMessage,
}: Props) {
  const details = buildMarkdownOutputDetails(path, content, hasUnsavedChanges)
  const enabledActions = requestedActions ?? ['save-pdf', 'system-share', 'copy-rendered']

  useEffect(() => {
    if (!listenToNativeCommands) return undefined

    const handleNativeCommand = (event: Event) => {
      const command = (event as NativeAppCommandEvent).detail?.command
      if (command === 'print-markdown') {
        event.preventDefault()
        void handleAction('save-pdf')
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
      case 'save-pdf':
        try {
          const pdfWindow = window.open('', '_blank')
          if (!pdfWindow) {
            onStatusMessage?.('Save PDF could not open a printable document in this browser.')
            return
          }
          pdfWindow.document.open()
          pdfWindow.document.write(details.pdfHtml)
          pdfWindow.document.close()
          pdfWindow.focus()
          pdfWindow.setTimeout(() => pdfWindow.print(), 0)
          onStatusMessage?.('Opened rendered content for Save PDF.')
        } catch {
          onStatusMessage?.('Save PDF could not be started in this browser.')
        }
        return
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

  if (mode === 'menu') {
    return (
      <>
        {enabledActions.includes('save-pdf') ? (
          <DropdownMenuItem onSelect={() => { void handleAction('save-pdf') }}>
            Save PDF
          </DropdownMenuItem>
        ) : null}
        {enabledActions.includes('system-share') ? (
          <DropdownMenuItem onSelect={() => { void handleAction('system-share') }}>
            Share
          </DropdownMenuItem>
        ) : null}
        {enabledActions.includes('download-artifact') ? (
          <DropdownMenuItem onSelect={() => { void handleAction('download-artifact') }}>
            Download Markdown
          </DropdownMenuItem>
        ) : null}
      </>
    )
  }

  const renderedActions = (
    <>
      {enabledActions.includes('save-pdf') ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('save-pdf') }}>
          <PdfIcon />
          Save PDF
        </Button>
      ) : null}
      {enabledActions.includes('system-share') ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => { void handleAction('system-share') }}>
          <ShareIcon />
          Share
        </Button>
      ) : null}
      {enabledActions.includes('copy-rendered') ? (
        <CopyButton getText={() => details.plainText} className="copy-button copy-button-labeled" label="Copy" visibleLabel />
      ) : null}
    </>
  )

  if (inline) {
    return (
      <div className="markdown-share-actions markdown-share-actions-inline" role="group" aria-label="Markdown output actions">
        {renderedActions}
      </div>
    )
  }

  return (
    <section className="markdown-share-actions" aria-label="Markdown output actions">
      <div className="markdown-share-actions-row">
        {renderedActions}
      </div>
    </section>
  )
}
