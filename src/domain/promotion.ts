import type { AdvicePosition, GameState, RankDef } from './types'
import { clamp } from '../utils/format'
import { chance, pick, rnd } from './rng'
import { applyEffect } from './effects'
import {
  ladder, majorGroup, networkScore, nextRankInfo, 提任年龄上限, 二线年龄,
  indicatorList, 条线Of, 岗位平台, 是高配, 是党政班子, 是二线, 是实权, 是基层岗位,
  zhijiFloorOf, 家庭系数, eduIdxOf, 专业条线匹配,
} from './selectors'
import { 专业偏好条线, 职级序列, 平台表 } from '../data/static'
import { 生成调查事件 } from './discipline'
import { 晋升职位池, 机构Of, 平台序, type PoolPos } from './positions'
import { makeNpc, makeNpcs, 刷新人脉职务 } from './newGame'
import { makeShixiOrder } from './quiz'

export interface PromoteResult {
  kind: 'toast' | 'modal' | 'none'
  msg?: string
}

/* 判断两个单位名是否属于同一系统（医院/学校/科研/文化/媒体/企业），用于非公务员调岗 */
function 系统(名: string): string {
  if (/医院|卫生院|疾控|妇幼|中医/.test(名)) return '医院'
  if (/学校|中学|小学|大学|学院|幼儿园/.test(名)) return '学校'
  if (/设计院|研究院|科学院|研究所/.test(名)) return '科研'
  if (/博物馆|图书馆|文化馆|美术馆/.test(名)) return '文化'
  if (/日报|晚报|电视台|通讯社|媒体|记者站|融媒体/.test(名)) return '媒体'
  if (/集团|公司|企业/.test(名)) return '企业'
  return ''
}

function 同系统(a: string, b: string): boolean {
  const ka = 系统(a)
  return !!ka && ka === 系统(b)
}

export function promoteRate(g: GameState, idx: number): number {
  const L = ladder(g)
  const def = L[idx]
  if (!def) return 0
  if (g.p.健康 < 50) return 0
  if (g.p.职业 === '公务员' && g.p.年龄 > 提任年龄上限(g, idx)) return 0
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
  if (g.p.职业 === '公务员' && 专业条线匹配(g)) r += 0.05
  if (g.p.职业 === '公务员' && g.flags['党政班子经历'] && idx >= 4) r += 0.04
  if (g.p2.任职年 < def.最低年) r -= 0.15
  r += 家庭系数(g)
  r -= g.discipline.risk / 100 * 0.45
  r -= g.p2.处分 * 0.07
  // 职业特性：不同赛道看重的条件不同
  if (g.p.职业 === '教师') r += clamp(g.p.道德 - 60, 0, 40) / 40 * 0.05
  else if (g.p.职业 === '医生') r += clamp(g.p.能力 - 60, 0, 40) / 40 * 0.05 + clamp(g.p.声望 - 50, 0, 50) / 50 * 0.03
  else if (g.p.职业 === '记者') r += clamp(g.p.声望 - 50, 0, 50) / 50 * 0.07
  else if (g.p.职业 === '企业') r += Math.min(1, g.zhengji / Math.max(1, need.政绩)) * 0.05
  else if (g.p.职业 === '国企') r += clamp(g.p.上司 - need.上司, 0, 45) / 45 * 0.04
  else if (g.p.职业 === '事业单位') r += eduIdxOf(g.p.学历) >= 2 ? 0.03 : 0
  if (!g.p2.初次晋升) r = Math.max(r, 0.80 + clamp(g.p.专业匹配度 - 80, 0, 20) / 20 * 0.10)
  return clamp(r, 0.03, 0.96)
}

