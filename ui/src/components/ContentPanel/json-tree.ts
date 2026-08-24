type JsonValueKind = 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'

export interface JsonTreeNode {
  key?: string
  valueKind: JsonValueKind
  scalarValue?: string
  children?: JsonTreeNode[]
  childCount?: number
}

interface ParsedJsonTree {
  ok: true
  root: JsonTreeNode
}

interface ParsedJsonFailure {
  ok: false
  message: string
}

export type ParsedJson = ParsedJsonTree | ParsedJsonFailure

function valueKindOf(value: unknown): JsonValueKind {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const type = typeof value
  if (type === 'object') return 'object'
  if (type === 'string') return 'string'
  if (type === 'number') return 'number'
  if (type === 'boolean') return 'boolean'
  /* v8 ignore next */
  return 'null'
}

function scalarValueOf(value: unknown, kind: JsonValueKind): string | undefined {
  if (kind === 'string') return value as string
  if (kind === 'number') return String(value)
  if (kind === 'boolean') return value ? 'true' : 'false'
  if (kind === 'null') return 'null'
  return undefined
}

function buildNode(value: unknown, key?: string): JsonTreeNode {
  const valueKind = valueKindOf(value)

  if (valueKind === 'array') {
    const items = value as unknown[]
    return {
      ...(key !== undefined ? { key } : {}),
      valueKind,
      childCount: items.length,
      children: items.map((item, index) => buildNode(item, String(index))),
    }
  }

  if (valueKind === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return {
      ...(key !== undefined ? { key } : {}),
      valueKind,
      childCount: entries.length,
      children: entries.map(([childKey, childValue]) => buildNode(childValue, childKey)),
    }
  }

  return {
    ...(key !== undefined ? { key } : {}),
    valueKind,
    scalarValue: scalarValueOf(value, valueKind),
  }
}

export function parseJsonTree(content: string): ParsedJson {
  if (!content.trim()) {
    return { ok: false, message: 'This file is empty.' }
  }

  try {
    const value = JSON.parse(content) as unknown
    return { ok: true, root: buildNode(value) }
  } catch {
    return { ok: false, message: 'This file could not be parsed as valid JSON.' }
  }
}
