import type { Direction } from '../types'

export async function openaiTranslate(
  apiKey: string,
  text: string,
  direction: Direction,
): Promise<string> {
  const source = direction === 'ko2zh' ? 'Korean' : 'Simplified Chinese'
  const target = direction === 'ko2zh' ? 'Simplified Chinese' : 'Korean'

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: `You are a professional simultaneous interpreter. Translate the user's ${source} into ${target}. Output ONLY the translation, with no explanations, no notes, and no quotation marks.`,
        },
        { role: 'user', content: text },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`翻译请求失败（${res.status}）：${t.slice(0, 200)}`)
  }

  const data = await res.json()
  const out: string = data?.choices?.[0]?.message?.content ?? ''
  return String(out).trim()
}
