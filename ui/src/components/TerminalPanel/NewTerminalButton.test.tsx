import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, it, expect, vi } from 'vitest'
import { NewTerminalButton } from './NewTerminalButton'

describe('NewTerminalButton', () => {
  it('is an icon-only "+" action labeled "New Terminal"', () => {
    render(<NewTerminalButton onClick={vi.fn()} creating={false} />)
    const button = screen.getByRole('button', { name: 'New Terminal' })
    expect(button).toBeEnabled()
  })

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<NewTerminalButton onClick={onClick} creating={false} />)

    await user.click(screen.getByRole('button', { name: 'New Terminal' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows a busy accessible name and disables itself while creating', () => {
    render(<NewTerminalButton onClick={vi.fn()} creating />)

    const button = screen.getByRole('button', { name: 'Starting terminal…' })
    expect(button).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'New Terminal' })).not.toBeInTheDocument()
  })

  it('has no accessibility violations in either state', async () => {
    const { container, rerender } = render(<NewTerminalButton onClick={vi.fn()} creating={false} />)
    expect((await axe(container)).violations).toHaveLength(0)

    rerender(<NewTerminalButton onClick={vi.fn()} creating />)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})
