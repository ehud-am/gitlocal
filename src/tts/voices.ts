// Read aloud (#139): the macOS voice list. `say -v '?'` prints one installed voice per line, for
// example `Ava (Premium)       en_US    # Hello! My name is Ava.`. The quality is only visible in
// the name suffix: "(Premium)" and "(Enhanced)" are the downloadable high-quality variants, a name
// without one is the basic (compact) voice.

export type VoiceQuality = 'premium' | 'enhanced' | 'basic'
export type VoiceGender = 'female' | 'male'

export interface InstalledVoice {
  name: string
  baseName: string
  locale: string
  quality: VoiceQuality
}

export interface RecommendedVoiceSpec {
  key: string
  label: string
  gender: VoiceGender
  locale: string
  accent: 'US' | 'UK'
  bestQuality: Exclude<VoiceQuality, 'basic'>
}

export interface RecommendedVoiceStatus extends RecommendedVoiceSpec {
  installed: boolean
  installedQuality: VoiceQuality | null
  voice: string | null
  upgradeAvailable: boolean
}

export interface SayVoiceReport {
  engine: 'say'
  recommended: RecommendedVoiceStatus[]
  otherInstalled: InstalledVoice[]
  installedRecommended: Record<VoiceGender, number>
  needsSetup: boolean
}

// Free Apple voices picked for natural-sounding English. Apple ships no male en-US voice in
// Premium quality, so Evan and Nathan are Enhanced.
export const RECOMMENDED_VOICES: readonly RecommendedVoiceSpec[] = [
  { key: 'ava', label: 'Ava', gender: 'female', locale: 'en_US', accent: 'US', bestQuality: 'premium' },
  { key: 'zoe', label: 'Zoe', gender: 'female', locale: 'en_US', accent: 'US', bestQuality: 'premium' },
  { key: 'serena', label: 'Serena', gender: 'female', locale: 'en_GB', accent: 'UK', bestQuality: 'premium' },
  { key: 'evan', label: 'Evan', gender: 'male', locale: 'en_US', accent: 'US', bestQuality: 'enhanced' },
  { key: 'nathan', label: 'Nathan', gender: 'male', locale: 'en_US', accent: 'US', bestQuality: 'enhanced' },
  { key: 'jamie', label: 'Jamie', gender: 'male', locale: 'en_GB', accent: 'UK', bestQuality: 'premium' },
]

// Minimum of each gender among installed recommended voices before setup guidance is hidden.
export const RECOMMENDED_MINIMUM_PER_GENDER = 2

const LINE_PATTERN = /^(.*\S)\s+([a-z]{2,3}(?:[_-][A-Za-z0-9_-]+)?)\s+#/
const QUALITY_SUFFIX = /\s*\((premium|enhanced)\)$/i
const QUALITY_RANK: Record<VoiceQuality, number> = { premium: 0, enhanced: 1, basic: 2 }

export function parseSayVoiceList(output: string): InstalledVoice[] {
  const voices: InstalledVoice[] = []
  for (const line of output.split('\n')) {
    const match = LINE_PATTERN.exec(line.trimEnd())
    if (!match) continue
    const name = match[1].trim()
    const suffix = QUALITY_SUFFIX.exec(name)
    voices.push({
      name,
      baseName: suffix ? name.slice(0, suffix.index).trim() : name,
      locale: match[2],
      quality: suffix ? (suffix[1].toLowerCase() as VoiceQuality) : 'basic',
    })
  }
  return voices
}

export function isEnglishLocale(locale: string): boolean {
  return /^en(?:[_-]|$)/i.test(locale)
}

function byQualityThenName(a: InstalledVoice, b: InstalledVoice): number {
  return QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality] || a.name.localeCompare(b.name)
}

export function buildVoiceReport(installed: InstalledVoice[]): SayVoiceReport {
  const english = installed.filter((voice) => isEnglishLocale(voice.locale))
  const recommendedNames = new Set(RECOMMENDED_VOICES.map((spec) => spec.label.toLowerCase()))
  const installedRecommended: Record<VoiceGender, number> = { female: 0, male: 0 }

  const recommended = RECOMMENDED_VOICES.map((spec): RecommendedVoiceStatus => {
    const variants = english
      .filter((voice) => voice.baseName.toLowerCase() === spec.label.toLowerCase())
      .sort(byQualityThenName)
    const best = variants[0]
    const installedGood = best !== undefined && best.quality !== 'basic'
    if (installedGood) installedRecommended[spec.gender] += 1
    return {
      ...spec,
      installed: installedGood,
      installedQuality: best?.quality ?? null,
      voice: installedGood ? best.name : null,
      upgradeAvailable: best !== undefined && QUALITY_RANK[best.quality] > QUALITY_RANK[spec.bestQuality],
    }
  })

  const otherInstalled = english
    .filter((voice) => !recommendedNames.has(voice.baseName.toLowerCase()))
    .sort(byQualityThenName)

  return {
    engine: 'say',
    recommended,
    otherInstalled,
    installedRecommended,
    needsSetup:
      installedRecommended.female < RECOMMENDED_MINIMUM_PER_GENDER ||
      installedRecommended.male < RECOMMENDED_MINIMUM_PER_GENDER,
  }
}
