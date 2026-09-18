import { describe, expect, it, afterEach } from 'vitest'
import { resetRandomSource, setRandomSource } from './rng'
import { newState, 刷新人脉职务 } from './newGame'
import { endYear } from './year'
import { 快照, 案件风险底 } from './effects'
import { monthly, buyAsset, sellAsset, repayLoan, repayDebt } from './economy'
import { genPositions, doPromote, settlePosition, 向上社交 } from './promotion'
import { nextRankInfo } from './selectors'
import { disciplineTick, 处置结果 } from './discipline'
import { makeEvent, make腐败事件, makeRetiredEvent, npcTick, 政府事件标题 } from './events'
import { makeShixiOrder } from './quiz'
import { SHIXI } from '../data/shixi'
import { SHIXI_EXTRA } from '../data/shixiExtra'
import { 政治本地职位, 平台序, 机构Of } from './positions'
import { 职务阶梯 } from '../data/static'
import type { AdvicePosition, GameState, Job } from './types'

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

function 装备晋升条件(g: GameState) {
  g.zhengji = 999999
  g.p.能力 = 100
  g.p.道德 = 100
  g.p.上司 = 100
  g.p.人脉 = 100
  g.p.健康 = 95
  g.p2.任职年 = 8
  g.p2.初次晋升 = true
  g.flags['基层经历'] = true
  g._年初快照 = 快照(g)
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
    expect(g.candidates.length).toBe(2)
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

  it('七种职业各自推进并完成晋升，参数合法', () => {
    const jobs: Job[] = ['公务员', '事业单位', '国企', '企业', '记者', '教师', '医生']
    let seed = 7
    for (const job of jobs) {
      setRandomSource(mulberry32(seed++))
      const g = newState({ name: '周正', sex: '男', age: 26, major: '法学', job })
      装备晋升条件(g)
      for (let i = 0; i < 20 && !g.over; i++) {
        if (g.pendingPositions) {
          expect(g.pendingPositions.length).toBeGreaterThanOrEqual(3)
          g.pendingPositions = null
        }
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

  it('全款不产生贷款，偿还负债与提前结清有效', () => {
    setRandomSource(mulberry32(9))
    const g = newState({ name: '周正', sex: '男', age: 26, major: '法学', job: '公务员' })
    g.cash = 5_000_000
    g.负债 = 30000
    const r1 = buyAsset(g, '车', 0, 'full')
    expect(r1.ok).toBe(true)
    expect(g.loans.length).toBe(0)
    expect(g.assets.车辆.length).toBe(1)
    const r2 = buyAsset(g, '房', 0, 'loan')
    expect(r2.ok).toBe(true)
    expect(g.loans.length).toBe(1)
    const r3 = repayLoan(g, 0)
    expect(r3.ok).toBe(true)
    expect(g.loans.length).toBe(0)
    const r4 = repayDebt(g)
    expect(r4.ok).toBe(true)
    expect(g.负债).toBe(0)
  })

  it('同类资产出售时结清对应贷款', () => {
    setRandomSource(mulberry32(67))
    const g = newState({ name: '周正', sex: '男', age: 26, major: '法学', job: '公务员' })
    g.cash = 1_000_000
    buyAsset(g, '车', 0, 'loan')
    buyAsset(g, '车', 0, 'loan')
    expect(g.loans.length).toBe(2)
    const 标识0 = g.assets.车辆[0].标识
    const r = sellAsset(g, '车', 0)
    expect(r.ok).toBe(true)
    expect(g.loans.length).toBe(1)
    expect(g.loans[0].标识).not.toBe(标识0)
    expect(g.loans[0].标识).toBe(g.assets.车辆[0].标识)
  })
})

describe('逻辑一致性', () => {
  it('退休后不再缴存公积金', () => {
    setRandomSource(mulberry32(61))
    const g = newState({ name: '苏晚', sex: '女', age: 54, major: '会计学', job: '公务员' })
    g.status = '退休'
    g.loans = []
    const f0 = g.fund
    endYear(g)
    expect(g.fund).toBe(f0)
  })

  it('非体制内不触发纪检监察', () => {
    setRandomSource(mulberry32(63))
    const g = newState({ name: '周正', sex: '男', age: 30, major: '计算机科学与技术', job: '企业' })
    g.discipline.risk = 100
    for (let i = 0; i < 200; i++) disciplineTick(g)
    expect(g.discipline.records.length).toBe(0)
    expect(g.pendingEvent).toBeNull()
  })

  it('晋升后刷新题库优先未做项', () => {
    setRandomSource(mulberry32(65))
    const g = newState({ name: '周正', sex: '男', age: 26, major: '计算机科学与技术', job: '企业' })
    const first = g.shixiOrder[0]
    g.usedThisYear = [first]
    const order = makeShixiOrder(g)
    expect(order[0]).not.toBe(first)
  })

  it('向上社交常驻，且人脉层级随晋升上移', () => {
    setRandomSource(mulberry32(91))
    const g = newState({ name: '周正', sex: '男', age: 30, major: '法学', job: '公务员' })
    g.rankIdx = 2
    const 前 = g.npcs.find((n) => n.id === 'leader')!.身份
    刷新人脉职务(g)
    const 后 = g.npcs.find((n) => n.id === 'leader')!.身份
    expect(后).not.toBe(前)
    expect(后).toContain('分管领导（')

    g.npcs[0].好感度 = 1
    g.npcs[1].好感度 = 2
    const 名字 = 向上社交(g)
    expect(名字).toContain('（')
    expect(g.npcs.length).toBe(4)
  })

  it('公务员处级提任要求本科及以上学历', () => {
    setRandomSource(mulberry32(95))
    const g = newState({ name: '周正', sex: '男', age: 32, major: '法学', job: '公务员' })
    装备晋升条件(g)
    g.rankIdx = 1
    g.p.学历 = '大专'
    const res = doPromote(g, true)
    expect(res.kind).toBe('toast')
    expect(res.msg || '').toContain('学历')
  })

  it('省长不会直接升任中央部长，书记/组工轨道才会', () => {
    setRandomSource(mulberry32(101))
    const 省长 = newState({ name: '周正', sex: '男', age: 56, major: '法学', job: '公务员' })
    省长.rankIdx = 7
    省长.p.平台 = '省级'
    省长.positions = [{ 年: 省长.date.y, 职级: '省部级正职', 岗位: '省长', 条线: '主官' }]
    const 省长候选 = genPositions(省长, 8).map((p) => p.名)
    expect(省长候选).not.toContain('中央组织部部长')
    expect(省长候选).toContain('国务委员')

    const 书记 = newState({ name: '周正', sex: '男', age: 58, major: '法学', job: '公务员' })
    书记.rankIdx = 7
    书记.p.平台 = '省级'
    书记.positions = [{ 年: 书记.date.y, 职级: '省部级正职', 岗位: '省委书记', 条线: '主官' }]
    expect(genPositions(书记, 8).map((p) => p.名)).toContain('中央组织部部长')
  })

  it('高平台岗位的单位映射正确', () => {
    expect(机构Of('中央组织部部长', '京州市', '省级', '公务员')).toBe('中共中央组织部')
    expect(机构Of('中央宣传部部长', '京州市', '省级', '公务员')).toBe('中共中央宣传部')
    expect(机构Of('省长', '京州市', '省级', '公务员')).toBe('省政府')
    expect(机构Of('省委书记', '京州市', '省级', '公务员')).toBe('省委')
    expect(机构Of('省政协主席', '京州市', '省级', '公务员')).toBe('省政协')
    expect(机构Of('省纪委书记、省监委主任', '京州市', '省级', '公务员')).toBe('省纪委监委')
    expect(机构Of('京州市市长', '京州市', '市级', '公务员')).toBe('京州市政府')
    expect(机构Of('岩台县委书记', '岩台县', '县级', '公务员')).toBe('岩台县委')
  })

  it('人脉更替不会出现重名', () => {
    setRandomSource(mulberry32(99))
    const g = newState({ name: '周正', sex: '男', age: 40, major: '法学', job: '公务员' })
    for (let i = 0; i < 300; i++) {
      g.npcs.forEach((n) => { n.年龄 = 62 })
      npcTick(g)
    }
    const 名s = g.npcs.map((n) => n.姓名)
    expect(new Set(名s).size).toBe(名s.length)
    for (const l of g.log.filter((x) => x.h === '人脉更替')) {
      const m = l.d.match(/^(.+?)到龄退居二线，(.+?)接替/)
      if (m) expect(m[1]).not.toBe(m[2])
    }
  })

  it('学历不足会阻止考察并写入轨迹', () => {
    setRandomSource(mulberry32(97))
    const g = newState({ name: '周正', sex: '男', age: 32, major: '法学', job: '公务员' })
    g.rankIdx = 1
    g.p.学历 = '大专'
    装备晋升条件(g)
    const ni = nextRankInfo(g)
    expect(ni.学历不足).toBe(true)
    expect(ni.can).toBe(false)
    endYear(g)
    expect(g.log.some((x) => x.d.includes('学历未达本科及以上要求'))).toBe(true)
  })

  it('非公务员在市级平台可本地上到更高职级', () => {
    setRandomSource(mulberry32(93))
    const g = newState({ name: '苏晚', sex: '女', age: 30, major: '临床医学', job: '医生' })
    g.rankIdx = 4
    g.p.平台 = '市级'
    g.p.城市 = '京州市'
    const list = genPositions(g, 5)
    expect(list.length).toBeGreaterThanOrEqual(3)
    expect(list.every((p) => (p.序号 ?? 2) === 2)).toBe(true)
  })

  it('单身不出现家庭/配偶相关事件', () => {
    setRandomSource(mulberry32(71))
    const g = newState({ name: '周正', sex: '男', age: 28, major: '法学', job: '公务员' })
    g.family.配偶 = null
    for (let i = 0; i < 200; i++) {
      expect(makeEvent(g).标题).not.toBe('家里的事')
      const ev = make腐败事件(g)
      if (ev) expect(ev.标题).not.toBe('配偶收下的钱')
    }
  })

  it('非体制内不出现政府类事件', () => {
    setRandomSource(mulberry32(73))
    const g = newState({ name: '周正', sex: '男', age: 26, major: '计算机科学与技术', job: '企业' })
    for (let i = 0; i < 200; i++) {
      expect(政府事件标题).not.toContain(makeEvent(g).标题)
    }
  })

  it('行动题库每个职级阶段至少三套，且按职级随机抽题', () => {
    for (const it of SHIXI) {
      expect(it.asks.length).toBeGreaterThanOrEqual(3)
      for (const tier of it.asks) expect(tier.length).toBeGreaterThanOrEqual(3)
    }
    const 职业s: Job[] = ['事业单位', '国企', '企业', '记者', '教师', '医生']
    for (const job of 职业s) {
      const items = SHIXI_EXTRA.filter((it) => !it.职业 || it.职业.includes(job))
      for (let tier = 0; tier < 3; tier++) {
        const 题量 = items.reduce((a, it) => a + (it.asks[Math.min(tier, it.asks.length - 1)]?.length || 0), 0)
        expect(题量).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('突发事件近期不重复，池子足够大', () => {
    setRandomSource(mulberry32(79))
    const g = newState({ name: '周正', sex: '男', age: 30, major: '法学', job: '公务员' })
    const 标题s: string[] = []
    for (let i = 0; i < 12; i++) 标题s.push(makeEvent(g).标题)
    expect(new Set(标题s).size).toBeGreaterThanOrEqual(9)
    const 退休 = newState({ name: '林远', sex: '男', age: 66, major: '法学', job: '公务员' })
    退休.status = '退休'
    const 退休题: string[] = []
    for (let i = 0; i < 6; i++) 退休题.push(makeRetiredEvent(退休).标题)
    expect(new Set(退休题).size).toBeGreaterThanOrEqual(5)
  })

  it('无子女无房产时不出现对应退休剧情', () => {
    setRandomSource(mulberry32(75))
    const g = newState({ name: '林远', sex: '男', age: 60, major: '法学', job: '公务员' })
    g.family.子女 = []
    g.assets.房产 = []
    for (let i = 0; i < 200; i++) {
      const ev = makeRetiredEvent(g)
      expect(ev.标题).not.toBe('孩子想让你帮忙带孙辈')
      expect(ev.标题).not.toBe('卖房还是留着')
    }
  })

  it('案卷风险底线不被年度冲淡', () => {
    setRandomSource(mulberry32(81))
    const g = newState({ name: '周正', sex: '男', age: 30, major: '法学', job: '公务员' })
    g.discipline.案件.push({ 年: g.date.y, 事由: '收受礼金', 金额: 200000 })
    const 底 = 案件风险底(g)
    expect(底).toBeGreaterThan(0)
    g.discipline.risk = 底 + 6
    g._年初快照 = 快照(g)
    endYear(g)
    expect(g.discipline.risk).toBeGreaterThanOrEqual(底)
  })

  it('非工程条线不出现工程结算事件', () => {
    setRandomSource(mulberry32(83))
    const g = newState({ name: '周正', sex: '男', age: 30, major: '法学', job: '公务员' })
    g.rankIdx = 1
    g.positions = [{ 年: g.date.y, 职级: '乡科级正职', 岗位: '岩台县教育局局长', 条线: '教育' }]
    for (let i = 0; i < 200; i++) {
      expect(make腐败事件(g)!.标题).not.toBe('项目结算后的“感谢”')
    }
    const g2 = newState({ name: '周正', sex: '男', age: 30, major: '土木工程', job: '公务员' })
    g2.rankIdx = 1
    g2.positions = [{ 年: g2.date.y, 职级: '乡科级正职', 岗位: '岩台县住房和城乡建设局局长', 条线: '住建' }]
    let 出现 = false
    for (let i = 0; i < 300 && !出现; i++) {
      if (make腐败事件(g2)!.标题 === '项目结算后的“感谢”') 出现 = true
    }
    expect(出现).toBe(true)
  })

  it('腐败事件只在合理职级与条线出现', () => {
    setRandomSource(mulberry32(85))
    const 高阶 = ['规划指标上的“办法”', '信封里的“推荐”', '亲属的“生意”']
    const g = newState({ name: '周正', sex: '男', age: 28, major: '法学', job: '公务员' })
    g.rankIdx = 0
    g.positions = [{ 年: g.date.y, 职级: '乡科级副职', 岗位: '平塘镇副镇长', 条线: '主官' }]
    for (let i = 0; i < 300; i++) {
      expect(高阶).not.toContain(make腐败事件(g)!.标题)
    }

    const g2 = newState({ name: '周正', sex: '男', age: 32, major: '法学', job: '公务员' })
    g2.rankIdx = 1
    g2.positions = [{ 年: g2.date.y, 职级: '乡科级正职', 岗位: '岩台县教育局局长', 条线: '教育' }]
    for (let i = 0; i < 300; i++) {
      const 名 = make腐败事件(g2)!.标题
      expect(名).not.toBe('检查发现后的“通融”')
      expect(名).not.toBe('招投标前的“招呼”')
    }
  })

  it('临近退休才出现“最后一把”事件', () => {
    setRandomSource(mulberry32(87))
    const g = newState({ name: '林远', sex: '男', age: 40, major: '法学', job: '公务员' })
    g.rankIdx = 1
    g.positions = [{ 年: g.date.y, 职级: '乡科级正职', 岗位: '岩台县财政局局长', 条线: '财政' }]
    for (let i = 0; i < 200; i++) {
      expect(make腐败事件(g)!.标题).not.toBe('退休前的“最后一把”')
    }
    g.p.年龄 = 58
    let 出现 = false
    for (let i = 0; i < 300 && !出现; i++) {
      if (make腐败事件(g)!.标题 === '退休前的“最后一把”') 出现 = true
    }
    expect(出现).toBe(true)
  })
})

describe('本地化晋升', () => {
  it('县区职位覆盖党政主官、组宣统与纪检法检公司', () => {
    const names = 政治本地职位('县级', 2, '岩台县').map((p) => p.名).join('|')
    expect(names).toContain('岩台县副县长')
    expect(names).toContain('常务副县长')
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
    const names = 政治本地职位('省级', 6, '京州市').map((p) => p.名).join('|')
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
    expect(list.length).toBeGreaterThanOrEqual(7)
    const local = list.filter((p) => p.本地 || p.名.includes('岩台县')).length
    expect(local).toBeGreaterThanOrEqual(3)
  })

  it('县局级以上晋升必含一个二线岗位', () => {
    setRandomSource(mulberry32(23))
    const g = newState({ name: '林远', sex: '男', age: 40, major: '法学', job: '公务员' })
    g.rankIdx = 2
    g.p.平台 = '县级'
    g.p.城市 = '岩台县'
    g.zhengji = 100000
    const list = genPositions(g, 3)
    expect(list.length).toBeGreaterThanOrEqual(7)
    expect(list.some((p) => p.二线)).toBe(true)
  })

  it('平台不会越级：乡镇升处级只会给到县级平台', () => {
    setRandomSource(mulberry32(31))
    const g = newState({ name: '方军', sex: '男', age: 35, major: '法学', job: '公务员' })
    g.rankIdx = 1
    g.p.平台 = '乡镇级'
    g.p.城市 = '平塘镇'
    g.zhengji = 100000
    g.flags['基层经历'] = true
    const list = genPositions(g, 2)
    expect(list.length).toBeGreaterThanOrEqual(7)
    expect(list.every((p) => (p.序号 ?? 1) <= 1)).toBe(true)
    expect(list.some((p) => p.名.includes('县') || p.名.includes('区'))).toBe(true)
  })

  it('非公务员岗位来自本职业序列', () => {
    setRandomSource(mulberry32(5))
    const g = newState({ name: '苏晚', sex: '女', age: 30, major: '临床医学', job: '医生' })
    g.rankIdx = 0
    g.p.平台 = '县级'
    const list = genPositions(g, 1)
    expect(list.length).toBeGreaterThanOrEqual(7)
    expect(list.some((p) => /医院|卫生院/.test(p.名))).toBe(true)
    expect(list.some((p) => /主治医师/.test(p.名))).toBe(true)
  })

  it('首次晋升（乡镇）必含党政领导职务', () => {
    setRandomSource(mulberry32(3))
    const g = newState({ name: '方军', sex: '男', age: 26, major: '法学', job: '公务员' })
    g.rankIdx = -1
    g.p.平台 = '乡镇级'
    g.p.城市 = '平塘镇'
    const list = genPositions(g, 0)
    expect(list.length).toBeGreaterThanOrEqual(7)
    const s = list.map((p) => p.名).join('|')
    expect(/党委副书记|组织委员|宣传委员|统战委员|常务副/.test(s)).toBe(true)
  })

  it('县级正处升厅级只会给出市级岗位，不越级到省级', () => {
    setRandomSource(mulberry32(13))
    const g = newState({ name: '林远', sex: '男', age: 45, major: '法学', job: '公务员' })
    g.rankIdx = 3
    g.p.平台 = '县级'
    g.p.城市 = '岩台县'
    g.zhengji = 999999
    g.flags['基层经历'] = true
    const list = genPositions(g, 4)
    expect(list.length).toBeGreaterThanOrEqual(7)
    expect(list.every((p) => (p.序号 ?? 1) <= 2)).toBe(true)
    expect(list.some((p) => p.名.includes('市'))).toBe(true)
  })

  it('乡科级正职晋升也保证有二线岗位', () => {
    setRandomSource(mulberry32(17))
    const g = newState({ name: '周正', sex: '男', age: 40, major: '法学', job: '公务员' })
    g.rankIdx = 0
    g.p.平台 = '乡镇级'
    g.p.城市 = '平塘镇'
    g.zhengji = 999999
    const list = genPositions(g, 1)
    expect(list.length).toBeGreaterThanOrEqual(7)
    expect(list.some((p) => p.二线)).toBe(true)
  })

  it('长跑审计：不越级、不出现裸职级岗位、配偶职级不越位', () => {
    const jobs: Job[] = ['公务员', '事业单位', '国企', '企业', '记者', '教师', '医生']
    const 裸职级 = new Set(职务阶梯.map((d) => d.名))
    let seed = 200
    for (const job of jobs) {
      setRandomSource(mulberry32(seed++))
      const g = newState({ name: '审计', sex: '男', age: 24, major: '法学', job })
      装备晋升条件(g)
      for (let i = 0; i < 45 && !g.over; i++) {
        if (g.pendingPositions) {
          expect(g.pendingPositions.length).toBeGreaterThanOrEqual(3)
          const 名s = g.pendingPositions.map((p) => p.名)
          expect(new Set(名s).size).toBe(名s.length)
          const 现序 = 平台序[g.p.平台] ?? 1
          for (const p of g.pendingPositions) {
            expect(p.序号 ?? 现序).toBeLessThanOrEqual(现序 + 1)
          }
          const 选 = g.pendingPositions[0]
          g.pendingPositions = null
          settlePosition(g, 选)
        }
        resolvePending(g)
        if (g.quiz) g.quiz = null
        endYear(g)
        for (const item of g.positions) {
          expect(裸职级.has(item.岗位)).toBe(false)
        }
        const sp = g.family.配偶
        if (sp && ['公务员', '事业单位人员', '国企人员'].includes(sp.类别) && sp.职级 != null) {
          expect(sp.职级).toBeLessThanOrEqual(g.rankIdx)
        }
      }
    }
  })

  it('扩展岗位库覆盖党委/政府/群团/人大政协序列', () => {
    const 县 = 政治本地职位('县级', 1, '岩台县').map((p) => p.名).join('|')
    expect(县).toContain('岩台县教育局局长')
    expect(县).toContain('岩台县委组织部副部长')
    expect(县).toContain('岩台县总工会')
    expect(县).toContain('共青团岩台县委')
    expect(县).toContain('岩台县人大常委会')
    expect(县).toContain('岩台县医疗保障局')

    const 市 = 政治本地职位('市级', 3, '京州市').map((p) => p.名).join('|')
    expect(市).toContain('京州市教育局局长')
    expect(市).toContain('京州市委宣传部副部长')
    expect(市).toContain('京州市体育局')

    const 省 = 政治本地职位('省级', 3, '京州市').map((p) => p.名).join('|')
    expect(省).toContain('省教育厅处长')
    expect(省).toContain('省委组织部处长')

    const 镇 = 政治本地职位('乡镇级', 0, '平塘镇').map((p) => p.名).join('|')
    expect(镇).toContain('平塘镇党政办公室副主任')
    expect(镇).toContain('平塘镇司法所副所长')
  })

  it('岗位库包含现实常见的兼任岗位', () => {
    const 县 = 政治本地职位('县级', 2, '岩台县').map((p) => p.名).join('|')
    expect(县).toContain('岩台县副县长、岩台县公安局局长')
    expect(县).toContain('岩台县委常委、组织部部长兼县委党校校长')

    const 市 = 政治本地职位('市级', 4, '京州市').map((p) => p.名).join('|')
    expect(市).toContain('京州市副市长、京州市公安局局长')
    expect(市).toContain('京州市委常委、市委秘书长')

    const 省 = 政治本地职位('省级', 6, '京州市').map((p) => p.名).join('|')
    expect(省).toContain('副省长、省公安厅厅长')
    expect(省).toContain('省委常委、组织部部长兼省委党校校长')
  })

  it('高平台岗位职级与职务严格对应', () => {
    const 省2 = 政治本地职位('省级', 2, '京州市').map((p) => p.名).join('|')
    expect(省2).not.toMatch(/省高级人民法院副院长|省人民检察院副检察长|省委宣传部副部长|省纪委常委/)
    expect(省2).toMatch(/副处长/)

    const 省4 = 政治本地职位('省级', 4, '京州市').map((p) => p.名).join('|')
    expect(省4).not.toMatch(/省高级人民法院副院长|省人民检察院副检察长|省委宣传部副部长|省委政法委副书记/)
    expect(省4).toMatch(/省公安厅副厅长/)

    const 省5 = 政治本地职位('省级', 5, '京州市').map((p) => p.名).join('|')
    expect(省5).toMatch(/省高级人民法院副院长|省委宣传部副部长/)

    const 市2 = 政治本地职位('市级', 2, '京州市').map((p) => p.名).join('|')
    expect(市2).not.toMatch(/中级人民法院副院长|人民检察院副检察长|委组织部部长/)

    const 市3 = 政治本地职位('市级', 3, '京州市').map((p) => p.名).join('|')
    expect(市3).toMatch(/中级人民法院副院长|委组织部副部长/)
    expect(市3).not.toMatch(/京州市公安局局长/)
    expect(市3).toMatch(/公安局副局长|公安局常务副局长/)

    const 县0 = 政治本地职位('县级', 0, '岩台县').map((p) => p.名).join('|')
    expect(县0).not.toMatch(/人民法院副院长|人民检察院副检察长|委组织部副部长/)

    const 县1 = 政治本地职位('县级', 1, '岩台县').map((p) => p.名).join('|')
    expect(县1).toMatch(/人民法院副院长|委组织部副部长/)

    const 法检越级 = [
      ['县级', 3, '人民法院院长'],
      ['市级', 5, '中级人民法院院长'],
      ['省级', 8, '高级人民法院院长'],
    ] as const
    for (const [平台, idx, 禁] of 法检越级) {
      const names = 政治本地职位(平台, idx, '京州市').map((p) => p.名).join('|')
      expect(names).not.toContain(禁)
    }
  })

  it('医生职称晋升有年资硬杠杠，不能被破格压成一年一级', () => {
    setRandomSource(mulberry32(5))
    const g = newState({ name: '裴景行', sex: '男', age: 30, major: '临床医学', job: '医生' })
    g.rankIdx = 1
    g.positions = [{ 年: g.date.y, 职级: '主治医师', 岗位: '县人民医院内科主治医师', 条线: '卫健' }]
    g.zhengji = 999999
    g.p.能力 = 100
    g.p.道德 = 100
    g.p.上司 = 100
    g.p.人脉 = 100
    g.p.健康 = 95
    g.p2.任职年 = 1
    expect(nextRankInfo(g).can).toBe(false)
    expect(nextRankInfo(g).min).toBeGreaterThanOrEqual(5)
    g.p2.任职年 = 4
    expect(nextRankInfo(g).can).toBe(true)
  })

  it('移送司法的贪官会被追缴违法所得', () => {
    setRandomSource(() => 0.5)
    const g = newState({ name: '周明远', sex: '男', age: 45, major: '土木工程', job: '公务员' })
    g.rankIdx = 5
    g.cash = 5_000_000
    g.discipline.risk = 90
    g.discipline.案件 = [{ 年: g.date.y, 事由: '受贿', 金额: 3_000_000 }]
    处置结果(g, 1)
    expect(g.discipline.移送).toBe(true)
    expect(g.over).toBe(true)
    expect(g.cash).toBe(2_000_000)
  })

  it('得罪人会招来实名举报，风险为零也会被查', () => {
    setRandomSource(() => 0.0001)
    const g = newState({ name: '周正', sex: '男', age: 45, major: '法学', job: '公务员' })
    g.discipline.risk = 0
    g.discipline.结怨 = 5
    disciplineTick(g)
    expect(g.pendingEvent?.标题).toBe('纪委监委找你谈话')
    expect(g.log.some((x) => x.h === '被举报')).toBe(true)
  })

  it('旧案可能被同案人牵出来（意外落马）', () => {
    setRandomSource(() => 0.0001)
    const g = newState({ name: '周正', sex: '男', age: 45, major: '法学', job: '公务员' })
    g.discipline.risk = 5
    g.discipline.案件 = [{ 年: g.date.y - 2, 事由: '受贿', 金额: 2_000_000 }]
    disciplineTick(g)
    expect(g.pendingEvent?.标题).toBe('纪委监委找你谈话')
    expect(g.log.some((x) => x.h === '意外')).toBe(true)
  })

  it('退出现职后旧案风险逐年降温，存在平安着陆空间', () => {
    setRandomSource(mulberry32(11))
    const g = newState({ name: '周正', sex: '男', age: 58, major: '法学', job: '公务员' })
    g.discipline.案件 = [{ 年: g.date.y, 事由: '受贿', 金额: 2_000_000 }]
    const 在职底 = 案件风险底(g)
    expect(在职底).toBeGreaterThan(10)
    g.flags['二线'] = true
    g.discipline.离职年 = g.date.y
    g.date.y += 5
    expect(案件风险底(g)).toBeLessThan(在职底 * 0.5)
    expect(案件风险底(g)).toBeGreaterThanOrEqual(1)
  })

  it('非公务员机构识别优先匹配完整后缀（市中心医院）', () => {
    expect(机构Of('市中心医院儿科主任', '京州市', '市级', '医生')).toBe('市中心医院')
    expect(机构Of('市融媒体中心摄影部副主任', '京州市', '市级', '记者')).toBe('市融媒体中心')
    expect(机构Of('乡镇综合服务中心业务科科员', '岩台县', '乡镇级', '事业单位')).toBe('乡镇综合服务中心')
    expect(机构Of('市第二人民医院外科主任', '林城市', '市级', '医生')).toBe('市第二人民医院')
  })

  it('人大/政协正职属二线不得再提拔，兼任不算', () => {
    setRandomSource(mulberry32(83))
    const mk = (名: string, 二线: boolean): AdvicePosition => ({
      名, sc: 0, 高配: false, 党政: false, 二线, 实权: false, 平台: '县级', 级别: '县处级正职', 条线: '人大政协', 理由: [],
    })
    const g1 = newState({ name: '周正', sex: '男', age: 45, major: '法学', job: '公务员' })
    g1.rankIdx = 2
    settlePosition(g1, mk('县委书记兼县人大常委会主任', false))
    expect(g1.flags['二线']).toBeFalsy()
    const g2 = newState({ name: '周正', sex: '男', age: 52, major: '法学', job: '公务员' })
    g2.rankIdx = 3
    settlePosition(g2, mk('县人大常委会主任', true))
    expect(g2.flags['二线']).toBe(true)
  })

  it('doPromote 成功后同步题库与圈子', () => {
    setRandomSource(mulberry32(77))
    const g = newState({ name: '程亦然', sex: '男', age: 28, major: '法学', job: '公务员' })
    装备晋升条件(g)
    g.shixiOrder = []
    const res = doPromote(g, true)
    expect(['modal', 'toast']).toContain(res.kind)
    if (res.kind === 'modal') {
      expect(g.pendingPositions && g.pendingPositions.length).toBeGreaterThanOrEqual(7)
      expect(g.flags['首升换圈']).toBe(true)
      expect(g.shixiOrder.length).toBe(3)
    }
  })
})
