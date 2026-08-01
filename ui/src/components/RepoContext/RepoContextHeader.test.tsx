import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import RepoContextHeader from './RepoContextHeader'

describe('RepoContextHeader', () => {
  it('renders a compact repo toolbar and expands inline details on demand', () => {
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
    expect(screen.getByText('Local repository')).toBeInTheDocument()
    expect(screen.getByText('/tmp/gitlocal/src/App.tsx')).toBeInTheDocument()
    expect(screen.getByText('https://github.com/ehud-am/gitlocal')).toBeInTheDocument()
    expect(screen.getByText(/test user <test@example.com>/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://github.com/ehud-am/gitlocal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /sync with remote|push to remote/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /edit repository git identity/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collapse repository details/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /edit repository git identity/i }))
    expect(onEditGitIdentity).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /collapse repository details/i }))
    expect(screen.queryByText('/tmp/gitlocal/src/App.tsx')).not.toBeInTheDocument()
  })

  it('supports remote branch labels, remote display, and has no obvious a11y violations', async () => {
    const { container } = render(
      <RepoContextHeader
        info={{
          name: '',
          path: '',
          currentBranch: '',
          isGitRepo: true,
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
    expect(screen.queryByText(/this branch does not currently track an upstream remote/i)).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /branch selector/i })).toHaveTextContent('release (origin)')
    expect(screen.queryByRole('button', { name: /^commit$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit repository git identity/i })).not.toBeInTheDocument()
    expect(screen.getByText('git@github.com:ehud-am/gitlocal.git')).toBeInTheDocument()
    expect(screen.getByText('Remote repository')).toBeInTheDocument()
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

  it('renders active change notices and changed-file review entries', () => {
    const onOpenChangedFiles = vi.fn()
    const onOpenChangedFile = vi.fn()
    const onCloseChangedFiles = vi.fn()

    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[{ name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true }]}
        selectedPath="README.md"
        selectedPathType="file"
        trackedChangeCount={2}
        untrackedChangeCount={1}
        activePathNotice={{
          path: 'README.md',
          changeKind: 'refreshed',
          detectedAt: '2026-06-11T12:00:00.000Z',
          lastRefreshedAt: '2026-06-11T12:00:00.000Z',
          message: 'README.md changed outside GitLocal and was refreshed.',
          actionLabel: 'View changed files',
        }}
        changedFiles={{
          branch: 'main',
          checkedAt: '2026-06-11T12:00:00.000Z',
          summary: { total: 3, modified: 1, added: 0, deleted: 1, renamed: 0, untracked: 1, remoteRelevant: 0, tracked: 2 },
          items: [
            {
              path: 'README.md',
              name: 'README.md',
              type: 'file',
              changeState: 'modified',
              generatedLocalState: 'tracked',
              sourcePath: '',
              canOpen: true,
              reviewHint: 'Modified locally',
            },
            {
              path: 'docs/deleted.md',
              name: 'deleted.md',
              type: 'missing',
              changeState: 'deleted',
              generatedLocalState: 'tracked',
              sourcePath: '',
              canOpen: false,
              reviewHint: 'Open parent folder',
            },
            {
              path: 'scratch.md',
              name: 'scratch.md',
              type: 'file',
              changeState: 'untracked',
              generatedLocalState: 'local-only',
              sourcePath: '',
              canOpen: true,
              reviewHint: 'Local-only file',
            },
          ],
        }}
        onBranchChange={vi.fn()}
        onOpenChangedFiles={onOpenChangedFiles}
        onCloseChangedFiles={onCloseChangedFiles}
        onOpenChangedFile={onOpenChangedFile}
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/changed outside GitLocal/i)
    expect(screen.queryByRole('button', { name: /^changed files$/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /view changed files/i }))
    expect(onOpenChangedFiles).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('region', { name: /changed files/i })).toHaveTextContent('README.md')
    expect(screen.getByText(/local-only/i)).toBeInTheDocument()
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /docs\/deleted\.md/i }))
    expect(onOpenChangedFile).toHaveBeenCalledWith(expect.objectContaining({ path: 'docs/deleted.md', canOpen: false }))
    fireEvent.click(screen.getByRole('button', { name: /close changed files/i }))
    expect(onCloseChangedFiles).toHaveBeenCalledTimes(1)
  })

  it('surfaces the repo summary local change count as a tag instead of a status summary box', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: {
            user: null,
            remote: {
              name: 'origin',
              fetchUrl: 'git@github.com:ehud-am/gitlocal.git',
              webUrl: 'https://github.com/ehud-am/gitlocal',
              selectionReason: 'origin',
            },
          },
        }}
        branch="main"
        branches={[{ name: 'main', displayName: 'main', scope: 'local', hasLocalCheckout: true, isCurrent: true }]}
        selectedPath=""
        selectedPathType="none"
        repoSummary={{
          repoName: 'gitlocal',
          branch: 'main',
          statusSummary: {
            text: 'main is 1 commit behind origin/main. It has 2 local changes to review.',
            tone: 'warning',
            remoteLabel: 'origin',
            syncState: 'behind',
            localChangeCount: 2,
            untrackedChangeCount: 1,
          },
          keyDocuments: [],
          recentItems: [],
          visibility: { generatedLocalMode: 'hide', hiddenCount: 3 },
        }}
        onBranchChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('region', { name: /repository status summary/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/main is 1 commit behind origin\/main/i)).not.toBeInTheDocument()
    expect(screen.getByText(/2 local changes/i)).toBeInTheDocument()
  })

  it('renders a closeable empty changed-files state after review', () => {
    const onCloseChangedFiles = vi.fn()
    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[{ name: 'main', isCurrent: true }]}
        selectedPath=""
        selectedPathType="none"
        changedFiles={{
          branch: 'main',
          checkedAt: '2026-06-11T12:00:00.000Z',
          summary: { total: 0, modified: 0, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0, tracked: 0 },
          items: [],
        }}
        onBranchChange={vi.fn()}
        onCloseChangedFiles={onCloseChangedFiles}
      />,
    )

    expect(screen.getByRole('region', { name: /changed files/i })).toHaveTextContent(/no changed files/i)
    fireEvent.click(screen.getByRole('button', { name: /close changed files/i }))
    expect(onCloseChangedFiles).toHaveBeenCalledTimes(1)
  })

  it('renders plain folder context without git-only controls', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'notes',
          path: '/tmp/notes',
          currentBranch: '',
          isGitRepo: false,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: false,
          rootEntryCount: 1,
          gitContext: null,
        }}
        branch=""
        branches={[]}
        selectedPath="drafts/idea.md"
        selectedPathType="file"
        onBranchChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Folder')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'notes' })).toBeInTheDocument()
    expect(screen.queryByText('Git')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /branch selector/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open repository search/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /expand folder details/i }))
    expect(screen.getByText('Local folder')).toBeInTheDocument()
    expect(screen.getByText('/tmp/notes/drafts/idea.md')).toBeInTheDocument()
    expect(screen.queryByText('Remote repository')).not.toBeInTheDocument()
    expect(screen.queryByText('Git identity')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /collapse folder details/i })).toBeInTheDocument()
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
              source: 'local',
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
    expect(screen.queryByText(/up to date/i)).not.toBeInTheDocument()
    expect(screen.getByText(/git user is not configured/i)).toBeInTheDocument()
    expect(screen.queryByText(/tracking the upstream branch\./i)).not.toBeInTheDocument()
    expect(screen.getByText('No remote configured')).toBeInTheDocument()
    expect(screen.queryByText('Remote path')).not.toBeInTheDocument()
    expect(screen.queryByText('Repository actions')).not.toBeInTheDocument()
  })

  it('shows the Up to date tag when there are no local changes to report', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/gitlocal',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        repoSync={{
          mode: 'up-to-date',
          aheadCount: 0,
          behindCount: 0,
          hasUpstream: true,
          upstreamRef: 'origin/main',
          remoteName: 'origin',
        }}
        trackedChangeCount={0}
        untrackedChangeCount={0}
        onBranchChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/up to date/i)).toBeInTheDocument()
    expect(screen.queryByText(/local change/i)).not.toBeInTheDocument()
  })

  it('renders an enabled Parent Folder button and invokes onNavigateParent when clicked', () => {
    const onNavigateParent = vi.fn()

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
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
        onNavigateParent={onNavigateParent}
        parentFolderEnabled
      />,
    )

    const buttons = screen.getAllByRole('button', { name: 'Parent Folder' })
    expect(buttons).toHaveLength(2)
    buttons.forEach((button) => expect(button).toBeEnabled())
    fireEvent.click(buttons[0])
    expect(onNavigateParent).toHaveBeenCalledTimes(1)
  })

  it('disables the Parent Folder button when parentFolderEnabled is false', () => {
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
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
        onNavigateParent={vi.fn()}
        parentFolderEnabled={false}
      />,
    )

    screen.getAllByRole('button', { name: 'Parent Folder' }).forEach((button) => expect(button).toBeDisabled())
  })

  it('does not render the Parent Folder button when onNavigateParent is not provided', () => {
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
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Parent Folder' })).not.toBeInTheDocument()
  })

  it('renders Home and Readme buttons for a git repo, enabled per repoLocation, and invokes their handlers', () => {
    const onNavigateHome = vi.fn()
    const onNavigateReadme = vi.fn()

    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/repo/vendor/inner-repo',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.4.9',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
        onNavigateHome={onNavigateHome}
        onNavigateReadme={onNavigateReadme}
        repoLocation={{
          repositoryRootPath: '/tmp/repo/vendor/inner-repo',
          isRepositoryRoot: false,
          homeReadmePath: 'README.md',
          atFilesystemRoot: false,
        }}
      />,
    )

    const homeButtons = screen.getAllByRole('button', { name: 'Root' })
    expect(homeButtons).toHaveLength(2)
    homeButtons.forEach((button) => expect(button).toBeEnabled())
    fireEvent.click(homeButtons[0])
    expect(onNavigateHome).toHaveBeenCalledTimes(1)

    const readmeButtons = screen.getAllByRole('button', { name: 'Readme' })
    expect(readmeButtons).toHaveLength(2)
    readmeButtons.forEach((button) => expect(button).toBeEnabled())
    fireEvent.click(readmeButtons[0])
    expect(onNavigateReadme).toHaveBeenCalledTimes(1)
  })

  it('disables Home when already at the repository root and disables Readme when there is no home README', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'gitlocal',
          path: '/tmp/repo',
          currentBranch: 'main',
          isGitRepo: true,
          pickerMode: false,
          version: '0.4.9',
          hasCommits: true,
          rootEntryCount: 2,
          gitContext: null,
        }}
        branch="main"
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
        onNavigateHome={vi.fn()}
        onNavigateReadme={vi.fn()}
        repoLocation={{
          repositoryRootPath: '/tmp/repo',
          isRepositoryRoot: true,
          homeReadmePath: '',
          atFilesystemRoot: false,
        }}
      />,
    )

    screen.getAllByRole('button', { name: 'Root' }).forEach((button) => expect(button).toBeDisabled())
    screen.getAllByRole('button', { name: 'Readme' }).forEach((button) => expect(button).toBeDisabled())
  })

  it('does not render Home or Readme buttons for a plain non-git folder even when handlers are provided', () => {
    render(
      <RepoContextHeader
        info={{
          name: 'notes',
          path: '/tmp/notes',
          currentBranch: '',
          isGitRepo: false,
          pickerMode: false,
          version: '0.5.2',
          hasCommits: false,
          rootEntryCount: 1,
          gitContext: null,
        }}
        branch=""
        branches={[]}
        selectedPath=""
        selectedPathType="none"
        onBranchChange={vi.fn()}
        onNavigateHome={vi.fn()}
        onNavigateReadme={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Root' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Readme' })).not.toBeInTheDocument()
  })
})
