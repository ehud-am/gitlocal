import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { readAloudApi, type VoiceCatalog } from '../../services/readAloudApi'
import { PauseIcon, PlayIcon, SkipIcon, CloseIcon } from '../ui/icons'
import { ReadAloudController, type ReadAloudSnapshot } from './controller'
import { SayEngine, WebSpeechEngine, loadLocalEnglishVoices, resolveWebVoice, type SpeechEngine, type SpeechError } from './engines'
import { extractSentences, type ExtractOptions } from './extract'
import { SentenceHighlighter } from './highlight'
import { READ_ALOUD_PREFERENCE_EVENT, openReadAloudSettings } from './events'
import { firstVisibleSentence, resolveCapturedSelection, selectionScope, sentenceAtNode, sentencesInRange, type CapturedSelection } from './selection'
import type { SpeechSentence } from './speech-model'
import VoiceSelect from './VoiceSelect'
import { READ_ALOUD_RATES, READ_ALOUD_SHORTCUT_LABEL, SYSTEM_VOICE_ID, isKnownSayVoice } from './voice-options'
import type { ReadAloudPreference } from '../../services/readAloudApi'

export interface ReadAloudBarHandle {
  togglePause: () => void
}

interface Props {
  getRoot: () => HTMLElement | null
  options: ExtractOptions
  selection: CapturedSelection | null
  onClose: () => void
}

function makeEngine(catalog: VoiceCatalog, voice: string, rate: number, webVoices: SpeechSynthesisVoice[]): SpeechEngine | null {
  if (catalog.engine === 'say') return new SayEngine(voice, rate)
  const webVoice = resolveWebVoice(voice, webVoices)
  return webVoice ? new WebSpeechEngine(webVoice, rate) : null
}

function positionText(snapshot: ReadAloudSnapshot | null, message: string): string {
  if (message) return message
  if (!snapshot) return 'Preparing…'
  if (snapshot.state === 'ended') return 'Finished.'
  if (snapshot.state === 'error') return snapshot.error ?? 'Speech failed.'
  return `Sentence ${Math.min(snapshot.index + 1, snapshot.total)} of ${snapshot.total}`
}

