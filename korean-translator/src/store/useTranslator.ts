import { useCallback, useEffect, useRef, useState } from 'react'
import type { Direction, EngineId, Segment, SpeechEngine } from '../types'
import { createWebSpeechEngine } from '../engines/webSpeech'
import { createOpenAIWhisperEngine } from '../engines/openaiWhisper'
import { freeTranslate } from '../engines/freeTranslate'
import { openaiTranslate } from '../engines/openaiTranslate'

const SETTINGS_KEY = 'kt_settings_v1'
const SESSION_KEY = 'kt_session_v1'

export interface Settings {
  engineId: EngineId
  direction: Direction
  apiKey: string
}

const DEFAULT_SETTINGS: Settings = {
  engineId: 'free',
  direction: 'ko2zh',
  apiKey: '',
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

function loadSession(): Segment[] {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Segment[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

export function useTranslator() {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [segments, setSegments] = useState<Segment[]>(loadSession)
  const [listening, setListening] = useState(false)
  const [starting, setStarting] = useState(false)
  const [interim, setInterim] = useState('')
  const [latest, setLatest] = useState('')
  const [error, setError] = useState('')

  const engineRef = useRef<SpeechEngine | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(segments))
    } catch {
      /* ignore */
    }
  }, [segments])

  const translate = useCallback(async (text: string): Promise<string> => {
    const { engineId, apiKey, direction } = settingsRef.current
    if (engineId === 'openai') {
      if (!apiKey.trim()) throw new Error('请先在设置中填写 OpenAI API Key')
      return openaiTranslate(apiKey.trim(), text, direction)
    }
    return freeTranslate(text, direction)
  }, [])

  const handleFinal = useCallback(
    (text: string) => {
      const clean = text.trim()
      if (!clean) return
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const seg: Segment = { id, timestampMs: Date.now(), original: clean, translation: '' }
      setSegments((prev) => [...prev, seg])
      setInterim('')
      setLatest('翻译中…')
      translate(clean)
        .then((t) => {
          setSegments((prev) =>
            prev.map((s) => (s.id === id ? { ...s, translation: t } : s)),
          )
          setLatest(t)
        })
        .catch((e: unknown) => {
          setSegments((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, translation: '（翻译失败）' } : s,
            ),
          )
          setLatest('')
          setError(e instanceof Error ? e.message : String(e))
        })
    },
    [translate],
  )

  const start = useCallback(async () => {
    setError('')
    setInterim('')
    setLatest('')
    setStarting(true)
    try {
      const { engineId, direction } = settingsRef.current
      const lang = direction === 'ko2zh' ? 'ko-KR' : 'zh-CN'
      const whisperLang = direction === 'ko2zh' ? 'ko' : 'zh'
      const engine =
        engineId === 'openai'
          ? createOpenAIWhisperEngine(() => settingsRef.current.apiKey)
          : createWebSpeechEngine()
      const speechLang = engineId === 'openai' ? whisperLang : lang
      await engine.start(speechLang, {
        onInterim: setInterim,
        onFinal: handleFinal,
        onError: setError,
        onEnd: () => setListening(false),
      })
      engineRef.current = engine
      setListening(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStarting(false)
    }
  }, [handleFinal])

  const stop = useCallback(() => {
    engineRef.current?.stop()
    engineRef.current = null
    setListening(false)
    setInterim('')
  }, [])

  const clear = useCallback(() => {
    setSegments([])
    setLatest('')
    setInterim('')
  }, [])

  const removeSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }, [])

  return {
    settings,
    setSettings,
    segments,
    setSegments,
    listening,
    starting,
    interim,
    latest,
    error,
    setError,
    start,
    stop,
    clear,
    removeSegment,
  }
}
