import type { Candidate, Edu, GameState, Sex, Job } from './types'
import { 单姓, 复姓, 男名, 女名, 男名池, 女名池, 婚恋职业池, 婚恋收入, 婚恋性格, BACKGROUNDS, JOB_BONUS, BASE_PAY, JOB_UNIT_FIXED, 平台表, 平台集合, ACTIONS_PER_YEAR, SHIXI_COUNT } from '../data/static'
import { SHIXI } from '../data/shixi'
import { clamp } from '../utils/format'
import { pick, rnd, shuffle } from './rng'
import { fitOf, 平台单位, 条线Of } from './selectors'

export function randomName(sex: Sex): string {
  const sur = pick(单姓.split('').concat(复姓))
  return sur + pick(sex === '女' ? 女名 : 男名)
}

export function makeCandidates(sex: Sex, age: number): Candidate[] {
  if (age > 66) return []
  const opp: Sex = sex === '男' ? '女' : '男'
  const pool = sex === '男' ? 女名池 : 男名池
  const 下限 = Math.max(22, age - 8)
  const 上限 = Math.min(70, age + 6)
  return shuffle(pool).slice(0, 2).map((nn, i) => {
    const jd = pick(婚恋职业池)
    const 身份 = jd.类别 + ' · ' + jd.名
    return {
      id: 'cand' + i + Math.floor(Math.random() * 1000), 姓名: nn, 性别: opp,
      年龄: clamp(age + rnd(-8, 6), 下限, 上限),
      职业: 身份, 身份, 类别: jd.类别,
      月收入: Math.round((婚恋收入[jd.类别] || 5200) * (0.85 + Math.random() * 0.35)),
      性格: pick(婚恋性格), 好感度: rnd(8, 26),
      面: opp === '女' ? '👩' : '👨', memory: [], notes: '通过朋友介绍认识的。',
    }
  })
}

function xdRate(age: number, edu: Edu): number {
  const e = eduLevel(edu)
  if (e === 2 && age <= 25) return 0.16
  if (e === 3 && age <= 28) return 0.28
  if (e === 4 && age <= 32) return 0.36
  return 0
}

function eduLevel(edu: Edu): number {
  const map: Record<Edu, number> = { '高中/中专': 0, '大专': 1, '本科': 2, '硕士': 3, '博士': 4 }
  return map[edu] != null ? map[edu] : 2
}

function startZhiji(edu: Edu, isXd: boolean): number {
  const e = eduLevel(edu)
  let idx = e <= 1 ? 0 : e === 2 ? 1 : e === 3 ? 2 : 3
  if (isXd) idx = Math.min(11, idx + 1)
  return idx
}

function zhijiFloorOf(idx: number): number {
  const map: Record<string, number> = { '-1': 0, '0': 2, '1': 4, '2': 6, '3': 8, '4': 9, '5': 10, '6': 11, '7': 11, '8': 11, '9': 11 }
  const c = map[String(idx)]
  return c == null ? 0 : c
}

export interface SetupForm {
  name: string
  sex: Sex
  age: number
  major: string
  job: Job
}

