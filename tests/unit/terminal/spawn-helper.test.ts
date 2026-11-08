import { afterEach, describe, expect, it, vi } from 'vitest'
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ensureSpawnHelperExecutable, spawnHelperCandidates } from '../../../src/terminal/spawn-helper.js'

const fsControl = vi.hoisted(() => ({ failChmod: false }))
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    chmodSync: (...args: Parameters<typeof actual.chmodSync>) => {
      if (fsControl.failChmod) throw new Error('read-only')
      return actual.chmodSync(...args)
    },
  }
})

const tempDirs: string[] = []

function makePackage(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-pty-'))
  tempDirs.push(dir)
  return dir
}

function writeHelper(dir: string, mode: number): string {
  mkdirSync(dir, { recursive: true })
  const helper = join(dir, 'spawn-helper')
  writeFileSync(helper, '')
  chmodSync(helper, mode)
  return helper
}

afterEach(() => {
  fsControl.failChmod = false
  vi.restoreAllMocks()
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('spawnHelperCandidates', () => {
  it('lists no helpers on Windows', () => {
    expect(spawnHelperCandidates('/pkg', 'win32', 'x64')).toEqual([])
  })

  it('lists the build and platform prebuild helpers elsewhere', () => {
    expect(spawnHelperCandidates('/pkg', 'darwin', 'arm64')).toEqual([
      join('/pkg', 'build', 'Release', 'spawn-helper'),
      join('/pkg', 'build', 'Debug', 'spawn-helper'),
      join('/pkg', 'prebuilds', 'darwin-arm64', 'spawn-helper'),
    ])
  })
})

describe.skipIf(process.platform === 'win32')('ensureSpawnHelperExecutable', () => {
  it('restores the execute bit on a prebuilt helper shipped as 0644', () => {
    const pkg = makePackage()
    const helper = writeHelper(join(pkg, 'prebuilds', 'darwin-arm64'), 0o644)

    expect(ensureSpawnHelperExecutable(pkg, 'darwin', 'arm64')).toEqual([helper])
    expect(statSync(helper).mode & 0o777).toBe(0o755)
  })

  it('leaves helpers that are already executable alone and skips missing ones', () => {
    const pkg = makePackage()
    writeHelper(join(pkg, 'build', 'Release'), 0o755)

    expect(ensureSpawnHelperExecutable(pkg, 'darwin', 'x64')).toEqual([])
  })

  it('does nothing on Windows', () => {
    const pkg = makePackage()
    expect(ensureSpawnHelperExecutable(pkg, 'win32', 'x64')).toEqual([])
  })

  it('reports a helper it cannot change and keeps going', () => {
    const pkg = makePackage()
    writeHelper(join(pkg, 'build', 'Release'), 0o644)
    fsControl.failChmod = true
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(ensureSpawnHelperExecutable(pkg, 'linux', 'x64')).toEqual([])
    expect(errorSpy).toHaveBeenCalledOnce()
  })
})
