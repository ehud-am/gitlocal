import type { TreeNode } from '../../types'

interface Props {
  node: TreeNode
  isExpanded: boolean
  isSelected: boolean
  depth: number
  onClick: () => void
}

const FolderIcon = ({ open }: { open: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    {open ? (
      <path d="M1.75 4.75h12.5a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75H1.75A.75.75 0 0 1 1 11.5v-6a.75.75 0 0 1 .75-.75zM1 4.25A1.75 1.75 0 0 1 2.75 2.5H6l1 1.5h6.25A1.75 1.75 0 0 1 15 5.75v5.75A1.75 1.75 0 0 1 13.25 13H2.75A1.75 1.75 0 0 1 1 11.25V4.25z" fill="currentColor"/>
    ) : (
      <path d="M1.75 2.5h4.5l1 1.5H14.25c.966 0 1.75.784 1.75 1.75v7A1.75 1.75 0 0 1 14.25 14.5H1.75A1.75 1.75 0 0 1 0 12.75v-8.5C0 3.284.784 2.5 1.75 2.5z" fill="currentColor"/>
    )}
  </svg>
)

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 1.75A1.75 1.75 0 0 1 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25V1.75z" fill="currentColor"/>
  </svg>
)

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} aria-hidden="true">
    <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
)

export default function FileTreeNode({ node, isExpanded, isSelected, depth, onClick }: Props) {
  return (
    <div
      className={`file-tree-node${isSelected ? ' selected' : ''}`}
      style={{ paddingLeft: `${8 + depth * 16}px` }}
      onClick={onClick}
      role="treeitem"
      aria-expanded={node.type === 'dir' ? isExpanded : undefined}
      aria-selected={isSelected}
    >
      {node.type === 'dir' && <span className="text-[var(--muted-foreground)]"><ChevronIcon open={isExpanded} /></span>}
      <span className={node.type === 'dir' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}>
        {node.type === 'dir' ? <FolderIcon open={isExpanded} /> : <FileIcon />}
      </span>
      <div className="file-tree-node-label">
        <span className="file-tree-node-name" title={node.name}>{node.name}</span>
        {node.localOnly ? <span className="local-only-badge local-only-badge-compact">Local only</span> : null}
      </div>
    </div>
  )
}
