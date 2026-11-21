import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

export interface ReadAloudPreference {
  // "system" (the macOS System Voice / browser default) or a voice name.
  voice: string
  rate: number
}

export const READ_ALOUD_RATES: readonly number[] = [0.75, 1, 1.25, 1.5]
export const DEFAULT_READ_ALOUD_PREFERENCE: ReadAloudPreference = { voice: 'system', rate: 1 }
const MAX_VOICE_LENGTH = 200

export function isValidReadAloudVoice(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_VOICE_LENGTH
}

export function isValidReadAloudRate(value: unknown): value is number {
  return typeof value === 'number' && READ_ALOUD_RATES.includes(value)
}

function defaultPreferencePath(): string {
  return process.env.GITLOCAL_READ_ALOUD_PREFERENCE_PATH || join(homedir(), '.gitlocal', 'read-aloud-preference.json')
}

// Missing, corrupt, or partly invalid files fall back field by field to the defaults.
export function readReadAloudPreference(path = defaultPreferencePath()): ReadAloudPreference {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<ReadAloudPreference>
    return {
      voice: isValidReadAloudVoice(parsed.voice) ? parsed.voice : DEFAULT_READ_ALOUD_PREFERENCE.voice,
      rate: isValidReadAloudRate(parsed.rate) ? parsed.rate : DEFAULT_READ_ALOUD_PREFERENCE.rate,
    }
  } catch {
    return { ...DEFAULT_READ_ALOUD_PREFERENCE }
  }
}

export function writeReadAloudPreference(preference: ReadAloudPreference, path = defaultPreferencePath()): ReadAloudPreference {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(preference, null, 2)}\n`)
  return preference
}
