import type { TreeNode } from '../../types'

export function resolveGeneratedLocalState(node: TreeNode): NonNullable<TreeNode['generatedLocalState']> {
  return node.generatedLocalState ?? (node.localOnly ? 'local-only' : 'tracked')
}
