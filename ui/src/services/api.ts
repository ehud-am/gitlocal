import type {
  ApiError,
  Branch,
  Commit,
  FileContent,
  ManualFileMutationRequest,
  ManualFileOperationResult,
  PickBrowseResponse,
  RepoInfo,
  SearchResponse,
  SyncStatus,
  TreeNode,
} from '../types'

const BASE = ''

async function request<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({
      error: res.statusText,
      code: 'UNKNOWN',
    }))
    throw err
  }
  return res.json() as Promise<T>
}

async function mutate<T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(
    () =>
      ({
        error: res.statusText,
        code: 'UNKNOWN',
      }) satisfies ApiError,
  )

  if (!res.ok) {
    throw payload
  }

  return payload as T
}

export const api = {
  getInfo: (): Promise<RepoInfo> => request<RepoInfo>('/api/info'),

  getBranches: (): Promise<Branch[]> => request('/api/branches'),

  getTree: (path: string, branch?: string): Promise<TreeNode[]> => {
    const params = new URLSearchParams()
    if (path) params.set('path', path)
    if (branch) params.set('branch', branch)
    const qs = params.toString()
    return request(`/api/tree${qs ? '?' + qs : ''}`)
  },

  getFile: (path: string, branch?: string, raw?: boolean): Promise<FileContent> => {
    const params = new URLSearchParams({ path })
    if (branch) params.set('branch', branch)
    if (raw) params.set('raw', 'true')
    return request(`/api/file?${params.toString()}`)
  },

  createFile: (payload: ManualFileMutationRequest): Promise<ManualFileOperationResult> =>
    mutate('/api/file', 'POST', payload),

  updateFile: (payload: ManualFileMutationRequest): Promise<ManualFileOperationResult> =>
    mutate('/api/file', 'PUT', payload),

  deleteFile: (payload: ManualFileMutationRequest): Promise<ManualFileOperationResult> =>
    mutate('/api/file', 'DELETE', payload),

  getCommits: (branch?: string, limit?: number): Promise<Commit[]> => {
    const params = new URLSearchParams()
    if (branch) params.set('branch', branch)
    if (limit !== undefined) params.set('limit', limit.toString())
    const qs = params.toString()
    return request(`/api/commits${qs ? '?' + qs : ''}`)
  },

  getReadme: (): Promise<{ path: string }> => request('/api/readme'),

  getSearchResults: (query: string, branch?: string): Promise<SearchResponse> => {
    const params = new URLSearchParams({ query, mode: 'name' })
    if (branch) params.set('branch', branch)
    return request(`/api/search?${params.toString()}`)
  },

  getSyncStatus: (path: string, branch?: string): Promise<SyncStatus> => {
    const params = new URLSearchParams()
    if (path) params.set('path', path)
    if (branch) params.set('branch', branch)
    return request(`/api/sync?${params.toString()}`)
  },

  getPickBrowse: (path?: string): Promise<PickBrowseResponse> => {
    const params = new URLSearchParams()
    if (path) params.set('path', path)
    const qs = params.toString()
    return request(`/api/pick/browse${qs ? '?' + qs : ''}`)
  },

  submitPick: async (path: string): Promise<{ ok: boolean; error: string }> => {
    const res = await fetch('/api/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    return res.json()
  },

  showParentPicker: async (): Promise<{ ok: boolean; error: string }> => {
    const res = await fetch('/api/pick/parent', {
      method: 'POST',
    })
    return res.json()
  },
}
