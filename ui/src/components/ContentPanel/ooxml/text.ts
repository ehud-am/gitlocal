// Text helpers shared by the OOXML previews.

const ROMAN: [number, string][] = [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]

// Lowercase Roman numerals for 1..3999; other values stay as digits.
export function toRoman(value: number): string {
  if (value <= 0 || value >= 4000) return String(value)
  let remaining = value
  let result = ''
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      result += numeral
      remaining -= amount
    }
  }
  return result
}

// Only links that leave the app for a web page or a mail client are followed; other schemes
// (file:, javascript:, ...) are dropped.
export function safeHref(target: string | null | undefined): string | null {
  if (!target) return null
  const trimmed = target.trim()
  return /^(https?:|mailto:)/i.test(trimmed) ? trimmed : null
}
