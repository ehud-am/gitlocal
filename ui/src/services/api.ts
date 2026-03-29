import type { Branch, Commit, FileContent, RepoInfo, TreeNode } from '../types'

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

export const api = {
  getInfo: (): Promise<RepoInfo> => request('/api/info'),

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

  getCommits: (branch?: string, limit?: number): Promise<Commit[]> => {
    const params = new URLSearchParams()
    if (branch) params.set('branch', branch)
    if (limit !== undefined) params.set('limit', limit.toString())
    const qs = params.toString()
    return request(`/api/commits${qs ? '?' + qs : ''}`)
  },

  getReadme: (): Promise<{ path: string }> => request('/api/readme'),

  submitPick: async (path: string): Promise<{ ok: boolean; error: string }> => {
    const res = await fetch('/api/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    return res.json()
  },
}
