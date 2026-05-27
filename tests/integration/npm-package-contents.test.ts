import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type PackageJson = {
  files?: string[]
  scripts?: Record<string, string>
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

  it('uses a concise npm README during package packing without publishing packaging sources', () => {
    const root = resolve(new URL('../..', import.meta.url).pathname)
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')) as PackageJson
    const npmReadmePath = resolve(root, 'packaging/npm/README.md')
    const npmReadme = readFileSync(npmReadmePath, 'utf-8')

    expect(existsSync(resolve(root, 'packaging/npm/use-npm-readme.mjs'))).toBe(true)
    expect(packageJson.scripts?.prepack).toBe('node packaging/npm/use-npm-readme.mjs prepack')
    expect(packageJson.scripts?.postpack).toBe('node packaging/npm/use-npm-readme.mjs postpack')
    expect(npmReadme).toContain('npm install -g gitlocal')
    expect(npmReadme).toContain('npx gitlocal')
    expect(npmReadme).toContain('https://github.com/ehud-am/gitlocal#readme')
    expect(npmReadme).not.toContain('brew install --cask gitlocal')
  })

  it('keeps the GitHub README branded and explicit about unsigned macOS alpha builds', () => {
    const root = resolve(new URL('../..', import.meta.url).pathname)
    const githubReadme = readFileSync(resolve(root, 'README.md'), 'utf-8')

    expect(githubReadme).toContain('ui/public/gitlocal-logo.svg')
    expect(githubReadme).toContain('alpha native distribution and is not signed or notarized')
    expect(githubReadme).toContain('xattr -dr com.apple.quarantine /Applications/GitLocal.app')
    expect(githubReadme).toContain('Save repository-local `user.name`, `user.email`')
  })
})
