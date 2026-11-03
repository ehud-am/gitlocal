// Fills a README's Vizoalica view-counting pixel (a 1x1 image; a README cannot run scripts).
// The block sits between two markers and is empty in the repository. With no endpoint or website
// key it stays empty, so a README never shows a broken image and the repository holds no settings.
// See https://github.com/ehud-am/vizoalica/blob/main/docs/operations/pixel.md
//
// CLI: node packaging/npm/readme-pixel.mjs <file> <path>
//   Reads VIZOALICA_ENDPOINT and VIZOALICA_PIXEL_WEBSITE_KEY (falls back to VIZOALICA_WEBSITE_KEY).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PIXEL_START = '<!-- readme-pixel:start -->'
export const PIXEL_END = '<!-- readme-pixel:end -->'

const PATH_PATTERN = /^\/[A-Za-z0-9/_.-]{0,511}$/
const KEY_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

/** The Markdown image for `path`, or '' when the settings are incomplete or invalid. */
export function pixelMarkdown({ endpoint, websiteKey, path }) {
  const key = websiteKey?.trim()
  if (!endpoint || !key || !KEY_PATTERN.test(key) || !PATH_PATTERN.test(path ?? '')) return ''
  let origin
  try {
    const url = new URL(endpoint.trim())
    if (url.protocol !== 'https:') return ''
    origin = url.origin
  } catch {
    return ''
  }
  return `![](${origin}/v1/pixel.gif?website=${key}&path=${path})`
}

/** Replaces what is between the markers; text without both markers is returned unchanged. */
export function applyReadmePixel(text, settings) {
  const start = text.indexOf(PIXEL_START)
  const end = text.indexOf(PIXEL_END)
  if (start < 0 || end < start) return text
  const image = pixelMarkdown(settings)
  return `${text.slice(0, start + PIXEL_START.length)}${image ? `\n\n${image}\n\n` : '\n'}${text.slice(end)}`
}

/** Settings from the environment the workflows pass. */
export function settingsFromEnv(env, path) {
  return {
    endpoint: env.VIZOALICA_ENDPOINT,
    websiteKey: env.VIZOALICA_PIXEL_WEBSITE_KEY || env.VIZOALICA_WEBSITE_KEY,
    path,
  }
}

/** Fills the pixel block of `file` in place. Returns true when the file changed. */
export function fillReadmePixel(file, path, env = process.env) {
  const before = readFileSync(file, 'utf8')
  const after = applyReadmePixel(before, settingsFromEnv(env, path))
  if (after !== before) writeFileSync(file, after)
  return after !== before
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, path] = process.argv.slice(2)
  if (!file || !path) throw new Error('Usage: node packaging/npm/readme-pixel.mjs <file> <path>')
  console.log(fillReadmePixel(file, path) ? `${file}: pixel updated` : `${file}: unchanged`)
}
