export type Direction = 'ko2zh' | 'zh2ko'

export type EngineId = 'free' | 'openai'

export interface Segment {
  id: string
  timestampMs: number
  original: string
  translation: string
}

export interface SpeechHandlers {
  onInterim(text: string): void
  onFinal(text: string): void
  onError(message: string): void
  onEnd(): void
}

export interface SpeechEngine {
  id: EngineId
  start(lang: string, handlers: SpeechHandlers): Promise<void>
  stop(): void
}
