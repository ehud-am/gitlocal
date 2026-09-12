import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AppFooter from './AppFooter'

describe('AppFooter', () => {
  it('renders links to gitlocal.dev and the GitHub project, plus year and version', () => {
    render(<AppFooter version="1.2.3" />)

    const websiteLink = screen.getByRole('link', { name: 'gitlocal.dev' })
    expect(websiteLink).toHaveAttribute('href', 'https://gitlocal.dev')
    expect(websiteLink).toHaveAttribute('target', '_blank')
    expect(websiteLink).toHaveAttribute('rel', 'noreferrer')

    const githubLink = screen.getByRole('link', { name: 'GitLocal' })
    expect(githubLink).toHaveAttribute('href', 'https://github.com/ehud-am/gitlocal')
    expect(githubLink).toHaveAttribute('target', '_blank')
    expect(githubLink).toHaveAttribute('rel', 'noreferrer')

    expect(screen.getByText(String(new Date().getFullYear()))).toBeInTheDocument()
    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
  })

  it('normalizes a leading "v" in the version and omits the version span when empty', () => {
    const { rerender } = render(<AppFooter version="v2.0.0" />)
    expect(screen.getByText('v2.0.0')).toBeInTheDocument()

    rerender(<AppFooter version="" />)
    expect(screen.queryByText(/^v/)).not.toBeInTheDocument()
  })

  it('pairs each link with a recognizable icon, per a developer-tool footer pattern', () => {
    render(<AppFooter version="1.2.3" />)

    const githubLink = screen.getByRole('link', { name: 'GitLocal' })
    expect(githubLink.querySelector('svg.footer-link-icon')).not.toBeNull()

    const websiteLink = screen.getByRole('link', { name: 'gitlocal.dev' })
    expect(websiteLink.querySelector('svg.footer-link-icon')).not.toBeNull()
  })
})
