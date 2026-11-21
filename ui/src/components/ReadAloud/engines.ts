// Speech engines. On macOS the local server renders each sentence with `say` (SayEngine); other
// platforms use the browser's Web Speech API, limited to on-device voices (WebSpeechEngine).
export type SpeechErrorCode = 'silent-audio' | 'voice-not-installed' | 'failed' | 'unavailable'

export class SpeechError extends Error {
  constructor(readonly code: SpeechErrorCode, message: string) {
    super(message)
  }
}

export interface SpeechEngine {
  prepare(text: string): Promise<unknown>
  play(prepared: unknown, text: string, signal: AbortSignal): Promise<void>
  pause(): void
  resume(): void
  stop(): void
}

type AudioContextConstructor = new () => AudioContext

let sharedContext: AudioContext | null = null

export function getAudioContext(): AudioContext | null {
  if (sharedContext) return sharedContext
  const scope = window as typeof window & { webkitAudioContext?: AudioContextConstructor }
  const Constructor = (window.AudioContext as AudioContextConstructor | undefined) ?? scope.webkitAudioContext
  if (!Constructor) return null
  sharedContext = new Constructor()
  return sharedContext
}

export function resetAudioContextForTests(): void {
  sharedContext = null
}

// Browsers only let audio start from a user gesture. Called synchronously from the click or key
// press that starts reading, before any await.
export function unlockAudio(): void {
  const context = getAudioContext()
  if (context && context.state === 'suspended') void context.resume().catch(() => undefined)
  const synth = typeof window.speechSynthesis === 'undefined' ? null : window.speechSynthesis
  if (synth && typeof SpeechSynthesisUtterance !== 'undefined' && !synth.speaking) {
    const primer = new SpeechSynthesisUtterance('')
    primer.volume = 0
    synth.speak(primer)
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>

export class SayEngine implements SpeechEngine {
  private source: AudioBufferSourceNode | null = null

  constructor(
    private readonly voice: string,
    private readonly rate: number,
    private readonly fetchImpl: Fetch = (input, init) => fetch(input, init),
    private readonly context: () => AudioContext | null = getAudioContext,
  ) {}

  async prepare(text: string): Promise<AudioBuffer> {
    const response = await this.fetchImpl('/api/tts/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: this.voice, rate: this.rate }),
    })
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { code?: string; error?: string } | null
      const code: SpeechErrorCode = body?.code === 'silent-audio' || body?.code === 'voice-not-installed' ? body.code : 'failed'
      throw new SpeechError(code, body?.error ?? 'Speech failed.')
    }
    const context = this.context()
    if (!context) throw new SpeechError('unavailable', 'Audio playback is not available in this browser.')
    return context.decodeAudioData(await response.arrayBuffer())
  }

  play(prepared: unknown, _text: string, signal: AbortSignal): Promise<void> {
    const context = this.context()
    if (!context || signal.aborted) return Promise.resolve()
    return new Promise((resolve) => {
      const source = context.createBufferSource()
      source.buffer = prepared as AudioBuffer
      source.connect(context.destination)
      this.source = source
      const done = () => {
        signal.removeEventListener('abort', onAbort)
        if (this.source === source) this.source = null
        resolve()
      }
      const onAbort = () => {
        stopSource(source)
        done()
      }
      source.onended = done
      signal.addEventListener('abort', onAbort, { once: true })
      source.start()
    })
  }

  pause(): void {
    void this.context()?.suspend().catch(() => undefined)
  }

  resume(): void {
    void this.context()?.resume().catch(() => undefined)
  }

  stop(): void {
    if (this.source) stopSource(this.source)
    this.source = null
  }
}

function stopSource(source: AudioBufferSourceNode): void {
  try {
    source.stop()
  } catch {
    // Already stopped.
  }
}

export class WebSpeechEngine implements SpeechEngine {
  constructor(
    private readonly voice: SpeechSynthesisVoice,
    private readonly rate: number,
    private readonly synth: SpeechSynthesis = window.speechSynthesis,
  ) {}

  async prepare(): Promise<null> {
    return null
  }

  play(_prepared: unknown, text: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.resolve()
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = this.voice
      utterance.lang = this.voice.lang
      utterance.rate = this.rate
      const onAbort = () => {
        this.synth.cancel()
        resolve()
      }
      utterance.onend = () => {
        signal.removeEventListener('abort', onAbort)
        resolve()
      }
      utterance.onerror = (event) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted || event.error === 'interrupted' || event.error === 'canceled') resolve()
        else reject(new SpeechError('failed', 'Speech failed.'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      this.synth.speak(utterance)
    })
  }

  pause(): void {
    this.synth.pause()
  }

  resume(): void {
    this.synth.resume()
  }

  stop(): void {
    this.synth.cancel()
  }
}

// Only voices that run on the device: Chrome and Edge also list network voices
// (localService === false) that send the text to an online service.
export function localEnglishVoices(synth: SpeechSynthesis): SpeechSynthesisVoice[] {
  return synth.getVoices().filter((voice) => voice.localService && /^en(?:[-_]|$)/i.test(voice.lang))
}

export function loadLocalEnglishVoices(synth: SpeechSynthesis | undefined, timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  if (!synth) return Promise.resolve([])
  const voices = localEnglishVoices(synth)
  if (synth.getVoices().length > 0) return Promise.resolve(voices)
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', finish)
      resolve(localEnglishVoices(synth))
    }
    const timer = setTimeout(finish, timeoutMs)
    synth.addEventListener('voiceschanged', finish)
  })
}

// "system" is the browser default voice when it is on-device, else the first on-device voice.
export function resolveWebVoice(id: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (id !== 'system') {
    const match = voices.find((voice) => voice.voiceURI === id)
    if (match) return match
  }
  return voices.find((voice) => voice.default) ?? voices[0] ?? null
}
