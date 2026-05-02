import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders a regular button with variants', () => {
    render(
      <Button variant="secondary" size="sm">
        Press
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Press' })
    expect(button.className).toContain('border')
    expect(button.className).toContain('text-xs')
  })

  it('supports rendering through a child element', () => {
    render(
      <Button asChild variant="outline">
        <a href="/docs">Docs</a>
      </Button>,
    )

    const link = screen.getByRole('link', { name: 'Docs' })
    expect(link).toHaveAttribute('href', '/docs')
    expect(link.className).toContain('border')
  })

  it('supports a destructive outline variant', () => {
    render(<Button variant="dangerOutline">Delete folder</Button>)

    const button = screen.getByRole('button', { name: 'Delete folder' })
    expect(button.className).toContain('border')
    expect(button.className).toContain('text-[var(--danger)]')
  })
})
