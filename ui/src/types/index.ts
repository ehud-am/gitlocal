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

export type GitUserSource = 'local'

export interface GitUserIdentity {
  name: string
  email: string
  source: GitUserSource
  sshKeyPath?: string
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
  sshKeyPath?: string
}

export interface SshKeyDirectory {
  path: string
  exists: boolean
  readable: boolean
}

export interface SshKeyCandidate {
  name: string
  path: string
}

export interface SshKeyListResponse {
  directory: SshKeyDirectory
  keys: SshKeyCandidate[]
  message: string
}

export interface SshKeyValidationRequest {
  sshKeyPath: string
}

export interface SshKeyValidationResponse {
  valid: boolean
  path: string
  message: string
}

export interface GitIdentityUpdateResponse {
  ok: boolean
  message: string
  user: GitUserIdentity | null
}

export type SearchPresentation = 'collapsed' | 'expanded'
export type SearchMode = 'name' | 'content' | 'both'
export type ViewerPathType = 'file' | 'dir' | 'none'
export type CopyRepresentation = 'raw' | 'rendered'
export type RenderedPdfOutputState = 'idle' | 'preparing' | 'ready' | 'saving' | 'saved' | 'failed'
export type MarkdownShareAction =
  | 'save-pdf'
  | 'system-share'
  | 'copy-rendered'
  | 'download-artifact'

export type NativeAppCommand =
  | 'find'
  | 'refresh'
  | 'undo'
  | 'redo'
  | 'select-all-panel'
  | 'print-markdown'
  | 'share-markdown'
export interface NativeAppCommandEvent extends CustomEvent<{ command: NativeAppCommand }> {
  type: 'gitlocal:native-command'
}
export type LocalGitState = 'repository-root' | 'inside-repository' | 'outside-repository'
export type LocalOpenMode = 'repository' | 'folder' | 'file' | 'blocked'

