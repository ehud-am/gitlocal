import { describe, expect, it, vi } from 'vitest'
import { ReadAloudController, type ReadAloudSnapshot } from './controller'
import { SpeechError, type SpeechEngine } from './engines'
import type { BlockKind, SpeechSentence } from './speech-model'

function sentence(text: string, kind: BlockKind = 'paragraph', preMs = 0, postMs = 0): SpeechSentence {
  return { text, range: null, blockIndex: 0, kind, preMs, postMs }
}

interface FakeEngine extends SpeechEngine {
  played: string[]
  prepared: string[]
  finish: () => void
}

// play() resolves when finish() is called, or right away when auto is true.
function fakeEngine(options: { auto?: boolean; fail?: (text: string) => Error | null } = {}): FakeEngine {
  let pending: (() => void) | null = null
  const engine: FakeEngine = {
    played: [],
    prepared: [],
    finish: () => {
      const resolve = pending
      pending = null
      resolve?.()
    },
    prepare: vi.fn(async (text: string) => {
      engine.prepared.push(text)
      const error = options.fail?.(text)
      if (error) throw error
      return text
    }),
    play: vi.fn((_prepared: unknown, text: string, signal: AbortSignal) => {
      engine.played.push(text)
      if (options.auto) return Promise.resolve()
      return new Promise<void>((resolve) => {
        pending = resolve
        signal.addEventListener('abort', () => resolve())
      })
    }),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  }
  return engine
}

const flush = async () => {
  for (let index = 0; index < 40; index += 1) await Promise.resolve()
}

function setup(sentences: SpeechSentence[], engine: SpeechEngine, extra: Partial<ConstructorParameters<typeof ReadAloudController>[2]> = {}) {
  const states: ReadAloudSnapshot[] = []
  const highlighted: (string | null)[] = []
  const controller = new ReadAloudController(engine, sentences, {
    onChange: (snapshot) => states.push(snapshot),
    onSentence: (current) => highlighted.push(current?.text ?? null),
    sleep: async () => undefined,
    ...extra,
  })
  return { controller, states, highlighted }
}

