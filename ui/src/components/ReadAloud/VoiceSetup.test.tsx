import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RecommendedVoice } from '../../services/readAloudApi'

const openVoiceSettings = vi.hoisted(() => vi.fn(async () => false))
vi.mock('../../services/readAloudApi', () => ({ readAloudApi: { openVoiceSettings } }))

import VoiceSetup from './VoiceSetup'

const base: RecommendedVoice = { key: 'k', label: 'Zoe', gender: 'female', locale: 'en_US', accent: 'US', bestQuality: 'premium', installed: false, installedQuality: null, voice: null, upgradeAvailable: false }

describe('VoiceSetup', () => {
  it('describes each voice status and explains failures to open settings', async () => {
    render(
      <VoiceSetup
        recommended={[
          { ...base, key: 'a', label: 'A', installed: true, installedQuality: 'premium', voice: 'A (Premium)' },
          { ...base, key: 'b', label: 'B', installed: true, installedQuality: 'enhanced', voice: 'B (Enhanced)', upgradeAvailable: true },
          { ...base, key: 'c', label: 'C', gender: 'male', installedQuality: 'basic', upgradeAvailable: true },
          { ...base, key: 'd', label: 'D', bestQuality: 'enhanced' },
        ]}
        needsSetup
        onRefresh={async () => undefined}
        onPreview={() => undefined}
        onUse={() => undefined}
      />,
    )
    expect(screen.getByText('Installed (Premium)')).toBeInTheDocument()
    expect(screen.getByText('Installed (Enhanced). Premium available')).toBeInTheDocument()
    expect(screen.getByText('Only the basic version is installed. Download Premium')).toBeInTheDocument()
    expect(screen.getByText('Not installed. Download Enhanced')).toBeInTheDocument()
    expect(screen.getByText('Male, US English')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open Spoken Content settings' }))
    await waitFor(() => expect(screen.getByText('Could not open System Settings. Open it from the Apple menu.')).toBeInTheDocument())
    openVoiceSettings.mockResolvedValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'Open Spoken Content settings' }))
    await waitFor(() => expect(screen.queryByText('Could not open System Settings. Open it from the Apple menu.')).toBeNull())
  })

  it('shows a busy refresh button', async () => {
    let finish: () => void = () => undefined
    render(<VoiceSetup recommended={[]} needsSetup={false} onRefresh={() => new Promise<void>((resolve) => { finish = resolve })} onPreview={() => undefined} onUse={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh voices' }))
    expect(screen.getByRole('button', { name: 'Refreshing…' })).toBeDisabled()
    finish()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Refresh voices' })).toBeEnabled())
  })
})
