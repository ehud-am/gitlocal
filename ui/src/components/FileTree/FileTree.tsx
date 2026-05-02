import React, { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { TreeNode } from '../../types'
import FileTreeNode from './FileTreeNode'

interface Props {
  branch: string
  refreshToken: number
  selectedPath: string
  selectedPathType: 'file' | 'dir' | 'none'
  onSelect: (path: string, type: 'file' | 'dir', localOnly: boolean) => void
}

interface NodeState {
  expanded: boolean
  children?: TreeNode[]
  loading: boolean
  error: boolean
}

export default function FileTree({ branch, refreshToken, selectedPath, selectedPathType, onSelect }: Props) {
  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map())

  const { data: roots, isLoading, isError } = useQuery({
    queryKey: ['tree', '', branch, refreshToken],
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
    const expandedPaths = Array.from(nodeStates.entries())
      .filter(([, state]) => state.expanded)
      .map(([path]) => path)

    if (expandedPaths.length === 0) return

    setNodeStates((prev) => {
      const next = new Map(prev)
      for (const path of expandedPaths) {
        const current = next.get(path) as NodeState
        next.set(path, { ...current, loading: true, error: false })
      }
      return next
    })

    let cancelled = false

    for (const path of expandedPaths) {
      api.getTree(path, branch)
        .then((children) => {
          if (cancelled) return
          setNodeStates((current) => {
            const updated = new Map(current)
            const existing = updated.get(path) as NodeState
            updated.set(path, { ...existing, children, loading: false, error: false })
            return updated
          })
        })
        .catch(() => {
          if (cancelled) return
          setNodeStates((current) => {
            const updated = new Map(current)
            const existing = updated.get(path) as NodeState
            updated.set(path, { ...existing, loading: false, error: true })
            return updated
          })
        })
    }

    return () => {
      cancelled = true
    }
  }, [branch, refreshToken])

  useEffect(() => {
    if (!selectedPath) return
    const directories = selectedPath
      .split('/')
      .filter(Boolean)
      .slice(0, selectedPathType === 'dir' ? undefined : -1)
      .map((_, index, parts) => parts.slice(0, index + 1).join('/'))

    void directories.reduce<Promise<void>>(async (previous, dirPath) => {
      await previous
      const current = nodeStates.get(dirPath)
      if (current?.expanded || current?.children || current?.error) return

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
  }, [selectedPath, selectedPathType, branch, nodeStates])

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
              isSelected={selectedPath === node.path}
              depth={depth}
              onClick={() => {
                if (node.type === 'dir') {
                  onSelect(node.path, 'dir', Boolean(node.localOnly))
                  toggleDir(node)
                } else {
                  onSelect(node.path, 'file', Boolean(node.localOnly))
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
