import type { GameState } from '../domain/types'

export const SAVE_KEY = 'rmdmj_save_v2'
const SAVE_TIME_KEY = 'rmdmj_save_v2_time'

export function stripTransient(g: GameState): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...g }
  copy.pendingEvent = null
  copy.pendingPositions = null
  copy.pendingPosTitle = ''
  copy.yearLog = []
  return copy
}

export function saveGame(g: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(stripTransient(g)))
    localStorage.setItem(SAVE_TIME_KEY, String(Date.now()))
    return true
  } catch {
    return false
  }
}

export function lastSaveTime(): string | null {
  const t = localStorage.getItem(SAVE_TIME_KEY)
  if (!t) return null
  const d = new Date(Number(t))
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('zh-CN')
}

export function hasSave(): boolean {
  return !!localStorage.getItem(SAVE_KEY)
}

export function normalizeSave(g: GameState): GameState {
  if (!g.version) g.version = 1
  if (!g.pendingEvent) g.pendingEvent = null
  if (!g.pendingPositions) g.pendingPositions = null
  if (!g.pendingPosTitle) g.pendingPosTitle = ''
  if (!g.yearLog) g.yearLog = []
  if (!g.flags) g.flags = {}
  if (!g.assets) g.assets = { 房产: [], 车辆: [], 投资: [] }
  if (!g.market) g.market = { 房价: 1 }
  if (!g.discipline) g.discipline = { risk: 0, level: '平稳', records: [], 案件: [] }
  if (!g.discipline.案件) g.discipline.案件 = []
  if (!g.discipline.records) g.discipline.records = []
  if (!g.family) g.family = { 婚姻: '单身', 配偶: null, 子女: [] }
  if (!g.family.子女) g.family.子女 = []
  if (!g.candidates) g.candidates = []
  if (!g._本年事件) g._本年事件 = []
  return g
}

export function parseSave(text: string): GameState | null {
  try {
    const g = JSON.parse(text) as GameState
    if (!g || !g.p || !g.p.姓名) return null
    return normalizeSave(g)
  } catch {
    return null
  }
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  return parseSave(raw)
}

/* 导出为 .json 文件，便于玩家备份、换设备或分享 */
export function exportSaveFile(g: GameState): void {
  const data = JSON.stringify(stripTransient(g), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `人民的名义-存档-${g.p.姓名}-${g.date.y}年.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(SAVE_TIME_KEY)
}
