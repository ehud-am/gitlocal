import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
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

  it('supports remote branch labels, local-only upstream messaging, and has no obvious a11y violations', async () => {
    const { container } = render(
      <RepoContextHeader
        info={{
          name: '',
          path: '',
          currentBranch: '',
          isGitRepo: false,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: false,
          rootEntryCount: 0,
          gitContext: {
            user: null,
            remote: {
              name: 'origin',
              fetchUrl: 'git@github.com:ehud-am/gitlocal.git',
              webUrl: '',
              selectionReason: 'origin',
            },
          },
        }}
        branch=""
        branches={[
          { name: 'release', scope: 'remote', remoteName: 'origin', trackingRef: 'origin/release', isCurrent: false },
        ]}
        selectedPath=""
        selectedPathType="none"
        repoSync={{
          mode: 'local-only',
          aheadCount: 0,
          behindCount: 0,
          hasUpstream: false,
          upstreamRef: '',
          remoteName: '',
        }}
        onBranchChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Repository' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /expand repository details/i }))
    expect(screen.getByText(/this branch does not currently track an upstream remote/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveTextContent('release (origin)')
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit identity/i })).not.toBeInTheDocument()
    expect(screen.getByText('git@github.com:ehud-am/gitlocal.git')).toBeInTheDocument()
    expect((await axe(container)).violations).toHaveLength(0)
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

  it('covers fallback branch labels and hides optional details when metadata is unavailable', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'fallback-repo',
          path: '/tmp/fallback-repo',
          currentBranch: 'fallback',
          isGitRepo: true,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: true,
          rootEntryCount: 1,
          gitContext: {
            user: {
              name: '',
              email: '',
              source: 'global',
            },
            remote: null,
          },
        }}
        branch="fallback"
        branches={[
          { name: 'fallback', isCurrent: true },
          { name: 'remote-only', scope: 'remote', isCurrent: false },
        ]}
        selectedPath=""
        selectedPathType="none"
        repoSync={{
          mode: 'up-to-date',
          aheadCount: 0,
          behindCount: 0,
          hasUpstream: true,
          upstreamRef: '',
          remoteName: '',
        }}
        trackedChangeCount={2}
        untrackedChangeCount={1}
        onBranchChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /expand repository details/i }))

    expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveTextContent('remote-only')
    expect(screen.getByText(/3 local changes/i)).toBeInTheDocument()
    expect(screen.getByText(/git user is not configured/i)).toBeInTheDocument()
    expect(screen.getByText(/tracking the upstream branch\./i)).toBeInTheDocument()
    expect(screen.queryByText('Remote path')).not.toBeInTheDocument()
    expect(screen.queryByText('Repository actions')).not.toBeInTheDocument()
  })
})
