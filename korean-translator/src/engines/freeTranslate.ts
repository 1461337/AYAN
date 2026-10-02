import type { Direction } from '../types'

export async function freeTranslate(
  text: string,
  direction: Direction,
): Promise<string> {
  const langpair = direction === 'ko2zh' ? 'ko|zh-CN' : 'zh-CN|ko'
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text,
  )}&langpair=${langpair}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('免费翻译请求失败，请稍后重试')
  const data = await res.json()
  const out: string | undefined = data?.responseData?.translatedText
  if (!out || typeof out !== 'string' || out.trim() === '') {
    throw new Error('免费翻译失败，请稍后重试')
  }
  return out.trim()
}
