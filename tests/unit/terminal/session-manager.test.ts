import { describe, it, expect, vi } from 'vitest'
import { createSessionManager } from '../../../src/terminal/session-manager.js'
import type { PtyLike, PtyFactory } from '../../../src/terminal/session-manager.js'

interface FakePty extends PtyLike {
  emitData(chunk: string): void
  emitExit(exitCode: number, signal?: number | null): void
  writes: string[]
  resizes: Array<{ cols: number; rows: number }>
  killed: boolean
}

function createFakePty(): FakePty {
  const dataCallbacks: Array<(data: string) => void> = []
  const exitCallbacks: Array<(event: { exitCode: number; signal?: number | null }) => void> = []
  const writes: string[] = []
  const resizes: Array<{ cols: number; rows: number }> = []
  let killed = false

  return {
    onData: (cb) => {
      dataCallbacks.push(cb)
    },
    onExit: (cb) => {
      exitCallbacks.push(cb)
    },
    write: (data) => {
      writes.push(data)
    },
    resize: (cols, rows) => {
      resizes.push({ cols, rows })
    },
    kill: () => {
      killed = true
    },
    emitData: (chunk) => {
      for (const cb of dataCallbacks) cb(chunk)
    },
    emitExit: (exitCode, signal = null) => {
      for (const cb of exitCallbacks) cb({ exitCode, signal })
    },
    writes,
    resizes,
    get killed() {
      return killed
    },
  }
}

function fakeFactory(pty: PtyLike): PtyFactory {
  return vi.fn(async () => pty)
}

