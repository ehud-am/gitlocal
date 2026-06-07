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

  it('prints rendered Markdown through the browser print flow', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onStatusMessage = vi.fn()

    render(
      <MarkdownShareActions
        path="docs/release.md"
        content={fixtureMarkdown}
        hasUnsavedChanges={false}
        onStatusMessage={onStatusMessage}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Print' }))

    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(onStatusMessage).toHaveBeenCalledWith('Opening print for rendered Markdown.')
  })

  it('prints rendered Markdown when the native command bridge requests it', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onStatusMessage = vi.fn()

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
    expect(onStatusMessage).toHaveBeenCalledWith('Opening print for rendered Markdown.')
  })

  it('routes Save PDF through print with explicit PDF guidance', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
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

    await waitFor(() => expect(print).toHaveBeenCalled())
    expect(onStatusMessage).toHaveBeenCalledWith('Opening print. Choose Save as PDF in the print dialog.')
  })

  it('uses system share when available for Slack and Share actions', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Slack' }))

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
