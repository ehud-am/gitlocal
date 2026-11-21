import { useState } from 'react'
import { readAloudApi, type RecommendedVoice } from '../../services/readAloudApi'
import { qualityLabel } from './voice-options'

interface Props {
  recommended: RecommendedVoice[]
  needsSetup: boolean
  onRefresh: () => Promise<void>
  onPreview: (voice: string) => void
  onUse: (voice: string) => void
}

function status(voice: RecommendedVoice): string {
  if (voice.installed && !voice.upgradeAvailable) return `Installed (${qualityLabel(voice.installedQuality)})`
  if (voice.installed) return `Installed (${qualityLabel(voice.installedQuality)}). ${qualityLabel(voice.bestQuality)} available`
  if (voice.upgradeAvailable) return `Only the basic version is installed. Download ${qualityLabel(voice.bestQuality)}`
  return `Not installed. Download ${qualityLabel(voice.bestQuality)}`
}

export default function VoiceSetup({ recommended, needsSetup, onRefresh, onPreview, onUse }: Props) {
  const [message, setMessage] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  return (
    <section className="read-aloud-setup" aria-label="Voice setup">
      <p className="read-aloud-setup-intro">
        {needsSetup
          ? 'For natural-sounding reading, install at least two female and two male voices from this list. They are free downloads from Apple and run on this Mac.'
          : 'Recommended voices for natural-sounding reading. They run on this Mac.'}
      </p>
      <ul className="read-aloud-setup-list">
        {recommended.map((voice) => (
          <li key={voice.key} className="read-aloud-setup-item">
            <span className="read-aloud-setup-name">
              {voice.label}
              <span className="read-aloud-setup-meta">{voice.gender === 'female' ? 'Female' : 'Male'}, {voice.accent} English</span>
            </span>
            <span className="read-aloud-setup-status">{status(voice)}</span>
            {voice.voice ? (
              <span className="read-aloud-setup-actions">
                <button type="button" className="read-aloud-link-button" onClick={() => onPreview(voice.voice!)}>Preview</button>
                <button type="button" className="read-aloud-link-button" onClick={() => onUse(voice.voice!)}>Use</button>
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <ol className="read-aloud-setup-steps">
        <li>Open System Settings &gt; Accessibility &gt; Spoken Content.</li>
        <li>Next to System Voice, open Manage Voices.</li>
        <li>Under English, download the Premium (or Enhanced) version of each voice. Premium voices take about 300 to 500 MB each.</li>
        <li>Come back and click Refresh voices.</li>
      </ol>
      <div className="read-aloud-setup-buttons">
        <button
          type="button"
          className="read-aloud-text-button"
          onClick={() => {
            void readAloudApi.openVoiceSettings().then((opened) => {
              setMessage(opened ? '' : 'Could not open System Settings. Open it from the Apple menu.')
            })
          }}
        >
          Open Spoken Content settings
        </button>
        <button
          type="button"
          className="read-aloud-text-button"
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            void onRefresh().finally(() => setRefreshing(false))
          }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh voices'}
        </button>
      </div>
      {message ? <p className="read-aloud-notice" role="status">{message}</p> : null}
    </section>
  )
}
