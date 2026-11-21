import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_READ_ALOUD_PREFERENCE, readAloudApi } from './readAloudApi'

afterEach(() => vi.unstubAllGlobals())

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('readAloudApi', () => {
  it('loads voices, falling back to web speech on errors', async () => {
    const fetchMock = vi.fn(async () => json({ engine: 'say', recommended: [] }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await readAloudApi.voices(true)).toEqual({ engine: 'say', recommended: [] })
    expect(fetchMock).toHaveBeenCalledWith('/api/tts/voices?refresh=1')
    await readAloudApi.voices()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/tts/voices')
    fetchMock.mockResolvedValueOnce(json({}, 500))
    expect(await readAloudApi.voices()).toEqual({ engine: 'web-speech' })
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    expect(await readAloudApi.voices()).toEqual({ engine: 'web-speech' })
  })

  it('reads and saves the preference', async () => {
    const fetchMock = vi.fn(async () => json({ voice: 'Ava (Premium)' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await readAloudApi.preference()).toEqual({ voice: 'Ava (Premium)', rate: 1 })
    fetchMock.mockResolvedValueOnce(json({}, 403))
    expect(await readAloudApi.preference()).toEqual(DEFAULT_READ_ALOUD_PREFERENCE)
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    expect(await readAloudApi.preference()).toEqual(DEFAULT_READ_ALOUD_PREFERENCE)
    await readAloudApi.savePreference({ voice: 'system', rate: 1.5 })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/read-aloud-preference', expect.objectContaining({ method: 'PUT', body: '{"voice":"system","rate":1.5}' }))
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(readAloudApi.savePreference({ voice: 'system', rate: 1 })).resolves.toBeUndefined()
  })

  it('opens voice settings', async () => {
    const fetchMock = vi.fn(async () => json({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await readAloudApi.openVoiceSettings()).toBe(true)
    fetchMock.mockResolvedValueOnce(json({}))
    expect(await readAloudApi.openVoiceSettings()).toBe(false)
    fetchMock.mockResolvedValueOnce(json({}, 404))
    expect(await readAloudApi.openVoiceSettings()).toBe(false)
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    expect(await readAloudApi.openVoiceSettings()).toBe(false)
  })
})
