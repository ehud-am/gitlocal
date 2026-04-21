export interface RepoInfo {
  name: string
  path: string
  currentBranch: string
  isGitRepo: boolean
  pickerMode: boolean
  version: string
  hasCommits: boolean
  rootEntryCount: number
  gitContext?: GitContext | null
}

export type GitUserSource = 'local' | 'global' | 'mixed'

export interface GitUserIdentity {
  name: string
  email: string
  source: GitUserSource
}

export interface RepoRemoteContext {
  name: string
  fetchUrl: string
  webUrl: string
  selectionReason: string
}

export interface GitContext {
  user: GitUserIdentity | null
  remote: RepoRemoteContext | null
}

export interface GitIdentityUpdateRequest {
  name: string
  email: string
}

export interface GitIdentityUpdateResponse {
  ok: boolean
  message: string
  user: GitUserIdentity
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
  displayName?: string
  scope?: 'local' | 'remote'
  remoteName?: string
  trackingRef?: string
  hasLocalCheckout?: boolean
}

export type BranchSwitchResolution = 'preview' | 'commit' | 'discard' | 'delete-untracked' | 'cancel'
export type BranchSwitchStatus =
  | 'switched'
  | 'confirmation-required'
  | 'second-confirmation-required'
  | 'blocked'
  | 'failed'
  | 'cancelled'

export interface BranchSwitchRequest {
  target: string
  resolution: BranchSwitchResolution
  commitMessage?: string
  allowDeleteUntracked?: boolean
}

export interface BranchSwitchResponse {
  ok: boolean
  status: BranchSwitchStatus
  message: string
  currentBranch?: string
  createdTrackingBranch?: string
  trackedChangeCount?: number
  untrackedChangeCount?: number
  blockingPaths?: string[]
  suggestedCommitMessage?: string
}

export type FileSyncState =
  | 'clean'
  | 'local-uncommitted'
  | 'local-committed'
  | 'remote-committed'
  | 'diverged'

export type RepoSyncMode =
  | 'local-only'
  | 'up-to-date'
  | 'ahead'
  | 'behind'
  | 'diverged'
  | 'unavailable'

export interface RepoSyncState {
  mode: RepoSyncMode
  aheadCount: number
  behindCount: number
  hasUpstream: boolean
  upstreamRef: string
  remoteName: string
}

export interface CommitChangesRequest {
  message: string
}

export type CommitChangesStatus = 'committed' | 'blocked' | 'failed'

export interface CommitChangesResponse {
  ok: boolean
  status: CommitChangesStatus
  message: string
  commitHash?: string
  shortHash?: string
}

export type RemoteSyncStatus = 'pushed' | 'pulled' | 'up-to-date' | 'blocked' | 'failed'

export interface RemoteSyncResponse {
  ok: boolean
  status: RemoteSyncStatus
  message: string
  aheadCount?: number
  behindCount?: number
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
  localOnly: boolean
  syncState?: FileSyncState
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
  path?: string
  message?: string
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
  isGitRepo?: boolean
  canOpen?: boolean
  canCreateChild?: boolean
  canInitGit?: boolean
  canCloneIntoChild?: boolean
}

export interface PickCreateFolderRequest {
  parentPath: string
  name: string
}

export interface PickInitGitRequest {
  path: string
}

export interface PickCloneRequest {
  parentPath: string
  name: string
  repositoryUrl: string
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
  localOnly: boolean
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
  pathSyncState: FileSyncState | 'none'
  trackedChangeCount: number
  untrackedChangeCount: number
  repoSync: RepoSyncState
  statusMessage: string
  checkedAt: string
}
