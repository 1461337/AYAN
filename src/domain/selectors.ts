import type { GameState, RankDef } from './types'
import {
  职务阶梯, LADDERS, mkLadder, 条线词表, 高配岗位, 二线岗位, 提任年龄表,
  ZHIJI_CAP, ZHIJI_FLOOR, MAJOR_FIT, MAJORS, 平台表, 平台集合, 专业偏好条线, EDU_LEVEL,
} from '../data/static'
import { clamp, fmt } from '../utils/format'
import { pick } from './rng'
import { 影响期内, perfLabel } from './effects'

export function majorGroup(m: string): string | null {
  for (const g in MAJORS) if (MAJORS[g].includes(m)) return g
  return null
}

export function fitOf(major: string, job: string): number {
  const g = majorGroup(major)
  return (g && (MAJOR_FIT[g] as Record<string, number>)[job]) || 0
}

export function ladder(g: GameState): RankDef[] {
  if (g.p.职业 === '公务员') return 职务阶梯
  const L = LADDERS[g.p.职业]
  if (L) return mkLadder(L.map((x) => x[0]), L[0][1])
  return mkLadder(LADDERS['事业单位'].map((x) => x[0]), LADDERS['事业单位'][0][1])
}

export function 条线Of(名: string | undefined | null): string {
  if (!名) return '其他'
  if (/人大常委会|政协/.test(名)) return '人大政协'
  if (/县委书记|区委书记|市委书记|省委书记|县长|区长|市长|省长|乡长|镇长|副乡长|副镇长|副县长|副区长|副市长|副省长|[乡镇]党委书记/.test(名)) return '主官'
  for (const [k, ws] of 条线词表) if (ws.some((w) => 名.includes(w))) return k
  if (/助理|常务|常委|秘书长|办公室主任|副书记/.test(名)) return '综合'
  return '其他'
}

export function 岗位平台(名: string | undefined | null): string {
  if (!名) return '其他'
  if (/省长|省委|省高级人民法院|省人民检察院|省纪委|省监委/.test(名)) return '省级'
  if (/省发展和改革委员会|省财政厅|省教育厅|省公安厅|省司法厅|省[^市]*厅|国家|中央/.test(名)) return '省级'
  if (/市长|市委|市政府|市中级人民法院|市人民检察院|市纪委|市监委|市[^县]*局|市[^县]*委员会/.test(名)) return '市级'
  if (/区长|区委|区政府|区人民法院|区人民检察院|区纪委|区监委|区[^县]*局/.test(名)) return '区级'
  if (/县长|县委|县政府|县人民法院|县人民检察院|县纪委|县监委|县[^乡]*局|县人民政府/.test(名)) return '县级'
  if (/副乡长|副镇长|乡长|镇长|[乡镇]党委书记|[乡镇]党委副书记|[乡镇]纪委书记|[乡镇]人大主席|乡人民政府|镇人民政府|街道办|街道党工委/.test(名)) return '乡镇级'
  if (平台集合.includes(名 as never)) return 名
  return '其他'
}

export function 平台单位(平台: string, 城市: string): string {
  const 表 = 平台表[平台 as keyof typeof 平台表]
  if (!表) return '机关'
  let 单位 = pick(表.单位)
  if (平台 === '乡镇级') {
    单位 = 城市.slice(-1) === '乡' ? '乡人民政府' : '镇人民政府'
    return 城市 + 单位.slice(1)
  }
  if (平台 === '省级') return 单位
  return 城市 + 单位.slice(1)
}

export function 是高配(名: string): boolean {
  if (!名) return false
  return 高配岗位.some((x) => 名 === x || 名.indexOf(x) >= 0) || /常委|纪委书记|监委主任/.test(名)
}

export function 是党政班子(名: string | undefined | null): boolean {
  if (!名) return false
  return /副书记|书记|常委|县长|区长|乡长|镇长|组织部|宣传部|统战部|政法委|党委|纪委书记|监委主任|人民法院院长|人民检察院检察长|公安局局长/.test(名)
}

export function 是基层岗位(名: string | undefined | null): boolean {
  if (!名) return false
  return /副乡长|副镇长|乡长|镇长|[乡镇]党委书记|[乡镇]党委副书记|[乡镇]纪委书记|[乡镇]人大主席|乡人民政府|镇人民政府|街道办|街道党工委/.test(名)
}

export function 是二线(名: string | undefined | null): boolean {
  return !!名 && 二线岗位.some((x) => 名.indexOf(x) >= 0)
}

