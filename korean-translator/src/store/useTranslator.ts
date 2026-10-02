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
  gain: number
}

const DEFAULT_SETTINGS: Settings = {
  engineId: 'free',
  direction: 'ko2zh',
  apiKey: '',
  gain: 6,
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

function joinFragments(a: string, b: string, direction: Direction): string {
  if (direction === 'ko2zh') return a.endsWith(' ') ? a + b : a + ' ' + b
  return a + b
}

function friendlyError(e: unknown): string {
  if (e && typeof e === 'object' && 'name' in e) {
    const name = (e as { name?: string }).name ?? ''
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return '麦克风权限被拒绝。请在浏览器「网站设置 / 锁图标」里允许麦克风后重试。'
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return '未检测到麦克风设备，请确认设备已连接。'
    }
    if (name === 'NotReadableError') {
      return '麦克风被其他应用占用，请关闭占用麦克风的程序后重试。'
    }
  }
  return e instanceof Error ? e.message : String(e)
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
  const interimTimer = useRef<number | null>(null)
  const bufferRef = useRef('')
  const bufferTimer = useRef<number | null>(null)
  const translateCache = useRef<Map<string, string>>(new Map())
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
    const cached = translateCache.current.get(text)
    if (cached) return cached
    const { engineId, apiKey, direction } = settingsRef.current
    let result: string
    if (engineId === 'openai') {
      if (!apiKey.trim()) throw new Error('请先在设置中填写 OpenAI API Key')
      result = await openaiTranslate(apiKey.trim(), text, direction)
    } else {
      result = await freeTranslate(text, direction)
    }
    translateCache.current.set(text, result)
    return result
  }, [])

  const handleInterim = useCallback(
    (text: string) => {
      setInterim(text)
      const clean = text.trim()
      if (!clean) return
      if (interimTimer.current !== null) clearTimeout(interimTimer.current)
      interimTimer.current = window.setTimeout(() => {
        translate(clean)
          .then((t) => setLatest(t))
          .catch(() => {
            /* 忽略临时翻译错误，避免频繁弹错 */
          })
      }, 800)
    },
    [translate],
  )

  const createSegment = useCallback(
    (clean: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const seg: Segment = { id, timestampMs: Date.now(), original: clean, translation: '' }
      setSegments((prev) => [...prev, seg])
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

  const flushBuffer = useCallback(() => {
    if (bufferTimer.current !== null) {
      clearTimeout(bufferTimer.current)
      bufferTimer.current = null
    }
    const text = bufferRef.current.trim()
    bufferRef.current = ''
    if (text) createSegment(text)
  }, [createSegment])

  const handleFinal = useCallback(
    (raw: string) => {
      const clean = raw.trim()
      if (!clean) return
      setInterim('')

      const buf = bufferRef.current.trim()
      let next: string
      if (!buf) {
        next = clean
      } else if (clean === buf) {
        next = buf
      } else if (clean.startsWith(buf)) {
        next = clean
      } else if (buf.endsWith(clean)) {
        next = buf
      } else {
        next = joinFragments(buf, clean, settingsRef.current.direction)
      }
      bufferRef.current = next

      if (interimTimer.current !== null) {
        clearTimeout(interimTimer.current)
        interimTimer.current = null
      }
      interimTimer.current = window.setTimeout(() => {
        translate(next)
          .then((t) => setLatest(t))
          .catch(() => {
            /* 忽略临时翻译错误 */
          })
      }, 500)

      if (/[。！？!?.]$/.test(next) || next.length > 150) {
        flushBuffer()
        return
      }
      if (bufferTimer.current !== null) clearTimeout(bufferTimer.current)
      bufferTimer.current = window.setTimeout(() => flushBuffer(), 1500)
    },
    [translate, flushBuffer],
  )

  const start = useCallback(async () => {
    setError('')
    setInterim('')
    setLatest('')
    bufferRef.current = ''
    if (bufferTimer.current !== null) {
      clearTimeout(bufferTimer.current)
      bufferTimer.current = null
    }
    setStarting(true)
    try {
      const { engineId, direction } = settingsRef.current
      const lang = direction === 'ko2zh' ? 'ko-KR' : 'zh-CN'
      const whisperLang = direction === 'ko2zh' ? 'ko' : 'zh'
      const engine =
        engineId === 'openai'
          ? createOpenAIWhisperEngine(
              () => settingsRef.current.apiKey,
              () => settingsRef.current.gain,
            )
          : createWebSpeechEngine()
      const speechLang = engineId === 'openai' ? whisperLang : lang
      await engine.start(speechLang, {
        onInterim: handleInterim,
        onFinal: handleFinal,
        onError: setError,
        onEnd: () => setListening(false),
      })
      engineRef.current = engine
      setListening(true)
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setStarting(false)
    }
  }, [handleFinal, handleInterim])

  const stop = useCallback(() => {
    flushBuffer()
    engineRef.current?.stop()
    engineRef.current = null
    setListening(false)
    setInterim('')
    if (interimTimer.current !== null) {
      clearTimeout(interimTimer.current)
      interimTimer.current = null
    }
  }, [flushBuffer])

  const clear = useCallback(() => {
    setSegments([])
    setLatest('')
    setInterim('')
    bufferRef.current = ''
    if (bufferTimer.current !== null) {
      clearTimeout(bufferTimer.current)
      bufferTimer.current = null
    }
  }, [])

  const removeSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const setGain = useCallback((value: number) => {
    setSettings((prev) => ({ ...prev, gain: value }))
    engineRef.current?.setGain?.(value)
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
    setGain,
  }
}
