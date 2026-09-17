import type { Effect, GameState, Snapshot } from './types'
import { clamp, fmt } from '../utils/format'
import { TIER_WEIGHT, 平台系数 } from '../data/static'

/* 平台产出系数：层级越高，经手事项的影响面越大；二线产出减半 */
export function 政绩系数(g: GameState): number {
  if (!g || g.rankIdx < 0) return 1
  const base = Math.pow(TIER_WEIGHT, g.rankIdx + 1)
  const p = 平台系数[g.p.平台] || 1
  return g.flags && g.flags['二线'] ? base * p * 0.5 : base * p
}

export function perfLabel(g: GameState | null): string {
  return g && g.p.职业 === '公务员' ? '政绩点' : '业绩点'
}

export function applyEffect(g: GameState, e: Effect | undefined | null): void {
  if (!e) return
  const stats: Array<'能力' | '道德' | '健康' | '人脉' | '上司' | '声望'> = ['能力', '道德', '健康', '人脉', '上司', '声望']
  for (const k of stats) {
    const v = e[k]
    if (v) g.p[k] = clamp(g.p[k] + v, 0, 100)
  }
  if (e.政绩) g.zhengji = Math.max(0, g.zhengji + Math.round(e.政绩 * 政绩系数(g)))
  const cash = e.cash ?? e.现金
  if (cash) g.cash += cash
  if (e.廉政风险) g.discipline.risk = clamp(g.discipline.risk + e.廉政风险, 0, 100)
  if (e.flag) g.flags[e.flag] = true
  if (e.rel) {
    for (const id in e.rel) {
      const d = e.rel[id]
      if (!d) continue
      if (id === 'family') {
        const sp = g.family.配偶
        if (!sp) continue
        if (d.信任 != null) sp.信任 = clamp(sp.信任 + d.信任, -100, 100)
        if (d.利益 != null) sp.利益 = clamp(sp.利益 + d.利益, -100, 100)
        if (d.公开 != null) sp.公开 = clamp(sp.公开 + d.公开, -100, 100)
        if (d.好感度 != null) sp.好感度 = clamp(sp.好感度 + d.好感度, 0, 100)
        continue
      }
      const r = g.npcs.find((n) => n.id === id)
      if (!r) continue
      if (d.信任 != null) r.信任 = clamp(r.信任 + d.信任, -100, 100)
      if (d.利益 != null) r.利益 = clamp(r.利益 + d.利益, -100, 100)
      if (d.公开 != null) r.公开 = clamp(r.公开 + d.公开, -100, 100)
      if (d.好感度 != null) r.好感度 = clamp(r.好感度 + d.好感度, 0, 100)
    }
  }
  if (e.mem) {
    for (const id in e.mem) {
      const r = g.npcs.find((n) => n.id === id)
      if (r) r.memory.unshift(e.mem[id])
    }
  }
}

/* 收过的每一笔都会留在档案里，构成风险的下限 */
export function 案件风险底(g: GameState): number {
  const c = (g.discipline && g.discipline.案件) || []
  return Math.min(92, c.reduce((a, x) => a + Math.min(16, Math.round(x.金额 / 120000 * 6) + 4), 0))
}

export function 涉案金额(g: GameState): number {
  return ((g.discipline && g.discipline.案件) || []).reduce((a, x) => a + x.金额, 0)
}

export function 人脉上限(g: GameState | null): number {
  if (!g) return 60
  return clamp(45 + Math.max(0, g.rankIdx + 1) * 6, 45, 100)
}

export function 快照(g: GameState): Snapshot {
  return {
    政绩: g.zhengji, 能力: g.p.能力, 道德: g.p.道德, 健康: g.p.健康, 人脉: g.p.人脉,
    上司: g.p.上司, 声望: g.p.声望, 现金: g.cash, 风险: g.discipline.risk, 职级: g.zhijiIdx, 职务: g.rankIdx,
  }
}

export function 差异(前: Snapshot, 后: Snapshot, 简称?: boolean, 业绩标签 = '政绩点'): string {
  const 项: [string, keyof Snapshot][] = [
    ['政绩', '政绩'], ['能力', '能力'], ['道德', '道德'], ['健康', '健康'],
    ['人脉', '人脉'], ['声望', '声望'], ['领导评价', '上司'], ['廉政风险', '风险'],
  ]
  const out: string[] = []
  项.forEach(([名, 键]) => {
    const d = 后[键] - 前[键]
    if (!d) return
    if (名 === '廉政风险' && d > 0) {
      out.push(`廉政风险 +${d}`)
      return
    }
    out.push(`${简称 && 名 === '政绩' ? 业绩标签 : 名} ${d > 0 ? '+' : '-'}${fmt(Math.abs(d))}`)
  })
  const dz = 后.现金 - 前.现金
  if (dz) out.push(`现金 ${dz > 0 ? '+' : '-'}¥${fmt(Math.abs(dz))}`)
  return out.join('　')
}

export function 影响期内(g: GameState): boolean {
  return !!(g.discipline && g.discipline.影响期 && g.date.y < g.discipline.影响期)
}
