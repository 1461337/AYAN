import type { CarAsset, Child, GameState, HouseAsset, Job } from './types'
import { CARS, HOUSES, 职务阶梯 } from '../data/static'
import { fmt } from '../utils/format'
import { rnd } from './rng'

export function loanRate(g: GameState, kind: '房' | '车'): number {
  const pub = isPublicJob(g)
  return kind === '房' ? (pub ? 3.1 : 4.2) : 4.8
}

export function monthly(principal: number, annualPct: number, years: number): number {
  const r = annualPct / 100 / 12
  const n = Math.round(years * 12)
  if (principal <= 0 || n <= 0) return 0
  if (r === 0) return Math.round(principal / n)
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

export function totalMonthly(g: GameState): number {
  return (g.loans || []).reduce((a, l) => a + l.月供, 0)
}

/* 工资条：应发 = 岗位＋级别＋津补贴；代扣五险一金与个税后为实发 */
export function 五险一金(g: GameState, 月薪?: number): number {
  const m = 月薪 == null ? g.income.月工资 : 月薪
  return Math.round(m * 0.22)
}

export function 个税(g: GameState, 月薪?: number): number {
  const m = 月薪 == null ? g.income.月工资 : 月薪
  const y = Math.max(0, m - 五险一金(g, m) - 5000)
  if (y <= 3000) return Math.round(y * 0.03)
  if (y <= 12000) return Math.round(90 + (y - 3000) * 0.10)
  if (y <= 25000) return Math.round(990 + (y - 12000) * 0.20)
  return Math.round(3590 + (y - 25000) * 0.25)
}

export function 实发(g: GameState, 月薪?: number): number {
  const m = 月薪 == null ? g.income.月工资 : 月薪
  return Math.max(0, m - 五险一金(g, m) - 个税(g, m))
}

export function 公积金月缴(g: GameState, 月薪?: number): number {
  const m = 月薪 == null ? g.income.月工资 : 月薪
  return Math.round(m * 0.24)
}

export function 岗位月薪(idx: number | null | undefined): number {
  const L = (idx == null || idx < 0) ? null : 职务阶梯[idx]
  return L ? L.月薪 : 5200
}

export function 年终奖(g: GameState): number {
  if (g.status === '退休') return 0
  const 体制内 = ['公务员', '事业单位', '国企'].includes(g.p.职业)
  return Math.round(g.income.月工资 * (体制内 ? rnd(1, 3) : rnd(0, 4)))
}

export function isPublicJob(g: GameState): boolean {
  return (['公务员', '事业单位', '国企'] as Job[]).includes(g.p.职业)
}

export function netIncome(g: GameState): number {
  let n = 实发(g) + g.income.其他
  const sp = g.family && g.family.配偶
  if (sp) n += 实发(g, sp.退休 ? (sp.养老金 || 0) : (sp.月收入 || 0))
  return n
}

/* 子女月支出：按成长阶段递增 */
export function 子女月支出(c: Child): number {
  if (c.独立) return 0
  const a = c.年龄
  if (a <= 2) return 1500
  if (a <= 5) return 1800
  if (a <= 11) return 1600
  if (a <= 14) return 1900
  if (a <= 17) return 2200
  if (a <= 21) return c.考上大学 ? 3200 : 1200
  return 1000
}

export function 年租金收入(g: GameState): number {
  return (g.assets.房产 || []).filter((x) => !x.自住).reduce((a, x) => a + Math.round((x.市值 || x.购入价 || 0) * 0.014), 0)
}

export function 年养车成本(g: GameState): number {
  return (g.assets.车辆 || []).reduce((a, v) => a + Math.round((v.总价 || v.市值 || 120000) * 0.03), 0)
}

export function livingCost(g: GameState): number {
  let c = Math.round(g.income.月工资 * 0.28)
  if (g.family.配偶) c += 1400
  g.family.子女.forEach((k) => { c += 子女月支出(k) })
  return c
}

export function luxuryCount(g: GameState): number {
  return (g.assets.房产 || []).filter((x) => /大平层|别墅/.test(x.名 || '')).length
    + (g.assets.车辆 || []).filter((x) => /豪华|高端/.test(x.名 || '')).length
}

export interface ActionResult {
  ok: boolean
  msg: string
}

export function buyAsset(g: GameState, kind: '房' | '车', i: number): ActionResult {
  const d = (kind === '房' ? HOUSES : CARS)[i]
  if (!d) return { ok: false, msg: '该资产不存在。' }
  const down = Math.round(d.总价 * d.首付比)
  const 可用公积金 = kind === '房' ? Math.min(g.fund || 0, down) : 0
  if (g.cash + 可用公积金 < down) {
    return { ok: false, msg: `首付不足，需 ${fmt(down)} 元${可用公积金 ? `（公积金可抵 ${fmt(可用公积金)} 元）` : ''}。` }
  }
  const pr = d.总价 - down
  const rate = loanRate(g, kind)
  const pay = monthly(pr, rate, d.年)
  const limit = Math.round((netIncome(g) + 公积金月缴(g)) * 0.55)
  if (pay + totalMonthly(g) > limit) {
    return { ok: false, msg: `银行不予批贷：月供 ${fmt(pay)} 元，已超过家庭月收入 55% 的还款能力上限（${fmt(limit)} 元）。` }
  }
  if (可用公积金 > 0) g.fund -= 可用公积金
  g.cash -= (down - 可用公积金)
  g.loans.push({ 名: d.名, 类型: kind, 余额: pr, 月供: pay, 利率: rate, 总月: Math.round(d.年 * 12), 已还: 0, 年: d.年 })
  if (kind === '房') {
    const 首套 = g.assets.房产.length === 0
    g.assets.房产.push({ 名: d.名, 面积: d.面积, 购入价: d.总价, 购入年: g.date.y, 市值: d.总价, 自住: 首套, 贷款: true })
    if (首套) g.housing = '自有住房 · ' + d.名
  } else {
    g.assets.车辆.push({ 名: d.名, 总价: d.总价, 购入年: g.date.y, 市值: d.总价 })
  }
  g.log.unshift({
    t: `${g.date.y}年`, h: kind === '房' ? '购置住房' : '购置车辆', kind: 'good',
    d: `你以 ${fmt(down)} 元首付（其中公积金 ${fmt(可用公积金)} 元）买下${d.名}，贷款 ${fmt(pr)} 元，${d.年} 年期，年利率 ${rate}%，月供 ${fmt(pay)} 元。`
      + (kind === '房' ? (g.assets.房产.length === 1 ? '\n这是你的第一套房，从租房搬进了自己的家。' : '\n这套房用于出租，每年约有 ' + fmt(Math.round(d.总价 * 0.014)) + ' 元租金收入。') : '')
      + (d.奢侈 && isPublicJob(g) ? `\n一名${g.p.职业}购置这种价位的资产，在每年的组织考察中，都可能被重新提起。` : ''),
  })
  return { ok: true, msg: '已购置：' + d.名 }
}

export function sellAsset(g: GameState, kind: '房' | '车', i: number): ActionResult {
  const arr: (HouseAsset | CarAsset)[] = kind === '房' ? g.assets.房产 : g.assets.车辆
  const it = arr[i]
  if (!it) return { ok: false, msg: '该资产不存在。' }
  const 名 = it.名 || ''
  const loan = g.loans.find((l) => 名.indexOf(l.名) === 0)
  const 基准 = kind === '房'
    ? ((it as HouseAsset).市值 || (it as HouseAsset).购入价 || 0)
    : ((it as CarAsset).市值 || Math.round(((it as CarAsset).总价 || 0) * 0.5))
  const price = Math.round(基准 * (kind === '房' ? (0.94 + Math.random() * 0.10) : (0.90 + Math.random() * 0.10)))
  const 手续费 = Math.round(price * (kind === '房' ? 0.02 : 0.005))
  if (loan) {
    g.cash += price - loan.余额 - 手续费
    g.loans = g.loans.filter((l) => l !== loan)
  } else {
    g.cash += price - 手续费
  }
  arr.splice(i, 1)
  if (kind === '房') {
    if (!g.assets.房产.some((x) => x.自住) && g.assets.房产.length) g.assets.房产[0].自住 = true
    if (!g.assets.房产.length) g.housing = '租房（原自有住房已出售）'
  }
  g.log.unshift({
    t: `${g.date.y}年`, h: kind === '房' ? '出售住房' : '出售车辆', kind: '',
    d: `你以 ${fmt(price)} 元处置了${名}${loan ? `，结清剩余贷款 ${fmt(loan.余额)} 元` : ''}，扣除手续费 ${fmt(手续费)} 元。`
      + (kind === '房' && !g.assets.房产.length ? '\n房子卖掉之后，你们又回到了租房的日子。' : ''),
  })
  return { ok: true, msg: '已处置，款项到账。' }
}