describe('ReadAloudController', () => {
  it('reads every sentence in order, prepares ahead, and ends', async () => {
    const engine = fakeEngine({ auto: true })
    const sleep = vi.fn(async () => undefined)
    const { controller, states, highlighted } = setup([sentence('A', 'heading', 400, 800), sentence('B'), sentence('C', 'paragraph', 0, 450)], engine, { sleep })
    controller.start()
    await flush()
    expect(engine.played).toEqual(['A', 'B', 'C'])
    expect(engine.prepared).toEqual(['A', 'B', 'C'])
    expect(sleep.mock.calls.map((call) => (call as unknown as [number])[0])).toEqual([400, 800, 450])
    expect(highlighted).toEqual(['A', 'B', 'C', null])
    expect(states[states.length - 1]).toEqual({ state: 'ended', index: 3, total: 3, error: null })
  })

  it('ends at once with no sentences', async () => {
    const { controller, states } = setup([], fakeEngine())
    controller.start()
    await flush()
    expect(states[states.length - 1]?.state).toBe('ended')
  })

  it('uses real timers for pauses by default', async () => {
    vi.useFakeTimers()
    try {
      const engine = fakeEngine({ auto: true })
      const controller = new ReadAloudController(engine, [sentence('A', 'paragraph', 0, 300)], { onChange: () => undefined, onSentence: () => undefined })
      controller.start()
      await vi.advanceTimersByTimeAsync(300)
      expect(controller.snapshot.state).toBe('ended')
    } finally {
      vi.useRealTimers()
    }
  })

  it('pauses, resumes and toggles', async () => {
    const engine = fakeEngine()
    const { controller } = setup([sentence('A'), sentence('B')], engine)
    controller.pause()
    expect(engine.pause).not.toHaveBeenCalled()
    controller.start()
    await flush()
    controller.togglePause()
    expect(controller.snapshot.state).toBe('paused')
    expect(engine.pause).toHaveBeenCalled()
    controller.togglePause()
    expect(controller.snapshot.state).toBe('playing')
    controller.resume()
    expect(engine.resume).toHaveBeenCalledTimes(1)
    controller.pause()
    engine.finish()
    await flush()
    expect(engine.played).toEqual(['A'])
    controller.resume()
    await flush()
    expect(engine.played).toEqual(['A', 'B'])
    engine.finish()
    await flush()
    expect(controller.snapshot.state).toBe('ended')
    controller.togglePause()
    await flush()
    expect(engine.played).toEqual(['A', 'B', 'A'])
  })

  it('jumps between sentences and headings', async () => {
    const engine = fakeEngine()
    const sentences = [sentence('H1', 'heading'), sentence('a'), sentence('H2', 'heading'), sentence('b')]
    const { controller } = setup(sentences, engine)
    controller.start()
    await flush()
    controller.next()
    await flush()
    expect(controller.snapshot.index).toBe(1)
    controller.nextHeading()
    await flush()
    expect(controller.snapshot.index).toBe(2)
    controller.nextHeading()
    expect(controller.snapshot.index).toBe(2)
    controller.next()
    await flush()
    controller.previousHeading()
    await flush()
    expect(controller.snapshot.index).toBe(2)
    controller.previousHeading()
    await flush()
    expect(controller.snapshot.index).toBe(0)
    controller.previousHeading()
    controller.previous()
    await flush()
    expect(controller.snapshot.index).toBe(0)
    expect(engine.played[engine.played.length - 1]).toBe('H1')
  })

  it('jumping while paused resumes playback', async () => {
    const engine = fakeEngine()
    const { controller } = setup([sentence('A'), sentence('B')], engine)
    controller.start()
    await flush()
    controller.pause()
    controller.start(1)
    await flush()
    expect(engine.resume).toHaveBeenCalled()
    expect(engine.played).toEqual(['A', 'B'])
  })

  it('stops and clears the highlight', async () => {
    const engine = fakeEngine()
    const { controller, highlighted } = setup([sentence('A')], engine)
    controller.start()
    await flush()
    controller.stop()
    await flush()
    expect(controller.snapshot.state).toBe('idle')
    expect(highlighted[highlighted.length - 1]).toBeNull()
    expect(engine.stop).toHaveBeenCalled()
  })

  it('switches engines and restarts the current sentence', async () => {
    const first = fakeEngine()
    const second = fakeEngine()
    const { controller } = setup([sentence('A'), sentence('B')], first)
    controller.setEngine(second)
    expect(second.played).toEqual([])
    controller.start()
    await flush()
    controller.setEngine(first)
    await flush()
    expect(first.played).toEqual(['A'])
    expect(second.played).toEqual(['A'])
  })

  it('replaces a failing engine when the failure handler offers one', async () => {
    const failing = fakeEngine({ fail: () => new SpeechError('silent-audio', 'silent') })
    const fallback = fakeEngine({ auto: true })
    const onEngineFailure = vi.fn(() => fallback)
    const { controller } = setup([sentence('A'), sentence('B')], failing, { onEngineFailure })
    controller.start()
    await flush()
    expect(onEngineFailure).toHaveBeenCalledWith(expect.objectContaining({ code: 'silent-audio' }))
    expect(fallback.played).toEqual(['A', 'B'])
    expect(controller.snapshot.state).toBe('ended')
  })

  it('stops with an error when no replacement is offered', async () => {
    const { controller, highlighted } = setup([sentence('A')], fakeEngine({ fail: () => new SpeechError('failed', 'Speech failed badly.') }), { onEngineFailure: () => null })
    controller.start()
    await flush()
    expect(controller.snapshot).toMatchObject({ state: 'error', error: 'Speech failed badly.' })
    expect(highlighted[highlighted.length - 1]).toBeNull()
    const plain = setup([sentence('A')], fakeEngine({ fail: () => new Error('') }))
    plain.controller.start()
    await flush()
    expect(plain.controller.snapshot.error).toBe('Speech failed.')
    controller.togglePause()
    await flush()
    expect(controller.snapshot.state).toBe('error')
  })

  it('ignores a stale run that finishes after a restart', async () => {
    let release: (() => void) | null = null
    const engine = fakeEngine({ auto: true })
    engine.prepare = vi.fn(() => new Promise<unknown>((resolve) => { release = () => resolve('x') }))
    const { controller } = setup([sentence('A', 'paragraph', 0, 100)], engine, { sleep: () => new Promise<void>((resolve) => setTimeout(resolve, 0)) })
    controller.start()
    await flush()
    controller.stop()
    release!()
    await flush()
    expect(engine.played).toEqual([])
    const failing = fakeEngine()
    let reject: ((error: Error) => void) | null = null
    failing.prepare = vi.fn(() => new Promise<unknown>((_resolve, fail) => { reject = fail }))
    const second = setup([sentence('A')], failing)
    second.controller.start()
    await flush()
    second.controller.stop()
    reject!(new Error('late'))
    await flush()
    expect(second.controller.snapshot.state).toBe('idle')
  })

  it('stops after play when restarted mid-sentence, and during pauses', async () => {
    const engine = fakeEngine()
    let wake: (() => void) | null = null
    const { controller } = setup([sentence('A', 'paragraph', 0, 100), sentence('B')], engine, { sleep: () => new Promise<void>((resolve) => { wake = resolve }) })
    controller.start()
    await flush()
    engine.finish()
    await flush()
    controller.stop()
    wake!()
    await flush()
    expect(engine.played).toEqual(['A'])
    const pausing = fakeEngine()
    const paused = setup([sentence('A', 'paragraph', 100)], pausing, { sleep: () => new Promise<void>((resolve) => { wake = resolve }) })
    paused.controller.start()
    await flush()
    paused.controller.pause()
    wake!()
    await flush()
    paused.controller.stop()
    await flush()
    expect(pausing.played).toEqual([])
  })

  it('aborts prepared sentences that a jump skips, and resumes the audio when stopped while paused', async () => {
    const engine = fakeEngine()
    const signals: AbortSignal[] = []
    engine.prepare = vi.fn(async (text: string, signal?: AbortSignal) => {
      signals.push(signal!)
      return text
    })
    const { controller } = setup(['A', 'B', 'C', 'D', 'E', 'F'].map((text) => sentence(text)), engine)
    controller.start(0)
    await flush()
    expect(signals).toHaveLength(3)
    controller.start(4)
    await flush()
    expect(signals.slice(0, 3).map((signal) => signal.aborted)).toEqual([true, true, true])
    expect(signals.slice(3).every((signal) => !signal.aborted)).toBe(true)
    controller.pause()
    controller.stop()
    expect(engine.resume).toHaveBeenCalledTimes(1)
    expect(signals.every((signal) => signal.aborted)).toBe(true)
    controller.stop()
    expect(engine.resume).toHaveBeenCalledTimes(1)
  })
})
