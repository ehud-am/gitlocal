import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MarkdownRenderer from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders a copy button for fenced code blocks', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <MarkdownRenderer
        content={'```ts\nconst answer = 42\n```'}
        onNavigate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /copy code/i }))
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const answer = 42')
    })
  })

  it('navigates relative links through onNavigate', () => {
    const onNavigate = vi.fn()

    render(
      <MarkdownRenderer content={'[Guide](./docs/guide.md)'} onNavigate={onNavigate} />,
    )

    fireEvent.click(screen.getByRole('link', { name: 'Guide' }))
    expect(onNavigate).toHaveBeenCalledWith('docs/guide.md')
  })
})
