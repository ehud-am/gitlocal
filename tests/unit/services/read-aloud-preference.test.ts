import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  DEFAULT_READ_ALOUD_PREFERENCE,
  isValidReadAloudRate,
  isValidReadAloudVoice,
  readReadAloudPreference,
  writeReadAloudPreference,
} from '../../../src/services/read-aloud-preference.js'

const dirs: string[] = []
function tempFile(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gitlocal-read-aloud-'))
  dirs.push(dir)
  return join(dir, 'nested', 'read-aloud-preference.json')
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('read-aloud preference', () => {
  it('defaults when the file is missing or corrupt', () => {
    const path = tempFile()
    expect(readReadAloudPreference(path)).toEqual(DEFAULT_READ_ALOUD_PREFERENCE)
    writeReadAloudPreference({ voice: 'Ava (Premium)', rate: 1.25 }, path)
    writeFileSync(path, '{nope')
    expect(readReadAloudPreference(path)).toEqual(DEFAULT_READ_ALOUD_PREFERENCE)
  })

  it('round-trips a valid preference and drops invalid fields', () => {
    const path = tempFile()
    writeReadAloudPreference({ voice: 'Ava (Premium)', rate: 1.25 }, path)
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({ voice: 'Ava (Premium)', rate: 1.25 })
    expect(readReadAloudPreference(path)).toEqual({ voice: 'Ava (Premium)', rate: 1.25 })
    writeFileSync(path, JSON.stringify({ voice: '', rate: 3 }))
    expect(readReadAloudPreference(path)).toEqual(DEFAULT_READ_ALOUD_PREFERENCE)
  })

  it('uses the env override path by default', () => {
    const path = tempFile()
    process.env.GITLOCAL_READ_ALOUD_PREFERENCE_PATH = path
    try {
      writeReadAloudPreference({ voice: 'system', rate: 0.75 })
      expect(readReadAloudPreference()).toEqual({ voice: 'system', rate: 0.75 })
    } finally {
      delete process.env.GITLOCAL_READ_ALOUD_PREFERENCE_PATH
    }
  })

  it('validates voice and rate', () => {
    expect(isValidReadAloudVoice('Ava')).toBe(true)
    expect(isValidReadAloudVoice('  ')).toBe(false)
    expect(isValidReadAloudVoice('x'.repeat(201))).toBe(false)
    expect(isValidReadAloudVoice(3)).toBe(false)
    expect(isValidReadAloudRate(1.5)).toBe(true)
    expect(isValidReadAloudRate(1.1)).toBe(false)
    expect(isValidReadAloudRate('1')).toBe(false)
  })
})
