import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SayEngine,
  SpeechError,
  WebSpeechEngine,
  getAudioContext,
  loadLocalEnglishVoices,
  localEnglishVoices,
  resetAudioContextForTests,
  resolveWebVoice,
  unlockAudio,
} from './engines'

class FakeSource {
  buffer: unknown = null
  onended: (() => void) | null = null
  started = false
  stopped = false
  connect = vi.fn()
  start() { this.started = true }
  stop() {
    if (this.stopped) throw new Error('already stopped')
    this.stopped = true
    this.onended?.()
  }
}

class FakeAudioContext {
  state: 'suspended' | 'running' = 'suspended'
  destination = {}
  sources: FakeSource[] = []
  resume = vi.fn(async () => { this.state = 'running' })
  suspend = vi.fn(async () => { this.state = 'suspended' })
  decodeAudioData = vi.fn(async (data: ArrayBuffer) => ({ decoded: data.byteLength }))
  createBufferSource() {
    const source = new FakeSource()
    this.sources.push(source)
    return source
  }
}

afterEach(() => {
  resetAudioContextForTests()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(window, 'AudioContext')
  Reflect.deleteProperty(window, 'webkitAudioContext')
  Reflect.deleteProperty(window, 'speechSynthesis')
})

function okResponse(): Response {
  return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
}

describe('SayEngine', () => {
  it('posts the sentence to the local server and decodes the audio', async () => {
    const context = new FakeAudioContext()
    const fetchImpl = vi.fn(async () => okResponse())
    const engine = new SayEngine('Ava (Premium)', 1.25, fetchImpl, () => context as unknown as AudioContext)
    const audio = await engine.prepare('Hello.')
    expect(fetchImpl).toHaveBeenCalledWith('/api/tts/say', expect.objectContaining({ method: 'POST' }))
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url.startsWith('/')).toBe(true)
    expect(JSON.parse(init.body as string)).toEqual({ text: 'Hello.', voice: 'Ava (Premium)', rate: 1.25 })
    expect(audio).toEqual({ decoded: 3 })
  })

  it('maps server errors to speech errors', async () => {
    const context = () => new FakeAudioContext() as unknown as AudioContext
    const silent = new SayEngine('A', 1, async () => new Response(JSON.stringify({ code: 'silent-audio', error: 'No sound' }), { status: 422 }), context)
    await expect(silent.prepare('x')).rejects.toMatchObject({ code: 'silent-audio', message: 'No sound' })
    const missing = new SayEngine('A', 1, async () => new Response(JSON.stringify({ code: 'voice-not-installed' }), { status: 400 }), context)
    await expect(missing.prepare('x')).rejects.toMatchObject({ code: 'voice-not-installed', message: 'Speech failed.' })
    const broken = new SayEngine('A', 1, async () => new Response('nope', { status: 500 }), context)
    await expect(broken.prepare('x')).rejects.toBeInstanceOf(SpeechError)
    const noAudio = new SayEngine('A', 1, async () => okResponse(), () => null)
    await expect(noAudio.prepare('x')).rejects.toMatchObject({ code: 'unavailable' })
  })

  it('plays, pauses, resumes and stops through the audio context', async () => {
    const context = new FakeAudioContext()
    const engine = new SayEngine('A', 1, async () => okResponse(), () => context as unknown as AudioContext)
    const controller = new AbortController()
    const playing = engine.play({ decoded: 1 }, 'x', controller.signal)
    expect(context.sources[0].started).toBe(true)
    engine.pause()
    expect(context.suspend).toHaveBeenCalled()
    engine.resume()
    expect(context.resume).toHaveBeenCalled()
    context.sources[0].onended?.()
    await playing
    const second = engine.play({}, 'y', controller.signal)
    engine.stop()
    await second
    engine.stop()
    const aborted = engine.play({}, 'z', controller.signal)
    controller.abort()
    await aborted
    await engine.play({}, 'after abort', controller.signal)
    expect(context.sources).toHaveLength(3)
    const noContext = new SayEngine('A', 1, async () => okResponse(), () => null)
    await noContext.play({}, 'x', new AbortController().signal)
    noContext.pause()
    noContext.resume()
  })

  it('swallows a second stop on an already stopped source', async () => {
    const context = new FakeAudioContext()
    const engine = new SayEngine('A', 1, async () => okResponse(), () => context as unknown as AudioContext)
    const controller = new AbortController()
    const playing = engine.play({}, 'x', controller.signal)
    context.sources[0].stopped = true
    controller.abort()
    await playing
  })

  it('uses the global fetch by default', async () => {
    const fetchSpy = vi.fn(async () => okResponse())
    vi.stubGlobal('fetch', fetchSpy)
    const context = new FakeAudioContext()
    await new SayEngine('A', 1, undefined, () => context as unknown as AudioContext).prepare('x')
    expect(fetchSpy).toHaveBeenCalled()
  })
})

