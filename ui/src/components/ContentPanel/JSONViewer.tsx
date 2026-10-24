import { useState, type ReactNode } from 'react'
import type { JsonTreeNode } from './json-tree'

interface Props {
  root: JsonTreeNode
}

function isContainer(node: JsonTreeNode): boolean {
  return node.valueKind === 'object' || node.valueKind === 'array'
}

function plural(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function containerSummary(node: JsonTreeNode): string {
  const count = node.childCount ?? 0
  return node.valueKind === 'array' ? plural(count, 'item') : plural(count, 'key')
}

// Scalars are shown as JSON source text, so strings keep their quotes and escapes.
function scalarText(node: JsonTreeNode): string {
  return node.valueKind === 'string' ? JSON.stringify(node.scalarValue) : node.scalarValue ?? ''
}

function Punct({ children }: { children: ReactNode }) {
  return <span className="json-code-punct">{children}</span>
}

// One JSON value laid out as formatted source (#114): `"key": value,` lines with syntax colors,
// braces on their own lines, and a gutter toggle that folds an object or array to `{ … }`.
function NodeLines({ node, isArrayItem, isLast }: { node: JsonTreeNode; isArrayItem: boolean; isLast: boolean }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = isContainer(node)
  const isEmpty = hasChildren && (node.childCount ?? 0) === 0
  const comma = isLast ? null : <Punct>,</Punct>
  const keyPart = node.key !== undefined && !isArrayItem ? (
    <>
      <span className="json-code-key">{JSON.stringify(node.key)}</span>
      <Punct>: </Punct>
    </>
  ) : null
  const spacer = <span className="json-code-toggle-spacer" aria-hidden="true" />

  if (!hasChildren) {
    return (
      <div className={`json-code-entry json-code-entry-${node.valueKind}`}>
        <div className="json-code-line">
          {spacer}
          {keyPart}
          <span className={`json-code-value json-code-${node.valueKind}`}>{scalarText(node)}</span>
          {comma}
        </div>
      </div>
    )
  }

  const open = node.valueKind === 'array' ? '[' : '{'
  const close = node.valueKind === 'array' ? ']' : '}'

  if (isEmpty) {
    return (
      <div className={`json-code-entry json-code-entry-${node.valueKind}`}>
        <div className="json-code-line">
          {spacer}
          {keyPart}
          <Punct>{open}{close}</Punct>
          {comma}
          <span className="json-code-summary">empty</span>
        </div>
      </div>
    )
  }

  const toggle = (
    <button
      type="button"
      className="json-code-toggle"
      aria-expanded={!collapsed}
      aria-label={collapsed ? 'Expand' : 'Collapse'}
      onClick={() => setCollapsed((value) => !value)}
    >
      {collapsed ? '▶' : '▼'}
    </button>
  )
  const summary = <span className="json-code-summary">{containerSummary(node)}</span>

  if (collapsed) {
    return (
      <div className={`json-code-entry json-code-entry-${node.valueKind}`}>
        <div className="json-code-line">
          {toggle}
          {keyPart}
          <Punct>{open}</Punct>
          <span className="json-code-ellipsis">…</span>
          <Punct>{close}</Punct>
          {comma}
          {summary}
        </div>
      </div>
    )
  }

  const children = node.children ?? []
  return (
    <div className={`json-code-entry json-code-entry-${node.valueKind}`}>
      <div className="json-code-line">
        {toggle}
        {keyPart}
        <Punct>{open}</Punct>
        {summary}
      </div>
      <div className="json-code-children">
        {children.map((child, index) => (
          <NodeLines
            key={`${child.key ?? index}:${child.valueKind}`}
            node={child}
            isArrayItem={node.valueKind === 'array'}
            isLast={index === children.length - 1}
          />
        ))}
      </div>
      <div className="json-code-line">
        {spacer}
        <Punct>{close}</Punct>
        {comma}
      </div>
    </div>
  )
}

export default function JSONViewer({ root }: Props) {
  return (
    <div className="json-viewer" aria-label="JSON document structure">
      <NodeLines node={root} isArrayItem={false} isLast />
    </div>
  )
}
