import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('README assets', () => {
  it('uses a stable GitLocal logo URL backed by a committed asset', () => {
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf-8')
    const match = readme.match(/<img src="https:\/\/raw\.githubusercontent\.com\/ehud-am\/gitlocal\/main\/([^"]+)" alt="GitLocal icon"/)

    expect(match?.[1]).toBe('ui/public/gitlocal-logo.svg')
    expect(existsSync(resolve(repoRoot, match?.[1] ?? ''))).toBe(true)
  })
})
