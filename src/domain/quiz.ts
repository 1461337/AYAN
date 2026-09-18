import type { GameState, Job } from './types'
import { SHIXI } from '../data/shixi'
import { SHIXI_EXTRA } from '../data/shixiExtra'
import { SHIXI_COUNT } from '../data/static'
import { shuffle } from './rng'

export const ALL_SHIXI = [...SHIXI, ...SHIXI_EXTRA]
const 公务池: Job[] = ['公务员', '事业单位', '国企']

export function 可用题目(g: GameState): number[] {
  const job = g.p.职业
  const list = ALL_SHIXI
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => {
      const 职业 = it.职业
      if (!职业 || !职业.length) return 公务池.includes(job)
      return 职业.includes(job)
    })
    .map((x) => x.i)
  return list.length ? list : ALL_SHIXI.map((_, i) => i)
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
  const tier = Math.min(tierOfRank(rankIdx), it.asks.length - 1)
  return { item: it, tier, variants: it.asks[tier] }
}
