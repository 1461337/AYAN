/// <reference types="node" />
import { it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { useGame } from '../store/gameStore'
import { ALL_SHIXI } from './quiz'
import { nextRankInfo } from './selectors'
import { 快照 } from './effects'
import { resetRandomSource, setRandomSource } from './rng'
import type { GameEvent, GameState, Job } from './types'

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

type 策略 = '清廉' | '贪腐' | '贪后收手' | '激进' | '稳健'

const 该收手了 = (g: GameState) => g.p.年龄 >= 55 || g.discipline.risk >= 60

/* 清廉：综合收益最优 */
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

/* 贪腐：拿钱、拿权、不怕风险 */
function 贪腐最优(g: GameState, ev: GameEvent): number {
  const saved = g.pendingEvent
  g.pendingEvent = null
  let best = 0
  let bestScore = -Infinity
  ev.选项.forEach((o, i) => {
    const copy = structuredClone(g)
    try { o.resolve(copy) } catch { /* 忽略单选项异常 */ }
    const 现金 = (copy.cash - g.cash) / 8000
    const 政绩 = (copy.zhengji - g.zhengji) / 40
    const 指标 = (copy.p.上司 - g.p.上司) + (copy.p.人脉 - g.p.人脉) + (copy.p.声望 - g.p.声望) * 0.5
    const 风险 = (copy.discipline.risk - g.discipline.risk) * 0.35
    const 案数 = ((copy.discipline.案件 || []).length - (g.discipline.案件 || []).length) * 30
    const 健康 = (copy.p.健康 - g.p.健康) * 0.5
    const score = 现金 + 政绩 + 指标 + 风险 + 案数 + 健康
    if (score > bestScore) { bestScore = score; best = i }
  })
  g.pendingEvent = saved
  return best
}

/* 稳健：保健康、避风险、重家庭，晋升顺其自然 */
function 稳健最优(g: GameState, ev: GameEvent): number {
  const saved = g.pendingEvent
  g.pendingEvent = null
  let best = 0
  let bestScore = -Infinity
  ev.选项.forEach((o, i) => {
    const copy = structuredClone(g)
    try { o.resolve(copy) } catch { /* 忽略单选项异常 */ }
    const score = (copy.p.健康 - g.p.健康) * 2
      + (copy.p.道德 - g.p.道德) * 0.5
      + (copy.p.声望 - g.p.声望) * 0.5
      - (copy.discipline.risk - g.discipline.risk) * 3
      + (copy.zhengji - g.zhengji) / 100
      + (copy.cash - g.cash) / 100000
    if (score > bestScore) { bestScore = score; best = i }
  })
  g.pendingEvent = saved
  return best
}

function 选事件(g: GameState, ev: GameEvent, 策略: 策略): number {
  if (策略 === '贪后收手' && 该收手了(g)) {
    if (ev.标题 === '纪委监委找你谈话') return 0
    return 事件最优(g, ev)
  }
  if (策略 !== '清廉' && 策略 !== '稳健' && ev.标题 === '纪委监委找你谈话') return 2
  if (策略 === '清廉') return 事件最优(g, ev)
  if (策略 === '稳健') return 稳健最优(g, ev)
  return 贪腐最优(g, ev)
}

/* 逐利/实权岗位优先（贪腐与激进打法共用）；稳健避开高配与二线 */
function 选岗(g: GameState, 策略: 策略): number {
  const list = g.pendingPositions || []
  if (!list.length) return 0
  if (策略 === '稳健') {
    const k = list.findIndex((p) => !p.高配 && !p.二线)
    if (k >= 0) return k
  }
  if (策略 === '激进') {
    const k = list.findIndex((p) => /大学|三甲|集团|总编辑|校长|院长|副主任医师|主任医师/.test(p.名))
    if (k >= 0) return k
  }
  const 逐利 = 策略 !== '清廉' && 策略 !== '稳健'
  if (逐利 && !(策略 === '贪后收手' && 该收手了(g))) {
    const k = list.findIndex((p) => /住建|交通|发改|自然资源|规划|城建|城管|财政|市场监管/.test(p.名))
    if (k >= 0) return k
  }
  return 0
}

interface 模拟配置 {
  姓名: string
  职业: Job
  专业: string
  种子: number
  策略: 策略
  年龄?: number
}

interface 模拟结果 {
  配置: 模拟配置
  结局: string
  详情: string[]
}

function 跑一局(c: 模拟配置): 模拟结果 {
  const rng = mulberry32(c.种子)
  setRandomSource(rng)
  const oldRandom = Math.random
  Math.random = rng
  try {
    useGame.getState().start({ name: c.姓名, sex: '男', age: c.年龄 ?? 24, major: c.专业, job: c.职业 })
    let s = useGame.getState()
    if (s.game) s.game._年初快照 = 快照(s.game)

    const 升迁记录: string[] = []

    for (let year = 0; year < 75; year++) {
      s = useGame.getState()
      if (!s.game || s.game.over) break

      // 就任
      let guard = 0
      while (s.game?.pendingPositions && s.game.pendingPositions.length && guard++ < 5) {
        useGame.getState().choosePos(选岗(s.game, c.策略))
        s = useGame.getState()
      }

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
      const 健康线 = c.策略 === '稳健' ? 78 : 55
      if (s.game && s.game.p.健康 < 健康线 && s.game.actions > 0 && s.game.cash > 20000) useGame.getState().healthPaid()
      s = useGame.getState()

      // 婚恋
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
          const cc = after.candidates.find((x) => x.id === cand.id)
          if (cc && cc.好感度 >= 60 && !cc.恋爱中) useGame.getState().date(cc.id, '表白')
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
        const idx = 选事件(s.game, s.game.pendingEvent, c.策略)
        useGame.getState().chooseEvent(idx)
      }

      // 结束本年
      useGame.getState().endYear()
      s = useGame.getState()
      if (s.game?.yearSummary) useGame.getState().closeSummary()
      s = useGame.getState()
      if (s.game?.pendingPositions) {
        useGame.getState().choosePos(选岗(s.game, c.策略))
        s = useGame.getState()
      }
      if (s.game && s.game.positions.length !== 升迁记录.length) {
        const 新 = s.game.positions.slice(0, s.game.positions.length - 升迁记录.length)
        for (const p of 新.reverse()) 升迁记录.push(`${p.年}年 ${p.职级} · ${p.岗位}`)
      }
    }

    const g = useGame.getState().game!
    const 详情: string[] = []
    详情.push(`===== ${c.职业} · ${c.策略}打法 =====`)
    详情.push(`姓名：${g.p.姓名}（${g.p.性别}）　出生地：${g.p.出生地}　家庭背景：${g.p.家庭背景}`)
    详情.push(`求学：${g.p.学历} · ${g.p.专业}　专业匹配度：${g.p.专业匹配度}%`)
    详情.push(`起止：${g.beginYear} 年参加工作 → ${g.endYear || g.date.y} 年${g.status === '死亡' ? (g.discipline.移送 ? '落马' : '去世') : '结束'}　享年 ${g.p.年龄} 岁`)
    详情.push(`最终身份：${g.status}${g.discipline.移送 ? '（移送司法）' : ''}　最后平台：${g.p.平台} · ${g.p.城市} · ${g.p.单位}`)
    详情.push(`最后职务：${g.positions[0]?.岗位 || '无'}（${g.positions[0]?.职级 || '无'}）`)
    详情.push('')
    详情.push(`六项指标：政绩 ${g.zhengji.toLocaleString('zh-CN')}　能力 ${g.p.能力}　道德 ${g.p.道德}　健康 ${g.p.健康}　人脉 ${g.p.人脉}　领导评价 ${g.p.上司}　声望 ${g.p.声望}`)
    详情.push(`廉政：风险 ${g.discipline.risk}　处分 ${g.p2.处分} 次　嘉奖 ${g.p2.嘉奖} 次　涉案 ${(g.discipline.案件 || []).reduce((a, x) => a + x.金额, 0).toLocaleString('zh-CN')} 元　已查 ${(g.discipline.已查金额 || 0).toLocaleString('zh-CN')} 元${g.discipline.移送 ? '　【移送司法】' : ''}`)
    详情.push(`资产：现金 ${g.cash.toLocaleString('zh-CN')} 元　房产 ${g.assets.房产.length} 套　车辆 ${g.assets.车辆.length} 辆　负债 ${(g.loans.reduce((a, l) => a + l.余额, 0) + g.负债).toLocaleString('zh-CN')} 元`)
    详情.push(`家庭：${g.family.婚姻}${g.family.配偶 ? ` · 配偶 ${g.family.配偶.姓名}（${g.family.配偶.身份}，好感 ${g.family.配偶.好感度}）` : ''}　子女 ${g.family.子女.length} 人`)
    详情.push('')
    详情.push(`晋升次数：${Math.max(0, g.positions.length - 1)} 次`)
    详情.push('任职经历（按时间）：')
    for (const r of 升迁记录.slice(-12)) 详情.push('  ' + r)
    详情.push('')
    详情.push('人生轨迹（最后 8 条）：')
    for (const l of g.log.slice(0, 8)) 详情.push(`  [${l.t}] ${l.h}：${l.d.split('\n')[0]}`)
    详情.push('')

    const 结局 = g.discipline.移送
      ? `落马：涉案 ${(g.discipline.案件 || []).reduce((a, x) => a + x.金额, 0).toLocaleString('zh-CN')} 元，移送司法`
      : g.status === '死亡'
        ? `于 ${g.endYear} 年去世，享年 ${g.p.年龄} 岁，最后职务 ${g.positions[0]?.岗位 || '无'}`
        : `在世，最后职务 ${g.positions[0]?.岗位 || '无'}`
    return { 配置: c, 结局, 详情 }
  } finally {
    Math.random = oldRandom
    resetRandomSource()
  }
}

