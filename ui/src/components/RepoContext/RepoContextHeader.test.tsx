import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RepoContextHeader from './RepoContextHeader'

describe('RepoContextHeader', () => {
  it('renders repo metadata, branch options, and theme controls', () => {
    const onThemeChange = vi.fn()
    const onBranchChange = vi.fn()
    const onEditGitIdentity = vi.fn()

    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.4.9',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: {
            user: {
              name: 'Test User',
              email: 'test@example.com',
              source: 'local',
            },
            remote: {
              name: 'origin',
              fetchUrl: 'git@github.com:ehud-am/gitlocal.git',
              webUrl: 'https://github.com/ehud-am/gitlocal',
              selectionReason: 'origin',
            },
          },
        }}
        branch="main"
        branches={[
          { name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true },
          { name: 'release', displayName: 'release (origin)', scope: 'remote', trackingRef: 'origin/release', isCurrent: false },
        ]}
        selectedPath="src/App.tsx"
        selectedPathType="file"
        theme="light"
        onThemeChange={onThemeChange}
        onBranchChange={onBranchChange}
        onEditGitIdentity={onEditGitIdentity}
        branchDisabled={false}
        branchSwitchDialog={<div>Branch switch dialog</div>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'App.tsx' })).toBeInTheDocument()
    expect(screen.getByText('/tmp/gitlocal/src/App.tsx')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/ehud-am/gitlocal')).toBeInTheDocument()
    expect(screen.getByText(/linked to remote git/i)).toBeInTheDocument()
    expect(screen.getByText(/test user <test@example.com>/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/ehud-am/gitlocal' })).toBeInTheDocument()
    expect(screen.getByText('Branch switch dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: /branch selector/i }), {
      target: { value: 'origin/release' },
    })
    expect(onBranchChange).toHaveBeenCalledWith('origin/release')

    fireEvent.click(screen.getByRole('switch', { name: /toggle dark theme/i }))
    expect(onThemeChange).toHaveBeenCalledWith('dark')

    fireEvent.click(screen.getByRole('button', { name: /edit repository git identity/i }))
    expect(onEditGitIdentity).toHaveBeenCalledTimes(1)
  })

  it('disables branch switching while a branch mutation is running', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.4.9',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[
          { name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true },
        ]}
        selectedPath=""
        selectedPathType="none"
        theme="dark"
        onThemeChange={vi.fn()}
        onBranchChange={vi.fn()}
        branchDisabled
      />,
    )

    expect(screen.getByRole('combobox', { name: /branch selector/i })).toBeDisabled()
  })
})
