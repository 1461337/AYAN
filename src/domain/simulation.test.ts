import { describe, expect, it, afterEach } from 'vitest'
import { resetRandomSource, setRandomSource } from './rng'
import { newState } from './newGame'
import { endYear } from './year'
import { 快照 } from './effects'
import { monthly } from './economy'
import { genPositions } from './promotion'
import { 本地职位 } from './positions'
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

describe('本地化晋升', () => {
  it('县区职位覆盖党政主官、组宣统与纪检法检公司', () => {
    const names = 本地职位('县级', 2, '岩台县').map((p) => p.名).join('|')
    expect(names).toContain('岩台县副县长')
    expect(names).toContain('岩台县委常委、组织部部长')
    expect(names).toContain('岩台县委常委、宣传部部长')
    expect(names).toContain('岩台县委常委、统战部部长')
    expect(names).toContain('岩台县委常委、政法委书记')
    expect(names).toContain('岩台县纪委书记、县监委主任')
    expect(names).toContain('岩台县人民法院院长')
    expect(names).toContain('岩台县人民检察院检察长')
    expect(names).toContain('岩台县公安局局长')
  })

  it('省级职位覆盖纪检、法院、检察院方向', () => {
    const names = 本地职位('省级', 6, '京州市').map((p) => p.名).join('|')
    expect(names).toContain('省纪委书记、省监委主任')
    expect(names).toContain('省高级人民法院院长')
    expect(names).toContain('省人民检察院检察长')
  })

  it('晋升候选以本地区岗位为主', () => {
    setRandomSource(mulberry32(11))
    const g = newState({ name: '周正', sex: '男', age: 32, major: '法学', job: '公务员' })
    g.rankIdx = 1
    g.p.平台 = '县级'
    g.p.城市 = '岩台县'
    g.positions = [{ 年: 2040, 职级: '乡科级正职', 岗位: '岩台县财政局局长', 条线: '财政' }]
    g.flags['基层经历'] = true
    g.p2.任职年 = 5
    g.zhengji = 100000
    const list = genPositions(g, 2)
    expect(list.length).toBeGreaterThanOrEqual(3)
    const local = list.filter((p) => p.名.includes('岩台县')).length
    expect(local).toBeGreaterThanOrEqual(Math.ceil(list.length / 2))
  })
})
