import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

type PackageJson = {
  files?: string[]
}

describe('npm package contents', () => {
  it('keeps native app and Homebrew packaging artifacts out of the npm package allowlist', () => {
    const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')) as PackageJson

    expect(packageJson.files).toEqual(expect.arrayContaining(['dist', 'ui/dist']))
    expect(packageJson.files).not.toContain('native')
    expect(packageJson.files).not.toContain('packaging')
    expect(packageJson.files?.some((entry) => entry.startsWith('native/'))).toBe(false)
    expect(packageJson.files?.some((entry) => entry.startsWith('packaging/'))).toBe(false)
  })
})
