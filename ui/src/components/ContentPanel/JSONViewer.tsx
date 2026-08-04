import { useState } from 'react'
import type { JsonTreeNode } from './json-tree'

interface Props {
  root: JsonTreeNode
}

function isContainer(node: JsonTreeNode): boolean {
  return node.valueKind === 'object' || node.valueKind === 'array'
}

function containerLabel(node: JsonTreeNode): string {
  if (node.valueKind === 'array') return `Array(${node.childCount ?? 0})`
  return `Object(${node.childCount ?? 0})`
}

function NodeRow({ node, isArrayItem }: { node: JsonTreeNode; isArrayItem: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = isContainer(node)
  const isEmpty = hasChildren && (node.childCount ?? 0) === 0

  return (
    <li className={`json-tree-entry json-tree-entry-${node.valueKind}`}>
      <div className="json-tree-row">
        {hasChildren && !isEmpty ? (
          <button
            type="button"
            className="json-tree-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        ) : (
          <span className="json-tree-toggle-spacer" aria-hidden="true" />
        )}
        {node.key !== undefined && !isArrayItem ? (
          <span className="json-tree-key">{node.key}</span>
        ) : null}
        {node.key !== undefined && isArrayItem ? (
          <span className="json-tree-index">{node.key}</span>
        ) : null}
        {hasChildren ? (
          <span className="json-tree-type-badge">
            {isEmpty ? `${containerLabel(node)} (empty)` : containerLabel(node)}
          </span>
        ) : (
          <span className="json-tree-value">{node.scalarValue}</span>
        )}
      </div>
      {hasChildren && !isEmpty && !collapsed ? (
        <ul className="json-tree-children">
          {node.children?.map((child, index) => (
            <NodeRow
              key={`${child.key ?? index}:${child.valueKind}`}
              node={child}
              isArrayItem={node.valueKind === 'array'}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export default function JSONViewer({ root }: Props) {
  return (
    <div className="json-viewer" aria-label="JSON document structure">
      <ul className="json-tree-root">
        <NodeRow node={root} isArrayItem={false} />
      </ul>
    </div>
  )
}