function 专业Label(g: GameState): string {
  return g.p.职业 === '公务员' ? '政绩点' : '业绩点'
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
  if (g.p.职业 === '公务员' && ni.idx >= 2 && eduIdxOf(g.p.学历) < 2) {
    g.log.unshift({
      t: `${g.date.y}年`, h: '学历未达提任要求', kind: '',
      d: `拟提任${ni.def.名}要求本科及以上学历，你当前为${g.p.学历}。组织上暂不列入考虑。`,
    })
    return { kind: 'toast', msg: '学历未达到提任要求（本科及以上）。' }
  }
  if (g.p.职业 === '公务员' && g.p.年龄 > 提任年龄上限(g, ni.idx)) {
    g.log.unshift({
      t: `${g.date.y}年`, h: '到龄不再提任', kind: '',
      d: `你已 ${g.p.年龄} 岁，超过提任${ni.def.名}的年龄界限（${提任年龄上限(g, ni.idx)} 岁）。\n从这一年起，实职提拔这条路对你关闭了。`,
    })
    return { kind: 'toast', msg: `已超过提任${ni.def.名}的年龄界限（${提任年龄上限(g, ni.idx)} 岁），组织上不再考虑。` }
  }
  const 体制内 = (['公务员', '事业单位', '国企'] as string[]).includes(g.p.职业)
  if (体制内 && g.discipline.risk >= 40 && chance(g.discipline.risk / 380)) {
    g.pendingEvent = 生成调查事件(g, '你在晋升考察期间，考察组收到了相关的信访举报')
    g.pendingEvent.月 = rnd(1, 12)
    g.log.unshift({ t: `${g.date.y}年`, h: '考察中止', kind: 'bad', d: '晋升考察期间，考察组收到了关于你的反映。考察中止，问题移交有关部门核实。' })
    return { kind: 'toast', msg: '考察中止：涉及问题线索。' }
  }
  if (Math.random() >= promoteRate(g, ni.idx)) {
    if (!g.p2.初次晋升) {
      const 缺: string[] = []
      if (g.zhengji < ni.def.门槛.政绩) 缺.push(`${专业Label(g)}还差 ${(ni.def.门槛.政绩 - g.zhengji).toLocaleString('zh-CN')}`)
      if (g.p.能力 < ni.def.门槛.能力) 缺.push(`能力还差 ${ni.def.门槛.能力 - g.p.能力}`)
      if (g.p.道德 < ni.def.门槛.道德) 缺.push(`道德评价还差 ${ni.def.门槛.道德 - g.p.道德}`)
      if (g.p.上司 < ni.def.门槛.上司) 缺.push(`领导评价还差 ${ni.def.门槛.上司 - g.p.上司}`)
      if (g.p.健康 < 80) 缺.push(`健康需要回到 80 以上（当前 ${g.p.健康}）`)
      g.log.unshift({
        t: `${g.date.y}年`, h: '首次考察未通过', kind: '',
        d: `组织部门找你谈了话，认为你还需要继续历练。\n`
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
  const L = ladder(g)
  if (g.p.职业 === '公务员') {
    const 职级下限 = zhijiFloorOf(g.rankIdx)
    if (g.zhijiIdx < 职级下限) {
      g.zhijiIdx = 职级下限
      g.income.月工资 = Math.max(g.income.月工资, (L[g.rankIdx]?.月薪 || 0) * 0.85)
      g.log.unshift({
        t: `${g.date.y}年`, h: '职级相应调整', kind: 'good',
        d: `因提任领导职务，你的职级同步调整为${职级序列[g.zhijiIdx]}。`,
      })
    }
  }
  g.p2.任职年 = 0
  g.p2.连续模糊 = 0
  g.p2.累计模糊 = 0
  if (ni.idx === 0) g.p2.初次晋升 = true
  g._晋升消耗 = Math.round(ni.def.门槛.政绩 * 0.75)
  g.zhengji = Math.max(0, g.zhengji - g._晋升消耗)
  g.income.月工资 = Math.max(g.income.月工资, ni.def.月薪)
  g.shixiOrder = makeShixiOrder(g)
  if (!g.flags['首升换圈']) {
    g.npcs = makeNpcs(g)
    g.flags['首升换圈'] = true
    g.log.unshift({
      t: `${g.date.y}年`, h: '圈子更替', kind: '',
      d: '职务变了，身边来往的人也换了一批。新同僚、新上级，关系要重新处。',
    })
  }
  配偶随晋(g)
  return { kind: 'modal' }
}

/* ============ 拟任岗位 ============ */

export function genPositions(g: GameState, idx: number): AdvicePosition[] {
  const L = ladder(g)
  const def = L[idx]
  if (!def) return []
  const 政治 = g.p.职业 === '公务员'
  let pool: PoolPos[] = 晋升职位池(g, idx)
  if (政治 && g.p.年龄 >= 二线年龄(g)) {
    const 二线池 = pool.filter((p) => p.二线)
    if (二线池.length) pool = 二线池
  }
  // 岗位不足时只做最低限度兜底，且保证不重名
  const 兜底方向 = ['综合', '业务', '行政', '技术', '管理']
  let 兜底序 = 0
  while (pool.length < 3) {
    pool.push({
      名: `${def.名}（${兜底方向[兜底序 % 兜底方向.length]}岗）`,
      序号: 平台序[g.p.平台] ?? 1,
      本地: true,
    })
    兜底序++
  }

  const 专业 = (专业偏好条线[majorGroup(g.p.专业) || ''] || []).slice()
  const 现序 = 平台序[g.p.平台] ?? 1
  const 现条线 = 条线Of(g.positions[0] && g.positions[0].岗位)
  const 单位条线 = 条线Of(g.p.单位)
  const 有基层经历 = !!g.flags['基层经历']
  const 有党政经历 = !!g.flags['党政班子经历']

  let 突出数 = 0
  if (idx > 0) {
    const d = L[idx - 1]
    if (d) indicatorList(g, d).forEach((x) => { if (x.已达20) 突出数++ })
  }
  const 高配概率 = 突出数 >= 4 ? 0.75 : 突出数 >= 2 ? 0.4 : 0.12
  const 有本级 = pool.some((x) => (x.序号 ?? 现序) === 现序)

  const 评分 = pool.map((entry) => {
    const 名 = entry.名
    let sc = rnd(0, 4)
    const 理由: string[] = []
    const 条 = 条线Of(名)
    const 岗台 = 岗位平台(名)
    const 基层 = 政治 ? 是基层岗位(名) : (entry.序号 ?? 现序) === 0
    const 高层 = /省|部|国家|中央/.test(名) || (entry.序号 ?? 现序) >= 3
    const 主官 = 政治 && 条 === '主官'
    const 组宣统 = 政治 && /组织部|宣传部|统战部/.test(名)
    const 党政 = 政治 && 是党政班子(名)
    const 高配 = 政治 && 是高配(名)
    // 兼任岗位（含“、”或“兼”）只按兼任算，不按二线处理
    const 兼任 = /[、]|兼/.test(名)
    const 二线 = 政治 && !兼任 && (!!entry.二线 || 是二线(名))
    const 实权 = 政治 && 是实权(名)
    const 序 = entry.序号 ?? 现序
    const d = 序 - 现序
    if (d === 0) sc += 6
    else if (d === 1) {
      const 够格 = 有基层经历 && 突出数 >= 2
      const 上调概率 = Math.pow(0.45, g.p.上调次数 || 0)
      const 过关 = chance(有本级 ? 上调概率 : Math.max(0.45, 上调概率))
      if (够格 && 过关) {
        sc += 7
        理由.push(有本级 ? '组织上有意放到更高一层的平台锻炼' : '本级没有合适岗位，组织安排到上一级平台')
      } else if (过关 && !够格) {
        sc -= 5
        理由.push('有上调机会，但缺少基层经历或实绩')
      } else sc -= 11
    } else if (d >= 2) sc -= 14
    else sc -= 4

    if (entry.本地) { sc += 3 }
    if (政治) {
      if (条 !== '综合' && 条 !== '主官' && 条 !== '其他' && 条 !== '人大政协' && 专业.includes(条)) { sc += 4; 理由.push('与你的专业对口') }
      else if (条 === '综合' && 专业.includes('综合')) { sc += 2 }
      if (主官) sc += 专业.includes('综合') ? 4 : 2
      if (组宣统 && !主官) sc += 2
      if (条 === 现条线 && 条 !== '其他' && 条 !== '人大政协') { sc += 3; 理由.push('延续你现在的条线') }
      if (条 === 单位条线 && 条 !== '其他' && 条 !== '人大政协') sc += 2
      if (基层) {
        if (有基层经历) sc += 1
        else { sc += 3; 理由.push('需要到基层历练') }
      } else if (主官 || 高层) {
        if (有基层经历) sc += 2
        else sc -= 1
      }
      if (idx >= 4 && 党政) {
        if (有党政经历) { sc += 4; 理由.push('拥有党政班子经历') }
        else { sc -= 3; 理由.push('缺少党政班子经历，这是硬杠杠') }
      }
      if (党政 && 有党政经历 && idx < 4) sc += 1
      if (二线) {
        if (g.p.年龄 >= 二线年龄(g)) sc += 6
        else sc -= 6
      }
      if (实权 && g.p.年龄 < 二线年龄(g)) sc += 3
      if (高配) {
        if (g.p.年龄 >= 二线年龄(g)) sc -= 4
        else if (chance(高配概率)) { sc += 5; 理由.push('组织统筹后拿出的岗位') }
        else sc -= 6
      }
      if (g.p.选调生) sc += 1
    } else {
      if (entry.本地) sc += 2
      if (g.p.专业匹配度 >= 90) { sc += 2 }
      if (g.p.单位 && 名.startsWith(g.p.单位)) { sc += 3; 理由.push('留在原单位') }
      else if (同系统(g.p.单位, 名)) { sc += 5; 理由.push('留在本系统') }
    }
    return {
      名, sc, 高配, 党政, 二线, 实权, 平台: 岗台, 级别: def.名, 条线: 条,
      序号: 序, 城市: entry.城市, 本地: entry.本地,
      理由: 理由.length ? Array.from(new Set(理由)).slice(0, 1) : ['组织统一安排'],
    }
  })
  评分.sort((a, b) => b.sc - a.sc)

  // 党政班子经历是提任党政班子的硬杠杠；到副国级不再一刀切剔除（此时由评分体现）
  let 可用 = (政治 && idx >= 4 && idx <= 7) ? 评分.filter((x) => !(x.党政 && x.高配 && !有党政经历)) : 评分
  if (可用.length < 3) 可用 = 评分
  let list = 可用.slice(0, 9)
  if (政治 && idx >= 1 && !list.some((x) => x.二线)) {
    const cand = 评分.find((x) => x.二线)
    if (cand) {
      if (list.length >= 3) list = [...list.slice(0, list.length - 1), cand]
      else list.push(cand)
    }
  }
  return list
}

export function posHint(p: AdvicePosition): string {
  const 方向: Record<string, string> = {
    '主官': '党政主官', '纪检': '纪检监察', '法院': '法院系统', '检察': '检察系统',
    '公安': '公安系统', '司法': '司法行政', '政法': '政法工作', '组工': '组工干部',
    '宣传': '宣传文化', '统战': '统战工作', '人大政协': '人大政协',
  }
  const 主 = (p.理由 && p.理由[0]) || '组织统一安排'
  const 尾 = 方向[p.条线] ? `　方向：${方向[p.条线]}` : ''
  return `${主}${尾}`
}

export function posEffect(g: GameState, pos: AdvicePosition): string {
  const 名 = pos.名
  const 序 = pos.序号 ?? 平台序[g.p.平台] ?? 1
  if (g.p.职业 !== '公务员') {
    if (序 === 0) {
      applyEffect(g, { 道德: 2, 声望: 3, 政绩: 40, 健康: -1 })
      return '你在基层单位待了几年，最清楚一线的难处。'
    }
    if (序 === 1) {
      applyEffect(g, { 能力: 2, 政绩: 55 })
      return '县区一级的活最杂，你被迫学会了同时处理十几件事。'
    }
    if (序 === 2) {
      applyEffect(g, { 能力: 2, 政绩: 70, 人脉: 2 })
      return '到了市级平台，你接触的项目和资源上了一个量级。'
    }
    applyEffect(g, { 上司: 3, 人脉: 3, 政绩: 90 })
    return '你在省级平台站住了脚，视野和话语权都不一样了。'
  }
  if (是基层岗位(名)) {
    applyEffect(g, { 道德: 2, 声望: 4, 政绩: 60, 人脉: 1, 健康: -2 })
    return '基层的几年，你走遍了辖区的每个村。群众认得你，也愿意跟你说实话。'
  }
  if (/省|部|国家|中央/.test(名)) {
    applyEffect(g, { 上司: 3, 人脉: 3, 政绩: 30, 声望: -1 })
    return '你在更高层的机关见了更多场面，也离决策更近了一步。'
  }
  if (/县|区/.test(名)) {
    applyEffect(g, { 能力: 2, 政绩: 50, 健康: -1 })
    return '县区的工作包罗万象，你学会了在复杂局面里找平衡。'
  }
  applyEffect(g, { 政绩: 40, 能力: 1 })
  return '业务条线上的工作扎实而具体，你的专业能力在增长。'
}

function 平台FromCity(序: number, 城市: string): GameState['p']['平台'] {
  if (序 === 0) return '乡镇级'
  if (序 === 1) return 城市.endsWith('区') ? '区级' : '县级'
  if (序 === 2) return '市级'
  return '省级'
}

export function settlePosition(g: GameState, pos: AdvicePosition): void {
  const 名 = pos.名
  const 政治 = g.p.职业 === '公务员'
  const 新序 = pos.序号 ?? 平台序[g.p.平台] ?? 1
  const L = ladder(g)
  const 职级名 = (g.rankIdx >= 0 && L[g.rankIdx]) ? L[g.rankIdx].名 : (g.rankIdx < 0 ? '科员' : '—')

  if (政治 && 是基层岗位(名)) g.flags['基层经历'] = true
  if (政治 && 是党政班子(名)) g.flags['党政班子经历'] = true
  if (政治 && 是高配(名)) g.flags['高配经历'] = true
  if (政治 && 是实权(名)) g.flags['实权经历'] = true

  const 旧序 = 平台序[g.p.平台] ?? 1
  const 旧城 = g.p.城市
  if (pos.城市 && pos.城市 !== g.p.城市) {
    g.p.城市 = pos.城市
    g.log.unshift({
      t: `${g.date.y}年`, h: '组织调动', kind: '',
      d: `根据工作需要，你从${旧城}调任${pos.城市}工作。`,
    })
  }
  if (新序 !== 旧序) {
    g.p.平台 = 平台FromCity(新序, g.p.城市)
    g.p.上调次数 = (g.p.上调次数 || 0) + 1
    g.log.unshift({
      t: `${g.date.y}年`, h: '平台调整', kind: 'good',
      d: `你从${序平台名(旧序)}机关调到${序平台名(新序)}机关任职，站到了更高的平台上。`,
    })
    if (!政治) {
      const 城市s = 平台表[序平台名(新序) as keyof typeof 平台表]?.城市
      if (城市s && 城市s.length) {
        g.p.城市 = pick(城市s)
      }
    }
  }
  if (政治 && 是二线(名) && !g.flags['二线']) {
    g.flags['二线'] = true
    g.p.声望 = clamp(g.p.声望 + 3, 0, 100)
    g.p.健康 = clamp(g.p.健康 + 4, 0, 100)
  }
  g.p.单位 = 机构Of(名, g.p.城市, g.p.平台, g.p.职业)
  g.positions.unshift({ 年: g.date.y, 职级: 职级名, 岗位: 名, 条线: 条线Of(名) })
  const extra = posEffect(g, pos)
  g.log.unshift({
    t: `${g.date.y}年`, h: '职务调整', kind: 'good',
    d: `经组织研究，任命你为${名}（${职级名}）。${g.p.选调生 ? '作为选调生，你比同批人快了一步，也比同批人更容易被盯着。' : ''}\n${extra}`,
  })
  配偶随晋(g)
  刷新人脉职务(g)
}

function 序平台名(序: number): string {
  return ['乡镇级', '县级', '市级', '省级'][序] || '上级'
}

/* ============ 配偶随迁 ============ */

export function 配偶头衔(类别: string, idx: number): string {
  if (类别 === '公务员') return 职级序列[Math.min(职级序列.length - 1, Math.max(0, idx))]
  if (类别 === '事业单位人员') return ['科员', '副科长', '科长', '副处长', '处长', '副主任'][Math.min(5, Math.max(0, idx))]
  if (类别 === '国企人员') return ['职员', '业务主管', '部门副经理', '部门经理', '副总经理', '总经理'][Math.min(5, Math.max(0, idx))]
  return '普通职工'
}

export function 配偶随晋(g: GameState): void {
  const sp = g.family.配偶
  if (!sp) return
  if (!['公务员', '事业单位人员', '国企人员'].includes(sp.类别)) return
  const 低 = rnd(1, 2)
  const 目标 = Math.max(0, g.rankIdx - 低)
  const 当前 = sp.职级 == null ? -1 : sp.职级
  if (当前 < 目标) {
    sp.职级 = 目标
    sp.身份 = `你的配偶 · ${配偶头衔(sp.类别, 目标)}`
    const 旧月 = sp.月收入
    sp.月收入 = Math.round(旧月 * (1 + 0.12 * Math.max(1, 目标 - Math.max(0, 当前))))
  }
}

/* 向上社交：换掉好感度最低的两位人脉，新人的层级高于当前职级 */
export function 向上社交(g: GameState): string {
  const sorted = g.npcs.slice().sort((a, b) => a.好感度 - b.好感度)
  const 换掉 = sorted.slice(0, 2).map((n) => n.id)
  const 新 = 换掉.map((id) => makeNpc(g, id, 1))
  g.npcs = g.npcs.map((n) => 新.find((x) => x.id === n.id) || n)
  return 新.map((n) => `${n.姓名}（${n.身份}）`).join('、')
}

export function rankName(g: GameState): RankDef | null {
  return ladder(g)[g.rankIdx] || null
}
