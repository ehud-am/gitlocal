import type { RecommendedVoice, SayVoice, VoiceCatalog, VoiceQuality } from '../../services/readAloudApi'

export const SYSTEM_VOICE_ID = 'system'
export const READ_ALOUD_RATES = [0.75, 1, 1.25, 1.5] as const

export function qualityLabel(quality: VoiceQuality | null): string {
  return quality === 'premium' ? 'Premium' : quality === 'enhanced' ? 'Enhanced' : 'Basic'
}

export function recommendedLabel(voice: RecommendedVoice): string {
  return `${voice.label} (${voice.gender === 'female' ? 'female' : 'male'}, ${voice.accent}, ${qualityLabel(voice.installedQuality)})`
}

// Every voice name `say` can use from this catalog.
export function installedSayVoices(catalog: VoiceCatalog): Set<string> {
  if (catalog.engine !== 'say') return new Set()
  return new Set([
    ...catalog.recommended.flatMap((voice) => (voice.voice ? [voice.voice] : [])),
    ...catalog.otherInstalled.map((voice: SayVoice) => voice.name),
  ])
}

export function isKnownSayVoice(catalog: VoiceCatalog, id: string): boolean {
  return id === SYSTEM_VOICE_ID || installedSayVoices(catalog).has(id)
}
