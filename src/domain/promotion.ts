import type { AdvicePosition, GameState, RankDef } from './types'
import { clamp } from '../utils/format'
import { chance, pick, rnd } from './rng'
import { applyEffect } from './effects'
import {
  ladder, majorGroup, networkScore, nextRankInfo, 提任年龄上限, 二线年龄,
  indicatorList, 条线Of, 岗位平台, 是高配, 是党政班子, 是二线, 是实权, 是基层岗位, 专业条线匹配,
  zhijiFloorOf, 家庭系数, eduIdxOf,
} from './selectors'
import { 专业偏好条线, 职务阶梯 } from '../data/static'
import { 生成调查事件 } from './discipline'
import { 晋升职位池 } from './positions'

export interface PromoteResult {
  kind: 'toast' | 'modal' | 'none'
  msg?: string
}

export function promoteRate(g: GameState, idx: number): number {
  const L = ladder(g)
  const def = L[idx]
  if (!def) return 0
  if (g.p.健康 < 50) return 0
  if (g.p.年龄 > 提任年龄上限(g, idx)) return 0
  const need = def.门槛
  let r = 0.06
  r += networkScore(g) / 100 * 0.30
  r += clamp(g.p.能力 - need.能力, 0, 45) / 45 * 0.17
  r += clamp(g.p.上司 - need.上司, 0, 45) / 45 * 0.17
  r += Math.min(1, g.zhengji / Math.max(1, need.政绩)) * 0.17
  r += clamp(g.p.道德 - need.道德, 0, 45) / 45 * 0.06
  if (g.p.健康 < 70) r -= (70 - g.p.健康) * 0.006
  else if (g.p.健康 < 80) r -= (80 - g.p.健康) * 0.004
  else if (g.p.健康 >= 90) r += 0.02
  if (g.p.选调生) r += 0.06
  if (idx >= 2 && eduIdxOf(g.p.学历) >= 2) r += 0.04
  if (专业条线匹配(g)) r += 0.05
  if (g.flags['党政班子经历'] && idx >= 4) r += 0.04
  if (g.p2.任职年 < def.最低年) r -= 0.15
  r += 家庭系数(g)
  r -= g.discipline.risk / 100 * 0.45
  r -= g.p2.处分 * 0.07
  if (!g.p2.初次晋升) r = Math.max(r, 0.80 + clamp(g.p.专业匹配度 - 80, 0, 20) / 20 * 0.10)
  return clamp(r, 0.03, 0.96)
}