const ReadAloudBar = forwardRef<ReadAloudBarHandle, Props>(function ReadAloudBar({ getRoot, options, selection, onClose }, ref) {
  const [catalog, setCatalog] = useState<VoiceCatalog | null>(null)
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voice, setVoice] = useState(SYSTEM_VOICE_ID)
  const [rate, setRate] = useState(1)
  const [snapshot, setSnapshot] = useState<ReadAloudSnapshot | null>(null)
  const [message, setMessage] = useState('')
  const [notice, setNotice] = useState('')
  const controllerRef = useRef<ReadAloudController | null>(null)
  const sentencesRef = useRef<SpeechSentence[]>([])
  const voiceRef = useRef(voice)
  const rateRef = useRef(rate)
  const [highlighter] = useState(() => new SentenceHighlighter())
  // The start inputs are read once, when reading starts.
  const startRef = useRef({ getRoot, options, selection })

  useImperativeHandle(ref, () => ({ togglePause: () => controllerRef.current?.togglePause() }), [])

  useEffect(() => {
    let cancelled = false
    async function begin(): Promise<void> {
      const [loaded, preference] = await Promise.all([readAloudApi.voices(), readAloudApi.preference()])
      const voices = loaded.engine === 'web-speech' ? await loadLocalEnglishVoices(window.speechSynthesis) : []
      if (cancelled) return
      let voiceId = preference.voice
      const known = loaded.engine === 'say'
        ? isKnownSayVoice(loaded, voiceId)
        : voiceId === SYSTEM_VOICE_ID || voices.some((candidate) => candidate.voiceURI === voiceId)
      if (!known) {
        setNotice(`Saved voice ${voiceId} is not installed. Using the system voice.`)
        voiceId = SYSTEM_VOICE_ID
      }
      voiceRef.current = voiceId
      rateRef.current = preference.rate
      setCatalog(loaded)
      setWebVoices(voices)
      setVoice(voiceId)
      setRate(preference.rate)

      const { getRoot: readRoot, options: extractOptions, selection: selected } = startRef.current
      const root = readRoot()
      const all = root ? extractSentences(root, extractOptions) : []
      const selectedIndices = sentencesInRange(all, resolveCapturedSelection(selectionScope(root, extractOptions.type), selected))
      const sentences = selectedIndices ? selectedIndices.map((index) => all[index]) : all
      if (sentences.length === 0) {
        setMessage(extractOptions.type === 'pdf' ? 'This PDF has no text to read.' : 'Nothing to read in this file.')
        return
      }
      const engine = makeEngine(loaded, voiceId, preference.rate, voices)
      if (!engine) {
        setMessage('No on-device voices are available in this browser.')
        return
      }
      sentencesRef.current = sentences
      const controller = new ReadAloudController(engine, sentences, {
        onChange: (next) => {
          if (!cancelled) setSnapshot(next)
        },
        onSentence: (sentence) => highlighter.show(sentence?.range ?? null),
        onEngineFailure: (error: SpeechError) => {
          if (loaded.engine !== 'say' || voiceRef.current === SYSTEM_VOICE_ID) return null
          const failed = voiceRef.current
          voiceRef.current = SYSTEM_VOICE_ID
          setVoice(SYSTEM_VOICE_ID)
          setNotice(error.code === 'silent-audio'
            ? `${failed} produced no sound. Using the system voice.`
            : `${failed} is not installed. Using the system voice.`)
          return new SayEngine(SYSTEM_VOICE_ID, rateRef.current)
        },
      })
      controllerRef.current = controller
      controller.start(selectedIndices ? 0 : firstVisibleSentence(sentences, window.innerHeight))
    }
    begin().catch(() => {
      if (!cancelled) setMessage('Read aloud could not start.')
    })
    return () => {
      cancelled = true
      controllerRef.current?.stop()
      controllerRef.current = null
      highlighter.clear()
    }
  }, [highlighter])

  // While reading, clicking a sentence in the preview moves reading there.
  useEffect(() => {
    const root = startRef.current.getRoot()
    if (!root) return undefined
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      if (!target || target.closest('a, button, input, select, textarea')) return
      // A drag that selects text ends with a click; that is a new selection, not a jump.
      const selection = root.ownerDocument.getSelection()
      if (selection && !selection.isCollapsed) return
      const index = sentenceAtNode(sentencesRef.current, target)
      if (index >= 0) controllerRef.current?.start(index)
    }
    root.addEventListener('click', handleClick)
    return () => root.removeEventListener('click', handleClick)
  }, [])

  const applyEngine = useCallback((nextVoice: string, nextRate: number, save = true) => {
    if (!catalog) return
    voiceRef.current = nextVoice
    rateRef.current = nextRate
    setVoice(nextVoice)
    setRate(nextRate)
    if (save) void readAloudApi.savePreference({ voice: nextVoice, rate: nextRate })
    const engine = makeEngine(catalog, nextVoice, nextRate, webVoices)
    if (engine) controllerRef.current?.setEngine(engine)
  }, [catalog, webVoices])

  // The settings dialog saved a new voice or speed: use it for the rest of this reading.
  const applyEngineRef = useRef(applyEngine)
  applyEngineRef.current = applyEngine
  useEffect(() => {
    const handlePreference = (event: Event) => {
      const preference = (event as CustomEvent<ReadAloudPreference>).detail
      if (preference) applyEngineRef.current(preference.voice, preference.rate, false)
    }
    window.addEventListener(READ_ALOUD_PREFERENCE_EVENT, handlePreference)
    return () => window.removeEventListener(READ_ALOUD_PREFERENCE_EVENT, handlePreference)
  }, [])

  const controller = controllerRef.current
  const playing = snapshot?.state === 'playing' || snapshot?.state === 'loading'
  const needsSetup = catalog?.engine === 'say' && catalog.needsSetup && voice === SYSTEM_VOICE_ID

  return (
    <section className="read-aloud-bar" aria-label="Read aloud">
      <div className="read-aloud-controls">
        <div className="read-aloud-transport">
          <button type="button" className="panel-icon-button" aria-label="Previous heading" title="Previous heading" disabled={!controller} onClick={() => controller?.previousHeading()}>
            <SkipIcon direction="back" heading />
          </button>
          <button type="button" className="panel-icon-button" aria-label="Previous sentence" title="Previous sentence" disabled={!controller} onClick={() => controller?.previous()}>
            <SkipIcon direction="back" />
          </button>
          <button type="button" className="panel-icon-button read-aloud-play" aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (Ctrl+Alt+S)' : 'Play (Ctrl+Alt+S)'} disabled={!controller} onClick={() => controller?.togglePause()}>
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button type="button" className="panel-icon-button" aria-label="Next sentence" title="Next sentence" disabled={!controller} onClick={() => controller?.next()}>
            <SkipIcon direction="forward" />
          </button>
          <button type="button" className="panel-icon-button" aria-label="Next heading" title="Next heading" disabled={!controller} onClick={() => controller?.nextHeading()}>
            <SkipIcon direction="forward" heading />
          </button>
        </div>
        <span className="read-aloud-position" aria-live="polite">{positionText(snapshot, message)}</span>
        <div className="read-aloud-settings">
          <label className="read-aloud-field">
            <span>Voice</span>
            <VoiceSelect catalog={catalog} webVoices={webVoices} value={voice} onChange={(next) => applyEngine(next, rateRef.current)} />
          </label>
          <label className="read-aloud-field">
            <span>Speed</span>
            <select value={rate} disabled={!catalog} onChange={(event) => applyEngine(voiceRef.current, Number(event.target.value))}>
              {READ_ALOUD_RATES.map((value) => <option key={value} value={value}>{value}x</option>)}
            </select>
          </label>
          {needsSetup ? (
            <button type="button" className="read-aloud-text-button" onClick={openReadAloudSettings}>
              Get natural voices
            </button>
          ) : null}
          <button type="button" className="panel-icon-button" aria-label="Stop reading" title={`Stop reading (Esc or ${READ_ALOUD_SHORTCUT_LABEL})`} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
      </div>
      {notice ? <p className="read-aloud-notice" role="status">{notice}</p> : null}
    </section>
  )
})

export default ReadAloudBar