export function 是实权(名: string | undefined | null): boolean {
  if (!名) return false
  if (是二线(名)) return false
  return /县委书记|区委书记|市委书记|省委书记|县长|区长|市长|省长|乡长|镇长|街道办主任|副书记|常委|组织部长|宣传部长|统战部长|政法委书记|公安局|发展和改革委员会主任|财政局局长|财政厅厅长|组织部部长|纪委书记|监委主任|人民法院院长|人民检察院检察长|司法局局长/.test(名)
}

export function 提任年龄上限(g: GameState, idx: number): number {
  const 女 = g && g.p && g.p.性别 === '女'
  const v = 提任年龄表[idx] || [63, 61]
  return 女 ? v[1] : v[0]
}

export function 二线年龄(g: GameState): number {
  if (!g) return 60
  const 女 = g.p.性别 === '女'
  if (g.rankIdx >= 6) return 女 ? 60 : 63
  if (g.rankIdx >= 3) return 女 ? 55 : 58
  return 女 ? 54 : 57
}

export function 平台天花板(g: GameState): number {
  if (g.p.平台顶 != null) return g.p.平台顶
  const t = 平台表[g.p.平台]
  return t ? t.顶 : 8
}

export function zhijiFloorOf(idx: number): number {
  const c = ZHIJI_FLOOR[String(idx)]
  return c == null ? 0 : c
}

export function zhijiCapOf(idx: number): number {
  const c = ZHIJI_CAP[String(idx)]
  return c == null ? 1 : c
}

export function zhijiCap(g: GameState): number {
  if (g.p.职业 !== '公务员') return 0
  return zhijiCapOf(g.rankIdx)
}

export function rankTitle(g: GameState): string {
  if (g.status === '退休') return '退休（' + ((g.positions[0] && g.positions[0].职级) || '科员') + '）'
  if (g.rankIdx < 0) return g.p.职业 === '公务员' ? '科员' : ladder(g)[0].名
  const L = ladder(g)
  return (L[g.rankIdx] && L[g.rankIdx].名) || '—'
}

export function networkScore(g: GameState): number {
  const key = g.npcs.filter((n) => !n.非核心)
  if (!key.length) return g.p.人脉
  let t = 0
  let avg = 0
  key.forEach((n) => { t += (n.信任 + 100) / 2; avg += n.好感度 })
  return clamp(g.p.人脉 * 0.45 + (t / key.length) * 0.30 + (avg / key.length) * 0.25, 0, 100)
}

export function 人脉门槛(def: RankDef | null | undefined): number {
  if (!def || !def.门槛) return 35
  return Math.max(35, Math.round(def.门槛.上司 * 0.78))
}

export interface IndicatorItem {
  名: string
  当前: number
  门槛: number
  超20: number
  超60: number
  已达20: boolean
  已达60: boolean
}

export function indicatorList(g: GameState, def: RankDef | null | undefined): IndicatorItem[] {
  if (!def) return []
  const mk = (名: string, 当前: number, 门槛: number): IndicatorItem => {
    if (门槛 >= 100) return { 名, 当前, 门槛, 超20: 门槛, 超60: 门槛, 已达20: 当前 >= 门槛, 已达60: 当前 >= 门槛 }
    const room = 100 - 门槛
    const 超20 = Math.round(门槛 + room * 0.30)
    const 超60 = Math.round(门槛 + room * 0.70)
    return { 名, 当前, 门槛, 超20, 超60, 已达20: 当前 >= 超20, 已达60: 当前 >= 超60 }
  }
  const 政绩项: IndicatorItem = {
    名: '政绩', 当前: g.zhengji, 门槛: def.门槛.政绩,
    超20: Math.round(def.门槛.政绩 * 1.2), 超60: Math.round(def.门槛.政绩 * 1.6),
    已达20: g.zhengji >= def.门槛.政绩 * 1.2, 已达60: g.zhengji >= def.门槛.政绩 * 1.6,
  }
  return [
    政绩项,
    mk('能力', g.p.能力, def.门槛.能力),
    mk('道德', g.p.道德, def.门槛.道德),
    mk('领导评价', g.p.上司, def.门槛.上司),
    mk('人脉', Math.round(networkScore(g)), 人脉门槛(def)),
    mk('健康', g.p.健康, 80),
  ]
}

export function earlyYears(g: GameState, def: RankDef | null | undefined): number {
  if (!def) return 0
  let c20 = 0
  let c60 = 0
  indicatorList(g, def).forEach((x) => {
    if (x.已达60) c60++
    if (x.已达20) c20++
  })
  if (c60 >= 4) return 4
  if (c20 >= 4) return 2
  return 0
}

export interface NextRankInfo {
  def: RankDef | null
  min: number
  served: number
  can: boolean
  have: boolean
  idx: number
  early: number
  effMin: number
  超龄: boolean
  年龄线: number
}

