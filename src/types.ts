export interface RepoInfo {
  name: string
  path: string
  currentBranch: string
  isGitRepo: boolean
  pickerMode: boolean
  version: string
  hasCommits: boolean
  rootEntryCount: number
}

export type ViewerPathType = 'file' | 'dir' | 'none'

export interface ViewerState {
  branch: string
  path: string
  pathType: ViewerPathType
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

export type FileEncoding = 'utf-8' | 'base64' | 'none'
export type FileContentType = 'markdown' | 'text' | 'image' | 'binary'

export interface FileContent {
  path: string
  content: string
  encoding: FileEncoding
  type: FileContentType
  language: string
  editable: boolean
  revisionToken: string | null
}

export interface ManualFileMutationRequest {
  path: string
  content?: string
  revisionToken?: string
}

export type ManualFileOperation = 'create' | 'update' | 'delete'
export type ManualFileOperationStatus = 'created' | 'updated' | 'deleted' | 'conflict' | 'blocked' | 'failed'

export interface ManualFileOperationResult {
  ok: boolean
  operation: ManualFileOperation
  path: string
  status: ManualFileOperationStatus
  message: string
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
