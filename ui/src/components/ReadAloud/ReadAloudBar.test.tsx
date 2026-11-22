import { act, fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  created: [] as { kind: string; voice: string; rate: number }[],
  played: [] as string[],
  failVoices: new Set<string>(),
  missingVoices: new Set<string>(),
  holdPlay: false,
  webVoices: [] as { voiceURI: string; name: string; lang: string; localService: boolean; default: boolean }[],
}))
vi.mock('./engines', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./engines')>()
  class FakeEngine {
    constructor(readonly voice: string, readonly rate: number, kind: string) {
      engines.created.push({ kind, voice, rate })
    }
    async prepare(text: string) {
      if (engines.failVoices.has(this.voice)) throw new actual.SpeechError('silent-audio', 'silent')
      if (engines.missingVoices.has(this.voice)) throw new actual.SpeechError('voice-not-installed', 'missing')
      return text
    }
    play(_prepared: unknown, text: string, signal: AbortSignal) {
      engines.played.push(`${this.voice}:${text}`)
      if (!engines.holdPlay) return Promise.resolve()
      return new Promise<void>((resolve) => signal.addEventListener('abort', () => resolve()))
    }
    pause() {}
    resume() {}
    stop() {}
  }
  return {
    ...actual,
    SayEngine: class extends FakeEngine { constructor(voice: string, rate: number) { super(voice, rate, 'say') } },
    WebSpeechEngine: class extends FakeEngine { constructor(voice: { voiceURI: string }, rate: number) { super(voice.voiceURI, rate, 'web') } },
    loadLocalEnglishVoices: async () => engines.webVoices,
  }
})

import ReadAloudBar, { type ReadAloudBarHandle } from './ReadAloudBar'
import { OPEN_READ_ALOUD_SETTINGS_EVENT, READ_ALOUD_PREFERENCE_EVENT, announceReadAloudPreference } from './events'

const SAY_CATALOG: VoiceCatalog = {
  engine: 'say',
  recommended: [
    { key: 'ava', label: 'Ava', gender: 'female', locale: 'en_US', accent: 'US', bestQuality: 'premium', installed: true, installedQuality: 'premium', voice: 'Ava (Premium)', upgradeAvailable: false },
    { key: 'evan', label: 'Evan', gender: 'male', locale: 'en_US', accent: 'US', bestQuality: 'enhanced', installed: false, installedQuality: null, voice: null, upgradeAvailable: false },
  ],
  otherInstalled: [
    { name: 'Fiona (Enhanced)', baseName: 'Fiona', locale: 'en-scotland', quality: 'enhanced' },
    { name: 'Albert', baseName: 'Albert', locale: 'en_US', quality: 'basic' },
  ],
  installedRecommended: { female: 1, male: 0 },
  needsSetup: true,
}

function mountContent(html: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = html
  document.body.appendChild(root)
  return root
}

const flush = async () => {
  for (let index = 0; index < 30; index += 1) await act(async () => { await Promise.resolve() })
}

beforeEach(() => {
  engines.created = []
  engines.played = []
  engines.failVoices = new Set()
  engines.missingVoices = new Set()
  api.savePreference.mockClear()
  engines.holdPlay = false
  engines.webVoices = []
  api.voices.mockResolvedValue(SAY_CATALOG)
  api.preference.mockResolvedValue({ voice: 'system', rate: 1 })
})

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

function renderBar(html = '<h1>Title</h1><p>One. Two.</p>', props: Partial<Parameters<typeof ReadAloudBar>[0]> = {}) {
  const root = mountContent(html)
  const onClose = vi.fn()
  const ref = createRef<ReadAloudBarHandle>()
  const utils = render(
    <ReadAloudBar ref={ref} getRoot={() => root} options={{ type: 'markdown' }} selection={null} onClose={onClose} {...props} />,
  )
  return { ...utils, root, onClose, ref }
}

