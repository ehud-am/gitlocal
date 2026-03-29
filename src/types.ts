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
