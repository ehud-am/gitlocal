import { describe, expect, it } from 'vitest'
import { parseJsonTree } from './json-tree'

describe('parseJsonTree', () => {
  it('parses a root object with nested fields and an array', () => {
    const parsed = parseJsonTree(JSON.stringify({
      name: 'gitlocal',
      version: '0.9.0',
      private: true,
      scripts: { test: 'vitest' },
      keywords: ['git', 'viewer'],
    }))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.root.valueKind).toBe('object')
    expect(parsed.root.childCount).toBe(5)
    expect(parsed.root.children).toEqual([
      { key: 'name', valueKind: 'string', scalarValue: 'gitlocal' },
      { key: 'version', valueKind: 'string', scalarValue: '0.9.0' },
      { key: 'private', valueKind: 'boolean', scalarValue: 'true' },
      {
        key: 'scripts',
        valueKind: 'object',
        childCount: 1,
        children: [{ key: 'test', valueKind: 'string', scalarValue: 'vitest' }],
      },
      {
        key: 'keywords',
        valueKind: 'array',
        childCount: 2,
        children: [
          { key: '0', valueKind: 'string', scalarValue: 'git' },
          { key: '1', valueKind: 'string', scalarValue: 'viewer' },
        ],
      },
    ])
  })

  it('parses a root-level array of objects', () => {
    const parsed = parseJsonTree(JSON.stringify([{ id: 1 }, { id: 2 }]))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.root.valueKind).toBe('array')
    expect(parsed.root.childCount).toBe(2)
    expect(parsed.root.children?.[0]).toEqual({
      key: '0',
      valueKind: 'object',
      childCount: 1,
      children: [{ key: 'id', valueKind: 'number', scalarValue: '1' }],
    })
  })

  it.each([
    ['"hello"', 'string', 'hello'],
    ['42', 'number', '42'],
    ['true', 'boolean', 'true'],
    ['false', 'boolean', 'false'],
    ['null', 'null', 'null'],
  ])('parses a root-level bare scalar %s', (input, kind, value) => {
    const parsed = parseJsonTree(input)

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    expect(parsed.root).toEqual({ valueKind: kind, scalarValue: value })
  })

  it('parses an empty object and an empty array with zero child count', () => {
    const objectResult = parseJsonTree('{}')
    const arrayResult = parseJsonTree('[]')

    expect(objectResult.ok).toBe(true)
    expect(arrayResult.ok).toBe(true)
    if (!objectResult.ok || !arrayResult.ok) return

    expect(objectResult.root).toEqual({ valueKind: 'object', childCount: 0, children: [] })
    expect(arrayResult.root).toEqual({ valueKind: 'array', childCount: 0, children: [] })
  })

  it('parses deeply nested structures', () => {
    const parsed = parseJsonTree(JSON.stringify({ a: { b: { c: { d: ['e'] } } } }))

    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return

    const b = parsed.root.children?.[0].children?.[0]
    expect(b?.key).toBe('b')
    expect(b?.children?.[0].children?.[0]).toEqual({
      key: 'd',
      valueKind: 'array',
      childCount: 1,
      children: [{ key: '0', valueKind: 'string', scalarValue: 'e' }],
    })
  })

  it('reports a parse failure for an empty file', () => {
    const parsed = parseJsonTree('')

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.message).toContain('empty')
  })

  it('reports a parse failure for whitespace-only content', () => {
    const parsed = parseJsonTree('   \n  ')

    expect(parsed.ok).toBe(false)
  })

  it.each([
    ['trailing comma', '{"a": 1,}'],
    ['unquoted key', '{a: 1}'],
    ['truncated content', '{"a": 1'],
  ])('reports a parse failure for malformed JSON (%s)', (_label, input) => {
    const parsed = parseJsonTree(input)

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.message).toContain('valid JSON')
  })
})
