import { describe, expect, it } from 'vitest'
import { safeHref, toRoman } from './text'

describe('toRoman', () => {
  it('writes lowercase numerals and keeps out-of-range values as digits', () => {
    expect(toRoman(4)).toBe('iv')
    expect(toRoman(1994)).toBe('mcmxciv')
    expect(toRoman(0)).toBe('0')
    expect(toRoman(4000)).toBe('4000')
  })
})

describe('safeHref', () => {
  it('keeps web and mail links only', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com')
    expect(safeHref(' mailto:a@b.c ')).toBe('mailto:a@b.c')
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('file:///etc/passwd')).toBeNull()
    expect(safeHref(null)).toBeNull()
  })
})
