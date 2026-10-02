import type { SpeechEngine, SpeechHandlers } from '../types'

const CHUNK_SECONDS = 4000

export function createOpenAIWhisperEngine(
  getKey: () => string,
  getGain: () => number,
): SpeechEngine {
  let mediaRecorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let audioCtx: AudioContext | null = null
  let gainNode: GainNode | null = null
  let chunks: Blob[] = []
  let handlers: SpeechHandlers | null = null
  let lang = ''
  let timer: number | null = null
  let sending = false

  const send = async () => {
    if (chunks.length === 0 || sending) return
    const blob = new Blob(chunks, { type: 'audio/webm' })
    chunks = []
    sending = true
    try {
      const fd = new FormData()
      fd.append('file', blob, 'audio.webm')
      fd.append('model', 'whisper-1')
      fd.append('language', lang)
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getKey()}` },
        body: fd,
      })
      if (!res.ok) {
        const text = await res.text()
        handlers?.onError(`识别请求失败（${res.status}）：${text.slice(0, 200)}`)
        return
      }
      const data = await res.json()
      const text: string = (data?.text ?? '').trim()
      if (text) handlers?.onFinal(text)
    } catch {
      handlers?.onError('识别网络错误，请检查网络连接')
    } finally {
      sending = false
    }
  }

  return {
    id: 'openai',
    async start(l, h) {
      handlers = h
      lang = l
      chunks = []
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      })

      let audioStream: MediaStream = stream
      try {
        audioCtx = new AudioContext()
        const source = audioCtx.createMediaStreamSource(stream)
        gainNode = audioCtx.createGain()
        gainNode.gain.value = getGain()
        const dest = audioCtx.createMediaStreamDestination()
        source.connect(gainNode)
        gainNode.connect(dest)
        audioStream = dest.stream
      } catch {
        audioCtx = null
        gainNode = null
        /* 环境不支持 WebAudio 增益时回退原始麦克风流 */
      }

      mediaRecorder = new MediaRecorder(audioStream)
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      mediaRecorder.start(1000)
      timer = window.setInterval(() => void send(), CHUNK_SECONDS)
    },
    stop() {
      if (timer !== null) {
        clearInterval(timer)
        timer = null
      }
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.onstop = () => {
          void send()
          stream?.getTracks().forEach((t) => t.stop())
          void audioCtx?.close()
        }
        mediaRecorder.stop()
      } else {
        void send()
        stream?.getTracks().forEach((t) => t.stop())
        void audioCtx?.close()
      }
    },
    setGain(value) {
      if (gainNode) gainNode.gain.value = value
    },
  }
}