export function doPromote(g: GameState, _manual: boolean): PromoteResult {
  const ni = nextRankInfo(g)
  if (!ni.def) return { kind: 'toast', msg: '已达本序列最高职级。' }
  if (g.status !== '在职') return { kind: 'toast', msg: '已退休，不再涉及晋升。' }
  if (g.flags['二线']) return { kind: 'toast', msg: '已转任二线岗位，组织上不再考虑实职提拔。' }
  if (g.discipline.影响期 && g.date.y < g.discipline.影响期) {
    return { kind: 'toast', msg: `你还在影响期（至 ${g.discipline.影响期} 年底）内，不得提拔或者进一步使用。` }
  }
  if (g.p2.任职年 < ni.effMin) {
    applyEffect(g, { 政绩: -10 })
    g.log.unshift({
      t: `${g.date.y}年`, h: '申请晋升（破格）', kind: '',
      d: `你在任现职 ${g.p2.任职年} 年时主动提出申请。组织部门认为尚不具备条件，未予受理。`,
    })
    return { kind: 'toast', msg: '申请未被受理：任职年限不足。' }
  }
  if (g.zhengji < ni.def.门槛.政绩) return { kind: 'toast', msg: '基本条件尚有缺口，组织暂不列入考虑。' }
  if (g.p.健康 < 50) return { kind: 'toast', msg: '身体条件不适宜承担更重岗位，组织暂不列入考虑。' }
  if (g.p.年龄 > 提任年龄上限(g, ni.idx)) {
    g.log.unshift({
      t: `${g.date.y}年`, h: '到龄不再提任', kind: '',
      d: `你已 ${g.p.年龄} 岁，超过提任${ni.def.名}的年龄界限（${提任年龄上限(g, ni.idx)} 岁）。\n从这一年起，实职提拔这条路对你关闭了。`,
    })
    return { kind: 'toast', msg: `已超过提任${ni.def.名}的年龄界限（${提任年龄上限(g, ni.idx)} 岁），组织上不再考虑。` }
  }
  if (g.discipline.risk >= 40 && chance(g.discipline.risk / 380)) {
    g.pendingEvent = 生成调查事件(g, '组织正在对你进行晋升考察，同时收到了相关的信访举报')
    g.pendingEvent.月 = rnd(1, 12)
    g.log.unshift({ t: `${g.date.y}年`, h: '考察中止', kind: 'bad', d: '晋升考察期间，考察组收到了关于你的反映。考察中止，问题移交有关部门核实。' })
    return { kind: 'toast', msg: '考察中止：涉及问题线索。' }
  }
  if (Math.random() >= promoteRate(g, ni.idx)) {
    if (!g.p2.初次晋升) {
      const 缺: string[] = []
      if (g.zhengji < ni.def.门槛.政绩) 缺.push(`${g.p.职业 === '公务员' ? '政绩点' : '业绩点'}还差 ${(ni.def.门槛.政绩 - g.zhengji).toLocaleString('zh-CN')}`)
      if (g.p.能力 < ni.def.门槛.能力) 缺.push(`能力还差 ${ni.def.门槛.能力 - g.p.能力}`)
      if (g.p.道德 < ni.def.门槛.道德) 缺.push(`道德评价还差 ${ni.def.门槛.道德 - g.p.道德}`)
      if (g.p.上司 < ni.def.门槛.上司) 缺.push(`领导评价还差 ${ni.def.门槛.上司 - g.p.上司}`)
      if (g.p.健康 < 80) 缺.push(`健康需要回到 80 以上（当前 ${g.p.健康}）`)
      g.log.unshift({
        t: `${g.date.y}年`, h: '首次考察未通过', kind: '',
        d: `组织部门找你谈了话，认为你还需要继续历练。公示名单里没有你。\n`
          + (缺.length ? `差距主要在：${缺.join('、')}。` : '组织上认为时机还不成熟。')
          + '\n（这次不影响你的记录，补齐之后可以再次申请。）',
      })
      return { kind: 'toast', msg: 缺.length ? `考察未通过，差距：${缺[0]}` : '考察未通过，时机未到。' }
    }
    g.zhengji = Math.max(0, g.zhengji - Math.round(ni.def.门槛.政绩 * 0.05))
    applyEffect(g, { 上司: -1 })
    g.log.unshift({
      t: `${g.date.y}年`, h: '组织考察未通过', kind: 'bad',
      d: '组织部门进行了考察谈话，最终认为你还需要继续历练。\n公示名单里没有你。有人安慰你「下一步还有机会」。',
    })
    return { kind: 'toast', msg: '组织考察未通过。' }
  }

  g.pendingPositions = genPositions(g, ni.idx)
  g.pendingPosTitle = ni.def.名
  g.rankIdx = ni.idx
  const 人脉跃升 = 3 + Math.max(0, g.rankIdx)
  g.p.人脉 = clamp(g.p.人脉 + 人脉跃升, 0, 100)
  const 职级下限 = zhijiFloorOf(g.rankIdx)
  if (g.zhijiIdx < 职级下限) {
    g.zhijiIdx = 职级下限
    g.income.月工资 = Math.max(g.income.月工资, 职务阶梯[g.rankIdx].月薪 * 0.85)
    g.log.unshift({
      t: `${g.date.y}年`, h: '职级相应调整', kind: 'good',
      d: `因提任领导职务，你的职级同步调整为${职级序列Local[g.zhijiIdx]}。`,
    })
  }
  g.p2.任职年 = 0
  g.p2.连续模糊 = 0
  g.p2.累计模糊 = 0
  if (ni.idx === 0) g.p2.初次晋升 = true
  g._晋升消耗 = Math.round(ni.def.门槛.政绩 * 0.75)
  g.zhengji = Math.max(0, g.zhengji - g._晋升消耗)
  g.income.月工资 = Math.max(g.income.月工资, ni.def.月薪)
  return { kind: 'modal' }
}

const 职级序列Local = ['二级科员', '一级科员', '四级主任科员', '三级主任科员', '二级主任科员', '一级主任科员', '四级调研员', '三级调研员', '二级调研员', '一级调研员', '二级巡视员', '一级巡视员']

