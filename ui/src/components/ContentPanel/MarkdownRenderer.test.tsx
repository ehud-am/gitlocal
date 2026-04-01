import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MarkdownRenderer from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders copy buttons only for fenced code blocks and copies the selected block', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    render(
      <MarkdownRenderer
        content={[
          '# Guide',
          '',
          'Paragraph with `inline code` but no block copy action.',
          '',
          '```ts',
          'const answer = 42',
          '```',
          '',
          '```js',
          'console.log(answer)',
          '```',
        ].join('\n')}
        onNavigate={vi.fn()}
      />,
    )

    const copyButtons = screen.getAllByRole('button', { name: /copy code block/i })
    expect(copyButtons).toHaveLength(2)

    fireEvent.click(copyButtons[0])
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('const answer = 42')
    })
  })

  it('does not render copy buttons when markdown contains no fenced code blocks', () => {
    render(
      <MarkdownRenderer
        content={'# Guide\n\nParagraph text.\n\n- list item\n\n> quote'}
        onNavigate={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /copy code block/i })).not.toBeInTheDocument()
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
