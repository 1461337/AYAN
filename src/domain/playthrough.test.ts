/// <reference types="node" />
import { it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { useGame } from '../store/gameStore'
import { ALL_SHIXI } from './quiz'
import { nextRankInfo } from './selectors'
import { 快照 } from './effects'
import type { GameEvent, GameState } from './types'

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

function 事件最优(g: GameState, ev: GameEvent): number {
  const saved = g.pendingEvent
  g.pendingEvent = null
  let best = 0
  let bestScore = -Infinity
  ev.选项.forEach((o, i) => {
    const copy = structuredClone(g)
    try { o.resolve(copy) } catch { /* 忽略单选项异常 */ }
    const score = (copy.zhengji - g.zhengji) / 50
      + (copy.p.道德 - g.p.道德) + (copy.p.声望 - g.p.声望) + (copy.p.上司 - g.p.上司)
      + (copy.p.健康 - g.p.健康) * 0.5
      - (copy.discipline.risk - g.discipline.risk) * 2
      + (copy.cash - g.cash) / 50000
    if (score > bestScore) { bestScore = score; best = i }
  })
  g.pendingEvent = saved
  return best
}

it('公务员完整人生模拟（输出结局）', () => {
  const rng = mulberry32(2026)
  const oldRandom = Math.random
  Math.random = rng

  useGame.getState().start({ name: '陆承宇', sex: '男', age: 24, major: '法学', job: '公务员' })
  let s = useGame.getState()
  s.game!._年初快照 = 快照(s.game!)

  const 升迁记录: string[] = []

  for (let year = 0; year < 70; year++) {
    s = useGame.getState()
    if (!s.game || s.game.over) break

    // 就任
    let guard = 0
    while (s.game?.pendingPositions && s.game.pendingPositions.length && guard++ < 5) {
      useGame.getState().choosePos(0)
    }
    s = useGame.getState()

    // 应答处置题
    guard = 0
    while (s.game?.quiz && guard++ < 5) {
      const q = s.game.quiz!
      const item = ALL_SHIXI[q.item]
      const variants = item.asks[Math.min(q.tier, item.asks.length - 1)]
      const set = variants[Math.min(q.variant, variants.length - 1)]
      const k = q.order.findIndex((ai) => set.a[ai].判 === '正确')
      useGame.getState().answerQuiz(k >= 0 ? k : 0)
      s = useGame.getState()
    }

    // 施政 + 汇报
    guard = 0
    while ((s.game?.actions ?? 0) > 0 && guard++ < 8) {
      const gg = s.game!
      const 未做 = gg.shixiOrder.filter((i) => !gg.usedThisYear.includes(i))
      if (未做.length) {
        useGame.getState().shixi(未做[0])
        s = useGame.getState()
        // 立即作答
        const q = s.game?.quiz
        if (q) {
          const item = ALL_SHIXI[q.item]
          const variants = item.asks[Math.min(q.tier, item.asks.length - 1)]
          const set = variants[Math.min(q.variant, variants.length - 1)]
          const k = q.order.findIndex((ai) => set.a[ai].判 === '正确')
          useGame.getState().answerQuiz(k >= 0 ? k : 0)
          s = useGame.getState()
        }
      } else {
        useGame.getState().rel('leader', '汇报')
        s = useGame.getState()
      }
    }

    // 年度免费体检
    if (s.game && !s.game.flags['本年免费健康']) useGame.getState().healthFree()
    s = useGame.getState()
    if (s.game && s.game.p.健康 < 55 && s.game.actions > 0 && s.game.cash > 20000) useGame.getState().healthPaid()
    s = useGame.getState()

    // 婚恋：用免费/约会提升好感，够了就结婚
    if (s.game && !s.game.family.配偶 && s.game.candidates.length) {
      const cand = s.game.candidates[0]
      const 方式s = s.game.浪漫方式 || ['散步', '吃饭', '看电影', '短途旅行']
      for (const m of 方式s) {
        const cur = useGame.getState()
        if (!cur.game || cur.game.family.配偶) break
        if (cur.game.cash < 3500 && m !== '散步' && m !== '一起运动') continue
        useGame.getState().date(cand.id, m)
      }
      const after = useGame.getState().game
      if (after && after.candidates.length) {
        const c = after.candidates.find((x) => x.id === cand.id)
        if (c && c.好感度 >= 60 && !c.恋爱中) useGame.getState().date(c.id, '表白')
        const after2 = useGame.getState().game
        const c2 = after2?.candidates.find((x) => x.id === cand.id)
        if (c2 && c2.好感度 >= 80 && useGame.getState().game!.actions > 0) useGame.getState().marry(c2.id)
      }
    }

    // 主动申请晋升
    s = useGame.getState()
    if (s.game && s.game.actions > 0 && nextRankInfo(s.game).can) useGame.getState().applyPromote()

    // 事件
    s = useGame.getState()
    if (s.game?.pendingEvent) {
      const idx = 事件最优(s.game, s.game.pendingEvent)
      useGame.getState().chooseEvent(idx)
    }

    // 结束本年
    useGame.getState().endYear()
    s = useGame.getState()
    if (s.game?.yearSummary) useGame.getState().closeSummary()
    s = useGame.getState()
    if (s.game?.pendingPositions) {
      useGame.getState().choosePos(0)
      s = useGame.getState()
    }
    if (s.game && s.game.positions.length !== 升迁记录.length) {
      const 新 = s.game.positions.slice(0, s.game.positions.length - 升迁记录.length)
      for (const p of 新.reverse()) 升迁记录.push(`${p.年}年 ${p.职级} · ${p.岗位}`)
    }
  }

  Math.random = oldRandom
  const g = useGame.getState().game!
  const lines: string[] = []
  lines.push('===== 公务员人生模拟结局 =====')
  lines.push(`姓名：${g.p.姓名}（${g.p.性别}）　出生地：${g.p.出生地}　家庭背景：${g.p.家庭背景}`)
  lines.push(`求学：${g.p.学历} · ${g.p.专业}　专业匹配度：${g.p.专业匹配度}%`)
  lines.push(`起止：${g.beginYear} 年参加工作 → ${g.endYear || g.date.y} 年${g.status === '死亡' ? '去世' : '结束'}　享年 ${g.p.年龄} 岁`)
  lines.push(`最终身份：${g.status}　最后平台：${g.p.平台} · ${g.p.城市} · ${g.p.单位}`)
  lines.push(`最后职务：${g.positions[0]?.岗位 || '无'}（${g.positions[0]?.职级 || '无'}）`)
  lines.push('')
  lines.push(`六项指标：政绩 ${g.zhengji.toLocaleString('zh-CN')}　能力 ${g.p.能力}　道德 ${g.p.道德}　健康 ${g.p.健康}　人脉 ${g.p.人脉}　领导评价 ${g.p.上司}　声望 ${g.p.声望}`)
  lines.push(`廉政：风险 ${g.discipline.risk}　处分 ${g.p2.处分} 次　嘉奖 ${g.p2.嘉奖} 次　涉案 ${(g.discipline.案件 || []).reduce((a, x) => a + x.金额, 0).toLocaleString('zh-CN')} 元${g.discipline.移送 ? '　【已移送司法】' : ''}`)
  lines.push(`资产：现金 ${g.cash.toLocaleString('zh-CN')} 元　房产 ${g.assets.房产.length} 套　车辆 ${g.assets.车辆.length} 辆　负债 ${(g.loans.reduce((a, l) => a + l.余额, 0) + g.负债).toLocaleString('zh-CN')} 元`)
  lines.push(`家庭：${g.family.婚姻}${g.family.配偶 ? ` · 配偶 ${g.family.配偶.姓名}（${g.family.配偶.身份}，好感 ${g.family.配偶.好感度}）` : ''}　子女 ${g.family.子女.length} 人`)
  lines.push('')
  lines.push(`晋升次数：${Math.max(0, g.positions.length - 1)} 次`)
  lines.push('任职经历（按时间）：')
  for (const r of 升迁记录.slice(-14)) lines.push('  ' + r)
  lines.push('')
  lines.push('人生轨迹（最后 12 条）：')
  for (const l of g.log.slice(0, 12)) lines.push(`  [${l.t}] ${l.h}：${l.d.split('\n')[0]}`)
  lines.push('')
  lines.push(`结局判定：${g.discipline.移送 ? '严重违纪违法，移送司法' : g.status === '死亡' ? `于 ${g.endYear} 年去世，享年 ${g.p.年龄} 岁` : '在世'}`)

  const dest = path.join(process.env.TEMP || process.cwd(), 'opencode', 'playthrough.txt')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, lines.join('\n'), 'utf8')
  console.log('PLAYTHROUGH_WRITTEN', dest)

  expect(g.over).toBe(true)
  expect(g.positions.length).toBeGreaterThan(3)
  expect(g.log.length).toBeGreaterThan(10)
}, 60000)
