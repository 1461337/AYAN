import type { Direction, Segment } from '../types'

export type ExportContent = 'both' | 'ko' | 'zh'

const pad = (n: number) => String(n).padStart(2, '0')

function clock(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function srtTime(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())},${String(
    d.getMilliseconds(),
  ).padStart(3, '0')}`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function triggerDownload(
  filename: string,
  content: string,
  mime: string,
  withBom = false,
) {
  const blob = new Blob([withBom ? '\uFEFF' + content : content], {
    type: mime,
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

interface Pair {
  ko: string
  zh: string
}

function pairOf(seg: Segment, direction: Direction): Pair {
  if (direction === 'ko2zh') return { ko: seg.original, zh: seg.translation }
  return { ko: seg.translation, zh: seg.original }
}

function labelOf(content: ExportContent): string {
  if (content === 'ko') return '韩文'
  if (content === 'zh') return '中文'
  return '双语'
}

export function exportTxt(
  segments: Segment[],
  direction: Direction,
  content: ExportContent,
) {
  const body = segments
    .map((s) => {
      const { ko, zh } = pairOf(s, direction)
      if (content === 'ko') return `[${clock(s.timestampMs)}]\n${ko || '（未识别）'}\n`
      if (content === 'zh') return `[${clock(s.timestampMs)}]\n${zh || '（未翻译）'}\n`
      return `[${clock(s.timestampMs)}]\n韩文：${ko}\n中文：${zh || '（未翻译）'}\n`
    })
    .join('\n')
  triggerDownload(
    `同声翻译记录_${labelOf(content)}.txt`,
    body,
    'text/plain;charset=utf-8',
    true,
  )
}

export function exportWord(
  segments: Segment[],
  direction: Direction,
  content: ExportContent,
) {
  const header =
    content === 'both'
      ? '<th>时间</th><th>韩文</th><th>中文</th>'
      : content === 'ko'
        ? '<th>时间</th><th>韩文</th>'
        : '<th>时间</th><th>中文</th>'
  const rows = segments
    .map((s) => {
      const { ko, zh } = pairOf(s, direction)
      const time = `<td>${clock(s.timestampMs)}</td>`
      if (content === 'both')
        return `<tr>${time}<td>${escapeHtml(ko)}</td><td>${escapeHtml(zh)}</td></tr>`
      if (content === 'ko')
        return `<tr>${time}<td>${escapeHtml(ko)}</td></tr>`
      return `<tr>${time}<td>${escapeHtml(zh)}</td></tr>`
    })
    .join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>同声翻译记录</title></head><body><h2>韩语同声翻译记录</h2><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse"><tr>${header}</tr>${rows}</table></body></html>`
  triggerDownload(
    `同声翻译记录_${labelOf(content)}.doc`,
    html,
    'application/msword;charset=utf-8',
  )
}

export function exportSrt(
  segments: Segment[],
  direction: Direction,
  content: ExportContent,
) {
  const blocks = segments.map((s, i) => {
    const start = s.timestampMs
    const end = segments[i + 1]?.timestampMs ?? start + 5000
    const { ko, zh } = pairOf(s, direction)
    const text =
      content === 'both' ? `${ko}\n${zh}` : content === 'ko' ? ko : zh
    return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${text}`
  })
  triggerDownload(
    `同声翻译记录_${labelOf(content)}.srt`,
    blocks.join('\n\n'),
    'text/plain;charset=utf-8',
  )
}

export function exportCsv(
  segments: Segment[],
  direction: Direction,
  content: ExportContent,
) {
  const header =
    content === 'both'
      ? '时间,韩文,中文'
      : content === 'ko'
        ? '时间,韩文'
        : '时间,中文'
  const rows = segments.map((s) => {
    const { ko, zh } = pairOf(s, direction)
    const time = clock(s.timestampMs)
    if (content === 'both') return `${time},${csvEscape(ko)},${csvEscape(zh)}`
    if (content === 'ko') return `${time},${csvEscape(ko)}`
    return `${time},${csvEscape(zh)}`
  })
  triggerDownload(
    `同声翻译记录_${labelOf(content)}.csv`,
    [header, ...rows].join('\n'),
    'text/csv;charset=utf-8',
    true,
  )
}
