import { describe, expect, it } from 'vitest'
import { buildVoiceReport, isEnglishLocale, parseSayVoiceList, RECOMMENDED_VOICES } from '../../../src/tts/voices.js'

const SAMPLE = [
  'Albert              en_US    # Hello! My name is Albert.',
  'Ava (Premium)       en_US    # Hello! My name is Ava.',
  'Ava (Enhanced)      en_US    # Hello! My name is Ava.',
  'Samantha            en_US    # Hello! My name is Samantha.',
  'Zoe (Enhanced)      en_US    # Hello! My name is Zoe.',
  'Evan (Enhanced)     en_US    # Hello! My name is Evan.',
  'Nathan              en_US    # Hello! My name is Nathan.',
  'Eddy (English (UK)) en_GB    # Hello! My name is Eddy.',
  'Fiona (Enhanced)    en-scotland # Hello! My name is Fiona.',
  'Thomas              fr_FR    # Bonjour, je m’appelle Thomas.',
  'Grandpa (English (US)) en_US # Hello! My name is Grandpa.',
  '',
  'not a voice line',
].join('\n')

describe('parseSayVoiceList', () => {
  it('reads name, base name, locale and quality from each line', () => {
    const voices = parseSayVoiceList(SAMPLE)
    expect(voices).toHaveLength(11)
    expect(voices[1]).toEqual({ name: 'Ava (Premium)', baseName: 'Ava', locale: 'en_US', quality: 'premium' })
    expect(voices[2].quality).toBe('enhanced')
    expect(voices[0]).toEqual({ name: 'Albert', baseName: 'Albert', locale: 'en_US', quality: 'basic' })
    expect(voices[7]).toEqual({ name: 'Eddy (English (UK))', baseName: 'Eddy (English (UK))', locale: 'en_GB', quality: 'basic' })
    expect(voices[8].locale).toBe('en-scotland')
    expect(voices[10].name).toBe('Grandpa (English (US))')
  })
})

describe('isEnglishLocale', () => {
  it('matches en locales only', () => {
    expect(isEnglishLocale('en_US')).toBe(true)
    expect(isEnglishLocale('en-scotland')).toBe(true)
    expect(isEnglishLocale('en')).toBe(true)
    expect(isEnglishLocale('es_ES')).toBe(false)
  })
})

describe('buildVoiceReport', () => {
  it('marks installed recommended voices with their best quality and lists the rest', () => {
    const report = buildVoiceReport(parseSayVoiceList(SAMPLE))
    const byKey = Object.fromEntries(report.recommended.map((voice) => [voice.key, voice]))
    expect(report.recommended).toHaveLength(RECOMMENDED_VOICES.length)
    expect(byKey.ava).toMatchObject({ installed: true, installedQuality: 'premium', voice: 'Ava (Premium)', upgradeAvailable: false })
    expect(byKey.zoe).toMatchObject({ installed: true, installedQuality: 'enhanced', upgradeAvailable: true })
    expect(byKey.evan).toMatchObject({ installed: true, voice: 'Evan (Enhanced)', upgradeAvailable: false })
    expect(byKey.nathan).toMatchObject({ installed: false, installedQuality: 'basic', voice: null, upgradeAvailable: true })
    expect(byKey.jamie).toMatchObject({ installed: false, installedQuality: null, voice: null, upgradeAvailable: false })
    expect(report.installedRecommended).toEqual({ female: 2, male: 1 })
    expect(report.needsSetup).toBe(true)
    expect(report.otherInstalled.map((voice) => voice.name)).toEqual([
      'Fiona (Enhanced)', 'Albert', 'Eddy (English (UK))', 'Grandpa (English (US))', 'Samantha',
    ])
  })

  it('needs no setup once two of each gender are installed', () => {
    const report = buildVoiceReport(parseSayVoiceList([
      'Ava (Premium)       en_US    # x',
      'Serena (Premium)    en_GB    # x',
      'Evan (Enhanced)     en_US    # x',
      'Jamie (Premium)     en_GB    # x',
    ].join('\n')))
    expect(report.needsSetup).toBe(false)
    expect(report.otherInstalled).toEqual([])
  })
})
