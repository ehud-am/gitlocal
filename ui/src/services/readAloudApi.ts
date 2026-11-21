export type VoiceQuality = 'premium' | 'enhanced' | 'basic'

export interface SayVoice {
  name: string
  baseName: string
  locale: string
  quality: VoiceQuality
}

export interface RecommendedVoice {
  key: string
  label: string
  gender: 'female' | 'male'
  locale: string
  accent: 'US' | 'UK'
  bestQuality: 'premium' | 'enhanced'
  installed: boolean
  installedQuality: VoiceQuality | null
  voice: string | null
  upgradeAvailable: boolean
}

export type VoiceCatalog =
  | {
      engine: 'say'
      recommended: RecommendedVoice[]
      otherInstalled: SayVoice[]
      installedRecommended: { female: number; male: number }
      needsSetup: boolean
    }
  | { engine: 'web-speech' }

export interface ReadAloudPreference {
  voice: string
  rate: number
}

export const DEFAULT_READ_ALOUD_PREFERENCE: ReadAloudPreference = { voice: 'system', rate: 1 }

export const readAloudApi = {
  voices: async (refresh = false): Promise<VoiceCatalog> => {
    try {
      const res = await fetch(`/api/tts/voices${refresh ? '?refresh=1' : ''}`)
      if (!res.ok) return { engine: 'web-speech' }
      return (await res.json()) as VoiceCatalog
    } catch {
      return { engine: 'web-speech' }
    }
  },

  preference: async (): Promise<ReadAloudPreference> => {
    try {
      const res = await fetch('/api/read-aloud-preference')
      if (!res.ok) return { ...DEFAULT_READ_ALOUD_PREFERENCE }
      return { ...DEFAULT_READ_ALOUD_PREFERENCE, ...((await res.json()) as Partial<ReadAloudPreference>) }
    } catch {
      return { ...DEFAULT_READ_ALOUD_PREFERENCE }
    }
  },

  savePreference: async (preference: ReadAloudPreference): Promise<void> => {
    try {
      await fetch('/api/read-aloud-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preference),
      })
    } catch {
      // The choice still applies to this session.
    }
  },

  openVoiceSettings: async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/tts/open-voice-settings', { method: 'POST' })
      if (!res.ok) return false
      return Boolean(((await res.json()) as { ok?: boolean }).ok)
    } catch {
      return false
    }
  },
}
