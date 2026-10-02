import type { SpeechEngine, SpeechHandlers } from '../types'

export function createWebSpeechEngine(): SpeechEngine {
  const w = window as unknown as Record<string, unknown>
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => any)
    | undefined

  let recognition: any = null
  let handlers: SpeechHandlers | null = null
  let lang = ''
  let stopping = false

  const begin = () => {
    if (!handlers || !Ctor) return
    recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        const text: string = r[0]?.transcript ?? ''
        if (r.isFinal) final += text
        else interim += text
      }
      if (interim) handlers?.onInterim(interim)
      if (final) handlers?.onFinal(final)
    }

    recognition.onerror = (event: any) => {
      const code: string = event.error ?? ''
      if (code === 'no-speech' || code === 'aborted') return
      handlers?.onError(mapSpeechError(code))
    }

    recognition.onend = () => {
      if (!stopping) {
        try {
          begin()
        } catch {
          /* ignore */
        }
      } else {
        handlers?.onEnd()
      }
    }

    try {
      recognition.start()
    } catch {
      /* ignore */
    }
  }

  return {
    id: 'free',
    async start(l, h) {
      if (!Ctor) {
        throw new Error('当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器')
      }
      handlers = h
      lang = l
      stopping = false
      begin()
    },
    stop() {
      stopping = true
      try {
        recognition?.stop()
      } catch {
        /* ignore */
      }
    },
  }
}

function mapSpeechError(code: string): string {
  switch (code) {
    case 'network':
      return '语音识别网络错误，请检查网络连接'
    case 'not-allowed':
    case 'service-not-allowed':
      return '麦克风权限被拒绝，请在浏览器中允许访问麦克风'
    case 'audio-capture':
      return '未检测到麦克风设备'
    case 'language-not-supported':
      return '当前浏览器不支持该语言'
    default:
      return `语音识别错误：${code}`
  }
}
