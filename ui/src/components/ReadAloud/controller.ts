// Plays a list of sentences through a SpeechEngine: keeps the next sentences prepared while one
// plays, inserts the planned pauses, and supports pause, jumps, and switching engines.
import { SpeechError, type SpeechEngine } from './engines'
import type { SpeechSentence } from './speech-model'

export type ReadAloudState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export interface ReadAloudSnapshot {
  state: ReadAloudState
  index: number
  total: number
  error: string | null
}

export interface ControllerOptions {
  onChange: (snapshot: ReadAloudSnapshot) => void
  onSentence: (sentence: SpeechSentence | null) => void
  // Called when the engine reports silent audio or a missing voice. Returns a replacement engine
  // to continue with, or null to stop with an error.
  onEngineFailure?: (error: SpeechError) => SpeechEngine | null
  lookahead?: number
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export class ReadAloudController {
  private engine: SpeechEngine
  private index = 0
  private state: ReadAloudState = 'idle'
  private error: string | null = null
  private generation = 0
  private abort: AbortController | null = null
  private cache = new Map<number, Promise<unknown>>()
  private paused = false
  private resumeWaiters: (() => void)[] = []
  private readonly lookahead: number
  private readonly sleep: (ms: number) => Promise<void>

  constructor(engine: SpeechEngine, private readonly sentences: SpeechSentence[], private readonly options: ControllerOptions) {
    this.engine = engine
    this.lookahead = options.lookahead ?? 2
    this.sleep = options.sleep ?? defaultSleep
  }

  get snapshot(): ReadAloudSnapshot {
    return { state: this.state, index: this.index, total: this.sentences.length, error: this.error }
  }

  start(index = this.index): void {
    this.generation += 1
    this.abort?.abort()
    this.engine.stop()
    this.index = Math.max(0, Math.min(index, this.sentences.length))
    this.error = null
    if (this.paused) {
      this.paused = false
      this.engine.resume()
      this.releaseWaiters()
    }
    void this.run(this.generation)
  }

  pause(): void {
    if (this.state !== 'playing' && this.state !== 'loading') return
    this.paused = true
    this.engine.pause()
    this.setState('paused')
  }

  resume(): void {
    if (this.state !== 'paused') return
    this.paused = false
    this.engine.resume()
    this.releaseWaiters()
    this.setState('playing')
  }

  togglePause(): void {
    if (this.state === 'paused') this.resume()
    else if (this.state === 'ended' || this.state === 'error' || this.state === 'idle') this.start(this.state === 'ended' ? 0 : this.index)
    else this.pause()
  }

  stop(): void {
    this.generation += 1
    this.abort?.abort()
    this.engine.stop()
    this.paused = false
    this.releaseWaiters()
    this.options.onSentence(null)
    this.setState('idle')
  }

  next(): void {
    this.start(Math.min(this.index + 1, this.sentences.length - 1))
  }

  previous(): void {
    this.start(Math.max(this.index - 1, 0))
  }

  nextHeading(): void {
    const target = this.sentences.findIndex((sentence, index) => index > this.index && sentence.kind === 'heading')
    if (target >= 0) this.start(target)
  }

  previousHeading(): void {
    let target = -1
    for (let index = this.index - 1; index >= 0; index -= 1) {
      if (this.sentences[index].kind === 'heading') {
        target = index
        break
      }
    }
    this.start(Math.max(target, 0))
  }

  setEngine(engine: SpeechEngine): void {
    const wasActive = this.state === 'playing' || this.state === 'loading' || this.state === 'paused'
    this.generation += 1
    this.abort?.abort()
    this.engine.stop()
    this.engine = engine
    this.cache.clear()
    if (wasActive) this.start(this.index)
  }

  private setState(state: ReadAloudState): void {
    this.state = state
    this.options.onChange(this.snapshot)
  }

  private releaseWaiters(): void {
    const waiters = this.resumeWaiters
    this.resumeWaiters = []
    for (const waiter of waiters) waiter()
  }

  private async whileNotPaused(): Promise<void> {
    while (this.paused) {
      // eslint-disable-next-line no-await-in-loop -- wait until resumed
      await new Promise<void>((resolve) => this.resumeWaiters.push(resolve))
    }
  }

  private prepared(index: number): Promise<unknown> {
    let pending = this.cache.get(index)
    if (!pending) {
      pending = this.engine.prepare(this.sentences[index].text)
      pending.catch(() => undefined)
      this.cache.set(index, pending)
    }
    return pending
  }

  private async run(generation: number): Promise<void> {
    const current = () => generation === this.generation
    if (this.sentences.length === 0) {
      this.setState('ended')
      return
    }
    while (current() && this.index < this.sentences.length) {
      const index = this.index
      const sentence = this.sentences[index]
      this.setState(this.paused ? 'paused' : 'loading')
      try {
        if (sentence.preMs > 0) await this.sleep(sentence.preMs)
        await this.whileNotPaused()
        if (!current()) return
        const audio = await this.prepared(index)
        for (let ahead = 1; ahead <= this.lookahead && index + ahead < this.sentences.length; ahead += 1) this.prepared(index + ahead)
        await this.whileNotPaused()
        if (!current()) return
        this.abort = new AbortController()
        this.options.onSentence(sentence)
        this.setState('playing')
        await this.engine.play(audio, sentence.text, this.abort.signal)
        if (!current()) return
        if (sentence.postMs > 0) await this.sleep(sentence.postMs)
        if (!current()) return
        this.cache.delete(index)
        this.index = index + 1
      } catch (error) {
        if (!current()) return
        this.cache.delete(index)
        const replacement = error instanceof SpeechError ? this.options.onEngineFailure?.(error) ?? null : null
        if (replacement) {
          this.engine = replacement
          this.cache.clear()
          continue
        }
        this.error = error instanceof Error && error.message ? error.message : 'Speech failed.'
        this.options.onSentence(null)
        this.setState('error')
        return
      }
    }
    if (!current()) return
    this.options.onSentence(null)
    this.setState('ended')
  }
}
