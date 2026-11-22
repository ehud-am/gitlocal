import { useCallback, useEffect, useState } from 'react'
import { readAloudApi, type VoiceCatalog } from '../../services/readAloudApi'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'
import { SayEngine, WebSpeechEngine, loadLocalEnglishVoices, resolveWebVoice, unlockAudio } from './engines'
import { OPEN_READ_ALOUD_SETTINGS_EVENT, announceReadAloudPreference } from './events'
import VoiceSelect from './VoiceSelect'
import VoiceSetup from './VoiceSetup'
import { READ_ALOUD_RATES, READ_ALOUD_SHORTCUT_LABEL, SYSTEM_VOICE_ID, isKnownSayVoice } from './voice-options'
import type { NativeAppCommandEvent } from '../../types'

const PREVIEW_SENTENCE = 'This is how GitLocal reads your documents.'

// Voice and speed for read aloud, plus the macOS voice install guidance. Opened from the View
// options menu (browser), the macOS View menu, or the player bar's "Get natural voices" button.
export default function ReadAloudSettingsDialog() {
  const [open, setOpen] = useState(false)
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null)
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState(SYSTEM_VOICE_ID)
  const [rate, setRate] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const show = () => setOpen(true)
    const handleNativeCommand = (event: Event) => {
      if ((event as NativeAppCommandEvent).detail?.command === 'read-aloud-settings') setOpen(true)
    }
    window.addEventListener(OPEN_READ_ALOUD_SETTINGS_EVENT, show)
    window.addEventListener('gitlocal:native-command', handleNativeCommand)
    return () => {
      window.removeEventListener(OPEN_READ_ALOUD_SETTINGS_EVENT, show)
      window.removeEventListener('gitlocal:native-command', handleNativeCommand)
    }
  }, [])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setMessage('')
    void (async () => {
      const [loaded, preference] = await Promise.all([readAloudApi.voices(), readAloudApi.preference()])
      const voices = loaded.engine === 'web-speech' ? await loadLocalEnglishVoices(window.speechSynthesis) : []
      if (cancelled) return
      const known = loaded.engine === 'say'
        ? isKnownSayVoice(loaded, preference.voice)
        : preference.voice === SYSTEM_VOICE_ID || voices.some((candidate) => candidate.voiceURI === preference.voice)
      setCatalog(loaded)
      setWebVoices(voices)
      setVoice(known ? preference.voice : SYSTEM_VOICE_ID)
      setRate(preference.rate)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const save = useCallback((nextVoice: string, nextRate: number) => {
    setVoice(nextVoice)
    setRate(nextRate)
    const preference = { voice: nextVoice, rate: nextRate }
    void readAloudApi.savePreference(preference)
    announceReadAloudPreference(preference)
  }, [])

  const preview = useCallback((name: string) => {
    unlockAudio()
    setMessage('')
    const failed = () => setMessage('Could not play the preview.')
    if (catalog?.engine === 'say') {
      const engine = new SayEngine(name, rate)
      void engine.prepare(PREVIEW_SENTENCE)
        .then((audio) => engine.play(audio, PREVIEW_SENTENCE, new AbortController().signal))
        .catch(failed)
      return
    }
    const webVoice = resolveWebVoice(name, webVoices)
    if (!webVoice) {
      failed()
      return
    }
    void new WebSpeechEngine(webVoice, rate).play(null, PREVIEW_SENTENCE, new AbortController().signal).catch(failed)
  }, [catalog, rate, webVoices])

  const sayCatalog = catalog?.engine === 'say' ? catalog : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="read-aloud-settings-dialog">
        <DialogHeader>
          <DialogTitle>Read aloud voices</DialogTitle>
          <DialogDescription>
            Speech runs on this computer. Start or stop reading with {READ_ALOUD_SHORTCUT_LABEL}, pause with Ctrl+Alt+S, stop with Esc.
          </DialogDescription>
        </DialogHeader>
        <div className="read-aloud-settings-fields">
          <label className="read-aloud-field">
            <span>Voice</span>
            <VoiceSelect catalog={catalog} webVoices={webVoices} value={voice} onChange={(next) => save(next, rate)} />
          </label>
          <label className="read-aloud-field">
            <span>Speed</span>
            <select value={rate} disabled={!catalog} onChange={(event) => save(voice, Number(event.target.value))}>
              {READ_ALOUD_RATES.map((value) => <option key={value} value={value}>{value}x</option>)}
            </select>
          </label>
          <button type="button" className="read-aloud-text-button" disabled={!catalog} onClick={() => preview(voice)}>
            Preview
          </button>
        </div>
        {message ? <p className="read-aloud-notice" role="status">{message}</p> : null}
        {catalog?.engine === 'web-speech' && webVoices.length === 0 ? (
          <p className="read-aloud-notice" role="status">This browser has no on-device English voices.</p>
        ) : null}
        {sayCatalog ? (
          <VoiceSetup
            recommended={sayCatalog.recommended}
            needsSetup={sayCatalog.needsSetup}
            onRefresh={async () => setCatalog(await readAloudApi.voices(true))}
            onPreview={preview}
            onUse={(name) => save(name, rate)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
