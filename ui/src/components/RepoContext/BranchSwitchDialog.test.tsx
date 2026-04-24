import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, expect, it, vi } from 'vitest'
import BranchSwitchDialog from './BranchSwitchDialog'

describe('BranchSwitchDialog', () => {
  it('renders the commit, discard, and cancel flow for confirmation-required responses', () => {
    const onCancel = vi.fn()
    const onCommit = vi.fn()
    const onDiscard = vi.fn()
    const onCommitMessageChange = vi.fn()

    render(
      <BranchSwitchDialog
        open
        targetLabel="release (origin)"
        targetScope="remote"
        response={{
          ok: false,
          status: 'confirmation-required',
          message: 'This branch switch needs confirmation because your working tree has uncommitted changes.',
          trackedChangeCount: 2,
          untrackedChangeCount: 1,
          blockingPaths: ['src/App.tsx', 'notes.txt'],
          suggestedCommitMessage: 'WIP before switching to release',
        }}
        commitMessage="WIP before switching to release"
        onCommitMessageChange={onCommitMessageChange}
        onCancel={onCancel}
        onCommit={onCommit}
        onDiscard={onDiscard}
      />,
    )

    expect(screen.getByRole('heading', { name: /switch branches/i })).toBeInTheDocument()
    expect(screen.getByText(/create a local tracking branch/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('WIP before switching to release')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/commit message/i), {
      target: { value: 'save before switch' },
    })
    expect(onCommitMessageChange).toHaveBeenCalledWith('save before switch')

    fireEvent.click(screen.getByRole('button', { name: /discard changes and switch/i }))
    expect(onDiscard).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /commit and switch/i }))
    expect(onCommit).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('focuses the dialog on tracked changes only', () => {
    render(
      <BranchSwitchDialog
        open
        targetLabel="blocked-branch"
        response={{
          ok: false,
          status: 'confirmation-required',
          message: 'Tracked changes need confirmation.',
          trackedChangeCount: 1,
          untrackedChangeCount: 3,
          blockingPaths: ['src/App.tsx'],
        }}
        commitMessage=""
        onCommitMessageChange={vi.fn()}
        onCancel={vi.fn()}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: /switch branches/i })).toBeInTheDocument()
    expect(screen.getByText(/1 tracked change/i)).toBeInTheDocument()
    expect(screen.queryByText(/untracked file/i)).not.toBeInTheDocument()
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument()
    expect(screen.getByLabelText(/commit message/i)).toBeInTheDocument()
  })

  it('disables actions while pending and has no obvious a11y violations', async () => {
    const onCancel = vi.fn()
    const { container } = render(
      <BranchSwitchDialog
        open
        targetLabel="feature"
        response={{
          ok: false,
          status: 'confirmation-required',
          message: 'Choose how to continue.',
          trackedChangeCount: 1,
          untrackedChangeCount: 2,
        }}
        commitMessage=""
        pending
        errorMessage="Branch switch failed."
        onCommitMessageChange={vi.fn()}
        onCancel={onCancel}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /discarding/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /committing/i })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent(/branch switch failed/i)
    expect((await axe(container)).violations).toHaveLength(0)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('allows escape to dismiss the dialog when no action is pending', () => {
    const onCancel = vi.fn()

    render(
      <BranchSwitchDialog
        open
        targetLabel="feature"
        response={{
          ok: false,
          status: 'confirmation-required',
          message: 'Choose how to continue.',
          trackedChangeCount: 1,
          blockingPaths: ['README.md'],
        }}
        commitMessage="keep this"
        onCommitMessageChange={vi.fn()}
        onCancel={onCancel}
        onCommit={vi.fn()}
        onDiscard={vi.fn()}
      />,
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })
})