export interface ViewerState {
  repoPath: string
  branch: string
  path: string
  pathType: ViewerPathType
  raw: boolean
  sidebarCollapsed: boolean
  generatedLocalVisibility: GeneratedLocalVisibility
  searchRootPath: string
  searchContentKind: SearchContentKind
  searchTrackedMode: SearchTrackedMode
  searchLimit: number
  searchPresentation: SearchPresentation
  searchQuery: string
  searchMode: SearchMode
  searchCaseSensitive: boolean
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

export type BranchSwitchResolution = 'preview' | 'commit' | 'discard' | 'cancel'
export type BranchSwitchStatus =
  | 'switched'
  | 'confirmation-required'
  | 'blocked'
  | 'failed'
  | 'cancelled'

export interface BranchSwitchRequest {
  target: string
  resolution: BranchSwitchResolution
  commitMessage?: string
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

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  localOnly: boolean
  syncState?: FileSyncState
  generatedLocalState?: GeneratedLocalState
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

export interface Commit {
  hash: string
  shortHash: string
  author: string
  date: string
  message: string
}

export interface ApiError {
  error: string
  code: string
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

export interface FolderCreateRequest {
  parentPath: string
  name: string
}

export interface FolderDeleteRequest {
  path: string
  confirmationName: string
  previewFileCount: number
  previewFolderCount: number
  previewImpactToken: string
}

export type FolderOperation = 'create-folder' | 'preview-delete-folder' | 'delete-folder'
export type FolderOperationStatus = 'created' | 'previewed' | 'deleted' | 'blocked' | 'failed'

export interface FolderOperationResult {
  ok: boolean
  operation: FolderOperation
  path: string
  status: FolderOperationStatus
  message: string
  parentPath: string
  name?: string
  fileCount?: number
  folderCount?: number
  impactToken?: string
}

export interface FolderBrowseEntry {
  name: string
  path: string
  type: 'file' | 'dir'
  isGitRepo: boolean
  gitState?: LocalGitState
  openMode?: LocalOpenMode
  repositoryRootPath?: string
}

export interface FolderBrowseRoot {
  name: string
  path: string
}

export interface FolderBrowseResponse {
  currentPath: string
  parentPath: string | null
  homePath: string
  roots: FolderBrowseRoot[]
  entries: FolderBrowseEntry[]
  error: string
  isGitRepo?: boolean
  gitState?: LocalGitState
  openMode?: LocalOpenMode
  repositoryRootPath?: string
  canOpen?: boolean
  canCreateChild?: boolean
  canInitGit?: boolean
  canCloneIntoChild?: boolean
}

export interface LocalActionResponse {
  ok: boolean
  error: string
  path?: string
  rootPath?: string
  selectedPath?: string
  selectedPathType?: ViewerPathType
  gitState?: LocalGitState
  openMode?: LocalOpenMode
  repositoryRootPath?: string
  message?: string
}

export type StartupFolderSource = 'explicit' | 'last-used' | 'platform-default' | 'home-fallback'
export type StartupFolderUpdateSource = 'explicit-launch' | 'picker-open' | 'repo-open' | 'native-open'

export interface StartupFolderResponse {
  path: string
  source: StartupFolderSource
  exists: boolean
  readable: boolean
  platformDefaultPath: string
  lastUsedPath: string
  fallbackReason: string
}

export interface StartupFolderUpdateRequest {
  path: string
  source: StartupFolderUpdateSource
}

export interface StartupFolderUpdateResponse {
  ok: boolean
  path: string
  message: string
}

export interface FolderCreateChildRequest {
  parentPath: string
  name: string
}

export interface FolderInitRepositoryRequest {
  path: string
}

export interface FolderCloneRepositoryRequest {
  parentPath: string
  name: string
  repositoryUrl: string
}

export type GeneratedLocalVisibility = 'hide' | 'show' | 'only'
export type GeneratedLocalState = 'tracked' | 'local-only' | 'generated' | 'ignored' | 'unknown'
export type SearchContentKind = 'all' | 'markdown'
export type SearchTrackedMode = 'tracked-only' | 'include-generated-local' | 'generated-local-only'
export type RepositoryStatusTone = 'neutral' | 'info' | 'warning' | 'danger'
export type KeyDocumentCategory = 'README' | 'agent-instructions' | 'specs' | 'docs' | 'recent' | 'changed' | 'folder'
export type ChangedFileState =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'local-only'
  | 'local-committed'
  | 'remote-committed'
  | 'diverged'
  | 'clean'
  | 'unknown'
export type BackgroundChangeKind = 'refreshed' | 'modified' | 'deleted' | 'moved' | 'unavailable' | 'conflict'

export interface ReadingPreference {
  sidebarCollapsed: boolean
  generatedLocalVisibility: GeneratedLocalVisibility
  defaultSearchScope: SearchScope
}

export interface RepositoryStatusSummary {
  repoName: string
  branchLabel: string
  remoteLabel: string
  syncState: RepoSyncMode
  syncDescription: string
  localChangeCount: number
  untrackedChangeCount: number
  statusTone: RepositoryStatusTone
  detailBadges: Array<{ label: string; tone: RepositoryStatusTone }>
}

export interface RepositoryStatusSummaryPayload {
  text: string
  tone: RepositoryStatusTone
  remoteLabel: string
  syncState: RepoSyncMode
  localChangeCount: number
  untrackedChangeCount: number
}

export interface ChangedFilesSummary {
  total: number
  modified: number
  added: number
  deleted: number
  renamed: number
  untracked: number
  remoteRelevant: number
  tracked?: number
}

export interface ChangedFileItem {
  path: string
  name: string
  type: 'file' | 'folder' | 'missing' | 'unknown'
  changeState: ChangedFileState
  generatedLocalState: GeneratedLocalState
  sourcePath: string
  canOpen: boolean
  reviewHint: string
}

export interface KeyDocumentItem {
  path: string
  label: string
  category: KeyDocumentCategory
  reason: string
  available: boolean
}

export interface RecentItem {
  path: string
  type: 'file' | 'folder'
  label: string
  lastViewedAt?: string
  lastChangedAt?: string
  available: boolean
}

export interface BackgroundChangeNotice {
  path: string
  changeKind: BackgroundChangeKind
  detectedAt: string
  lastRefreshedAt: string
  message: string
  actionLabel?: string
}

export interface SearchScope {
  rootPath: string
  targets: SearchMode
  contentKinds: SearchContentKind
  trackedMode: SearchTrackedMode
  caseSensitive: boolean
  limit: number
  cursor?: string
}

export interface RepoSummaryResponse {
  repoName: string
  branch: string
  statusSummary: RepositoryStatusSummaryPayload
  keyDocuments: KeyDocumentItem[]
  recentItems: RecentItem[]
  visibility: {
    generatedLocalMode: GeneratedLocalVisibility
    hiddenCount: number
  }
}

export interface ChangedFilesResponse {
  branch: string
  checkedAt: string
  summary: ChangedFilesSummary
  items: ChangedFileItem[]
}

export interface NavigationHintsResponse {
  keyDocuments: KeyDocumentItem[]
  recentItems: RecentItem[]
  changedItems: ChangedFileItem[]
}

export interface SearchResult {
  path: string
  type: 'file' | 'dir'
  matchType: 'name' | 'content'
  snippet?: string
  line?: number
  localOnly: boolean
  changeState?: ChangedFileState
  generatedLocalState?: GeneratedLocalState
  scopeLabel?: string
}

export interface SearchResponse {
  query: string
  branch: string
  mode: SearchMode
  caseSensitive: boolean
  scope?: SearchScope
  resultCount?: number
  totalEstimate?: number
  partial?: boolean
  nextCursor?: string
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
  activePathNotice?: BackgroundChangeNotice
  changedFilesSummary?: ChangedFilesSummary
}
