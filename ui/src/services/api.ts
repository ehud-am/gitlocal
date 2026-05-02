import type {
  ApiError,
  Branch,
  BranchSwitchRequest,
  BranchSwitchResponse,
  CommitChangesRequest,
  CommitChangesResponse,
  Commit,
  FileContent,
  FolderCreateRequest,
  FolderDeleteRequest,
  FolderOperationResult,
  GitIdentityUpdateRequest,
  GitIdentityUpdateResponse,
  ManualFileMutationRequest,
  ManualFileOperationResult,
  PickCloneRequest,
  PickCreateFolderRequest,
  PickBrowseResponse,
  PickInitGitRequest,
  PickResponse,
  RepoInfo,
  RemoteSyncResponse,
  SearchMode,
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

async function branchSwitchRequest(payload: BranchSwitchRequest): Promise<BranchSwitchResponse> {
  const res = await fetch(BASE + '/api/branches/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(
    () =>
      ({
        ok: false,
        status: 'failed',
        message: res.statusText || 'Branch switch failed.',
      }) satisfies BranchSwitchResponse,
  )

  return body as BranchSwitchResponse
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

  createFolder: (payload: FolderCreateRequest): Promise<FolderOperationResult> =>
    mutate('/api/folder', 'POST', payload),

  getFolderDeletePreview: (path: string): Promise<FolderOperationResult> => {
    const params = new URLSearchParams({ path })
    return request(`/api/folder/delete-preview?${params.toString()}`)
  },

  deleteFolder: (payload: FolderDeleteRequest): Promise<FolderOperationResult> =>
    mutate('/api/folder', 'DELETE', payload),

  getCommits: (branch?: string, limit?: number): Promise<Commit[]> => {
    const params = new URLSearchParams()
    if (branch) params.set('branch', branch)
    if (limit !== undefined) params.set('limit', limit.toString())
    const qs = params.toString()
    return request(`/api/commits${qs ? '?' + qs : ''}`)
  },

  getReadme: (path?: string, branch?: string): Promise<{ path: string }> => {
    const params = new URLSearchParams()
    if (path) params.set('path', path)
    if (branch) params.set('branch', branch)
    const qs = params.toString()
    return request(`/api/readme${qs ? '?' + qs : ''}`)
  },

  switchBranch: (payload: BranchSwitchRequest): Promise<BranchSwitchResponse> =>
    branchSwitchRequest(payload),

  commitChanges: (payload: CommitChangesRequest): Promise<CommitChangesResponse> =>
    mutate('/api/git/commit', 'POST', payload),

  updateGitIdentity: (payload: GitIdentityUpdateRequest): Promise<GitIdentityUpdateResponse> =>
    mutate('/api/git/identity', 'PUT', payload),

  syncWithRemote: (): Promise<RemoteSyncResponse> =>
    mutate('/api/git/sync', 'POST', {}),

  getSearchResults: (
    query: string,
    branch?: string,
    mode: SearchMode = 'both',
    caseSensitive = false,
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({ query, mode })
    if (branch) params.set('branch', branch)
    if (caseSensitive) params.set('caseSensitive', 'true')
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

  submitPick: (path: string): Promise<PickResponse> =>
    mutate('/api/pick', 'POST', { path }),

  createPickFolder: (payload: PickCreateFolderRequest): Promise<PickResponse> =>
    mutate('/api/pick/create-folder', 'POST', payload),

  initPickGit: (payload: PickInitGitRequest): Promise<PickResponse> =>
    mutate('/api/pick/init', 'POST', payload),

  clonePickRepo: (payload: PickCloneRequest): Promise<PickResponse> =>
    mutate('/api/pick/clone', 'POST', payload),

  showParentPicker: (): Promise<PickResponse> =>
    mutate('/api/pick/parent', 'POST', {}),
}
