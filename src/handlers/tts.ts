import type { Context } from 'hono'
import {
  isValidReadAloudRate,
  isValidReadAloudVoice,
  readReadAloudPreference,
  writeReadAloudPreference,
  type ReadAloudPreference,
} from '../services/read-aloud-preference.js'
import {
  SYSTEM_VOICE,
  SilentAudioError,
  isSayAvailable,
  listInstalledVoices,
  openSpokenContentSettings,
  synthesize,
} from '../tts/say.js'
import { buildVoiceReport } from '../tts/voices.js'

export const MAX_SPEECH_TEXT_LENGTH = 2000

export async function ttsVoicesHandler(c: Context): Promise<Response> {
  if (!isSayAvailable()) return c.json({ engine: 'web-speech' })
  try {
    const voices = await listInstalledVoices(c.req.query('refresh') === '1')
    return c.json(buildVoiceReport(voices))
  } catch {
    return c.json({ engine: 'web-speech' })
  }
}

export async function ttsSayHandler(c: Context): Promise<Response> {
  if (!isSayAvailable()) return c.json({ error: 'Speech is not available on this system.' }, 404)
  let payload: { text?: unknown; voice?: unknown; rate?: unknown }
  try {
    payload = await c.req.json()
  } catch {
    return c.json({ error: 'Invalid request' }, 400)
  }
  const { text, voice = SYSTEM_VOICE, rate = 1 } = payload
  if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_SPEECH_TEXT_LENGTH) {
    return c.json({ error: 'Invalid text' }, 400)
  }
  if (!isValidReadAloudVoice(voice) || !isValidReadAloudRate(rate)) {
    return c.json({ error: 'Invalid voice or rate' }, 400)
  }
  try {
    if (voice !== SYSTEM_VOICE) {
      const installed = await listInstalledVoices()
      if (!installed.some((candidate) => candidate.name === voice)) {
        return c.json({ error: 'Voice is not installed', code: 'voice-not-installed' }, 400)
      }
    }
    const audio = await synthesize({ text, voice, rate })
    return new Response(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    if (error instanceof SilentAudioError) {
      return c.json({ error: error.message, code: 'silent-audio' }, 422)
    }
    return c.json({ error: 'Speech failed' }, 500)
  }
}

export async function ttsOpenSettingsHandler(c: Context): Promise<Response> {
  if (!isSayAvailable()) return c.json({ ok: false }, 404)
  return c.json({ ok: await openSpokenContentSettings() })
}

export function getReadAloudPreferenceHandler(c: Context): Response {
  return c.json(readReadAloudPreference())
}

export async function updateReadAloudPreferenceHandler(c: Context): Promise<Response> {
  let payload: Partial<ReadAloudPreference>
  try {
    payload = await c.req.json<Partial<ReadAloudPreference>>()
  } catch {
    return c.json({ error: 'Invalid preference' }, 400)
  }
  if (!isValidReadAloudVoice(payload.voice) || !isValidReadAloudRate(payload.rate)) {
    return c.json({ error: 'Invalid preference' }, 400)
  }
  return c.json(writeReadAloudPreference({ voice: payload.voice, rate: payload.rate }))
}
