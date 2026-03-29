import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Breadcrumb from './Breadcrumb'

describe('Breadcrumb', () => {
  it('renders just root for empty path', () => {
    const onNavigate = vi.fn()
    render(<Breadcrumb path="" onNavigate={onNavigate} />)

    expect(screen.getByText('root')).toBeInTheDocument()
  })

  it('renders correct segments for "foo/bar/baz"', () => {
    const onNavigate = vi.fn()
    render(<Breadcrumb path="foo/bar/baz" onNavigate={onNavigate} />)

    expect(screen.getByText('foo')).toBeInTheDocument()
    expect(screen.getByText('bar')).toBeInTheDocument()
    expect(screen.getByText('baz')).toBeInTheDocument()

    // foo and bar are links
    expect(screen.getByText('foo')).toHaveClass('breadcrumb-link')
    expect(screen.getByText('bar')).toHaveClass('breadcrumb-link')

    // baz is the current (last) segment
    expect(screen.getByText('baz')).toHaveClass('breadcrumb-current')
  })

  it('clicking middle segment calls onNavigate with "foo/bar"', () => {
    const onNavigate = vi.fn()
    render(<Breadcrumb path="foo/bar/baz" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByText('bar'))

    expect(onNavigate).toHaveBeenCalledWith('foo/bar')
  })

  it('clicking root calls onNavigate with ""', () => {
    const onNavigate = vi.fn()
    render(<Breadcrumb path="foo/bar/baz" onNavigate={onNavigate} />)

    fireEvent.click(screen.getByText('root'))

    expect(onNavigate).toHaveBeenCalledWith('')
  })

  it('clicking last segment does nothing', () => {
    const onNavigate = vi.fn()
    render(<Breadcrumb path="foo/bar/baz" onNavigate={onNavigate} />)

    const baz = screen.getByText('baz')
    expect(baz).toHaveClass('breadcrumb-current')

    fireEvent.click(baz)

    expect(onNavigate).not.toHaveBeenCalled()
  })
})
