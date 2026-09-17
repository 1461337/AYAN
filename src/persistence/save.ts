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

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  try {
    const g = JSON.parse(raw) as GameState
    if (!g || !g.p) return null
    if (!g.version) g.version = 1
    if (!g.pendingEvent) g.pendingEvent = null
    if (!g.pendingPositions) g.pendingPositions = null
    if (!g.pendingPosTitle) g.pendingPosTitle = ''
    if (!g.yearLog) g.yearLog = []
    if (!g.flags) g.flags = {}
    if (!g.assets) g.assets = { 房产: [], 车辆: [], 投资: [] }
    if (!g.market) g.market = { 房价: 1 }
    if (!g.discipline.案件) g.discipline.案件 = []
    if (!g.discipline.records) g.discipline.records = []
    if (!g.family.子女) g.family.子女 = []
    if (!g.candidates) g.candidates = []
    if (!g._本年事件) g._本年事件 = []
    return g
  } catch {
    return null
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(SAVE_TIME_KEY)
}
