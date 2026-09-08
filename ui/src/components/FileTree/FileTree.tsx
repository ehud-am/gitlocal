import React, { useState, useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import type { GeneratedLocalVisibility, TreeNode } from '../../types'
import FileTreeNode from './FileTreeNode'
import { resolveGeneratedLocalState } from './tree-node-state'

interface Props {
  branch: string
  refreshToken: number
  selectedPath: string
  selectedPathType: 'file' | 'dir' | 'none'
  isGitRepo?: boolean
  generatedLocalVisibility?: GeneratedLocalVisibility
  hideDotfiles?: boolean
  onSelect: (path: string, type: 'file' | 'dir', localOnly: boolean) => void
}

interface NodeState {
  expanded: boolean
  children?: TreeNode[]
  loading: boolean
  error: boolean
}

function isTrackedNode(node: TreeNode): boolean {
  return resolveGeneratedLocalState(node) === 'tracked'
}

// Tracked-vs-generated/local visibility is a git-tracking concept — outside a repository
// nothing is ever git-tracked, so applying it there would hide every node regardless of the
// folder's actual content. A plain OS folder should just show its files and folders like an
// ordinary folder browser, not be filtered through repo-review semantics.
function filterNodes(nodes: TreeNode[], visibility: GeneratedLocalVisibility, activePath: string, isGitRepo: boolean): TreeNode[] {
  if (!isGitRepo || visibility === 'show') return nodes
  return nodes.filter((node) => {
    const activeException = Boolean(activePath && (node.path === activePath || activePath.startsWith(`${node.path}/`) || node.path.startsWith(`${activePath}/`)))
    const tracked = isTrackedNode(node)
    if (visibility === 'only') return !tracked || activeException
    return tracked || activeException
  })
}

function filterDotfiles(nodes: TreeNode[], showDotfiles: boolean, activePath: string): TreeNode[] {
  if (showDotfiles) return nodes
  return nodes.filter((node) => {
    const activeException = Boolean(activePath && (node.path === activePath || activePath.startsWith(`${node.path}/`)))
    return !node.name.startsWith('.') || activeException
  })
}

export default function FileTree({
  branch,
  refreshToken,
  selectedPath,
  selectedPathType,
  isGitRepo = false,
  generatedLocalVisibility = 'show',
  hideDotfiles = false,
  onSelect,
}: Props) {
  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map())
  const [focusedPath, setFocusedPath] = useState<string | null>(null)
  const nodeElements = useRef<Map<string, HTMLDivElement>>(new Map())
  const visibleOrder = useRef<string[]>([])
  const parentOf = useRef<Map<string, string>>(new Map())
  // Mirrors nodeStates for callbacks/effects below that only need to read the *current* value at
  // call time (not react to every change) — keeps toggleDir and the two effects below from being
  // torn down and rebuilt on every expand/collapse/fetch, which nodeStates itself changes on.
  const nodeStatesRef = useRef(nodeStates)
  useEffect(() => {
    nodeStatesRef.current = nodeStates
  }, [nodeStates])

  const { data: roots, isLoading, isError } = useQuery({
    queryKey: ['tree', '', branch, refreshToken],
    queryFn: () => api.getTree('', branch),
  })

  const toggleDir = useCallback(async (node: TreeNode) => {
    const current = nodeStatesRef.current.get(node.path)
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
  }, [branch])

  useEffect(() => {
    const expandedPaths = Array.from(nodeStatesRef.current.entries())
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
      const current = nodeStatesRef.current.get(dirPath)
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
    // nodeStates intentionally omitted: the body reads nodeStatesRef.current, not this reactive value
  }, [selectedPath, selectedPathType, branch])

  const activateNode = useCallback((node: TreeNode) => {
    if (node.type === 'dir') {
      onSelect(node.path, 'dir', Boolean(node.localOnly))
      toggleDir(node)
    } else {
      onSelect(node.path, 'file', Boolean(node.localOnly))
    }
  }, [onSelect, toggleDir])

  const focusPath = useCallback((path: string) => {
    setFocusedPath(path)
    nodeElements.current.get(path)?.focus()
  }, [])

  const handleKeyDown = useCallback((node: TreeNode, event: KeyboardEvent<HTMLDivElement>) => {
    const order = visibleOrder.current
    const index = order.indexOf(node.path)

    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        const next = order[index + 1]
        if (next) focusPath(next)
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        const prev = order[index - 1]
        if (prev) focusPath(prev)
        break
      }
      case 'ArrowRight': {
        event.preventDefault()
        if (node.type === 'dir') {
          const state = nodeStates.get(node.path)
          if (!state?.expanded) {
            void toggleDir(node)
            break
          }
        }
        const next = order[index + 1]
        if (next && parentOf.current.get(next) === node.path) focusPath(next)
        break
      }
      case 'ArrowLeft': {
        event.preventDefault()
        if (node.type === 'dir' && nodeStates.get(node.path)?.expanded) {
          void toggleDir(node)
          break
        }
        const parentPath = parentOf.current.get(node.path)
        if (parentPath) focusPath(parentPath)
        break
      }
      case 'Enter':
      case ' ': {
        event.preventDefault()
        activateNode(node)
        break
      }
      default:
        break
    }
  }, [activateNode, focusPath, nodeStates, toggleDir])

  // Walk the same filtering/expansion logic used for rendering to compute the
  // flat, in-order list of currently visible node paths (and their parents),
  // ahead of the actual JSX render pass. This backs roving tabindex + arrow-key
  // navigation and must reflect exactly what's on screen (collapsed subtrees excluded).
  // Memoized so this tree walk only reruns when the visible set can actually
  // change, instead of duplicating renderNodes' filtering work on every render.
  const visibleOrderState = useMemo(() => {
    const order: string[] = []
    const parents = new Map<string, string>()

    const walk = (nodes: TreeNode[], ancestorPaths = new Set<string>(), parentPath?: string): void => {
      for (const node of filterDotfiles(filterNodes(nodes, generatedLocalVisibility, selectedPath, isGitRepo), !hideDotfiles, selectedPath)) {
        if (ancestorPaths.has(node.path)) continue
        order.push(node.path)
        if (parentPath) parents.set(node.path, parentPath)

        const state = nodeStates.get(node.path)
        if (node.type === 'dir' && state?.expanded && state.children) {
          const childAncestorPaths = new Set(ancestorPaths)
          childAncestorPaths.add(node.path)
          walk(state.children, childAncestorPaths, node.path)
        }
      }
    }

    if (roots) walk(roots)
    return { order, parents }
  }, [roots, nodeStates, generatedLocalVisibility, hideDotfiles, selectedPath, isGitRepo])

  visibleOrder.current = visibleOrderState.order
  parentOf.current = visibleOrderState.parents
  const rovingTargetPath = focusedPath && visibleOrder.current.includes(focusedPath) ? focusedPath : visibleOrder.current[0]

  const renderNodes = useCallback((nodes: TreeNode[], depth: number, ancestorPaths = new Set<string>()): React.ReactNode => (
    <>
      {filterDotfiles(filterNodes(nodes, generatedLocalVisibility, selectedPath, isGitRepo), !hideDotfiles, selectedPath)
        .filter((node) => !ancestorPaths.has(node.path))
        .map(node => {
        const state = nodeStates.get(node.path)
        const isExpanded = state?.expanded ?? false
        const childAncestorPaths = new Set(ancestorPaths)
        childAncestorPaths.add(node.path)

        return (
          <React.Fragment key={node.path}>
            <FileTreeNode
              node={node}
              isExpanded={isExpanded}
              isSelected={selectedPath === node.path}
              depth={depth}
              showLocalOnly={isGitRepo}
              onClick={() => {
                setFocusedPath(node.path)
                activateNode(node)
              }}
              tabIndex={rovingTargetPath === node.path ? 0 : -1}
              onFocus={() => setFocusedPath(node.path)}
              onKeyDown={(event) => handleKeyDown(node, event)}
              nodeRef={(el) => {
                if (el) nodeElements.current.set(node.path, el)
                else nodeElements.current.delete(node.path)
              }}
            />
            {node.type === 'dir' && (isExpanded || state?.error) && (
              <div className="file-tree-children">
                {state?.loading && (
                  <div style={{ paddingLeft: `${8 + (depth + 1) * 16}px`, color: '#768390', fontSize: 12 }}>
                    Loading...
                  </div>
                )}
                {state?.error && (
                  <div style={{ paddingLeft: `${8 + (depth + 1) * 16}px`, color: '#cf222e', fontSize: 12 }}>
                    Failed to load — click to retry
                  </div>
                )}
                {state?.children && renderNodes(state.children, depth + 1, childAncestorPaths)}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </>
  ), [generatedLocalVisibility, selectedPath, hideDotfiles, nodeStates, isGitRepo, rovingTargetPath, activateNode, handleKeyDown])

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
    <div className="file-tree-shell">
      <div className="file-tree" role="tree" aria-label="Repository files">
        {roots && renderNodes(roots, 0)}
      </div>
    </div>
  )
}
