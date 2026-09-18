import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import type { TerminalSession } from '../../../src/terminal/types.js'
import type { CreateSessionResult } from '../../../src/terminal/session-manager.js'

// The real session-manager singleton spawns a pty via node-pty, a native module that isn't
// buildable in every environment these contract tests run in (e.g. this sandbox). These tests
// exist to verify HTTP contract behavior (routing, validation, status codes) — the pty lifecycle
// itself is already covered by tests/unit/terminal/session-manager.test.ts's injected-fake-pty
// tests, and a real shell is exercised separately by tests/integration/terminal.test.ts.
vi.mock('../../../src/terminal/session-manager.js', () => ({
  sessionManager: {
    createSession: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
    closeSession: vi.fn(),
    subscribe: vi.fn(),
    writeInput: vi.fn(),
    resize: vi.fn(),
  },
}))

const { sessionManager } = await import('../../../src/terminal/session-manager.js')
const { createApp } = await import('../../../src/server.js')

const mockCreateSession = sessionManager.createSession as unknown as ReturnType<typeof vi.fn>
const mockListSessions = sessionManager.listSessions as unknown as ReturnType<typeof vi.fn>
const mockCloseSession = sessionManager.closeSession as unknown as ReturnType<typeof vi.fn>

function makeGitRepo(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-test-'))
  spawnSync('git', ['init'], { cwd: dir })
  spawnSync('git', ['config', 'user.email', 'test@test.com'], { cwd: dir })
  spawnSync('git', ['config', 'user.name', 'Test'], { cwd: dir })
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

function fakeSession(overrides: Partial<TerminalSession> = {}): TerminalSession {
  return {
    id: 'session-1',
    cwd: '/tmp',
    status: 'running',
    createdAt: '2026-01-01T00:00:00.000Z',
    exitInfo: null,
    ...overrides,
  }
}

describe('terminal handlers', () => {
  let dir: string
  let cleanup: () => void

  beforeAll(() => {
    const repo = makeGitRepo()
    dir = repo.dir
    cleanup = repo.cleanup
  })

  afterAll(() => cleanup())

  beforeEach(() => {
    mockCreateSession.mockReset()
    mockListSessions.mockReset()
    mockCloseSession.mockReset()
  })

  it('creates a plain session and returns 201 with the session body', async () => {
    const session = fakeSession()
    mockCreateSession.mockResolvedValue({ ok: true, session } satisfies CreateSessionResult)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(session)
    expect(mockCreateSession).toHaveBeenCalledWith({ cwd: expect.any(String) })
  })

  // Old client builds may still send a `kind` field; the server must ignore it rather than error.
  it('ignores an unknown/legacy "kind" field sent by an old client build', async () => {
    const session = fakeSession()
    mockCreateSession.mockResolvedValue({ ok: true, session } satisfies CreateSessionResult)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'claude' }),
    })

    expect(res.status).toBe(201)
    expect(mockCreateSession).toHaveBeenCalledWith({ cwd: expect.any(String) })
  })

  it('rejects an invalid JSON body with 400', async () => {
    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    })

    expect(res.status).toBe(400)
    expect(mockCreateSession).not.toHaveBeenCalled()
  })

  it('returns 503 with the error/message body when the session manager cannot spawn a pty', async () => {
    mockCreateSession.mockResolvedValue({
      ok: false,
      error: 'pty_unavailable',
      message: 'Terminal sessions are not supported on this platform.',
    } satisfies CreateSessionResult)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'pty_unavailable',
      message: 'Terminal sessions are not supported on this platform.',
    })
  })

  // ST-001: session-manager can also reject with 'session_limit_reached', which the handler's
  // response type must include (it was previously missing from TerminalUnavailableErrorCode).
  it('returns 503 with a well-formed session_limit_reached body when the session manager is at capacity', async () => {
    mockCreateSession.mockResolvedValue({
      ok: false,
      error: 'session_limit_reached',
      message: 'Too many open terminal sessions (limit 20). Close one and try again.',
    } satisfies CreateSessionResult)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'session_limit_reached',
      message: 'Too many open terminal sessions (limit 20). Close one and try again.',
    })
  })

  it('lists sessions', async () => {
    const sessions = [fakeSession({ id: 'a' }), fakeSession({ id: 'b' })]
    mockListSessions.mockReturnValue(sessions)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions')

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(sessions)
  })

  it('closes an existing session and returns 204', async () => {
    mockCloseSession.mockReturnValue(true)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions/session-1', { method: 'DELETE' })

    expect(res.status).toBe(204)
    expect(mockCloseSession).toHaveBeenCalledWith('session-1')
  })

  it('returns 404 when closing a session that does not exist', async () => {
    mockCloseSession.mockReturnValue(false)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions/missing', { method: 'DELETE' })

    expect(res.status).toBe(404)
  })

  // FR-011: a new tab's cwd defaults to whatever folder/file is currently visible.
  describe('cwd resolution from contextPath/contextType (FR-011)', () => {
    it('defaults to the repository root when contextPath/contextType are omitted', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ cwd: realpathSync(dir) })
    })

    it('defaults to the repository root when contextType is "none"', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: 'src', contextType: 'none' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ cwd: realpathSync(dir) })
    })

    it('uses the visible directory itself when contextType is "dir"', async () => {
      mkdirSync(join(dir, 'src', 'nested'), { recursive: true })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: 'src/nested', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        cwd: realpathSync(join(dir, 'src', 'nested')),
      })
    })

    it("uses the visible file's parent directory when contextType is \"file\"", async () => {
      mkdirSync(join(dir, 'lib'), { recursive: true })
      writeFileSync(join(dir, 'lib', 'index.ts'), '')
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: 'lib/index.ts', contextType: 'file' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        cwd: realpathSync(join(dir, 'lib')),
      })
    })

    it('walks up to the nearest still-existing ancestor when the visible directory has since been deleted', async () => {
      mkdirSync(join(dir, 'ghost', 'gone'), { recursive: true })
      rmSync(join(dir, 'ghost', 'gone'), { recursive: true, force: true })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: 'ghost/gone', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        cwd: realpathSync(join(dir, 'ghost')),
      })
    })

    it('falls back to the repository root when the entire visible path has been deleted', async () => {
      mkdirSync(join(dir, 'vanished'), { recursive: true })
      rmSync(join(dir, 'vanished'), { recursive: true, force: true })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: 'vanished', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ cwd: realpathSync(dir) })
    })

    it('falls back to the repository root when contextPath attempts to escape the repository', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contextPath: '../../etc', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ cwd: realpathSync(dir) })
    })
  })

  describe('terminal panel dock-position preference', () => {
    // Captured once (not per-test) so restoring it at the end reflects the value from before
    // this describe block ran at all, not whatever a prior test's beforeEach last set it to.
    const previousPreferencePath = process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH
    let prefDir: string

    beforeEach(() => {
      prefDir = mkdtempSync(join(tmpdir(), 'gitlocal-terminal-pref-test-'))
      process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH = join(prefDir, 'terminal-panel-preference.json')
    })

    afterEach(() => {
      rmSync(prefDir, { recursive: true, force: true })
    })

    afterAll(() => {
      if (previousPreferencePath === undefined) {
        delete process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH
      } else {
        process.env.GITLOCAL_TERMINAL_PANEL_PREFERENCE_PATH = previousPreferencePath
      }
    })

    it('GET returns the default "right" position when no preference has been saved', async () => {
      const app = createApp(dir)
      const res = await app.request('/api/terminal-panel-preference')

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ dockPosition: 'right' })
    })

    it('PUT persists a valid dock position and GET then reflects it', async () => {
      const app = createApp(dir)
      const putRes = await app.request('/api/terminal-panel-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dockPosition: 'left' }),
      })
      expect(putRes.status).toBe(200)
      expect(await putRes.json()).toEqual({ dockPosition: 'left' })

      const getRes = await app.request('/api/terminal-panel-preference')
      expect(await getRes.json()).toEqual({ dockPosition: 'left' })
    })

    it('PUT rejects an invalid dockPosition with 400', async () => {
      const app = createApp(dir)
      const res = await app.request('/api/terminal-panel-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dockPosition: 'top' }),
      })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid dockPosition' })
    })

    it('PUT rejects an invalid JSON body with 400', async () => {
      const app = createApp(dir)
      const res = await app.request('/api/terminal-panel-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{not json',
      })

      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'Invalid dockPosition' })
    })
  })
})
