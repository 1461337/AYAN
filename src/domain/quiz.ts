import type { GameState, Job } from './types'
import { SHIXI } from '../data/shixi'
import { SHIXI_EXTRA } from '../data/shixiExtra'
import { SHIXI_HIGH } from '../data/shixiHigh'
import { SHIXI_COUNT } from '../data/static'
import { shuffle } from './rng'
import { 条线Of } from './selectors'

export const ALL_SHIXI = [...SHIXI, ...SHIXI_EXTRA, ...SHIXI_HIGH]
const 公务池: Job[] = ['公务员', '事业单位', '国企']

export function 可用题目(g: GameState): number[] {
  const job = g.p.职业
  const 条 = 条线Of(g.positions[0]?.岗位 || g.p.单位 || '')
  const 基础 = ALL_SHIXI
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => {
      const 职业 = it.职业
      if (职业 && 职业.length && !职业.includes(job)) return false
      if ((!职业 || !职业.length) && !公务池.includes(job)) return false
      if (it.职级范围) {
        const [低, 高] = it.职级范围
        if (g.rankIdx < 低 || g.rankIdx > 高) return false
      }
      return true
    })
  // 岗位条线匹配的题优先，通用题保底
  const 命中 = 基础.filter(({ it }) => it.条线 && it.条线.includes(条))
  const 通用 = 基础.filter(({ it }) => !it.条线 || !it.条线.length)
  const 合并 = [...命中, ...通用]
  const 选 = 合并.length >= 3 ? 合并 : 基础
  const list = 选.map((x) => x.i)
  if (list.length) return list
  // 最后兜底：只限职业，不跨职业出题
  const 保底 = ALL_SHIXI
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => {
      const 职业 = it.职业
      if (职业 && 职业.length && !职业.includes(job)) return false
      if ((!职业 || !职业.length) && !公务池.includes(job)) return false
      return true
    })
    .map((x) => x.i)
  return 保底.length ? 保底 : [0]
}

export function makeShixiOrder(g: GameState): number[] {
  const pool = 可用题目(g)
  const 已做 = g.usedThisYear || []
  const 未做 = pool.filter((i) => !已做.includes(i))
  const 剩余 = pool.filter((i) => 已做.includes(i))
  return [...shuffle(未做), ...shuffle(剩余)].slice(0, SHIXI_COUNT)
}

/* 职级 → 题库阶段：科员 / 科级 / 处级 / 厅级 / 省部级 */
export function tierOfRank(rankIdx: number): number {
  if (rankIdx <= 0) return 0
  if (rankIdx === 1) return 1
  if (rankIdx <= 3) return 2
  if (rankIdx <= 5) return 3
  return 4
}

export function 题目套(item: number, rankIdx: number) {
  const it = ALL_SHIXI[item]
  let tier = Math.min(tierOfRank(rankIdx), it.asks.length - 1)
  // 高阶段题套固定取本阶段题目，防止职级异常时回落到低阶段题
  if (it.职级范围) {
    const [低] = it.职级范围
    if (低 >= 6) tier = Math.min(4, it.asks.length - 1)
    else if (低 >= 4) tier = Math.min(3, it.asks.length - 1)
  }
  return { item: it, tier, variants: it.asks[tier] }
}