describe('ReadAloudBar', () => {
  it('reads the document with the saved voice and lists voice groups', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    api.preference.mockResolvedValue({ voice: 'Ava (Premium)', rate: 1.25 })
    renderBar()
    await flush()
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(engines.played).toEqual(['Ava (Premium):Title.', 'Ava (Premium):One.', 'Ava (Premium):Two.'])
    expect(engines.created[0]).toEqual({ kind: 'say', voice: 'Ava (Premium)', rate: 1.25 })
    expect(screen.getByText('Finished.')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ava (female, US, Premium)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Evan (not installed)' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Other installed voices' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Basic voices' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Voice setup' })).toBeNull()
  })

  it('falls back to the system voice when the saved voice is missing or silent', async () => {
    api.preference.mockResolvedValue({ voice: 'Gone', rate: 1 })
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('Saved voice Gone is not installed. Using the system voice.')).toBeInTheDocument()
    document.body.innerHTML = ''
    engines.failVoices.add('Ava (Premium)')
    api.preference.mockResolvedValue({ voice: 'Ava (Premium)', rate: 1 })
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('Ava (Premium) produced no sound. Using the system voice.')).toBeInTheDocument()
    expect(engines.played).toContain('system:One.')
  })

  it('stops with an error when the system voice is silent too', async () => {
    engines.failVoices.add('system')
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('silent')).toBeInTheDocument()
  })

  it('reports a missing voice by name', async () => {
    engines.missingVoices.add('Ava (Premium)')
    api.preference.mockResolvedValue({ voice: 'Ava (Premium)', rate: 1 })
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('Ava (Premium) is not installed. Using the system voice.')).toBeInTheDocument()
  })

  it('reads only the selection when one was captured', async () => {
    const root = mountContent('<p id="a">Alpha.</p><p id="b">Beta.</p>')
    const range = document.createRange()
    range.selectNodeContents(root.querySelector('#b')!)
    render(<ReadAloudBar getRoot={() => root} options={{ type: 'markdown' }} selection={{ range, start: 6, end: 11 }} onClose={() => undefined} />)
    await flush()
    expect(engines.played).toEqual(['system:Beta.'])
  })

  it('finds the selection again by text offsets when the preview re-rendered its DOM', async () => {
    const root = mountContent('<p>Alpha.</p><p>Beta.</p>')
    const range = document.createRange()
    range.selectNodeContents(root.querySelectorAll('p')[1])
    root.innerHTML = '<p>Alpha.</p><p>Beta.</p>'
    render(<ReadAloudBar getRoot={() => root} options={{ type: 'markdown' }} selection={{ range, start: 6, end: 11 }} onClose={() => undefined} />)
    await flush()
    expect(engines.played).toEqual(['system:Beta.'])
  })

  it('reports a start failure', async () => {
    api.voices.mockRejectedValue(new Error('offline'))
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('Read aloud could not start.')).toBeInTheDocument()
  })

  it('shows a message when there is nothing to read', async () => {
    renderBar('<p>   </p>')
    await flush()
    expect(screen.getByText('Nothing to read in this file.')).toBeInTheDocument()
    document.body.innerHTML = ''
    const root = mountContent('')
    render(<ReadAloudBar getRoot={() => root} options={{ type: 'pdf' }} selection={null} onClose={() => undefined} />)
    await flush()
    expect(screen.getByText('This PDF has no text to read.')).toBeInTheDocument()
    document.body.innerHTML = ''
    render(<ReadAloudBar getRoot={() => null} options={{ type: 'markdown' }} selection={null} onClose={() => undefined} />)
    await flush()
    expect(screen.getByText('Nothing to read in this file.')).toBeInTheDocument()
  })

  it('uses on-device web voices off macOS, and reports when there are none', async () => {
    api.voices.mockResolvedValue({ engine: 'web-speech' })
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('No on-device voices are available in this browser.')).toBeInTheDocument()
    document.body.innerHTML = ''
    engines.webVoices = [{ voiceURI: 'samantha', name: 'Samantha', lang: 'en-US', localService: true, default: true }]
    api.preference.mockResolvedValue({ voice: 'samantha', rate: 1 })
    renderBar('<p>One.</p>')
    await flush()
    expect(engines.played).toEqual(['samantha:One.'])
    expect(screen.getByRole('option', { name: 'Browser default voice' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Voice setup' })).toBeNull()
    document.body.innerHTML = ''
    api.preference.mockResolvedValue({ voice: 'unknown', rate: 1 })
    renderBar('<p>One.</p>')
    await flush()
    expect(screen.getByText('Saved voice unknown is not installed. Using the system voice.')).toBeInTheDocument()
  })

  it('changes voice and speed, saving the preference', async () => {
    engines.holdPlay = true
    renderBar('<p>One. Two.</p>')
    await flush()
    fireEvent.change(screen.getByRole('combobox', { name: 'Voice' }), { target: { value: 'Fiona (Enhanced)' } })
    expect(api.savePreference).toHaveBeenLastCalledWith({ voice: 'Fiona (Enhanced)', rate: 1 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '1.5' } })
    expect(api.savePreference).toHaveBeenLastCalledWith({ voice: 'Fiona (Enhanced)', rate: 1.5 })
    await flush()
    expect(engines.created[engines.created.length - 1]).toEqual({ kind: 'say', voice: 'Fiona (Enhanced)', rate: 1.5 })
  })

  it('drives the transport buttons, the imperative handle, clicks and stop', async () => {
    engines.holdPlay = true
    const { onClose, ref, root } = renderBar('<h2>A</h2><p>One.</p><h2>B</h2><p>Two.</p>')
    await flush()
    const position = () => screen.getByText(/Sentence \d of 4/).textContent
    expect(position()).toBe('Sentence 1 of 4')
    fireEvent.click(screen.getByRole('button', { name: 'Next sentence' }))
    await flush()
    expect(position()).toBe('Sentence 2 of 4')
    fireEvent.click(screen.getByRole('button', { name: 'Next heading' }))
    await flush()
    expect(position()).toBe('Sentence 3 of 4')
    fireEvent.click(screen.getByRole('button', { name: 'Previous sentence' }))
    await flush()
    fireEvent.click(screen.getByRole('button', { name: 'Previous heading' }))
    await flush()
    expect(position()).toBe('Sentence 1 of 4')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument()
    act(() => ref.current?.togglePause())
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    fireEvent.click(root.querySelectorAll('p')[1])
    await flush()
    expect(position()).toBe('Sentence 4 of 4')
    // A click that ends a text selection does not move reading.
    const selected = document.createRange()
    selected.selectNodeContents(root.querySelectorAll('p')[0])
    document.getSelection()!.removeAllRanges()
    document.getSelection()!.addRange(selected)
    fireEvent.click(root.querySelectorAll('p')[0])
    await flush()
    expect(position()).toBe('Sentence 4 of 4')
    document.getSelection()!.removeAllRanges()
    const link = document.createElement('a')
    root.appendChild(link)
    fireEvent.click(link)
    fireEvent.click(root)
    fireEvent.click(screen.getByRole('button', { name: 'Stop reading' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('offers natural voices through the settings dialog and follows its changes', async () => {
    engines.holdPlay = true
    renderBar('<p>One. Two.</p>')
    await flush()
    expect(screen.queryByRole('button', { name: 'Voice setup' })).toBeNull()
    const opened = vi.fn()
    window.addEventListener(OPEN_READ_ALOUD_SETTINGS_EVENT, opened)
    fireEvent.click(screen.getByRole('button', { name: 'Get natural voices' }))
    expect(opened).toHaveBeenCalledTimes(1)
    window.removeEventListener(OPEN_READ_ALOUD_SETTINGS_EVENT, opened)
    act(() => announceReadAloudPreference({ voice: 'Ava (Premium)', rate: 1.25 }))
    await flush()
    expect(engines.created[engines.created.length - 1]).toEqual({ kind: 'say', voice: 'Ava (Premium)', rate: 1.25 })
    expect(api.savePreference).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Get natural voices' })).toBeNull()
    window.dispatchEvent(new CustomEvent(READ_ALOUD_PREFERENCE_EVENT))
  })

  it('ignores a voice change before voices load and cleans up on unmount', async () => {
    let resolveVoices: (catalog: VoiceCatalog) => void = () => undefined
    api.voices.mockReturnValue(new Promise((resolve) => { resolveVoices = resolve }))
    const { unmount } = renderBar('<p>One.</p>')
    expect(screen.getByText('Preparing…')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Speed' }), { target: { value: '1.5' } })
    expect(api.savePreference).not.toHaveBeenCalled()
    unmount()
    resolveVoices(SAY_CATALOG)
    await flush()
    expect(engines.played).toEqual([])
  })
})
