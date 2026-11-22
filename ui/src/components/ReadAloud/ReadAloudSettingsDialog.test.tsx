import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VoiceCatalog } from '../../services/readAloudApi'

const api = vi.hoisted(() => ({
  voices: vi.fn(),
  preference: vi.fn(),
  savePreference: vi.fn(async () => undefined),
  openVoiceSettings: vi.fn(async () => true),
}))
vi.mock('../../services/readAloudApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/readAloudApi')>()),
  readAloudApi: api,
}))

const engines = vi.hoisted(() => ({
  played: [] as string[],
  fail: false,
  webVoices: [] as { voiceURI: string; name: string; lang: string; localService: boolean; default: boolean }[],
}))
vi.mock('./engines', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./engines')>()
  class FakeEngine {
    constructor(readonly voice: string) {}
    async prepare(text: string) {
      if (engines.fail) throw new actual.SpeechError('failed', 'failed')
      return text
    }
    async play(_prepared: unknown, text: string) {
      if (engines.fail) throw new actual.SpeechError('failed', 'failed')
      engines.played.push(`${this.voice}:${text}`)
    }
  }
  return {
    ...actual,
    unlockAudio: vi.fn(),
    SayEngine: class extends FakeEngine {},
    WebSpeechEngine: class extends FakeEngine { constructor(voice: { voiceURI: string }) { super(voice.voiceURI) } },
    loadLocalEnglishVoices: async () => engines.webVoices,
  }
})

import ReadAloudSettingsDialog from './ReadAloudSettingsDialog'
import { READ_ALOUD_PREFERENCE_EVENT, openReadAloudSettings } from './events'

const SAY_CATALOG: VoiceCatalog = {
  engine: 'say',
  recommended: [
    { key: 'ava', label: 'Ava', gender: 'female', locale: 'en_US', accent: 'US', bestQuality: 'premium', installed: true, installedQuality: 'premium', voice: 'Ava (Premium)', upgradeAvailable: false },
    { key: 'evan', label: 'Evan', gender: 'male', locale: 'en_US', accent: 'US', bestQuality: 'enhanced', installed: false, installedQuality: null, voice: null, upgradeAvailable: false },
  ],
  otherInstalled: [],
  installedRecommended: { female: 1, male: 0 },
  needsSetup: true,
}

const flush = async () => {
  for (let index = 0; index < 20; index += 1) await act(async () => { await Promise.resolve() })
}

beforeEach(() => {
  vi.clearAllMocks()
  engines.played = []
  engines.fail = false
  engines.webVoices = []
  api.voices.mockResolvedValue(SAY_CATALOG)
  api.preference.mockResolvedValue({ voice: 'system', rate: 1 })
})

describe('ReadAloudSettingsDialog', () => {
  it('opens from the menu event, saves and announces changes, previews and refreshes', async () => {
    render(<ReadAloudSettingsDialog />)
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => openReadAloudSettings())
    await flush()
    expect(screen.getByRole('dialog', { name: 'Read aloud voices' })).toBeInTheDocument()
    const announced = vi.fn()
    window.addEventListener(READ_ALOUD_PREFERENCE_EVENT, announced)
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '1.25' } })
    expect(api.savePreference).toHaveBeenLastCalledWith({ voice: 'system', rate: 1.25 })
    expect((announced.mock.calls[0][0] as CustomEvent).detail).toEqual({ voice: 'system', rate: 1.25 })
    window.removeEventListener(READ_ALOUD_PREFERENCE_EVENT, announced)
    fireEvent.click(screen.getByRole('button', { name: 'Use' }))
    expect(api.savePreference).toHaveBeenLastCalledWith({ voice: 'Ava (Premium)', rate: 1.25 })
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0])
    await flush()
    expect(engines.played).toEqual(['Ava (Premium):This is how GitLocal reads your documents.'])
    api.voices.mockResolvedValue({ ...SAY_CATALOG, needsSetup: false })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh voices' }))
    await flush()
    expect(api.voices).toHaveBeenLastCalledWith(true)
  })

  it('opens from the native menu and reports a preview that fails', async () => {
    api.preference.mockResolvedValue({ voice: 'Gone', rate: 1 })
    engines.fail = true
    render(<ReadAloudSettingsDialog />)
    act(() => {
      window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'refresh' } }))
      window.dispatchEvent(new CustomEvent('gitlocal:native-command', { detail: { command: 'read-aloud-settings' } }))
    })
    await flush()
    expect(screen.getByRole('combobox', { name: 'Voice' })).toHaveValue('system')
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0])
    await flush()
    expect(screen.getByText('Could not play the preview.')).toBeInTheDocument()
  })

  it('uses on-device web voices off macOS', async () => {
    api.voices.mockResolvedValue({ engine: 'web-speech' })
    render(<ReadAloudSettingsDialog />)
    act(() => openReadAloudSettings())
    await flush()
    expect(screen.getByText('This browser has no on-device English voices.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByText('Could not play the preview.')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await flush()
    engines.webVoices = [{ voiceURI: 'samantha', name: 'Samantha', lang: 'en-US', localService: true, default: true }]
    api.preference.mockResolvedValue({ voice: 'samantha', rate: 1 })
    act(() => openReadAloudSettings())
    await flush()
    expect(screen.getByRole('combobox', { name: 'Voice' })).toHaveValue('samantha')
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    await flush()
    expect(engines.played).toEqual(['samantha:This is how GitLocal reads your documents.'])
    expect(screen.queryByRole('region', { name: 'Voice setup' })).toBeNull()
  })

  it('ignores a load that finishes after the dialog closed', async () => {
    let resolveVoices: (catalog: VoiceCatalog) => void = () => undefined
    api.voices.mockReturnValue(new Promise((resolve) => { resolveVoices = resolve }))
    const { unmount } = render(<ReadAloudSettingsDialog />)
    act(() => openReadAloudSettings())
    unmount()
    resolveVoices(SAY_CATALOG)
    await flush()
  })
})