describe('session-manager', () => {
  it('transitions starting -> running as the pty factory resolves', async () => {
    const pty = createFakePty()
    let resolveFactory: (value: PtyLike) => void = () => {}
    const factory: PtyFactory = () =>
      new Promise((resolve) => {
        resolveFactory = resolve
      })
    const manager = createSessionManager(factory, '/bin/sh')

    const createPromise = manager.createSession({ kind: 'regular', cwd: '/tmp' })
    // The session is inserted into the registry before the factory resolves, so 'starting'
    // is observable mid-flight — this is the behavior data-model.md and T013 require.
    await Promise.resolve()
    const [starting] = manager.listSessions()
    expect(starting?.status).toBe('starting')

    resolveFactory(pty)
    const result = await createPromise
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.session.status).toBe('running')
    expect(manager.listSessions()[0]?.status).toBe('running')
  })

  // FR-008/FR-009 (T036): a claude/codex tab is a shell session where the server types the
  // launch command for the user once the shell reports it's ready (its first output chunk).
  it('auto-launches the claude CLI once, triggered by the first pty output chunk', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'claude', cwd: '/tmp' })
    expect(result.ok).toBe(true)

    expect(pty.writes).toEqual([])
    pty.emitData('$ ')
    expect(pty.writes).toEqual(['claude\n'])

    pty.emitData('more output\n')
    expect(pty.writes).toEqual(['claude\n'])
  })

  it('auto-launches the codex CLI once, triggered by the first pty output chunk', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    await manager.createSession({ kind: 'codex', cwd: '/tmp' })

    pty.emitData('$ ')
    expect(pty.writes).toEqual(['codex\n'])
  })

  it('never auto-launches anything for a regular session', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    await manager.createSession({ kind: 'regular', cwd: '/tmp' })

    pty.emitData('$ ')
    pty.emitData('more output\n')
    expect(pty.writes).toEqual([])
  })

  it('flows pty output to subscribers and buffers it for late subscribers', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    pty.emitData('hello ')
    const onData = vi.fn()
    const onExit = vi.fn()
    const subscription = manager.subscribe(result.session.id, onData, onExit)
    expect(subscription?.bufferedOutput).toBe('hello ')

    pty.emitData('world')
    expect(onData).toHaveBeenCalledWith('world')
  })

  it('marks a session exited on pty exit and notifies exit listeners', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const onData = vi.fn()
    const onExit = vi.fn()
    manager.subscribe(result.session.id, onData, onExit)

    pty.emitExit(1, 15)
    expect(onExit).toHaveBeenCalledTimes(1)
    const session = manager.getSession(result.session.id)
    expect(session?.status).toBe('exited')
    expect(session?.exitInfo).toEqual({ code: 1, signal: '15' })
  })

  it('keeps an exited session registered while a listener is still attached, and removes it once unsubscribed', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const subscription = manager.subscribe(result.session.id, vi.fn(), vi.fn())
    pty.emitExit(0)
    expect(manager.getSession(result.session.id)).not.toBeNull()

    subscription?.unsubscribe()
    expect(manager.getSession(result.session.id)).toBeNull()
  })

  it('removes a session immediately on exit when nobody is subscribed', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    pty.emitExit(0)
    expect(manager.getSession(result.session.id)).toBeNull()
  })

  it('ignores a duplicate exit event once a session is already exited', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const onExit = vi.fn()
    manager.subscribe(result.session.id, vi.fn(), onExit)
    pty.emitExit(0)
    pty.emitExit(1)
    expect(onExit).toHaveBeenCalledTimes(1)
    expect(manager.getSession(result.session.id)?.exitInfo).toEqual({ code: 0, signal: null })
  })

  it('closeSession kills a running pty and marks it exited, and returns false for an unknown id', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // Keep a listener attached so the session stays inspectable after close, per
    // removeIfNoListeners()'s "only drop once nobody is subscribed" semantics.
    manager.subscribe(result.session.id, vi.fn(), vi.fn())

    expect(manager.closeSession('does-not-exist')).toBe(false)
    expect(manager.closeSession(result.session.id)).toBe(true)
    expect(pty.killed).toBe(true)
    expect(manager.getSession(result.session.id)?.status).toBe('exited')

    // Closing an already-exited session (pty still set, but status is neither 'running' nor
    // 'starting') must be a safe no-op rather than killing the pty a second time.
    expect(manager.closeSession(result.session.id)).toBe(true)
  })

  it('writeInput and resize forward to the pty only while running, and no-op otherwise', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(manager.writeInput(result.session.id, 'ls\n')).toBe(true)
    expect(manager.resize(result.session.id, 100, 40)).toBe(true)
    expect(pty.writes).toEqual(['ls\n'])
    expect(pty.resizes).toEqual([{ cols: 100, rows: 40 }])

    expect(manager.writeInput('missing', 'ls\n')).toBe(false)
    expect(manager.resize('missing', 100, 40)).toBe(false)

    pty.emitExit(0)
    expect(manager.writeInput(result.session.id, 'ls\n')).toBe(false)
    expect(manager.resize(result.session.id, 100, 40)).toBe(false)
  })

  it('subscribe returns null for an unknown session id', async () => {
    const manager = createSessionManager(fakeFactory(createFakePty()), '/bin/sh')
    expect(manager.subscribe('missing', vi.fn(), vi.fn())).toBeNull()
  })

  it('returns pty_unavailable and drops the session when the factory rejects', async () => {
    const factory: PtyFactory = vi.fn(async () => {
      throw new Error('spawn failed')
    })
    const manager = createSessionManager(factory, '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result).toEqual({
      ok: false,
      error: 'pty_unavailable',
      message: 'Failed to start a terminal session on this platform.',
    })
    expect(manager.listSessions()).toEqual([])
  })

  it('returns pty_unavailable without spawning when the platform is unsupported', async () => {
    const factory = fakeFactory(createFakePty())
    const manager = createSessionManager(factory, '/bin/sh')
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'aix', configurable: true })
    try {
      const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
      expect(result).toEqual({
        ok: false,
        error: 'pty_unavailable',
        message: 'Terminal sessions are not supported on this platform.',
      })
      expect(factory).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    }
  })

  it('truncates the buffered output once it exceeds the max buffer size', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const MAX_BUFFERED_OUTPUT_CHARS = 200_000
    pty.emitData('a'.repeat(MAX_BUFFERED_OUTPUT_CHARS))
    pty.emitData('b'.repeat(100))

    const subscription = manager.subscribe(result.session.id, vi.fn(), vi.fn())
    expect(subscription?.bufferedOutput.length).toBe(MAX_BUFFERED_OUTPUT_CHARS)
    expect(subscription?.bufferedOutput.endsWith('b'.repeat(100))).toBe(true)
    expect(subscription?.bufferedOutput.startsWith('a')).toBe(true)
  })

  it('falls back to the default shell command across platform and $SHELL combinations', async () => {
    const originalPlatform = process.platform
    const originalShell = process.env.SHELL
    try {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
      expect(() => createSessionManager(fakeFactory(createFakePty()))).not.toThrow()

      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
      process.env.SHELL = '/bin/zsh'
      expect(() => createSessionManager(fakeFactory(createFakePty()))).not.toThrow()

      delete process.env.SHELL
      expect(() => createSessionManager(fakeFactory(createFakePty()))).not.toThrow()
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
      if (originalShell === undefined) delete process.env.SHELL
      else process.env.SHELL = originalShell
    }
  })

  it('records a null exit code when the pty reports none', async () => {
    const pty = createFakePty()
    const manager = createSessionManager(fakeFactory(pty), '/bin/sh')
    const result = await manager.createSession({ kind: 'regular', cwd: '/tmp' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    manager.subscribe(result.session.id, vi.fn(), vi.fn())
    pty.emitExit(undefined as unknown as number)
    expect(manager.getSession(result.session.id)?.exitInfo).toEqual({ code: null, signal: null })
  })

  it('closeSession on a still-starting session marks it exited without killing a pty', async () => {
    let resolveFactory: (value: PtyLike) => void = () => {}
    const factory: PtyFactory = () =>
      new Promise((resolve) => {
        resolveFactory = resolve
      })
    const manager = createSessionManager(factory, '/bin/sh')

    const createPromise = manager.createSession({ kind: 'regular', cwd: '/tmp' })
    await Promise.resolve()
    const [starting] = manager.listSessions()
    expect(starting?.status).toBe('starting')
    // Keep a listener attached so the session stays inspectable after close, per
    // removeIfNoListeners()'s "only drop once nobody is subscribed" semantics.
    manager.subscribe(starting!.id, vi.fn(), vi.fn())

    expect(manager.closeSession(starting!.id)).toBe(true)
    expect(manager.getSession(starting!.id)?.status).toBe('exited')

    resolveFactory(createFakePty())
    await createPromise
  })

  it('lists multiple concurrent sessions independently', async () => {
    const manager = createSessionManager(fakeFactory(createFakePty()), '/bin/sh')
    const a = await manager.createSession({ kind: 'regular', cwd: '/tmp/a' })
    const b = await manager.createSession({ kind: 'claude', cwd: '/tmp/b' })
    expect(a.ok && b.ok).toBe(true)
    const ids = manager.listSessions().map((s) => s.id)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('supports 6+ concurrent sessions with no cross-talk between their I/O streams (SC-003)', async () => {
    const ptys = Array.from({ length: 6 }, () => createFakePty())
    let nextPty = 0
    const factory: PtyFactory = vi.fn(async () => ptys[nextPty++])
    const manager = createSessionManager(factory, '/bin/sh')

    const sessions = []
    for (let i = 0; i < ptys.length; i++) {
      const result = await manager.createSession({ kind: 'regular', cwd: `/tmp/${i}` })
      expect(result.ok).toBe(true)
      if (result.ok) sessions.push(result.session)
    }
    expect(new Set(sessions.map((s) => s.id)).size).toBe(6)

    const received: string[][] = sessions.map(() => [])
    const subscriptions = sessions.map((s, i) => manager.subscribe(s.id, (chunk) => received[i].push(chunk), vi.fn()))
    expect(subscriptions.every((sub) => sub !== null)).toBe(true)

    // Emit distinct output on each session's own pty and confirm it only ever reaches that
    // session's subscriber — never a sibling session's.
    ptys.forEach((pty, i) => pty.emitData(`output-from-session-${i}`))
    received.forEach((chunks, i) => expect(chunks).toEqual([`output-from-session-${i}`]))

    // Writing input to one session must not touch any other session's pty.
    expect(manager.writeInput(sessions[2].id, 'echo hi\n')).toBe(true)
    expect(ptys[2].writes).toEqual(['echo hi\n'])
    ptys.forEach((pty, i) => {
      if (i !== 2) expect(pty.writes).toEqual([])
    })

    // Closing one session must leave the others running and unaffected.
    expect(manager.closeSession(sessions[4].id)).toBe(true)
    expect(ptys[4].killed).toBe(true)
    expect(manager.getSession(sessions[4].id)?.status).toBe('exited')
    sessions.forEach((s, i) => {
      if (i !== 4) expect(manager.getSession(s.id)?.status).toBe('running')
    })
  })
})
