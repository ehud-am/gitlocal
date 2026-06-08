import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MarkdownShareActions from './MarkdownShareActions'

const fixtureMarkdown = [
  '# Release Notes',
  '',
  '- One',
  '- [Two](docs/two.md)',
  '',
  '| Name | Value |',
  '| ---- | ----- |',
  '| A | B |',
  '',
  '```ts',
  'const value = 1',
  '```',
].join('\n')

describe('MarkdownShareActions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockPdfWindow() {
    const onStatusMessage = vi.fn()
    const print = vi.fn()
    const write = vi.fn()
    const pdfWindow = {
      document: {
        open: vi.fn(),
        write,
        close: vi.fn(),
      },
      focus: vi.fn(),
      print,
      setTimeout: (callback: () => void) => {
        callback()
        return 1
      },
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(pdfWindow)

    return { onStatusMessage, print, write }
  }

  it('renders only supported Markdown actions', () => {
    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Email' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Slack' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save PDF' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('opens rendered Markdown for Save PDF', async () => {
    const { onStatusMessage, print, write } = mockPdfWindow()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save PDF' }))

    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(write).toHaveBeenCalledWith(expect.stringContaining('Release Notes'))
    expect(write).toHaveBeenCalledWith(expect.not.stringContaining('app-header'))
    expect(onStatusMessage).toHaveBeenCalledWith('Opened rendered content for Save PDF.')
  })

  it('opens rendered Markdown for Save PDF when the native print command bridge requests it', async () => {
    const { onStatusMessage, print } = mockPdfWindow()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'print-markdown' } }))

    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(onStatusMessage).toHaveBeenCalledWith('Opened rendered content for Save PDF.')
  })

  it('reports when Save PDF cannot open a printable document', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const onStatusMessage = vi.fn()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save PDF' }))

    await waitFor(() => expect(onStatusMessage).toHaveBeenCalledWith('Save PDF could not open a printable document in this browser.'))
  })

  it('uses system share when available for Share actions', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const onStatusMessage = vi.fn()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Release Notes',
      text: expect.stringContaining('Source: docs/release.md'),
    })))
    expect(onStatusMessage).toHaveBeenCalledWith('Shared rendered Markdown through the system share sheet.')
  })

  it('falls back to copying rendered text when direct sharing is unavailable', async () => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    const onStatusMessage = vi.fn()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Release Notes')))
    expect(onStatusMessage).toHaveBeenCalledWith('Share is not directly available, so GitLocal copied the rendered Markdown text.')
  })

  it('copies rendered Markdown from the visible Copy button', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Release Notes')))
  })

  it('shares rendered Markdown when the native command bridge requests it', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    const onStatusMessage = vi.fn()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'share-markdown' } }))

    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Release Notes',
      text: expect.stringContaining('Source: docs/release.md'),
    })))
    expect(onStatusMessage).toHaveBeenCalledWith('Shared rendered Markdown through the system share sheet.')
  })

  it('discloses when visible unsaved edits are used', () => {
    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges
      />,
    )

    expect(screen.getByText(/visible unsaved edits/i)).toBeInTheDocument()
  })
})
