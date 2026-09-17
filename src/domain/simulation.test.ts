import { describe, expect, it, afterEach } from 'vitest'
import { resetRandomSource, setRandomSource } from './rng'
import { newState } from './newGame'
import { endYear } from './year'
import { 快照 } from './effects'
import { monthly } from './economy'
import type { GameState } from './types'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function resolvePending(g: GameState) {
  if (!g.pendingEvent) return
  const ev = g.pendingEvent
  const opt = ev.选项[Math.floor(Math.random() * ev.选项.length)]
  opt.resolve(g)
  g.pendingEvent = null
}

describe('人生模拟冒烟测试', () => {
  afterEach(() => resetRandomSource())

  it('开局状态合法', () => {
    setRandomSource(mulberry32(1))
    const g = newState({ name: '陆承宇', sex: '男', age: 24, major: '法学', job: '公务员' })
    expect(g.p.姓名).toBe('陆承宇')
    expect(g.p.年龄).toBe(24)
    expect(g.p.学历).toBe('本科')
    expect(g.p.专业匹配度).toBeGreaterThan(80)
    expect(g.npcs).toHaveLength(4)
    expect(g.shixiOrder).toHaveLength(3)
    expect(g.log.length).toBeGreaterThan(0)
    expect(g.actions).toBe(5)
  })

  it('连续推进 45 年不崩溃，状态始终合法', () => {
    setRandomSource(mulberry32(42))
    const g = newState({ name: '苏晚', sex: '女', age: 22, major: '会计学', job: '公务员' })
    g._年初快照 = 快照(g)
    let years = 0
    while (!g.over && years < 45) {
      resolvePending(g)
      if (g.quiz) g.quiz = null
      endYear(g)
      years++
      expect(g.date.y).toBe(2040 + years)
      expect(g.p.健康).toBeGreaterThanOrEqual(0)
      expect(g.p.健康).toBeLessThanOrEqual(100)
      expect(g.cash).toBeGreaterThan(Number.NEGATIVE_INFINITY)
      expect(g.p.年龄).toBe(22 + years)
    }
    expect(years).toBeGreaterThan(5)
  })

  it('各职业开局与推进均可运行', () => {
    const jobs = ['事业单位', '国企', '企业', '记者', '教师', '医生'] as const
    let seed = 7
    for (const job of jobs) {
      setRandomSource(mulberry32(seed++))
      const g = newState({ name: '周正', sex: '男', age: 26, major: '法学', job })
      g._年初快照 = 快照(g)
      for (let i = 0; i < 10 && !g.over; i++) {
        resolvePending(g)
        if (g.quiz) g.quiz = null
        endYear(g)
      }
      expect(g.p.职业).toBe(job)
      expect(g.over || g.date.y > 2040).toBe(true)
    }
  })
})

describe('经济公式', () => {
  it('等额本息月供计算正确', () => {
    expect(monthly(100000, 4.8, 5)).toBe(1878)
    expect(monthly(0, 4.8, 5)).toBe(0)
  })
})
