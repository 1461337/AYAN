import type { Segment } from '../types'

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

export function exportTxt(segments: Segment[]) {
  const body = segments
    .map(
      (s) =>
        `[${clock(s.timestampMs)}]\n${s.original}\n${s.translation || '（未翻译）'}\n`,
    )
    .join('\n')
  triggerDownload(
    '同声翻译记录.txt',
    body,
    'text/plain;charset=utf-8',
    true,
  )
}

export function exportWord(segments: Segment[]) {
  const rows = segments
    .map(
      (s) => `
      <tr>
        <td>${clock(s.timestampMs)}</td>
        <td>${escapeHtml(s.original)}</td>
        <td>${escapeHtml(s.translation)}</td>
      </tr>`,
    )
    .join('')
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>同声翻译记录</title></head><body><h2>韩语同声翻译记录</h2><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse"><tr><th>时间</th><th>原文</th><th>译文</th></tr>${rows}</table></body></html>`
  triggerDownload('同声翻译记录.doc', html, 'application/msword;charset=utf-8')
}

export function exportSrt(segments: Segment[]) {
  const blocks = segments.map((s, i) => {
    const start = s.timestampMs
    const end = segments[i + 1]?.timestampMs ?? start + 5000
    return `${i + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${s.original}\n${
      s.translation || ''
    }`
  })
  triggerDownload('同声翻译记录.srt', blocks.join('\n\n'), 'text/plain;charset=utf-8')
}

export function exportCsv(segments: Segment[]) {
  const header = '时间,原文,译文'
  const rows = segments.map(
    (s) =>
      `${clock(s.timestampMs)},${csvEscape(s.original)},${csvEscape(s.translation)}`,
  )
  triggerDownload(
    '同声翻译记录.csv',
    [header, ...rows].join('\n'),
    'text/csv;charset=utf-8',
    true,
  )
}
