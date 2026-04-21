import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RepoContextHeader from './RepoContextHeader'

describe('RepoContextHeader', () => {
  it('renders a compact repo toolbar and expands inline details on demand', () => {
    const onBranchChange = vi.fn()
    const onEditGitIdentity = vi.fn()
    const onCommitChanges = vi.fn()
    const onSyncWithRemote = vi.fn()

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
        repoSync={{
          mode: 'ahead',
          aheadCount: 2,
          behindCount: 0,
          hasUpstream: true,
          upstreamRef: 'origin/main',
          remoteName: 'origin',
        }}
        trackedChangeCount={1}
        untrackedChangeCount={0}
        onBranchChange={onBranchChange}
        onEditGitIdentity={onEditGitIdentity}
        onCommitChanges={onCommitChanges}
        onSyncWithRemote={onSyncWithRemote}
        onOpenSearch={vi.fn()}
        branchDisabled={false}
        branchSwitchDialog={<div>Branch switch dialog</div>}
      />,
    )

    expect(screen.getByRole('heading', { name: 'gitlocal' })).toBeInTheDocument()
    expect(screen.getByText('Remote')).toBeInTheDocument()
    expect(screen.getByText(/2 ahead/i)).toBeInTheDocument()
    expect(screen.getByText(/1 local change/i)).toBeInTheDocument()
    expect(screen.queryByText('/tmp/gitlocal/src/App.tsx')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open repository search/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sync with remote|push to remote/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /expand repository details/i })).toBeInTheDocument()
    expect(screen.getByText('Branch switch dialog')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: /branch selector/i }), {
      target: { value: 'origin/release' },
    })
    expect(onBranchChange).toHaveBeenCalledWith('origin/release')

    fireEvent.click(screen.getByRole('button', { name: /expand repository details/i }))
    expect(screen.getByText('Repository details')).toBeInTheDocument()
    expect(screen.getByText('/tmp/gitlocal/src/App.tsx')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/ehud-am/gitlocal')).toBeInTheDocument()
    expect(screen.getByText(/test user <test@example.com>/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/ehud-am/gitlocal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^commit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sync with remote|push to remote/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collapse repository details/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /edit repository git identity/i }))
    expect(onEditGitIdentity).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /^commit$/i }))
    expect(onCommitChanges).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /sync with remote|push to remote/i }))
    expect(onSyncWithRemote).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /collapse repository details/i }))
    expect(screen.queryByText('/tmp/gitlocal/src/App.tsx')).not.toBeInTheDocument()
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
        onBranchChange={vi.fn()}
        branchDisabled
      />,
    )

    expect(screen.getByRole('combobox', { name: /branch selector/i })).toBeDisabled()
  })
})