export function genPositions(g: GameState, idx: number): AdvicePosition[] {
  const L = ladder(g)
  const def = L[idx]
  if (!def) return []
  let pool: { 名: string }[] = 晋升职位池(g, idx)
  if (g.p.年龄 >= 二线年龄(g)) {
    pool = ['人大常委会副主任', '人大专门委员会主任委员', '政协副主席', '政协秘书长', '政府参事'].map((名) => ({ 名 }))
  }
  if (!pool.length) pool = [{ 名: def.名 }]
  while (pool.length < 3) pool.push({ 名: def.名 + '（' + pick(['综合', '业务', '行政']) + '）' })

  const 专业 = (专业偏好条线[majorGroup(g.p.专业) || ''] || []).slice()
  const 现条线 = 条线Of(g.positions[0] && g.positions[0].岗位)
  const 单位条线 = 条线Of(g.p.单位)
  const 有基层经历 = !!g.flags['基层经历']
  const 有党政经历 = !!g.flags['党政班子经历']
  const 现平台 = g.p.平台 || '市级'
  const 现城市 = g.p.城市
  const 序号: Record<string, number> = { '乡镇级': 0, '县级': 1, '区级': 1, '市级': 2, '省级': 3 }

  let 突出数 = 0
  if (idx > 0) {
    const d = L[idx - 1]
    if (d) indicatorList(g, d).forEach((x) => { if (x.已达20) 突出数++ })
  }
  const 高配概率 = 突出数 >= 4 ? 0.75 : 突出数 >= 2 ? 0.4 : 0.12
  const 有本级 = pool.some((x) => 岗位平台(x.名) === 现平台)

  const 评分 = pool.map(({ 名 }) => {
    let sc = rnd(0, 4)
    const 理由: string[] = []
    const 条 = 条线Of(名)
    const 岗台 = 岗位平台(名)
    const 基层 = 是基层岗位(名)
    const 高层 = /省|部|国家|中央/.test(名)
    const 主官 = (条 === '主官')
    const 组宣统 = /组织部|宣传部|统战部/.test(名)
    const 党政 = 是党政班子(名)
    const 高配 = 是高配(名)
    const 二线 = 是二线(名)
    const 实权 = 是实权(名)
    const d = (序号[岗台] !== undefined && 序号[现平台] !== undefined) ? 序号[岗台] - 序号[现平台] : 0
    if (d === 0) sc += 6
    else if (d === 1) {
      const 够格 = 有基层经历 && 突出数 >= 2
      const 上调概率 = Math.pow(0.45, g.p.上调次数 || 0)
      const 过关 = Math.random() < (有本级 ? 上调概率 : Math.max(0.4, 上调概率))
      if (够格 && 过关) {
        sc += 6
        理由.push(有本级 ? '组织上有意把你放到更高一层的平台锻炼' : '本级没有合适岗位，组织安排到上一级平台')
      } else if (过关 && !够格) {
        sc -= 6
        理由.push('有上调的机会，但缺少基层经历或拿得出手的实绩')
      } else sc -= 12
    } else if (d >= 2) sc -= 16
    else sc -= 4
    if (名.includes(现城市)) { sc += 4; 理由.push('就地提任，熟悉本地情况') }
    if (条 !== '综合' && 条 !== '主官' && 条 !== '其他' && 条 !== '人大政协' && 专业.includes(条)) { sc += 4; 理由.push('与你的专业对口') }
    else if (条 === '综合' && 专业.includes('综合')) { sc += 2; 理由.push('综合管理岗位，与你所学相近') }
    if (主官) { sc += 专业.includes('综合') ? 4 : 2; 理由.push('党政主官岗位') }
    if (组宣统 && !主官) { sc += 2; 理由.push('党委组宣统序列') }
    if (条 === 现条线 && 条 !== '其他' && 条 !== '人大政协') { sc += 3; 理由.push('延续你现在的条线') }
    if (条 === 单位条线 && 条 !== '其他' && 条 !== '人大政协') { sc += 2; 理由.push('与所在单位业务相通') }
    if (基层) {
      if (有基层经历) { sc += 1; 理由.push('你已有基层经历，回去是压担子') }
      else { sc += 3; 理由.push('需要到基层历练一段') }
    } else {
      if (主官 || 高层) {
        if (有基层经历) { sc += 2; 理由.push('基层经验完整，可往上走') }
        else { sc -= 1; 理由.push('缺少基层经历，组织会慎重') }
      }
    }
    if (idx >= 4 && 党政) {
      if (有党政经历) { sc += 4; 理由.push('你有党政领导班子经历，组织上会优先考虑') }
      else { sc -= 3; 理由.push('缺少党政领导班子经历，这是硬杠杠') }
    }
    if (党政 && 有党政经历 && idx < 4) sc += 1
    if (二线) {
      if (g.p.年龄 >= 二线年龄(g)) { sc += 6; 理由.push('组织上对临近退休干部的统筹安排') }
      else sc -= 6
    }
    if (实权 && g.p.年龄 < 二线年龄(g)) sc += 3
    if (高配) {
      if (g.p.年龄 >= 二线年龄(g)) sc -= 4
      else if (Math.random() < 高配概率) { sc += 5; 理由.push('经组织统筹考虑后拿出的岗位') }
      else sc -= 6
    }
    if (g.p.选调生) sc += 1
    return {
      名, sc, 高配, 党政, 二线, 实权, 平台: 岗台, 级别: def.名, 条线: 条,
      理由: 理由.length ? Array.from(new Set(理由)).slice(0, 3) : ['组织统一安排'],
    }
  })
  评分.sort((a, b) => b.sc - a.sc)
  const 可用 = (idx >= 4) ? 评分.filter((x) => !(x.党政 && x.高配 && !有党政经历)) : 评分
  const 上限 = Math.min(8, 可用.length)
  const n2 = clamp(rnd(3, 上限), 3, 上限)
  return 可用.slice(0, n2)
}

