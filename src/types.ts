export interface RepoInfo {
  name: string
  path: string
  currentBranch: string
  isGitRepo: boolean
  pickerMode: boolean
}

export interface ViewerState {
  branch: string
  path: string
  pathType: 'file' | 'dir' | 'none'
  raw: boolean
  sidebarCollapsed: boolean
  searchMode: SearchMode
  searchQuery: string
  caseSensitive: boolean
}

export interface Branch {
  name: string
  isCurrent: boolean
}

export interface Commit {
  hash: string
  shortHash: string
  author: string
  date: string
  message: string
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf-8' | 'base64' | 'none'
  type: 'markdown' | 'text' | 'image' | 'binary'
  language: string
}

export interface PickRequest {
  path: string
}

export interface PickResponse {
  ok: boolean
  error: string
}

export interface PickBrowseEntry {
  name: string
  path: string
  isGitRepo: boolean
}

export interface PickBrowseRoot {
  name: string
  path: string
}

export interface PickBrowseResponse {
  currentPath: string
  parentPath: string | null
  homePath: string
  roots: PickBrowseRoot[]
  entries: PickBrowseEntry[]
  error: string
}

export type SearchMode = 'name' | 'content'

export interface SearchRequest {
  query: string
  branch?: string
  mode: SearchMode
  caseSensitive?: boolean
}

export interface SearchResult {
  path: string
  type: 'file' | 'dir'
  matchType: SearchMode
  snippet?: string
  line?: number
}

export interface SearchResponse {
  query: string
  branch: string
  mode: SearchMode
  caseSensitive: boolean
  results: SearchResult[]
}

export interface SyncStatus {
  branch: string
  repoPath: string
  workingTreeRevision: string
  treeStatus: 'unchanged' | 'changed' | 'invalid'
  fileStatus: 'unchanged' | 'changed' | 'deleted' | 'unavailable'
  currentPath: string
  resolvedPath: string
  currentPathType: 'file' | 'dir' | 'missing' | 'none'
  resolvedPathType: 'file' | 'dir' | 'missing' | 'none'
  statusMessage: string
  checkedAt: string
}