export function nextRankInfo(g: GameState): NextRankInfo {
  const L = ladder(g)
  const idx = g.rankIdx + 1
  const def = L[idx]
  if (!def) return { def: null, min: 0, served: g.p2.任职年, can: false, have: false, idx, early: 0, effMin: 0, 超龄: false, 年龄线: 0 }
  const early = g.status === '在职' ? earlyYears(g, def) : 0
  const effMin = Math.max(1, def.最低年 - early)
  const haveZ = g.zhengji >= def.门槛.政绩
  const healthy = g.p.健康 >= 50
  const 未超龄 = g.p.年龄 <= 提任年龄上限(g, idx)
  return {
    def, min: def.最低年, served: g.p2.任职年, have: haveZ, idx, early, effMin,
    超龄: !未超龄, 年龄线: 提任年龄上限(g, idx),
    can: g.status === '在职' && !g.flags['二线'] && !影响期内(g) && 未超龄 && g.p2.任职年 >= effMin && haveZ && healthy,
  }
}

export function retireAge(g: GameState): number {
  const senior = g.rankIdx >= 6
  if (g.p.性别 === '男') return senior ? 65 : 60
  return senior ? 63 : 55
}

/* 家庭系数：-0.13 ~ +0.04 */
export function 家庭系数(g: GameState): number {
  let f = 0
  const sp = g.family.配偶
  if (sp) {
    const gg = sp.好感度
    if (gg >= 80) f += 0.03
    else if (gg >= 60) f += 0.015
    else if (gg >= 30) f += 0
    else if (gg >= 15) f -= 0.06
    else f -= 0.13
  } else if (g.family.婚姻 === '离异') {
    f -= 0.04
  } else if (g.p.年龄 >= 35) {
    f -= 0.02
  }
  const kids = g.family.子女
  if (kids.length) {
    const avg = kids.reduce((a, c) => a + c.好感度, 0) / kids.length
    if (avg >= 75) f += 0.01
    else if (avg < 30) f -= 0.03
  }
  return f
}

export function 专业条线匹配(g: GameState): boolean {
  const 专业 = 专业偏好条线[majorGroup(g.p.专业) || ''] || []
  const 现条线 = 条线Of(g.positions[0] && g.positions[0].岗位)
  return 专业.includes(现条线)
}

export function healthLevel(h: number): [string, string, string] {
  if (h >= 90) return ['极佳', 'ok-txt', '身体状态很少成为你的负担。']
  if (h >= 80) return ['良好', 'ok-txt', '达到承担更重岗位的身体要求。']
  if (h >= 70) return ['尚可', '', '还能支撑，但已经能感觉到累。']
  if (h >= 50) return ['偏弱', 'bad-txt', '组织上会开始考虑你的身体是否吃得消。']
  if (h >= 30) return ['较差', 'bad-txt', '再往下走，就是强制退休的线了。']
  return ['危险', 'bad-txt', '随时可能倒下。']
}

export function tierOf(g: GameState): number {
  if (g.rankIdx >= 4) return 2
  if (g.rankIdx >= 2) return 1
  return 0
}

export const TIER_NAME = ['科员及乡科级', '县处级', '厅局级及以上']

export function eduIdxOf(e: string): number {
  return EDU_LEVEL[e as keyof typeof EDU_LEVEL] != null ? EDU_LEVEL[e as keyof typeof EDU_LEVEL] : 2
}

export function promoteGateWhy(g: GameState, ni: NextRankInfo): boolean {
  const d = ni.def
  if (!d) return true
  return g.zhengji >= d.门槛.政绩
}

export function nextYearHint(g: GameState): string {
  const ni = nextRankInfo(g)
  if (g.status === '退休') return '保重身体，照顾好家人。'
  if (!ni.def) return '你已在本序列最高职级。'
  const 缺: string[] = []
  if (g.p2.任职年 < ni.effMin) 缺.push(`还差 ${ni.effMin - g.p2.任职年} 年任职年限`)
  if (g.zhengji < ni.def.门槛.政绩) 缺.push(`${perfLabel(g)}尚缺 ${fmt(ni.def.门槛.政绩 - g.zhengji)}`)
  if (g.p.能力 < ni.def.门槛.能力) 缺.push('能力还需提升')
  if (g.p.道德 < ni.def.门槛.道德) 缺.push('道德评价还需积累')
  if (g.p.上司 < ni.def.门槛.上司) 缺.push('领导评价还需提升')
  if (g.p.健康 < 80) 缺.push('健康需回到 80 以上')
  if (缺.length) return `争取 ${ni.def.名}：` + 缺.join('，') + '。'
  return `条件已具备，明年有望进入 ${ni.def.名} 的考察程序。`
}

export function 平台键有效(平台: string): boolean {
  return 平台集合.includes(平台 as never)
}
