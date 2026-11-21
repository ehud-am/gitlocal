import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../../../src/server.js'
import { setSayCommandRunner, setSayPlatform, type CommandRunner } from '../../../src/tts/say.js'
import { MAX_SPEECH_TEXT_LENGTH } from '../../../src/handlers/tts.js'
import { wav } from '../tts/say.test.js'

const VOICES = 'Ava (Premium)       en_US    # Hello\nEvan (Enhanced)     en_US    # Hello\n'

function fakeSay(audio: Buffer = wav([0, 3000])): { runner: CommandRunner; calls: { command: string; args: string[] }[] } {
  const calls: { command: string; args: string[] }[] = []
  const runner: CommandRunner = async (command, args) => {
    calls.push({ command, args })
    if (command === 'say' && args[0] === '-v') return { code: 0, stdout: VOICES, stderr: '' }
    if (command === 'say') await writeFile(args[args.indexOf('-o') + 1], audio)
    return { code: 0, stdout: '', stderr: '' }
  }
  return { runner, calls }
}

let root: string
let preferenceDir: string
let app: ReturnType<typeof createApp>

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gitlocal-tts-root-'))
  writeFileSync(join(root, 'a.md'), '# A')
  preferenceDir = mkdtempSync(join(tmpdir(), 'gitlocal-tts-pref-'))
  process.env.GITLOCAL_READ_ALOUD_PREFERENCE_PATH = join(preferenceDir, 'pref.json')
  app = createApp(root)
})

afterAll(() => {
  delete process.env.GITLOCAL_READ_ALOUD_PREFERENCE_PATH
  rmSync(root, { recursive: true, force: true })
  rmSync(preferenceDir, { recursive: true, force: true })
})

afterEach(() => {
  setSayCommandRunner(null)
  setSayPlatform(null)
})

const json = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

describe('GET /api/tts/voices', () => {
  it('reports web speech off macOS', async () => {
    setSayPlatform('linux')
    const res = await app.request('/api/tts/voices')
    expect(await res.json()).toEqual({ engine: 'web-speech' })
  })

  it('reports the say voice list on macOS', async () => {
    setSayPlatform('darwin')
    setSayCommandRunner(fakeSay().runner)
    const body = await (await app.request('/api/tts/voices?refresh=1')).json() as { engine: string; installedRecommended: unknown }
    expect(body.engine).toBe('say')
    expect(body.installedRecommended).toEqual({ female: 1, male: 1 })
  })

  it('falls back to web speech when say fails', async () => {
    setSayPlatform('darwin')
    setSayCommandRunner(async () => ({ code: 1, stdout: '', stderr: '' }))
    expect(await (await app.request('/api/tts/voices?refresh=1')).json()).toEqual({ engine: 'web-speech' })
  })

  it('rejects a non-loopback origin', async () => {
    const res = await app.request('/api/tts/voices', { headers: { Origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
  })
})

describe('POST /api/tts/say', () => {
  it('returns wav audio', async () => {
    setSayPlatform('darwin')
    const { runner, calls } = fakeSay()
    setSayCommandRunner(runner)
    const res = await app.request('/api/tts/say', json({ text: 'Hello.', voice: 'Ava (Premium)', rate: 1 }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('audio/wav')
    expect(Buffer.from(await res.arrayBuffer()).toString('ascii', 0, 4)).toBe('RIFF')
    expect(calls.some((call) => call.args.includes('Ava (Premium)'))).toBe(true)
  })

  it('uses the system voice by default', async () => {
    setSayPlatform('darwin')
    setSayCommandRunner(fakeSay().runner)
    const res = await app.request('/api/tts/say', json({ text: 'Hello.' }))
    expect(res.status).toBe(200)
  })

  it('validates input', async () => {
    setSayPlatform('darwin')
    setSayCommandRunner(fakeSay().runner)
    const bad = await app.request('/api/tts/say', { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } })
    expect(bad.status).toBe(400)
    expect((await app.request('/api/tts/say', json({ text: ' ' }))).status).toBe(400)
    expect((await app.request('/api/tts/say', json({ text: 'x'.repeat(MAX_SPEECH_TEXT_LENGTH + 1) }))).status).toBe(400)
    expect((await app.request('/api/tts/say', json({ text: 'Hi', rate: 9 }))).status).toBe(400)
    const missing = await app.request('/api/tts/say', json({ text: 'Hi', voice: 'Nobody' }))
    expect(missing.status).toBe(400)
    expect(await missing.json()).toMatchObject({ code: 'voice-not-installed' })
  })

  it('reports silent audio and failures', async () => {
    setSayPlatform('darwin')
    setSayCommandRunner(fakeSay(wav([0])).runner)
    const silent = await app.request('/api/tts/say', json({ text: 'Hi', voice: 'system' }))
    expect(silent.status).toBe(422)
    expect(await silent.json()).toMatchObject({ code: 'silent-audio' })
    setSayCommandRunner(async () => ({ code: 1, stdout: '', stderr: '' }))
    expect((await app.request('/api/tts/say', json({ text: 'Hi', voice: 'system' }))).status).toBe(500)
  })

  it('is unavailable off macOS', async () => {
    setSayPlatform('linux')
    expect((await app.request('/api/tts/say', json({ text: 'Hi' }))).status).toBe(404)
  })
})

describe('POST /api/tts/open-voice-settings', () => {
  it('opens settings on macOS only', async () => {
    setSayPlatform('darwin')
    const { runner, calls } = fakeSay()
    setSayCommandRunner(runner)
    expect(await (await app.request('/api/tts/open-voice-settings', { method: 'POST' })).json()).toEqual({ ok: true })
    expect(calls[0].command).toBe('open')
    setSayPlatform('linux')
    expect((await app.request('/api/tts/open-voice-settings', { method: 'POST' })).status).toBe(404)
  })
})

describe('/api/read-aloud-preference', () => {
  it('reads and writes the preference', async () => {
    expect(await (await app.request('/api/read-aloud-preference')).json()).toEqual({ voice: 'system', rate: 1 })
    const put = await app.request('/api/read-aloud-preference', { ...json({ voice: 'Ava (Premium)', rate: 1.25 }), method: 'PUT' })
    expect(await put.json()).toEqual({ voice: 'Ava (Premium)', rate: 1.25 })
    expect(await (await app.request('/api/read-aloud-preference')).json()).toEqual({ voice: 'Ava (Premium)', rate: 1.25 })
  })

  it('rejects invalid preferences', async () => {
    expect((await app.request('/api/read-aloud-preference', { method: 'PUT', body: 'x' })).status).toBe(400)
    expect((await app.request('/api/read-aloud-preference', { ...json({ voice: 'a', rate: 2 }), method: 'PUT' })).status).toBe(400)
    expect((await app.request('/api/read-aloud-preference', { headers: { Host: 'evil.example' } })).status).toBe(403)
  })
})
