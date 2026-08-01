import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from './api'

function mockJsonResponse(payload: unknown, ok = true): Response {
  return {
    ok,
    statusText: ok ? 'OK' : 'Bad Request',
    json: async () => payload,
  } as Response
}

describe('api client viewer usability endpoints', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('requests repository summary for the selected branch', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      repoName: 'gitlocal',
      branch: 'main',
      statusSummary: {
        text: 'main is up to date with origin.',
        tone: 'neutral',
        remoteLabel: 'origin',
        syncState: 'up-to-date',
        localChangeCount: 0,
        untrackedChangeCount: 0,
      },
      keyDocuments: [],
      recentItems: [],
      visibility: { generatedLocalMode: 'hide', hiddenCount: 0 },
    }))

    const result = await api.getRepoSummary('main')

    expect(fetchMock).toHaveBeenCalledWith('/api/repo/summary?branch=main')
    expect(result.statusSummary.text).toContain('up to date')
  })

  it('requests changed files with generated/local inclusion when requested', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      branch: 'main',
      checkedAt: '2026-06-11T12:00:00.000Z',
      summary: { total: 1, modified: 1, added: 0, deleted: 0, renamed: 0, untracked: 0, remoteRelevant: 0 },
      items: [],
    }))

    await api.getChangedFiles('main', true)

    expect(fetchMock).toHaveBeenCalledWith('/api/repo/changes?branch=main&includeGeneratedLocal=true')
  })

  it('requests repo location for the selected path and branch', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      repositoryRootPath: '/repo/vendor/inner-repo',
      isRepositoryRoot: false,
      homeReadmePath: 'README.md',
      atFilesystemRoot: false,
    }))

    const result = await api.getRepoLocation('vendor/inner-repo/src', 'main')

    expect(fetchMock).toHaveBeenCalledWith('/api/repo/location?path=vendor%2Finner-repo%2Fsrc&branch=main')
    expect(result.repositoryRootPath).toBe('/repo/vendor/inner-repo')
    expect(result.homeReadmePath).toBe('README.md')
  })

  it('requests repo location with no query params when path and branch are omitted', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      repositoryRootPath: '',
      isRepositoryRoot: false,
      homeReadmePath: '',
      atFilesystemRoot: false,
    }))

    await api.getRepoLocation()

    expect(fetchMock).toHaveBeenCalledWith('/api/repo/location')
  })

  it('requests navigation hints with explicit recent and generated/local flags', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      keyDocuments: [],
      recentItems: [],
      changedItems: [],
    }))

    await api.getNavigationHints('feature', false, true)

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/repo/navigation-hints?branch=feature&includeRecent=false&includeGeneratedLocal=true',
    )
  })

  it('preserves legacy search params while adding scoped search options', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      query: 'markdown',
      branch: 'main',
      mode: 'both',
      caseSensitive: true,
      resultCount: 0,
      totalEstimate: 0,
      partial: false,
      results: [],
    }))

    await api.getSearchResults('markdown', 'main', 'both', true, {
      rootPath: 'docs/specs',
      contentKinds: 'markdown',
      trackedMode: 'include-generated-local',
      limit: 25,
      cursor: 'next',
    })

    const calledUrl = fetchMock.mock.calls[0][0] as string
    expect(calledUrl).toContain('/api/search?')
    expect(calledUrl).toContain('query=markdown')
    expect(calledUrl).toContain('branch=main')
    expect(calledUrl).toContain('mode=both')
    expect(calledUrl).toContain('caseSensitive=true')
    expect(calledUrl).toContain('rootPath=docs%2Fspecs')
    expect(calledUrl).toContain('contentKinds=markdown')
    expect(calledUrl).toContain('trackedMode=include-generated-local')
    expect(calledUrl).toContain('limit=25')
    expect(calledUrl).toContain('cursor=next')
  })

  it('returns sync responses with active notices and changed-file summaries', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      branch: 'main',
      repoPath: '/repo',
      workingTreeRevision: 'abc',
      treeStatus: 'unchanged',
      fileStatus: 'unchanged',
      currentPath: 'README.md',
      resolvedPath: 'README.md',
      currentPathType: 'file',
      resolvedPathType: 'file',
      pathSyncState: 'clean',
      trackedChangeCount: 1,
      untrackedChangeCount: 0,
      repoSync: {
        mode: 'up-to-date',
        aheadCount: 0,
        behindCount: 0,
        hasUpstream: true,
        upstreamRef: 'origin/main',
        remoteName: 'origin',
      },
      statusMessage: '',
      checkedAt: '2026-06-11T12:00:00.000Z',
      activePathNotice: {
        path: 'README.md',
        changeKind: 'refreshed',
        detectedAt: '2026-06-11T12:00:00.000Z',
        lastRefreshedAt: '2026-06-11T12:00:00.000Z',
        message: 'README.md changed outside GitLocal and was refreshed.',
        actionLabel: 'View changed files',
      },
      changedFilesSummary: {
        total: 1,
        modified: 1,
        added: 0,
        deleted: 0,
        renamed: 0,
        untracked: 0,
        remoteRelevant: 0,
      },
    }))

    const result = await api.getSyncStatus('README.md', 'main')

    expect(fetchMock).toHaveBeenCalledWith('/api/sync?path=README.md&branch=main')
    expect(result.activePathNotice?.changeKind).toBe('refreshed')
    expect(result.changedFilesSummary?.total).toBe(1)
  })

  it('requests startup-open and default-reader preference endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(mockJsonResponse({ target: null }))
      .mockResolvedValueOnce(mockJsonResponse({
        ok: true,
        preference: { status: 'not-asked', askedAt: '', answeredAt: '', message: '' },
        message: 'loaded',
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        ok: true,
        preference: {
          status: 'declined',
          askedAt: '2026-07-05T12:00:00.000Z',
          answeredAt: '2026-07-05T12:01:00.000Z',
          message: 'Not now.',
        },
        message: 'updated',
      }))

    await api.getStartupOpenTarget()
    await api.getDefaultReaderPreference()
    await api.updateDefaultReaderPreference({
      status: 'declined',
      askedAt: '2026-07-05T12:00:00.000Z',
      answeredAt: '2026-07-05T12:01:00.000Z',
      message: 'Not now.',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/startup-open-target')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/default-reader-preference')
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/default-reader-preference', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'declined',
        askedAt: '2026-07-05T12:00:00.000Z',
        answeredAt: '2026-07-05T12:01:00.000Z',
        message: 'Not now.',
      }),
    })
  })

  it('surfaces the structured error/code fields from a failed request instead of a generic message', async () => {
    fetchMock.mockResolvedValueOnce(mockJsonResponse({
      error: 'Permission was denied while accessing this path.',
      code: 'PERMISSION_DENIED',
    }, false))

    await expect(api.getInfo()).rejects.toEqual({
      error: 'Permission was denied while accessing this path.',
      code: 'PERMISSION_DENIED',
    })
  })

  it('falls back to a generic UNKNOWN error when a failed response has no parseable JSON body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('not JSON') },
    } as unknown as Response)

    await expect(api.getInfo()).rejects.toEqual({
      error: 'Internal Server Error',
      code: 'UNKNOWN',
    })
  })
})
