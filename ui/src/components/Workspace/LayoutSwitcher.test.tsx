import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import LayoutSwitcher from './LayoutSwitcher'

describe('LayoutSwitcher', () => {
  it('renders all four layout options', () => {
    render(<LayoutSwitcher layoutMode="tabbed" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: 'Tabbed' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '2-column' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4-tile' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '6-tile' })).toBeInTheDocument()
  })

  it('exposes the current selection via an accessible group label', () => {
    render(<LayoutSwitcher layoutMode="4-tile" onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup', { name: 'Workspace layout: 4-tile' })).toBeInTheDocument()
  })

  it('marks the active layout as checked and others as unchecked', () => {
    render(<LayoutSwitcher layoutMode="2-column" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '2-column' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Tabbed' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the selected layout mode when a different option is clicked', () => {
    const onChange = vi.fn()
    render(<LayoutSwitcher layoutMode="tabbed" onChange={onChange} />)
    screen.getByRole('radio', { name: '6-tile' }).click()
    expect(onChange).toHaveBeenCalledWith('6-tile')
  })

  it('is a no-op to click the already-active layout', () => {
    const onChange = vi.fn()
    render(<LayoutSwitcher layoutMode="tabbed" onChange={onChange} />)
    screen.getByRole('radio', { name: 'Tabbed' }).click()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables and ignores clicks on layouts passed via disabledLayouts (narrow-viewport degradation)', () => {
    const onChange = vi.fn()
    render(<LayoutSwitcher layoutMode="tabbed" onChange={onChange} disabledLayouts={['4-tile', '6-tile']} />)

    const fourTile = screen.getByRole('radio', { name: '4-tile' })
    expect(fourTile).toBeDisabled()
    fourTile.click()
    expect(onChange).not.toHaveBeenCalled()
  })
})
