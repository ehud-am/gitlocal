import { beforeEach, describe, expect, it, vi } from 'vitest'
import { terminalApi } from './terminalApi'

function mockJsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    statusText: ok ? 'OK' : 'Bad Request',
    json: async () => payload,
  } as Response
}

describe('terminalApi.createSession', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('sends the contextPath/contextType for a new tab opened from a nested folder view (FR-011, T042)', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        id: 'session-1',
        kind: 'regular',
        cwd: '/repo/src/nested',
        status: 'running',
        createdAt: '2026-01-01T00:00:00.000Z',
        exitInfo: null,
      }),
    )

    await terminalApi.createSession({ kind: 'regular', contextPath: 'src/nested', contextType: 'dir' })

    expect(fetchMock).toHaveBeenCalledWith('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'regular', contextPath: 'src/nested', contextType: 'dir' }),
    })
  })

  it('sends the contextPath/contextType for a new tab opened from a nested file view (FR-011, T042)', async () => {
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        id: 'session-2',
        kind: 'regular',
        cwd: '/repo/lib',
        status: 'running',
        createdAt: '2026-01-01T00:00:00.000Z',
        exitInfo: null,
      }),
    )

    await terminalApi.createSession({ kind: 'regular', contextPath: 'lib/util.ts', contextType: 'file' })

    expect(fetchMock).toHaveBeenCalledWith('/api/terminal/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'regular', contextPath: 'lib/util.ts', contextType: 'file' }),
    })
  })
})
