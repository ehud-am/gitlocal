import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile, writeFile } from 'node:fs/promises'
import {
  BASE_WORDS_PER_MINUTE,
  SPOKEN_CONTENT_SETTINGS_URLS,
  SayError,
  SilentAudioError,
  SpeechCancelledError,
  isSayAvailable,
  isSilentWav,
  listInstalledVoices,
  openSpokenContentSettings,
  setSayCommandRunner,
  setSayPlatform,
  spawnCommand,
  synthesize,
  type CommandRunner,
} from '../../../src/tts/say.js'

export function wav(samples: number[], extraChunk = false): Buffer {
  const data = Buffer.alloc(samples.length * 2)
  samples.forEach((sample, index) => data.writeInt16LE(sample, index * 2))
  const chunks: Buffer[] = []
  if (extraChunk) {
    const fmt = Buffer.alloc(8 + 3)
    fmt.write('LIST', 0, 'ascii')
    fmt.writeUInt32LE(3, 4)
    chunks.push(Buffer.concat([fmt, Buffer.alloc(1)]))
  }
  const dataHeader = Buffer.alloc(8)
  dataHeader.write('data', 0, 'ascii')
  dataHeader.writeUInt32LE(data.length, 4)
  chunks.push(dataHeader, data)
  const header = Buffer.alloc(12)
  header.write('RIFF', 0, 'ascii')
  header.writeUInt32LE(4 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4)
  header.write('WAVE', 8, 'ascii')
  return Buffer.concat([header, ...chunks])
}

// A runner that writes `audio` to the -o path, like `say` would.
function sayRunner(audio: Buffer, calls: { command: string; args: string[]; input?: string }[] = []): CommandRunner {
  return async (command, args, input) => {
    calls.push({ command, args, input })
    const output = args[args.indexOf('-o') + 1]
    await writeFile(output, audio)
    return { code: 0, stdout: '', stderr: '' }
  }
}

afterEach(() => {
  setSayCommandRunner(null)
  setSayPlatform(null)
})

describe('isSilentWav', () => {
  it('detects silent, empty and malformed audio', () => {
    expect(isSilentWav(Buffer.from('nope'))).toBe(true)
    expect(isSilentWav(Buffer.from('RIFF0000AVI xxxxxxxx'))).toBe(true)
    expect(isSilentWav(wav([]))).toBe(true)
    expect(isSilentWav(wav([0, 3, -5]))).toBe(true)
    expect(isSilentWav(wav([0, 2000]))).toBe(false)
    expect(isSilentWav(wav([0, -2000], true))).toBe(false)
    const noData = wav([1000]).subarray(0, 12)
    expect(isSilentWav(noData)).toBe(true)
  })
})

describe('platform', () => {
  it('reports say availability from the platform', () => {
    setSayPlatform('darwin')
    expect(isSayAvailable()).toBe(true)
    setSayPlatform('linux')
    expect(isSayAvailable()).toBe(false)
  })
})

describe('listInstalledVoices', () => {
  it('parses say output and caches it for 30 seconds', async () => {
    const runner = vi.fn<CommandRunner>(async () => ({ code: 0, stdout: 'Ava (Premium)  en_US  # hi', stderr: '' }))
    setSayCommandRunner(runner)
    const first = await listInstalledVoices(false, 1_000)
    expect(first[0].name).toBe('Ava (Premium)')
    await listInstalledVoices(false, 20_000)
    expect(runner).toHaveBeenCalledTimes(1)
    await listInstalledVoices(false, 40_000)
    await listInstalledVoices(true, 40_001)
    expect(runner).toHaveBeenCalledTimes(3)
    expect(runner).toHaveBeenCalledWith('say', ['-v', '?'])
  })

  it('throws when say fails', async () => {
    setSayCommandRunner(async () => ({ code: 1, stdout: '', stderr: 'boom' }))
    await expect(listInstalledVoices(true)).rejects.toBeInstanceOf(SayError)
  })
})

