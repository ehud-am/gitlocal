// Wire-format types shared with the server. Re-exported (not redeclared) from the server's
// `src/types.ts` — type-only imports are erased at build time, so this adds no runtime
// dependency on server code and requires no bundler configuration changes.
import type {
  RepoInfo,
  GitUserSource,
  GitUserIdentity,
  RepoRemoteContext,
  GitContext,
  GitIdentityUpdateRequest,
  SshKeyDirectory,
  SshKeyCandidate,
  SshKeyListResponse,
  SshKeyValidationRequest,
  SshKeyValidationResponse,
  GitIdentityUpdateResponse,
  ViewerPathType,
  LocalGitState,
  LocalOpenMode,
  Branch,
  BranchSwitchResolution,
  BranchSwitchStatus,
  BranchSwitchRequest,
  BranchSwitchResponse,
  FileSyncState,
  RepoSyncMode,
  RepoSyncState,
  CommitChangesRequest,
  CommitChangesStatus,
  CommitChangesResponse,
  RemoteSyncStatus,
  RemoteSyncResponse,
  TreeNode,
  FileEncoding,
  FileContentType,
  FileContent,
  Commit,
  ManualFileMutationRequest,
  ManualFileOperation,
  ManualFileOperationStatus,
  ManualFileOperationResult,
  FolderCreateRequest,
  FolderDeleteRequest,
  FolderOperation,
  FolderOperationStatus,
  FolderOperationResult,
  FolderBrowseEntry,
  FolderBrowseRoot,
  FolderBrowseResponse,
  LocalActionResponse,
  RepoLocationResponse,
  StartupFolderSource,
  StartupFolderUpdateSource,
  StartupOpenSource,
  StartupOpenStatus,
  DefaultReaderPreferenceStatus,
  StartupFolderUpdateRequest,
  StartupFolderUpdateResponse,
  StartupOpenTarget,
  StartupOpenTargetResponse,
  DefaultReaderPreference,
  DefaultReaderPreferenceUpdateRequest,
  DefaultReaderPreferenceResponse,
  FolderCreateChildRequest,
  FolderInitRepositoryRequest,
  FolderCloneRepositoryRequest,
  GeneratedLocalVisibility,
  GeneratedLocalState,
  SearchContentKind,
  SearchTrackedMode,
  RepositoryStatusTone,
  KeyDocumentCategory,
  ChangedFileState,
  BackgroundChangeKind,
  ReadingPreference,
  RepositoryStatusSummary,
  RepositoryStatusSummaryPayload,
  ChangedFilesSummary,
  ChangedFileItem,
  KeyDocumentItem,
  RecentItem,
  BackgroundChangeNotice,
  SearchScope,
  RepoSummaryResponse,
  ChangedFilesResponse,
  NavigationHintsResponse,
  SearchMode,
  SearchMatchType,
  SearchResult,
  SearchResponse,
  SyncStatus,
} from '../../../src/types'

