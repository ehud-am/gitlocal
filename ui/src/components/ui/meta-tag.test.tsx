import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetaTag, type MetaTagIcon } from './meta-tag'

const icons: MetaTagIcon[] = [
  'git',
  'remote',
  'local-only',
  'user',
  'local-change',
  'local-commit',
  'remote-update',
  'diverged',
]

describe('MetaTag', () => {
  it('renders every supported icon with its label', () => {
    for (const icon of icons) {
      const { unmount } = render(<MetaTag label={icon} icon={icon} />)
      expect(screen.getByText(icon)).toBeInTheDocument()
      expect(document.querySelector('svg')).toBeTruthy()
      unmount()
    }
  })

  it('supports tone, compact mode, and custom classes', () => {
    render(<MetaTag label="Local commit" icon="local-commit" tone="success" compact className="custom-tag" />)

    const tag = screen.getByText('Local commit').closest('.custom-tag')
    expect(tag).toBeTruthy()
    expect(tag?.className).toContain('text-[9px]')
    expect(tag?.className).toContain('px-1.5')
  })
})
