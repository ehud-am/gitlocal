import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
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
