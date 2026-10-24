import { describe, expect, it } from 'vitest'
import { isAbsoluteInput, resolveGoToPath } from './go-to-path'

describe('isAbsoluteInput', () => {
  it('recognizes POSIX, home, Windows drive and UNC paths', () => {
    expect(isAbsoluteInput('/Users/me')).toBe(true)
    expect(isAbsoluteInput('~')).toBe(true)
    expect(isAbsoluteInput('~/notes')).toBe(true)
    expect(isAbsoluteInput('C:\\work')).toBe(true)
    expect(isAbsoluteInput('c:/work')).toBe(true)
    expect(isAbsoluteInput('\\\\server\\share')).toBe(true)
    expect(isAbsoluteInput('src/app.ts')).toBe(false)
    expect(isAbsoluteInput('~notes')).toBe(false)
  })
})

describe('resolveGoToPath', () => {
  const root = '/Users/me/repo'

  it('treats blank input as empty', () => {
    expect(resolveGoToPath('   ', root)).toEqual({ kind: 'empty' })
  })

  it('resolves relative paths against the open root', () => {
    expect(resolveGoToPath('src/app.ts', root)).toEqual({ kind: 'in-root', path: 'src/app.ts' })
    expect(resolveGoToPath('./docs/', root)).toEqual({ kind: 'in-root', path: 'docs' })
    expect(resolveGoToPath('src\\lib\\x.ts', root)).toEqual({ kind: 'in-root', path: 'src/lib/x.ts' })
    expect(resolveGoToPath('src/../README.md', root)).toEqual({ kind: 'in-root', path: 'README.md' })
    expect(resolveGoToPath('.', root)).toEqual({ kind: 'root' })
  })

  it('sends a relative path that climbs above the root to the server as an absolute path', () => {
    expect(resolveGoToPath('../other', root)).toEqual({ kind: 'external', path: '/Users/me/repo/../other' })
  })

  it('maps absolute paths inside the root back to root-relative paths', () => {
    expect(resolveGoToPath('/Users/me/repo/src/app.ts', root)).toEqual({ kind: 'in-root', path: 'src/app.ts' })
    expect(resolveGoToPath('/Users/me/repo/', root)).toEqual({ kind: 'root' })
    expect(resolveGoToPath('/Users/me/repo', `${root}/`)).toEqual({ kind: 'root' })
    expect(resolveGoToPath('/Users/me/repo/a/..', root)).toEqual({ kind: 'root' })
  })

  it('treats absolute paths outside the root as external', () => {
    expect(resolveGoToPath('/Users/me/repository', root)).toEqual({ kind: 'external', path: '/Users/me/repository' })
    expect(resolveGoToPath('/Users/me/repo/../x', root)).toEqual({ kind: 'external', path: '/Users/me/repo/../x' })
    expect(resolveGoToPath('~/notes', root)).toEqual({ kind: 'external', path: '~/notes' })
    expect(resolveGoToPath('/tmp', '')).toEqual({ kind: 'external', path: '/tmp' })
  })

  it('compares Windows roots case-insensitively and accepts either separator', () => {
    const winRoot = 'C:\\Work\\Repo'
    expect(resolveGoToPath('c:\\work\\repo\\src\\a.ts', winRoot)).toEqual({ kind: 'in-root', path: 'src/a.ts' })
    expect(resolveGoToPath('C:/Work/Repo', winRoot)).toEqual({ kind: 'root' })
    expect(resolveGoToPath('D:\\Other', winRoot)).toEqual({ kind: 'external', path: 'D:\\Other' })
    expect(resolveGoToPath('..\\x', winRoot)).toEqual({ kind: 'external', path: 'C:\\Work\\Repo\\..\\x' })
  })
})