export type {
  RepoInfo,
  GitUserSource,
  GitUserIdentity,
  RepoRemoteContext,
  GitContext,
  GitIdentityUpdateRequest,
  SshKeyDirectory,
  SshKeyCandidate,
  SshKeyListResponse,
  SshKeyValidationRequest,
  SshKeyValidationResponse,
  GitIdentityUpdateResponse,
  ViewerPathType,
  LocalGitState,
  LocalOpenMode,
  Branch,
  BranchSwitchResolution,
  BranchSwitchStatus,
  BranchSwitchRequest,
  BranchSwitchResponse,
  FileSyncState,
  RepoSyncMode,
  RepoSyncState,
  CommitChangesRequest,
  CommitChangesStatus,
  CommitChangesResponse,
  RemoteSyncStatus,
  RemoteSyncResponse,
  TreeNode,
  FileEncoding,
  FileContentType,
  FileContent,
  Commit,
  ManualFileMutationRequest,
  ManualFileOperation,
  ManualFileOperationStatus,
  ManualFileOperationResult,
  FolderCreateRequest,
  FolderDeleteRequest,
  FolderOperation,
  FolderOperationStatus,
  FolderOperationResult,
  FolderBrowseEntry,
  FolderBrowseRoot,
  FolderBrowseResponse,
  LocalActionResponse,
  RepoLocationResponse,
  StartupFolderSource,
  StartupFolderUpdateSource,
  StartupOpenSource,
  StartupOpenStatus,
  DefaultReaderPreferenceStatus,
  StartupFolderUpdateRequest,
  StartupFolderUpdateResponse,
  StartupOpenTarget,
  StartupOpenTargetResponse,
  DefaultReaderPreference,
  DefaultReaderPreferenceUpdateRequest,
  DefaultReaderPreferenceResponse,
  FolderCreateChildRequest,
  FolderInitRepositoryRequest,
  FolderCloneRepositoryRequest,
  GeneratedLocalVisibility,
  GeneratedLocalState,
  SearchContentKind,
  SearchTrackedMode,
  RepositoryStatusTone,
  KeyDocumentCategory,
  ChangedFileState,
  BackgroundChangeKind,
  ReadingPreference,
  RepositoryStatusSummary,
  RepositoryStatusSummaryPayload,
  ChangedFilesSummary,
  ChangedFileItem,
  KeyDocumentItem,
  RecentItem,
  BackgroundChangeNotice,
  SearchScope,
  RepoSummaryResponse,
  ChangedFilesResponse,
  NavigationHintsResponse,
  SearchMode,
  SearchMatchType,
  SearchResult,
  SearchResponse,
  SyncStatus,
}

export type SearchPresentation = 'collapsed' | 'expanded'
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
  | 'default-reader-available'
  | 'default-reader-setup-succeeded'
  | 'default-reader-setup-failed'
  | 'open-file'
  | 'toggle-terminal'
  | 'toggle-dotfiles'
  | 'set-tracked-visibility'
export type NativeAppOutboundCommand = 'set-default-markdown-reader' | 'dotfiles-state' | 'tracked-visibility-state'
export interface NativeAppCommandEvent extends CustomEvent<{ command: NativeAppCommand; message?: string; path?: string }> {
  type: 'gitlocal:native-command'
}

export interface ViewerState {
  repoPath: string
  branch: string
  path: string
  pathType: ViewerPathType
  raw: boolean
  sidebarCollapsed: boolean
  hideDotfiles: boolean
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

export interface ApiError {
  error: string
  code: string
}

export interface StartupFolderResponse {
  path: string
  source: StartupFolderSource
  exists: boolean
  readable: boolean
  lastUsedPath: string
  fallbackReason: string
}

// Integrated terminal panel (feature 032). Server-side counterparts live in
// `src/terminal/types.ts`; kept in sync by hand since the server bundle and UI bundle are
// built separately and don't share a types module.

export type TerminalKind = 'regular' | 'claude' | 'codex'

export type TerminalSessionStatus = 'starting' | 'running' | 'exited' | 'unavailable'

export interface TerminalExitInfo {
  code: number | null
  signal: string | null
}

export interface TerminalSession {
  id: string
  kind: TerminalKind
  cwd: string
  status: TerminalSessionStatus
  createdAt: string
  exitInfo: TerminalExitInfo | null
}

export type TerminalContextType = 'file' | 'dir' | 'none'

export interface CreateTerminalSessionRequest {
  kind: TerminalKind
  contextPath?: string
  contextType?: TerminalContextType
}

export type TerminalUnavailableErrorCode = 'cli_not_found' | 'pty_unavailable' | 'session_limit_reached'

export interface TerminalUnavailableResponse {
  error: TerminalUnavailableErrorCode
  message: string
}

export interface TerminalCapabilities {
  available: boolean
  claudeCliFound: boolean
  codexCliFound: boolean
}

// Client-side UI state, per data-model.md — not mirrored server-side.
export interface TerminalTabRef {
  id: string
  kind: TerminalKind
  label: string
  cwd: string
  status: TerminalSessionStatus
  // Set only for a locally-synthesized `unavailable` tab (FR-010): the server never created a
  // session for it, so there's no real id/cwd to show alongside the "CLI not found" message.
  unavailableMessage?: string
}

export interface TerminalPanelState {
  visible: boolean
  tabs: TerminalTabRef[]
  activeTabId: string | null
}
