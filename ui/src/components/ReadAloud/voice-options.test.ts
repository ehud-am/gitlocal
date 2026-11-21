import { describe, expect, it } from 'vitest'
import { installedSayVoices, isKnownSayVoice, qualityLabel } from './voice-options'

describe('voice options', () => {
  it('labels quality and lists installed say voices', () => {
    expect(qualityLabel('premium')).toBe('Premium')
    expect(qualityLabel(null)).toBe('Basic')
    expect(installedSayVoices({ engine: 'web-speech' })).toEqual(new Set())
    const catalog = {
      engine: 'say' as const,
      recommended: [{ key: 'a', label: 'Ava', gender: 'female' as const, locale: 'en_US', accent: 'US' as const, bestQuality: 'premium' as const, installed: true, installedQuality: 'premium' as const, voice: 'Ava (Premium)', upgradeAvailable: false }],
      otherInstalled: [{ name: 'Albert', baseName: 'Albert', locale: 'en_US', quality: 'basic' as const }],
      installedRecommended: { female: 1, male: 0 },
      needsSetup: true,
    }
    expect(isKnownSayVoice(catalog, 'system')).toBe(true)
    expect(isKnownSayVoice(catalog, 'Albert')).toBe(true)
    expect(isKnownSayVoice(catalog, 'Nope')).toBe(false)
  })
})
