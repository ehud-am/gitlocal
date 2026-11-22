import type { VoiceCatalog } from '../../services/readAloudApi'
import { SYSTEM_VOICE_ID, recommendedLabel } from './voice-options'

interface Props {
  catalog: VoiceCatalog | null
  webVoices: SpeechSynthesisVoice[]
  value: string
  onChange: (voice: string) => void
}

// The voice picker used by the player bar and the settings dialog.
export default function VoiceSelect({ catalog, webVoices, value, onChange }: Props) {
  const sayCatalog = catalog?.engine === 'say' ? catalog : null
  const goodOther = sayCatalog?.otherInstalled.filter((candidate) => candidate.quality !== 'basic') ?? []
  const basicOther = sayCatalog?.otherInstalled.filter((candidate) => candidate.quality === 'basic') ?? []
  return (
    <select value={value} disabled={!catalog} onChange={(event) => onChange(event.target.value)}>
      {catalog?.engine === 'web-speech' ? (
        <>
          <option value={SYSTEM_VOICE_ID}>Browser default voice</option>
          {webVoices.length > 0 ? (
            <optgroup label="On-device voices">
              {webVoices.map((candidate) => <option key={candidate.voiceURI} value={candidate.voiceURI}>{candidate.name}</option>)}
            </optgroup>
          ) : null}
        </>
      ) : (
        <>
          <option value={SYSTEM_VOICE_ID}>System voice</option>
          {sayCatalog ? (
            <optgroup label="Recommended">
              {sayCatalog.recommended.map((candidate) => (candidate.voice
                ? <option key={candidate.key} value={candidate.voice}>{recommendedLabel(candidate)}</option>
                : <option key={candidate.key} value={`missing:${candidate.key}`} disabled>{candidate.label} (not installed)</option>))}
            </optgroup>
          ) : null}
          {goodOther.length > 0 ? (
            <optgroup label="Other installed voices">
              {goodOther.map((candidate) => <option key={candidate.name} value={candidate.name}>{candidate.name}</option>)}
            </optgroup>
          ) : null}
          {basicOther.length > 0 ? (
            <optgroup label="Basic voices">
              {basicOther.map((candidate) => <option key={candidate.name} value={candidate.name}>{candidate.name}</option>)}
            </optgroup>
          ) : null}
        </>
      )}
    </select>
  )
}
