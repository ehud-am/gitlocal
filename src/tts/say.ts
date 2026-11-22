// Read aloud (#139): runs the built-in macOS `say` command. Everything here uses async `spawn`,
// never spawnSync, so a running synthesis never blocks the event loop that also carries the
// terminal's PTY traffic (see the 0.13.7 notes in CLAUDE.md).
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseSayVoiceList, type InstalledVoice } from './voices.js'

export interface CommandResult {
  code: number | null
  stdout: string
  stderr: string
}

export type CommandRunner = (command: string, args: string[], input?: string) => Promise<CommandResult>

const COMMAND_TIMEOUT_MS = 30_000

export const spawnCommand: CommandRunner = (command, args, input) =>
  new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (result: CommandResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish({ code: null, stdout, stderr: `${stderr}timed out` })
    }, COMMAND_TIMEOUT_MS)
    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
    child.on('error', (error) => finish({ code: null, stdout, stderr: error.message }))
    child.on('close', (code) => finish({ code, stdout, stderr }))
    child.stdin.on('error', () => undefined)
    child.stdin.end(input ?? '')
  })

let runner: CommandRunner = spawnCommand
let platformOverride: NodeJS.Platform | null = null

export function setSayCommandRunner(next: CommandRunner | null): void {
  runner = next ?? spawnCommand
  voiceCache = null
}

export function setSayPlatform(next: NodeJS.Platform | null): void {
  platformOverride = next
  voiceCache = null
}

export function isSayAvailable(): boolean {
  return (platformOverride ?? process.platform) === 'darwin'
}

export class SayError extends Error {}
export class SilentAudioError extends SayError {}

const VOICE_CACHE_MS = 30_000
let voiceCache: { at: number; voices: InstalledVoice[] } | null = null

export async function listInstalledVoices(refresh = false, now = Date.now()): Promise<InstalledVoice[]> {
  if (!refresh && voiceCache && now - voiceCache.at < VOICE_CACHE_MS) return voiceCache.voices
  const result = await runner('say', ['-v', '?'])
  if (result.code !== 0) throw new SayError(`say -v ? failed: ${result.stderr.trim()}`)
  const voices = parseSayVoiceList(result.stdout)
  voiceCache = { at: now, voices }
  return voices
}

// Words per minute for 1x. `say` speaks Premium voices at roughly this pace by default [likely].
export const BASE_WORDS_PER_MINUTE = 180
export const SYSTEM_VOICE = 'system'

const MAX_CONCURRENT_JOBS = 2
let activeJobs = 0
const waiting: (() => void)[] = []

async function withJobSlot<T>(job: () => Promise<T>): Promise<T> {
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    await new Promise<void>((resolve) => waiting.push(resolve))
  }
  activeJobs += 1
  try {
    return await job()
  } finally {
    activeJobs -= 1
    waiting.shift()?.()
  }
}

export interface SynthesizeRequest {
  text: string
  voice: string
  rate: number
  // Aborted when the page no longer needs this sentence (the reader skipped ahead or stopped).
  signal?: AbortSignal
}

export class SpeechCancelledError extends SayError {}

// One sentence to 16-bit 22.05 kHz WAV. The text goes to `say` on stdin, never as an argument.
export function synthesize({ text, voice, rate, signal }: SynthesizeRequest): Promise<Buffer> {
  return withJobSlot(async () => {
    // A request cancelled while it waited for a slot never starts `say`.
    if (signal?.aborted) throw new SpeechCancelledError('Speech request cancelled.')
    const dir = await mkdtemp(join(tmpdir(), 'gitlocal-say-'))
    const output = join(dir, 'speech.wav')
    try {
      const args = ['-o', output, '--data-format=LEI16@22050', '-r', String(Math.round(BASE_WORDS_PER_MINUTE * rate))]
      if (voice !== SYSTEM_VOICE) args.push('-v', voice)
      args.push('-f', '-')
      const result = await runner('say', args, text)
      if (result.code !== 0) throw new SayError(`say failed: ${result.stderr.trim()}`)
      const audio = await readFile(output)
      if (isSilentWav(audio)) throw new SilentAudioError('The voice produced no sound.')
      return audio
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
}

// Some Premium/Enhanced voices on macOS Tahoe have been reported to produce no sound. A WAV with
// no data chunk, an empty one, or only near-zero samples counts as silent.
const SILENCE_THRESHOLD = 16

export function isSilentWav(audio: Buffer): boolean {
  if (audio.length < 12 || audio.toString('ascii', 0, 4) !== 'RIFF' || audio.toString('ascii', 8, 12) !== 'WAVE') return true
  let offset = 12
  while (offset + 8 <= audio.length) {
    const id = audio.toString('ascii', offset, offset + 4)
    const size = audio.readUInt32LE(offset + 4)
    const start = offset + 8
    if (id === 'data') {
      const end = Math.min(start + size, audio.length)
      for (let index = start; index + 1 < end; index += 2) {
        if (Math.abs(audio.readInt16LE(index)) >= SILENCE_THRESHOLD) return false
      }
      return true
    }
    offset = start + size + (size % 2)
  }
  return true
}

// System Settings > Accessibility > Spoken Content. The first URL is the macOS 13+ settings
// extension; the second is the older preference pane, tried if the first fails to open.
export const SPOKEN_CONTENT_SETTINGS_URLS = [
  'x-apple.systempreferences:com.apple.Accessibility-Settings.extension?SpokenContent',
  'x-apple.systempreferences:com.apple.preference.universalaccess?SpeakableItems',
] as const

export async function openSpokenContentSettings(): Promise<boolean> {
  for (const url of SPOKEN_CONTENT_SETTINGS_URLS) {
    // eslint-disable-next-line no-await-in-loop -- try each URL in order, stop at the first that opens
    const result = await runner('open', [url])
    if (result.code === 0) return true
  }
  return false
}