export function posHint(p: AdvicePosition): string {
  const 名 = p.名
  const 理由 = (p && p.理由) ? p.理由.join('、') : ''
  const 补: string[] = []
  if (p && p.党政) 补.push('党委序列')
  if (是基层岗位(名)) 补.push('基层一线，直接面对群众')
  if (/省|部|国家|中央/.test(名)) 补.push('离决策层近，人脉提升快')
  if (/县|区/.test(名) && !/省|市/.test(名)) 补.push('承上启下，事务最杂')
  return [理由].concat(补).filter(Boolean).join('；')
}

export function posEffect(g: GameState, 名: string): string {
  if (是基层岗位(名)) {
    applyEffect(g, { 道德: 2, 声望: 4, 政绩: 60, 人脉: 1, 健康: -2 })
    return '基层的两年，你走遍了辖区的每个村。群众认得你，也愿意跟你说实话。'
  }
  if (/省|部|国家|中央/.test(名)) {
    applyEffect(g, { 上司: 3, 人脉: 3, 政绩: 30, 声望: -1 })
    return '你在更高层的机关见了更多场面，也离决策更近了一步。'
  }
  if (/县|区/.test(名)) {
    applyEffect(g, { 能力: 2, 政绩: 50, 健康: -1 })
    return '县区的工作包罗万象，你被迫学会了同时处理十几件事。'
  }
  applyEffect(g, { 政绩: 40, 能力: 1 })
  return '业务条线上的工作扎实而具体，你的专业能力在增长。'
}

export function settlePosition(g: GameState, pos: string): void {
  const L = ladder(g)
  const 职级名 = (g.rankIdx >= 0 && L[g.rankIdx]) ? L[g.rankIdx].名 : (g.rankIdx < 0 ? '科员' : '—')
  if (是基层岗位(pos)) g.flags['基层经历'] = true
  if (是党政班子(pos)) g.flags['党政班子经历'] = true
  if (是高配(pos)) g.flags['高配经历'] = true
  const 新台 = 岗位平台(pos)
  const 台序: Record<string, number> = { '乡镇级': 0, '县级': 1, '区级': 1, '市级': 2, '省级': 3 }
  if (台序[新台] !== undefined && 台序[g.p.平台] !== undefined && 台序[新台] > 台序[g.p.平台]) {
    const 旧台 = g.p.平台
    g.p.平台 = 新台 as GameState['p']['平台']
    g.p.上调次数 = (g.p.上调次数 || 0) + 1
    g.log.unshift({
      t: `${g.date.y}年`, h: '平台调整', kind: 'good',
      d: `你从${旧台}机关调到${新台}机关任职，站到了更高的平台上。`,
    })
  }
  if (是实权(pos)) g.flags['实权经历'] = true
  if (是二线(pos) && !g.flags['二线']) {
    g.flags['二线'] = true
    g.p.声望 = clamp(g.p.声望 + 3, 0, 100)
    g.p.健康 = clamp(g.p.健康 + 4, 0, 100)
  }
  g.positions.unshift({ 年: g.date.y, 职级: 职级名, 岗位: pos, 条线: 条线Of(pos) })
  const extra = posEffect(g, pos)
  g.log.unshift({
    t: `${g.date.y}年`, h: '职务调整', kind: 'good',
    d: `经组织研究，任命你为${pos}（${职级名}）。${g.p.选调生 ? '作为选调生，你比同批人快了一步，也比同批人更容易被盯着。' : ''}\n${extra}`,
  })
}

/* 延迟引用，避免与 discipline 模块循环依赖 */
export function rankName(g: GameState): RankDef | null {
  return ladder(g)[g.rankIdx] || null
}
