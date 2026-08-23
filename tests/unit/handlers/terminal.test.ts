import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
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

// Real filesystem PATH state (whether `claude`/`codex` happen to be installed on the machine
// running these tests) must never leak into the FR-010 pre-flight assertions below, so
// detectCapabilities() is mocked with a controllable default and overridden per test.
vi.mock('../../../src/terminal/cli-detection.js', () => ({
  detectCapabilities: vi.fn(() => ({ available: true, claudeCliFound: true, codexCliFound: true })),
}))

const { sessionManager } = await import('../../../src/terminal/session-manager.js')
const { detectCapabilities } = await import('../../../src/terminal/cli-detection.js')
const { createApp } = await import('../../../src/server.js')

const mockCreateSession = sessionManager.createSession as unknown as ReturnType<typeof vi.fn>
const mockListSessions = sessionManager.listSessions as unknown as ReturnType<typeof vi.fn>
const mockDetectCapabilities = detectCapabilities as unknown as ReturnType<typeof vi.fn>
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
    kind: 'regular',
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
    mockDetectCapabilities.mockReset()
    mockDetectCapabilities.mockReturnValue({ available: true, claudeCliFound: true, codexCliFound: true })
  })

  it('creates a session and returns 201 with the session body', async () => {
    const session = fakeSession()
    mockCreateSession.mockResolvedValue({ ok: true, session } satisfies CreateSessionResult)

    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'regular' }),
    })

    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(session)
    expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'regular', cwd: expect.any(String) })
  })

  it('rejects an invalid kind with 400 and never calls the session manager', async () => {
    const app = createApp(dir)
    const res = await app.request('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'bogus' }),
    })

    expect(res.status).toBe(400)
    expect(mockCreateSession).not.toHaveBeenCalled()
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
      body: JSON.stringify({ kind: 'regular' }),
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
      body: JSON.stringify({ kind: 'regular' }),
    })

    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      error: 'session_limit_reached',
      message: 'Too many open terminal sessions (limit 20). Close one and try again.',
    })
  })

  it('lists sessions', async () => {
    const sessions = [fakeSession({ id: 'a' }), fakeSession({ id: 'b', kind: 'claude' })]
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

  // FR-010: a claude/codex tab must fail fast with a clear message instead of spawning a shell
  // that would just report "command not found".
  describe('cli_not_found pre-flight (FR-010)', () => {
    it('returns 503 cli_not_found for a claude session when the claude CLI is missing, without spawning a pty', async () => {
      mockDetectCapabilities.mockReturnValue({ available: true, claudeCliFound: false, codexCliFound: true })

      const app = createApp(dir)
      const res = await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'claude' }),
      })

      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toBe('cli_not_found')
      expect(body.message).toMatch(/claude/i)
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('returns 503 cli_not_found for a codex session when the codex CLI is missing, without spawning a pty', async () => {
      mockDetectCapabilities.mockReturnValue({ available: true, claudeCliFound: true, codexCliFound: false })

      const app = createApp(dir)
      const res = await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'codex' }),
      })

      expect(res.status).toBe(503)
      const body = await res.json()
      expect(body.error).toBe('cli_not_found')
      expect(body.message).toMatch(/codex/i)
      expect(mockCreateSession).not.toHaveBeenCalled()
    })

    it('creates a claude session when only codex is missing', async () => {
      mockDetectCapabilities.mockReturnValue({ available: true, claudeCliFound: true, codexCliFound: false })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession({ kind: 'claude' }) } satisfies CreateSessionResult)

      const app = createApp(dir)
      const res = await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'claude' }),
      })

      expect(res.status).toBe(201)
      expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'claude', cwd: expect.any(String) })
    })

    it('never pre-flights CLI availability for a regular session', async () => {
      mockDetectCapabilities.mockReturnValue({ available: true, claudeCliFound: false, codexCliFound: false })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      const res = await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'regular' }),
      })

      expect(res.status).toBe(201)
    })
  })

  // FR-011: a new tab's cwd defaults to whatever folder/file is currently visible.
  describe('cwd resolution from contextPath/contextType (FR-011)', () => {
    it('defaults to the repository root when contextPath/contextType are omitted', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'regular' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'regular', cwd: realpathSync(dir) })
    })

    it('defaults to the repository root when contextType is "none"', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'regular', contextPath: 'src', contextType: 'none' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'regular', cwd: realpathSync(dir) })
    })

    it('uses the visible directory itself when contextType is "dir"', async () => {
      mkdirSync(join(dir, 'src', 'nested'), { recursive: true })
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'regular', contextPath: 'src/nested', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        kind: 'regular',
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
        body: JSON.stringify({ kind: 'regular', contextPath: 'lib/index.ts', contextType: 'file' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        kind: 'regular',
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
        body: JSON.stringify({ kind: 'regular', contextPath: 'ghost/gone', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({
        kind: 'regular',
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
        body: JSON.stringify({ kind: 'regular', contextPath: 'vanished', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'regular', cwd: realpathSync(dir) })
    })

    it('falls back to the repository root when contextPath attempts to escape the repository', async () => {
      mockCreateSession.mockResolvedValue({ ok: true, session: fakeSession() } satisfies CreateSessionResult)

      const app = createApp(dir)
      await app.request('/api/terminal/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'regular', contextPath: '../../etc', contextType: 'dir' }),
      })

      expect(mockCreateSession).toHaveBeenCalledWith({ kind: 'regular', cwd: realpathSync(dir) })
    })
  })

  it('reports terminal capabilities', async () => {
    const app = createApp(dir)
    const res = await app.request('/api/terminal/capabilities')

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({
      available: expect.any(Boolean),
      claudeCliFound: expect.any(Boolean),
      codexCliFound: expect.any(Boolean),
    })
  })
})