describe('audio context and unlock', () => {
  it('creates one shared context and resumes it on unlock', () => {
    expect(getAudioContext()).toBeNull()
    Object.defineProperty(window, 'webkitAudioContext', { value: FakeAudioContext, configurable: true })
    const context = getAudioContext() as unknown as FakeAudioContext
    expect(getAudioContext()).toBe(context)
    unlockAudio()
    expect(context.resume).toHaveBeenCalled()
    context.resume.mockRejectedValueOnce(new Error('denied'))
    context.state = 'suspended'
    unlockAudio()
  })

  it('primes speech synthesis once when idle', () => {
    const speak = vi.fn()
    Object.defineProperty(window, 'speechSynthesis', { value: { speak, speaking: false }, configurable: true })
    vi.stubGlobal('SpeechSynthesisUtterance', class { volume = 1; constructor(public text: string) {} })
    unlockAudio()
    expect(speak).toHaveBeenCalledTimes(1)
    expect((speak.mock.calls[0] as unknown as [{ volume: number }])[0].volume).toBe(0)
  })
})

interface FakeUtterance {
  text: string
  voice: unknown
  lang: string
  rate: number
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}

function fakeSynth(voices: Partial<SpeechSynthesisVoice>[] = []) {
  const listeners: (() => void)[] = []
  const spoken: FakeUtterance[] = []
  const synth = {
    spoken,
    voices,
    getVoices: vi.fn(() => synth.voices as SpeechSynthesisVoice[]),
    speak: vi.fn((utterance: FakeUtterance) => spoken.push(utterance)),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    addEventListener: vi.fn((_name: string, listener: () => void) => listeners.push(listener)),
    removeEventListener: vi.fn(),
    fire: () => listeners.forEach((listener) => listener()),
  }
  return synth
}

describe('WebSpeechEngine', () => {
  const voice = { voiceURI: 'v1', name: 'Samantha', lang: 'en-US', localService: true, default: true } as SpeechSynthesisVoice

  it('speaks with the chosen voice and rate', async () => {
    vi.stubGlobal('SpeechSynthesisUtterance', class { voice: unknown = null; lang = ''; rate = 1; onend: (() => void) | null = null; onerror: unknown = null; constructor(public text: string) {} })
    const synth = fakeSynth()
    const engine = new WebSpeechEngine(voice, 1.5, synth as unknown as SpeechSynthesis)
    expect(await engine.prepare()).toBeNull()
    const playing = engine.play(null, 'Hello', new AbortController().signal)
    const utterance = synth.spoken[0]
    expect(utterance).toMatchObject({ text: 'Hello', voice, lang: 'en-US', rate: 1.5 })
    utterance.onend?.()
    await playing

    const interrupted = engine.play(null, 'x', new AbortController().signal)
    synth.spoken[1].onerror?.({ error: 'interrupted' })
    await interrupted
    const failed = engine.play(null, 'x', new AbortController().signal)
    synth.spoken[2].onerror?.({ error: 'synthesis-failed' })
    await expect(failed).rejects.toBeInstanceOf(SpeechError)

    const controller = new AbortController()
    const aborted = engine.play(null, 'x', controller.signal)
    controller.abort()
    await aborted
    expect(synth.cancel).toHaveBeenCalled()
    synth.spoken[3].onerror?.({ error: 'synthesis-failed' })
    await engine.play(null, 'skipped', controller.signal)
    engine.pause()
    engine.resume()
    engine.stop()
    expect(synth.pause).toHaveBeenCalled()
    expect(synth.resume).toHaveBeenCalled()
    expect(synth.cancel).toHaveBeenCalledTimes(2)
  })

  it('defaults to window.speechSynthesis', () => {
    const synth = fakeSynth()
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    new WebSpeechEngine(voice, 1).stop()
    expect(synth.cancel).toHaveBeenCalled()
  })
})

describe('web voices', () => {
  const local = { voiceURI: 'local', name: 'Local', lang: 'en-GB', localService: true, default: false }
  const remote = { voiceURI: 'remote', name: 'Google US English', lang: 'en-US', localService: false, default: true }
  const french = { voiceURI: 'fr', name: 'Thomas', lang: 'fr-FR', localService: true, default: false }

  it('keeps only on-device English voices', () => {
    expect(localEnglishVoices(fakeSynth([local, remote, french]) as unknown as SpeechSynthesis).map((voice) => voice.voiceURI)).toEqual(['local'])
  })

  it('waits for voiceschanged or a timeout', async () => {
    expect(await loadLocalEnglishVoices(undefined)).toEqual([])
    expect(await loadLocalEnglishVoices(fakeSynth([local]) as unknown as SpeechSynthesis)).toHaveLength(1)
    const late = fakeSynth([])
    const pending = loadLocalEnglishVoices(late as unknown as SpeechSynthesis)
    late.voices = [local]
    late.fire()
    expect(await pending).toHaveLength(1)
    vi.useFakeTimers()
    try {
      const never = loadLocalEnglishVoices(fakeSynth([]) as unknown as SpeechSynthesis, 50)
      await vi.advanceTimersByTimeAsync(50)
      expect(await never).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('resolves a stored voice, the default, or the first voice', () => {
    const voices = [local, { ...local, voiceURI: 'b', default: true }] as SpeechSynthesisVoice[]
    expect(resolveWebVoice('local', voices)?.voiceURI).toBe('local')
    expect(resolveWebVoice('system', voices)?.voiceURI).toBe('b')
    expect(resolveWebVoice('gone', [local] as SpeechSynthesisVoice[])?.voiceURI).toBe('local')
    expect(resolveWebVoice('system', [])).toBeNull()
  })
})
