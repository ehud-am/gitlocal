export interface RepoInfo {
  name: string
  path: string
  currentBranch: string
  isGitRepo: boolean
  pickerMode: boolean
}

export interface Branch {
  name: string
  isCurrent: boolean
}

export interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
}

export interface FileContent {
  path: string
  content: string
  encoding: 'utf8' | 'base64'
  type: 'markdown' | 'text' | 'image' | 'binary'
  language: string
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