export function newState(f: SetupForm): GameState {
  const age = f.age
  const edu = age <= 20 ? '高中/中专' : age === 21 ? '大专' : age <= 24 ? '本科' : age <= 27 ? '硕士' : '博士'
  const fit = fitOf(f.major, f.job)
  const isXd = f.job === '公务员' && Math.random() < xdRate(age, edu as Edu)
  const bg = pick(BACKGROUNDS)
  const born = pick(['汉东省京州', '汉东省吕州', '汉东省林城', '汉东省岩台', '外省城镇', '外省农村'])
  const 平台 = pick(平台集合)
  const city = pick(平台表[平台].城市)
  const 分配单位 = 平台单位(平台, city)
  const housing = pick(['单位集体宿舍', '与人合租的老小区两居', '城中村单间', '亲戚家借住', '父母家（每天通勤）'])
  const jobUnit = f.job === '公务员' ? 分配单位 : JOB_UNIT_FIXED[f.job]
  const basePay = BASE_PAY[f.job]

  const s: GameState = {
    version: 1,
    p: {
      姓名: f.name, 性别: f.sex, 年龄: age, 出生地: born, 城市: city, 家庭背景: bg.k, 平台, 平台顶: 平台表[平台].顶,
      学历: edu as Edu, 专业: f.major, 专业匹配度: fit, 职业: f.job, 单位: jobUnit,
      选调生: isXd, 政治面貌: isXd ? '中共党员' : (Math.random() < 0.3 ? '中共党员' : '群众'),
      目标: pick(['在体制内向上走，做出实事', '把家人安顿好，过得踏实', '做成一件真正留下痕迹的事', '守住底线，安稳一生', '趁年轻多挣点钱，别留遗憾']),
      能力: 52, 道德: 58, 健康: 72, 人脉: 28, 上司: 40, 声望: 48,
    },
    p2: { 处分: 0, 嘉奖: 0, 任职年: 0, 职级年: 0, 初次晋升: false, 连续模糊: 0, 累计模糊: 0 },
    status: '在职',
    rankIdx: isXd ? 0 : -1,
    zhijiIdx: f.job === '公务员' ? Math.max(startZhiji(edu as Edu, isXd), isXd ? zhijiFloorOf(0) : 0) : 0,
    positions: [], zhengji: 0,
    cash: rnd(bg.现金[0], bg.现金[1]), housing,
    assets: { 房产: [], 车辆: [], 投资: [] },
    market: { 房价: 1 },
    loans: [], 负债: rnd(bg.负债[0], bg.负债[1]), fund: 0,
    edu: { 在读: null, 证书: [] },
    income: { 月工资: basePay, 其他: 0 },
    date: { y: 2040 }, beginYear: 2040, endYear: 0,
    actions: ACTIONS_PER_YEAR, actionsMax: ACTIONS_PER_YEAR,
    usedThisYear: [],
    shixiOrder: shuffle(SHIXI.map((_, i) => i)).slice(0, SHIXI_COUNT),
    quiz: null,
    family: { 婚姻: '单身', 配偶: null, 子女: [] },
    candidates: [],
    discipline: { risk: 0, level: '平稳', records: [], 案件: [] },
    riskSnapshot: 0,
    city: { 财政收入: 62, 就业: 58, 房地产: 55, 产业: 54, 公共服务: 60, 交通: 52, 舆论: 60, 矛盾: 38 },
    npcs: [], log: [], flags: {}, over: false,
    pendingEvent: null, pendingPositions: null, pendingPosTitle: '', yearLog: [],
  }

  for (const m of [bg.bonus, JOB_BONUS[f.job] || {}]) {
    for (const k in m) {
      const key = k as '能力' | '道德' | '健康' | '人脉' | '上司' | '声望' | '政绩' | '廉政风险'
      const v = m[key]
      if (v && (key === '能力' || key === '道德' || key === '健康' || key === '人脉' || key === '上司' || key === '声望')) {
        s.p[key] = clamp(s.p[key] + v, 0, 100)
      }
    }
  }

  let post: string | null = null
  if (isXd) {
    s.p.上司 = clamp(s.p.上司 + 8, 0, 100)
    s.p.人脉 = clamp(s.p.人脉 + 6, 0, 100)
    s.p.声望 = clamp(s.p.声望 + 5, 0, 100)
    s.flags['选调生'] = true
    s.p.单位 = '省委组织部'
    s.p.平台 = '省级'
    const 挂职层级 = pick(['县级', '县级', '乡镇级'] as const)
    const 挂职城市 = pick(平台表[挂职层级].城市)
    const 挂职单位 = 平台单位(挂职层级, 挂职城市)
    s.p.挂职 = { 层级: 挂职层级, 单位: 挂职单位, 结束年: s.date.y + rnd(2, 3) }
    s.rankIdx = 0
    s.zhijiIdx = Math.max(s.zhijiIdx, zhijiFloorOf(0))
    const 挂职条 = 条线Of(挂职单位)
    const 条线岗位: Record<string, string> = {
      '发改': '县发展和改革局副局长', '财政': '县财政局副局长', '组工': '县委组织部副部长',
      '宣传': '县委宣传部副部长', '住建': '县住房和城乡建设局副局长', '政法': '县公安局副局长',
      '教育': '县教育局副局长', '农业': '县农业农村局副局长', '交通': '县交通运输局副局长',
      '审计': '县审计局副局长', '市场监管': '县市场监督管理局副局长', '卫健': '县卫生健康局副局长',
      '自然资源': '县自然资源局副局长', '工信': '县工业和信息化局副局长', '生态': '县生态环境局副局长', '综合': '副乡长',
    }
    const 挂职岗位 = 挂职层级 === '乡镇级'
      ? (挂职城市.slice(-1) === '乡' ? pick(['副乡长', '乡镇党委副书记']) : pick(['副镇长', '乡镇党委副书记']))
      : (条线岗位[挂职条] || '县发展和改革局副局长')
    post = '挂职' + 挂职岗位
    s.positions = [{ 年: s.date.y, 职级: '乡科级副职', 岗位: post, 条线: 条线Of(post), 挂职: true }]
    s.p2.初次晋升 = true
    s.zhijiIdx = Math.min(s.zhijiIdx, 7)
  }

  const leaderName = pick(['高育良', '李达康', '季昌明', '孙连城', '丁义珍', '陈海', '赵东来', '田国福'])
  s.npcs = [
    {
      id: 'leader', 姓名: leaderName, 身份: '分管领导（正处级）', 年龄: 52, 面: '🧔', 层级: '上级',
      信任: 32, 利益: 0, 公开: 20, 好感度: 62, 性格: '爱惜羽毛，重文字材料',
      memory: ['第一次见他时，你交上去的材料格式错了三处。'], notes: '你的直接领导，晋升时最有分量的一票。',
    },
    {
      id: 'colleague', 姓名: pick(男名池), 身份: '同处室同批同事', 年龄: Math.max(24, age + 2), 面: '👨‍💼', 层级: '同事',
      信任: 48, 利益: 0, 公开: 45, 好感度: 75, 性格: '业务熟，话不多',
      memory: [], notes: '和你同一条船，也和你争同一个位置。',
    },
    {
      id: 'oldclass', 姓名: pick(['蔡成功', '王大路', '郑胜利', '刘新建', '孙广志']), 身份: '京州民营建筑公司老板', 年龄: Math.max(26, age + 3), 面: '🧑‍💼', 层级: '社会',
      信任: 58, 利益: 28, 公开: 40, 好感度: 78, 性格: '讲义气，也讲利益，胆子偏大',
      memory: ['大学时你借过他两千块交学费。'], notes: '你的老同学，做工程生意。',
    },
    {
      id: 'discipline', 姓名: pick(男名池), 身份: '市纪委监委监督检查室副主任', 年龄: 44, 面: '🕵️', 层级: '监督',
      信任: 20, 利益: 0, 公开: 15, 好感度: 40, 性格: '程序至上，只认证据',
      memory: [], notes: '目前和你没有交集，但你知道他存在。',
    },
  ]
  s.candidates = makeCandidates(f.sex, age)

  s.log.unshift({
    t: `${s.date.y}年`, h: '初入社会', kind: '',
    d: `你叫${f.name}，${f.sex}，${age}岁，${edu}学历，${f.major}专业，专业与${f.job}的匹配度为 ${fit}%。`
      + `\n出生地：${born}　家庭：${bg.k}　城市：${city}　现居：${housing}`
      + `\n存款 ${s.cash.toLocaleString('zh-CN')} 元${s.负债 ? `，助学贷款等负债 ${s.负债.toLocaleString('zh-CN')} 元` : ''}。一切从零开始。`
      + `\n身份：${f.job}${jobUnit ? `（${jobUnit}）` : ''}${isXd ? '，省委组织部选调生，按规定定级为乡科级副职' : ''}`
      + `\n工作平台：${isXd ? `省委组织部（下派${s.p.挂职?.单位}挂职锻炼）` : (平台 + '（' + (平台 === '省级' ? '起点高，但往上每一步都要挤' : 平台 === '乡镇级' ? '离群众最近，路也最窄' : '上下都有通道') + '）')}`
      + `\n目前单身。感情和事业一样，都需要时间。`,
  })
  if (isXd) {
    s.log.unshift({
      t: `${s.date.y}年`, h: '选调生分配', kind: 'good',
      d: `作为省委组织部选调生，你的人事关系留在省委组织部，先下派到${s.p.挂职?.单位}挂职锻炼。\n当前岗位：${post}（乡科级副职），挂职期约 ${s.p.挂职!.结束年 - s.date.y} 年，期满回部另行安排。\n同批选调生不多，组织上对你们有另一种期待——也有另一种要求。`,
    })
  }
  return s
}