it('全部职业人生模拟（含公务员贪腐打法）', () => {
  const 配置s: 模拟配置[] = [
    { 姓名: '陆承宇', 职业: '公务员', 专业: '法学', 种子: 2026, 策略: '清廉' },
    { 姓名: '周明远', 职业: '公务员', 专业: '土木工程', 种子: 2027, 策略: '贪腐' },
    { 姓名: '曹得志', 职业: '公务员', 专业: '工程管理', 种子: 2034, 策略: '贪后收手' },
    { 姓名: '陈守拙', 职业: '公务员', 专业: '法学', 种子: 2040, 策略: '稳健' },
    { 姓名: '许砚舟', 职业: '事业单位', 专业: '土木工程', 种子: 2028, 策略: '清廉' },
    { 姓名: '方雨桐', 职业: '事业单位', 专业: '会计学', 种子: 2035, 策略: '贪后收手' },
    { 姓名: '齐静之', 职业: '事业单位', 专业: '汉语言文学', 种子: 2041, 策略: '稳健' },
    { 姓名: '林北辰', 职业: '国企', 专业: '会计学', 种子: 2029, 策略: '清廉' },
    { 姓名: '赵启铭', 职业: '国企', 专业: '工商管理', 种子: 2036, 策略: '贪腐' },
    { 姓名: '郭惟俭', 职业: '国企', 专业: '经济学', 种子: 2042, 策略: '稳健' },
    { 姓名: '沈亦寒', 职业: '企业', 专业: '工商管理', 种子: 2030, 策略: '清廉' },
    { 姓名: '韩东野', 职业: '企业', 专业: '经济学', 种子: 2037, 策略: '激进' },
    { 姓名: '陆知进退', 职业: '企业', 专业: '会计学', 种子: 2043, 策略: '稳健' },
    { 姓名: '顾长川', 职业: '记者', 专业: '新闻学', 种子: 2031, 策略: '清廉' },
    { 姓名: '苏怀瑾', 职业: '记者', 专业: '汉语言文学', 种子: 2038, 策略: '激进' },
    { 姓名: '方秉笔', 职业: '记者', 专业: '新闻学', 种子: 2044, 策略: '稳健' },
    { 姓名: '程知远', 职业: '教师', 专业: '汉语言文学', 种子: 2032, 策略: '清廉' },
    { 姓名: '唐佩珊', 职业: '教师', 专业: '英语', 种子: 2039, 策略: '激进', 年龄: 26 },
    { 姓名: '温守正', 职业: '教师', 专业: '数学与应用数学', 种子: 2045, 策略: '稳健' },
    { 姓名: '裴景行', 职业: '医生', 专业: '临床医学', 种子: 2033, 策略: '清廉' },
    { 姓名: '白景明', 职业: '医生', 专业: '口腔医学', 种子: 2040, 策略: '激进', 年龄: 26 },
    { 姓名: '许仁心', 职业: '医生', 专业: '预防医学', 种子: 2046, 策略: '稳健' },
  ]

  const 结果s: 模拟结果[] = []
  for (const c of 配置s) {
    结果s.push(跑一局(c))
  }

  const report: string[] = []
  report.push('====== 全职业人生模拟报告 ======')
  report.push('')
  report.push('【结局速览】')
  for (const r of 结果s) {
    report.push(`- ${r.配置.职业}${r.配置.策略 === '贪腐' ? '（贪腐）' : ''}　${r.配置.姓名}：${r.结局}`)
  }
  report.push('')
  for (const r of 结果s) {
    report.push(...r.详情)
  }

  const dest = path.join(process.env.TEMP || process.cwd(), 'opencode', 'playthrough-all.txt')
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, report.join('\n'), 'utf8')
  console.log('ALL_PLAYTHROUGH_WRITTEN', dest)

  for (const r of 结果s) {
    const g = useGame.getState().game
    void g
    expect(r.结局.length).toBeGreaterThan(2)
    expect(r.详情.length).toBeGreaterThan(12)
  }
  const 贪官s = 结果s.filter((r) => r.配置.策略 === '贪腐' || r.配置.策略 === '贪后收手')
  expect(贪官s.length).toBeGreaterThanOrEqual(4)
  expect(贪官s.some((r) => r.结局.includes('落马'))).toBe(true)
}, 240000)
