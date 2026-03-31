import React, { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { TreeNode } from '../../types'
import FileTreeNode from './FileTreeNode'

interface Props {
  branch: string
  selectedFile: string
  onFileSelect: (path: string) => void
}

interface NodeState {
  expanded: boolean
  children?: TreeNode[]
  loading: boolean
  error: boolean
}

export default function FileTree({ branch, selectedFile, onFileSelect }: Props) {
  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map())

  const { data: roots, isLoading, isError } = useQuery({
    queryKey: ['tree', '', branch],
    queryFn: () => api.getTree('', branch),
  })

  const toggleDir = useCallback(async (node: TreeNode) => {
    const current = nodeStates.get(node.path)
    if (current?.expanded) {
      setNodeStates(prev => {
        const next = new Map(prev)
        next.set(node.path, { ...current, expanded: false })
        return next
      })
      return
    }
    if (current?.children) {
      setNodeStates(prev => {
        const next = new Map(prev)
        next.set(node.path, { ...current, expanded: true })
        return next
      })
      return
    }
    // Fetch children
    setNodeStates(prev => {
      const next = new Map(prev)
      next.set(node.path, { expanded: true, loading: true, error: false })
      return next
    })
    try {
      const children = await api.getTree(node.path, branch)
      setNodeStates(prev => {
        const next = new Map(prev)
        next.set(node.path, { expanded: true, loading: false, error: false, children })
        return next
      })
    } catch {
      setNodeStates(prev => {
        const next = new Map(prev)
        next.set(node.path, { expanded: false, loading: false, error: true })
        return next
      })
    }
  }, [nodeStates, branch])

  useEffect(() => {
    if (!selectedFile) return
    const directories = selectedFile
      .split('/')
      .filter(Boolean)
      .slice(0, -1)
      .map((_, index, parts) => parts.slice(0, index + 1).join('/'))

    void directories.reduce<Promise<void>>(async (previous, dirPath) => {
      await previous
      const current = nodeStates.get(dirPath)
      if (current?.expanded || current?.children) return

      setNodeStates((prev) => {
        const next = new Map(prev)
        next.set(dirPath, { expanded: true, loading: true, error: false })
        return next
      })

      try {
        const children = await api.getTree(dirPath, branch)
        setNodeStates((prev) => {
          const next = new Map(prev)
          next.set(dirPath, { expanded: true, loading: false, error: false, children })
          return next
        })
      } catch {
        setNodeStates((prev) => {
          const next = new Map(prev)
          next.set(dirPath, { expanded: false, loading: false, error: true })
          return next
        })
      }
    }, Promise.resolve())
  }, [selectedFile, branch, nodeStates])

  const renderNodes = (nodes: TreeNode[], depth: number): React.ReactNode => (
    <>
      {nodes.map(node => {
        const state = nodeStates.get(node.path)
        const isExpanded = state?.expanded ?? false
        return (
          <React.Fragment key={node.path}>
            <FileTreeNode
              node={node}
              isExpanded={isExpanded}
              isSelected={selectedFile === node.path}
              depth={depth}
              onClick={() => {
                if (node.type === 'dir') {
                  toggleDir(node)
                } else {
                  onFileSelect(node.path)
                }
              }}
            />
            {node.type === 'dir' && isExpanded && (
              <div className="file-tree-children">
                {state?.loading && (
                  <div style={{ paddingLeft: `${8 + (depth + 1) * 16}px`, color: '#768390', fontSize: 12 }}>
                    Loading...
                  </div>
                )}
                {state?.children && renderNodes(state.children, depth + 1)}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </>
  )

  if (isLoading) {
    return (
      <div className="file-tree-skeleton" aria-label="loading">
        {[60, 80, 50, 90, 70].map((w, i) => (
          <div key={i} className="skeleton-row" style={{ width: `${w}%` }} />
        ))}
      </div>
    )
  }

  if (isError) {
    return <div style={{ padding: '12px', color: '#cf222e', fontSize: 13 }}>Failed to load file tree</div>
  }

  return (
    <div className="file-tree" role="tree" aria-label="Repository files">
      {roots && renderNodes(roots, 0)}
    </div>
  )
}
