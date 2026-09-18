import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, it, expect, vi } from 'vitest'
import { DockPositionControl } from './DockPositionControl'

describe('DockPositionControl', () => {
  it('renders three icon buttons (bottom/left/right) grouped under one accessible label', () => {
    render(<DockPositionControl value="right" onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Terminal panel position' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dock terminal to bottom' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dock terminal to left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dock terminal to right' })).toBeInTheDocument()
  })

  it('marks only the current position as pressed', () => {
    render(<DockPositionControl value="left" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Dock terminal to left' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dock terminal to bottom' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Dock terminal to right' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the clicked position', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DockPositionControl value="right" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Dock terminal to bottom' }))
    expect(onChange).toHaveBeenCalledWith('bottom')

    await user.click(screen.getByRole('button', { name: 'Dock terminal to left' }))
    expect(onChange).toHaveBeenCalledWith('left')
  })

  it('has no accessibility violations', async () => {
    const { container } = render(<DockPositionControl value="bottom" onChange={vi.fn()} />)
    expect((await axe(container)).violations).toHaveLength(0)
  })
})
