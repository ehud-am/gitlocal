import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GitIdentityDialog } from './AppDialogs'
import type { PrivateSettingsProtectionState, SshKeyCandidate } from '../types'

const protectedState: PrivateSettingsProtectionState = {
  settingsPath: '.env',
  ignoreFileExists: true,
  protected: true,
  status: 'protected',
  canApplyFix: false,
  message: '.env is protected by .gitignore.',
}

function renderDialog(overrides: Partial<Parameters<typeof GitIdentityDialog>[0]> = {}) {
  const props: Parameters<typeof GitIdentityDialog>[0] = {
    open: true,
    pending: false,
    error: '',
    name: 'Local User',
    email: 'local@example.com',
    sshKeyPath: '',
    sshKeys: [],
    sshKeysMessage: 'Found 0 SSH private keys.',
    sshKeysPending: false,
    protection: protectedState,
    protectionPending: false,
    onOpenChange: vi.fn(),
    onNameChange: vi.fn(),
    onEmailChange: vi.fn(),
    onSshKeyPathChange: vi.fn(),
    onApplyProtection: vi.fn(),
    onCancel: vi.fn(),
    onSave: vi.fn(),
    ...overrides,
  }
  render(<GitIdentityDialog {...props} />)
  return props
}

describe('GitIdentityDialog', () => {
  it('selects a listed SSH private key', () => {
    const keys: SshKeyCandidate[] = [{ name: 'id_ed25519', path: '/home/user/.ssh/id_ed25519' }]
    const props = renderDialog({ sshKeys: keys, sshKeysMessage: 'Found 1 SSH private key.' })

    fireEvent.change(screen.getByLabelText(/choose ssh key/i), {
      target: { value: '/home/user/.ssh/id_ed25519' },
    })

    expect(props.onSshKeyPathChange).toHaveBeenCalledWith('/home/user/.ssh/id_ed25519')
    expect(screen.getByText('Found 1 SSH private key.')).toBeInTheDocument()
  })

  it('shows validation errors and disables controls while saving', () => {
    renderDialog({ pending: true, error: 'Selected file is not a valid SSH private key.' })

    expect(screen.getByRole('alert')).toHaveTextContent('Selected file is not a valid SSH private key.')
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    expect(screen.getByLabelText(/git user name/i)).toBeDisabled()
  })

  it('shows .env protection warning and applies the approved fix', () => {
    const props = renderDialog({
      protection: {
        settingsPath: '.env',
        ignoreFileExists: false,
        protected: false,
        status: 'missing-ignore-file',
        canApplyFix: true,
        message: '.env is not ignored.',
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent('.env is not ignored.')
    fireEvent.click(screen.getByRole('button', { name: /add \.env to \.gitignore/i }))
    expect(props.onApplyProtection).toHaveBeenCalledTimes(1)
  })
})