describe('synthesize', () => {
  it('passes text on stdin and the voice and rate as arguments', async () => {
    const calls: { command: string; args: string[]; input?: string }[] = []
    setSayCommandRunner(sayRunner(wav([0, 4000, -4000]), calls))
    const audio = await synthesize({ text: 'Hello there.', voice: 'Ava (Premium)', rate: 1.5 })
    expect(audio.toString('ascii', 0, 4)).toBe('RIFF')
    expect(calls[0].command).toBe('say')
    expect(calls[0].input).toBe('Hello there.')
    expect(calls[0].args).toEqual(expect.arrayContaining(['--data-format=LEI16@22050', '-r', String(BASE_WORDS_PER_MINUTE * 1.5), '-v', 'Ava (Premium)', '-f', '-']))
    expect(calls[0].args).not.toContain('Hello there.')
    await expect(readFile(calls[0].args[1])).rejects.toThrow()
  })

  it('omits -v for the system voice', async () => {
    const calls: { command: string; args: string[]; input?: string }[] = []
    setSayCommandRunner(sayRunner(wav([5000]), calls))
    await synthesize({ text: 'Hi.', voice: 'system', rate: 1 })
    expect(calls[0].args).not.toContain('-v')
  })

  it('reports silent audio and command failures', async () => {
    setSayCommandRunner(sayRunner(wav([0, 0])))
    await expect(synthesize({ text: 'Hi.', voice: 'system', rate: 1 })).rejects.toBeInstanceOf(SilentAudioError)
    setSayCommandRunner(async () => ({ code: 1, stdout: '', stderr: 'no voice' }))
    await expect(synthesize({ text: 'Hi.', voice: 'system', rate: 1 })).rejects.toBeInstanceOf(SayError)
  })

  it('runs at most two jobs at once', async () => {
    let active = 0
    let peak = 0
    setSayCommandRunner(async (command, args) => {
      active += 1
      peak = Math.max(peak, active)
      await new Promise((resolve) => setTimeout(resolve, 10))
      await writeFile(args[args.indexOf('-o') + 1], wav([3000]))
      active -= 1
      return { code: 0, stdout: '', stderr: '' }
    })
    await Promise.all([1, 2, 3, 4].map(() => synthesize({ text: 'x', voice: 'system', rate: 1 })))
    expect(peak).toBe(2)
  })

  it('does not run say for a request cancelled before it started', async () => {
    const calls: { command: string; args: string[]; input?: string }[] = []
    setSayCommandRunner(sayRunner(wav([3000]), calls))
    const abort = new AbortController()
    abort.abort()
    await expect(synthesize({ text: 'x', voice: 'system', rate: 1, signal: abort.signal })).rejects.toBeInstanceOf(SpeechCancelledError)
    expect(calls).toEqual([])
  })
})

describe('openSpokenContentSettings', () => {
  it('tries each settings URL until one opens', async () => {
    const runner = vi.fn<CommandRunner>()
      .mockResolvedValueOnce({ code: 1, stdout: '', stderr: '' })
      .mockResolvedValueOnce({ code: 0, stdout: '', stderr: '' })
    setSayCommandRunner(runner)
    expect(await openSpokenContentSettings()).toBe(true)
    expect(runner).toHaveBeenNthCalledWith(2, 'open', [SPOKEN_CONTENT_SETTINGS_URLS[1]])
    setSayCommandRunner(async () => ({ code: 1, stdout: '', stderr: '' }))
    expect(await openSpokenContentSettings()).toBe(false)
  })
})

describe('spawnCommand', () => {
  it('collects output and exit code, and feeds stdin', async () => {
    const result = await spawnCommand(process.execPath, ['-e', 'process.stdin.pipe(process.stdout); console.error("e")'], 'piped')
    expect(result).toEqual({ code: 0, stdout: 'piped', stderr: 'e\n' })
    const noInput = await spawnCommand(process.execPath, ['-e', 'process.exit(3)'])
    expect(noInput.code).toBe(3)
  })

  it('reports a missing command', async () => {
    const result = await spawnCommand('gitlocal-command-that-does-not-exist', [])
    expect(result.code).toBeNull()
    expect(result.stderr).toMatch(/ENOENT/)
  })

  it('kills a command that runs too long', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const pending = spawnCommand(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'])
      await vi.advanceTimersByTimeAsync(30_000)
      const result = await pending
      expect(result.code).toBeNull()
      expect(result.stderr).toMatch(/timed out/)
    } finally {
      vi.useRealTimers()
    }
  })
})
