// Turns displayed text into text that reads well aloud. Numbers, times and most dates are left to
// the speech engine, which already says them naturally.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const REPLACEMENTS: [RegExp, string | ((...args: string[]) => string)][] = [
  [/\p{Extended_Pictographic}️?/gu, ''],
  [/[•▪●◦‣■□➢►▶✓✔]/g, ' '],
  [/\bhttps?:\/\/(?:www\.)?([^\s/?#]+)[^\s]*/gi, (_match, host) => `link to ${host}`],
  [/\bv(\d+(?:\.\d+)+)\b/gi, (_match, version) => `version ${version}`],
  [/\b(\d{4})-(\d{2})-(\d{2})\b/g, (match, year, month, day) => {
    const monthIndex = Number(month) - 1
    const dayNumber = Number(day)
    if (monthIndex < 0 || monthIndex > 11 || dayNumber < 1 || dayNumber > 31) return match
    return `${MONTHS[monthIndex]} ${dayNumber}, ${year}`
  }],
  [/\be\.g\.(?=\s|,|$)/gi, 'for example'],
  [/\bi\.e\.(?=\s|,|$)/gi, 'that is'],
  [/\betc\./gi, 'et cetera'],
  [/\bvs\.(?=\s)/gi, 'versus'],
  [/\s&\s/g, ' and '],
  [/\*\*|__|`/g, ''],
]

export function normalizeForSpeech(text: string): string {
  let result = text
  for (const [pattern, replacement] of REPLACEMENTS) {
    result = typeof replacement === 'string' ? result.replace(pattern, replacement) : result.replace(pattern, replacement as (...args: string[]) => string)
  }
  return result.replace(/\s+/g, ' ').trim()
}

export function hasSpeakableText(text: string): boolean {
  return /[\p{L}\p{N}]/u.test(text)
}

// Headings are read as their own sentence and need an ending so the engine drops its pitch.
export function withTerminalPunctuation(text: string): string {
  return /[.!?:;]$/.test(text) ? text : `${text}.`
}
