import type { GameState, Snapshot } from './types'
import { clamp, fmt } from '../utils/format'
import { chance, rnd, shuffle } from './rng'
import { applyEffect, 快照, 差异, perfLabel, 人脉上限 } from './effects'
import { doPromote } from './promotion'
import { nextRankInfo, ladder, rankTitle, promoteGateWhy } from './selectors'
import { makeEvent, make腐败事件, makeRetiredEvent, miniEvent, npcTick, cityTick, retiredMini } from './events'
import { disciplineTick, 生成调查事件 } from './discipline'
import { 浪漫方式池 } from '../data/static'
import { makeCandidates } from './newGame'
import { makeShixiOrder } from './quiz'
import {
  netIncome, livingCost, 年租金收入, 年养车成本, 年终奖, 公积金月缴,
  isPublicJob, luxuryCount,
} from './economy'

export function yearWrapUp(g: GameState): void {
  g.riskSnapshot = g.discipline.risk
  g.actions = g.actionsMax
  g.usedThisYear = []
  g.flags['本年免费健康'] = false
  g.shixiOrder = makeShixiOrder(g)
  g.浪漫方式 = shuffle(浪漫方式池).slice(0, 4)
}

export function lifeCheck(g: GameState): void {
  if (g.over) return
  if (g.p.健康 < 20) { die(g, '长期积劳成疾，身体终于撑不住了'); return }
  if (g.status !== '退休' && g.p.健康 < 30) { retire(g, '健康状况不适宜继续任职'); return }
  if (g.status !== '退休' && g.p.年龄 >= retireAgeOf(g)) { retire(g, '到达任职年龄界限'); return }
  if (g.status === '退休') {
    if (g.p.年龄 >= 80 && chance(0.12 + g.p.年龄 * 0.006)) { die(g, '在家中安详离世'); return }
    if (g.p.健康 < 15) { die(g, '久病之后离世'); return }
  }
}

function retireAgeOf(g: GameState): number {
  const senior = g.rankIdx >= 6
  if (g.p.性别 === '男') return senior ? 65 : 60
  return senior ? 63 : 55
}

export function retire(g: GameState, why: string): void {
  if (isPublicJob(g) && g.discipline.risk >= 35 && chance(g.discipline.risk / 300)) {
    g.pendingEvent = 生成调查事件(g, '你在办理退休手续前，组织上对你进行离任审计')
    g.pendingEvent.月 = rnd(1, 12)
  }
  g.status = '退休'
  g.pension = Math.round(g.income.月工资 * 0.85)
  g.income.月工资 = g.pension
  g.log.unshift({
    t: `${g.date.y}年`, h: '办理退休', kind: '',
    d: `${why}，你在 ${g.p.年龄} 岁办理了退休手续。\n此后每月领取养老金约 ${fmt(g.pension)} 元。办公室的钥匙交还给了年轻人。`,
  })
}

export function die(g: GameState, why: string): void {
  g.over = true
  g.status = '死亡'
  g.endYear = g.date.y
  g.log.unshift({ t: `${g.date.y}年`, h: '去世', kind: 'bad', d: `${g.p.姓名}于 ${g.date.y} 年去世，享年 ${g.p.年龄} 岁。${why}。` })
}

export function endYear(g: GameState): void {
  const 年初: Snapshot = g._年初快照 || 快照(g)
  const 本年施政 = (g.usedThisYear || []).length
  g.date.y++
  g.p.年龄++
  g.p2.任职年++
  g.quiz = null

  /* 家庭合并收支 + 年终考核奖 + 非自住房租金 - 养车 */
  const 奖金 = 年终奖(g)
  if (奖金 > 0) {
    g.cash += 奖金
    g.yearLog.unshift({
      t: `${g.date.y}年`, h: '年终考核奖', kind: 'good',
      d: `年度考核结果出来，你拿到 ${fmt(奖金)} 元年终奖（约 ${Math.round(奖金 / g.income.月工资)} 个月工资）。`,
    })
  }
  // 住房公积金：在职期间按月缴存（退休后停缴）
  if (g.status !== '退休') g.fund = (g.fund || 0) + 公积金月缴(g) * 12
  const 房供年 = (g.loans || []).filter((l) => l.类型 === '房').reduce((a, l) => a + l.月供, 0) * 12
  if (房供年 > 0 && g.fund > 0) {
    const 冲还 = Math.min(g.fund, 房供年)
    g.fund -= 冲还
    g.cash += 冲还
    g.yearLog.unshift({ t: `${g.date.y}年`, h: '公积金冲还贷', kind: 'good', d: `从公积金账户提取 ${fmt(冲还)} 元用于偿还房贷。` })
  }
  if (g.date.y % 2 === 0) {
    const 本级月薪 = g.rankIdx >= 0 ? (ladder(g)[g.rankIdx]?.月薪 || 5200) : 5200
    const 同级 = Math.max(6200, 本级月薪 * 1.6)
    g.income.月工资 = Math.min(Math.round(同级), Math.round(g.income.月工资 * 1.02))
  }
  g.cash += (netIncome(g) - livingCost(g)) * 12
  const 租金 = 年租金收入(g)
  if (租金 > 0) {
    g.cash += 租金
    g.yearLog.unshift({ t: `${g.date.y}年`, h: '租金收入', kind: 'good', d: `名下非自住房产本年租金收入约 ${fmt(租金)} 元。` })
  }
  const 养车 = 年养车成本(g)
  if (养车 > 0) g.cash -= 养车
  for (const l of g.loans) {
    if (l.余额 <= 0) continue
    for (let m = 0; m < 12 && l.余额 > 0; m++) {
      const interest = Math.round((l.余额 * l.利率) / 100 / 12)
      if (g.cash >= l.月供) {
        g.cash -= l.月供
        l.余额 = Math.max(0, l.余额 - (l.月供 - interest))
        l.已还++
      } else {
        l.余额 += l.月供 + Math.round(l.月供 * 0.05)
        l.已还++
        g.p.声望 = clamp(g.p.声望 - 3, 0, 100)
        g.discipline.risk = clamp(g.discipline.risk + 2, 0, 100)
        g.yearLog.unshift({ t: `${g.date.y}年`, h: '贷款逾期', kind: 'bad', d: `${l.名}月供 ${fmt(l.月供)} 元未能按时偿还，银行计收罚息并上报征信。` })
      }
    }
  }
  g.loans = g.loans.filter((l) => l.余额 > 0)

  /* 在职学历（退休后中止） */
  if (g.edu.在读 && g.status === '退休') g.edu.在读 = null
  if (g.edu.在读) {
    const u = g.edu.在读
    u.剩--
    g.actions = Math.max(0, g.actions - 1)
    const per = Math.round((u.总费 - u.已付) / Math.max(1, u.剩 + 1))
    if (per > 0) {
      if (g.cash >= per) { g.cash -= per; u.已付 += per }
      else g.yearLog.unshift({ t: `${g.date.y}年`, h: '学费未缴', kind: 'bad', d: `本年学费 ${fmt(per)} 元未缴清。` })
    }
    if (u.剩 <= 0) {
      const old = g.p.学历
      g.p.学历 = u.至
      applyEffect(g, u.效)
      g.log.unshift({ t: `${g.date.y}年`, h: '学历提升完成', kind: 'good', d: `你完成了${u.名}，学历由${old}提升至${u.至}。` })
      g.edu.在读 = null
      g.flags['学历已提升'] = true
    }
  }

  /* 家庭 */
  if (g.family.配偶) {
    const sp = g.family.配偶
    sp.年龄++
    if (!sp.退休) {
      if (sp.年龄 >= 55) {
        sp.退休 = true
        sp.养老金 = Math.round((sp.月收入 || 0) * 0.8)
        g.log.unshift({ t: `${g.date.y}年`, h: `${sp.姓名}退休`, kind: '', d: `${sp.姓名}办理了退休手续，每月养老金约 ${fmt(sp.养老金)} 元。家里的收入少了一块。` })
      } else sp.月收入 = Math.round((sp.月收入 || 5000) * 1.03)
    }
    let drift = rnd(-8, 2)
    if (g.flags['本年顾家']) drift += 6
    sp.好感度 = clamp(sp.好感度 + drift, 0, 100)
    if (sp.年龄 >= 72 && chance(0.03 + (sp.年龄 - 72) * 0.012)) {
      g.family.配偶 = null
      g.family.婚姻 = '丧偶'
      if (!g.candidates.length) g.candidates = makeCandidatesLocal(g)
      g._候选年数 = 0
      g.p.声望 = clamp(g.p.声望 - 3, 0, 100)
      g.p.健康 = clamp(g.p.健康 - 8, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '配偶去世', kind: 'bad', d: `${sp.姓名}因病去世，享年 ${sp.年龄} 岁。\n家里忽然安静下来，很多习惯要重新学一遍。` })
    } else if (sp.好感度 < 20 && chance(0.35)) {
      g.family.配偶 = null
      g.family.婚姻 = '离异'
      if (!g.candidates.length) g.candidates = makeCandidatesLocal(g)
      g._候选年数 = 0
      g.p.声望 = clamp(g.p.声望 - 6, 0, 100)
      g.p.健康 = clamp(g.p.健康 - 4, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '离婚', kind: 'bad', d: `你和${sp.姓名}办理了离婚手续。\n对方说：「你从来没有真正在这个家里待过。」` })
    }
  }
  g.flags['本年顾家'] = false
  g.family.子女.forEach((c) => {
    c.年龄++
    const 底 = c.独立 ? 30 : 10
    c.好感度 = clamp(c.好感度 - rnd(0, c.独立 ? 1 : 4), 底, 100)
    if (c.年龄 === 3) g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}上幼儿园`, kind: '', d: `${c.姓名}开始上幼儿园，每月多出一笔不小的开销。` })
    if (c.年龄 === 6) g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}上小学`, kind: '', d: `${c.姓名}背上书包上学了。${c.好感度 > 60 ? '孩子愿意跟你说学校的事。' : '孩子的话越来越少。'}` })
    if (c.年龄 === 12) g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}上初中`, kind: '', d: `${c.姓名}升入初中，补课费成了家里的一项固定支出。` })
    if (c.年龄 === 15) g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}中考`, kind: '', d: `${c.姓名}今年中考。${c.好感度 > 60 ? '孩子愿意听你的意见。' : '孩子什么都不愿意跟你说。'}` })
    if (c.年龄 === 18) {
      if (chance(c.好感度 / 150 + 0.25)) {
        c.考上大学 = true
        c.备注 = '在读大学'
        if (g.family.配偶) g.family.配偶.好感度 = clamp(g.family.配偶.好感度 + 8, 0, 100)
        g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}考上大学`, kind: 'good', d: `${c.姓名}收到了大学录取通知书。学费和生活费每年要花掉你不少钱，但你请了半天假去车站送他。` })
      } else {
        c.考上大学 = false
        c.独立 = true
        c.备注 = '外出务工'
        g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}高考失利`, kind: 'bad', d: `${c.姓名}没能考上大学，决定外出打工。你在电话里沉默了很久。` })
      }
    }
    if (c.年龄 === 22 && c.考上大学) {
      c.独立 = true
      c.备注 = '已工作'
      g.log.unshift({ t: `${g.date.y}年`, h: `${c.姓名}大学毕业`, kind: 'good', d: `${c.姓名}大学毕业，找到了工作。你终于不用再为他/她的生活费操心。` })
    }
    if (c.独立 && c.年龄 >= 23 && chance(0.55)) {
      const 孝养 = Math.round(rnd(2000, 12000) * (0.4 + c.好感度 / 100))
      g.cash += 孝养
      g.yearLog.unshift({ t: `${g.date.y}年`, h: `${c.姓名}的孝养`, kind: 'good', d: `${c.姓名}给你转了 ${fmt(孝养)} 元，说让你别太省。` })
    }
  })
  g.candidates.forEach((c) => { c.年龄++; c.本年约会 = [] })
  g._候选年数 = (g._候选年数 || 0) + 1
  // 不再整批替换候选：只在人数不足时补充，上限 6 位
  if (g.status !== '退休' && g.p.年龄 <= 66 && g.candidates.length < 2) {
    const fresh = makeCandidatesLocal(g)
    const add = Math.min(2 - g.candidates.length, fresh.length)
    g.candidates.push(...fresh.slice(0, add))
    g._候选年数 = 0
  }

  lifeCheck(g)
  if (g.over) { yearWrapUp(g); return }

  /* 人脉 */
  const 上限 = 人脉上限(g)
  const 年增 = 1 + Math.floor(Math.max(0, g.rankIdx + 1) / 3)
  if (g.p.人脉 < 上限) g.p.人脉 = clamp(Math.min(g.p.人脉 + 年增, 上限), 0, 100)

  /* 健康 */
  g.p.健康 = clamp(g.p.健康 + 6 + Math.min(g.actions, 4), 0, 100)
  if (g.p.年龄 > 45) g.p.健康 = clamp(g.p.健康 - 2, 0, 100)
  if (g.p.年龄 > 55) g.p.健康 = clamp(g.p.健康 - 2, 0, 100)
  if (g.p.年龄 > 70) g.p.健康 = clamp(g.p.健康 - 3, 0, 100)
  if (g.p.健康 < 25) g.p.能力 = clamp(g.p.能力 - 2, 0, 100)

  /* 事件 */
  if (g.status === '退休') {
    if (chance(0.55)) {
      g.pendingEvent = makeRetiredEvent(g)
      g.pendingEvent.月 = rnd(1, 12)
    } else if (chance(0.5)) retiredMini(g)
  } else {
    const 廉政机会 = (isPublicJob(g) && g.rankIdx >= 0 && chance(0.6)) ? make腐败事件(g) : null
    if (廉政机会) {
      g.pendingEvent = 廉政机会
      g.pendingEvent.月 = rnd(1, 12)
    } else if (chance(0.62)) {
      g.pendingEvent = makeEvent(g)
      g.pendingEvent.月 = rnd(1, 12)
    } else if (chance(0.5)) miniEvent(g)
  }

  npcTick(g)
  cityTick(g)
  disciplineTick(g)
  g.discipline.risk = clamp(g.discipline.risk - 6, 0, 100)

  /* 超标资产 */
  const lux = luxuryCount(g)
  if (lux > 0 && isPublicJob(g) && g.status !== '退休') {
    if (chance(0.10 + 0.08 * (lux - 1))) {
      g.discipline.risk = clamp(g.discipline.risk + 10 * lux, 0, 100)
      g.discipline.records.unshift(`${g.date.y}年：组织考察期间，个人有关事项报告中的房产/车辆情况被要求作出说明。`)
      g.p.声望 = clamp(g.p.声望 - 5, 0, 100)
      if (chance(0.35)) { g.p2.处分++; g.p.上司 = clamp(g.p.上司 - 8, 0, 100) }
      g.log.unshift({
        t: `${g.date.y}年`, h: '纪律审查', kind: 'bad',
        d: `组织部门在考察期间核对个人有关事项报告，你名下 ${lux} 项明显超出收入水平的资产被要求说明来源。\n`
          + (g.p2.处分 ? '最终给予诫勉谈话，记入个人档案。' : '你提供了购房贷款合同与资金来源说明，暂时过关——但这件事被记下来了。'),
      })
    }
  }

  /* 挂职期满 */
  if (g.p.挂职 && g.date.y >= g.p.挂职.结束年) {
    const gg = g.p.挂职
    g.p.挂职 = null
    g.log.unshift({ t: `${g.date.y}年`, h: '挂职期满', kind: 'good', d: `你在${gg.单位}的挂职期满，组织关系转回${g.p.单位}。\n两年基层下来，你说话的分量和两年前不一样了。` })
    g.flags['挂职期满'] = true
  }

  /* 退居二线 */
  if (g.p.职业 === '公务员' && g.status === '在职' && !g.flags['二线'] && g.rankIdx >= 2 && g.p.年龄 >= 二线年龄Of(g)) {
    const 超龄 = g.p.年龄 - 二线年龄Of(g)
    if (g.discipline.risk >= 35 && chance(g.discipline.risk / 300)) {
      g.pendingEvent = 生成调查事件(g, '你即将转任二线，组织上按惯例对你进行离任审计')
      g.pendingEvent.月 = rnd(1, 12)
    } else if (chance(0.35 + 超龄 * 0.12)) {
      const 现任 = g.positions[0]
      const 二线名 = (['人大常委会副主任', '政协副主席', '政协秘书长', '政府参事'] as const)[Math.floor(Math.random() * 4)]
      const 级别名 = 现任 ? 现任.职级 : rankTitle(g)
      g.positions.unshift({ 年: g.date.y, 职级: 级别名, 岗位: 二线名, 条线: '综合' })
      g.flags['二线'] = true
      g.p.声望 = clamp(g.p.声望 + 3, 0, 100)
      g.p.健康 = clamp(g.p.健康 + 4, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '转任二线', kind: '', d: `年满 ${g.p.年龄} 岁，组织上安排你转任${二线名}（${级别名}）。\n不再分管一线事务，但级别与待遇不变。办公室的人来得少了，会开得也少了。` })
    }
  }

  /* 职级并行 */
  if (g.p.职业 === '公务员' && g.status === '在职') {
    g.p2.职级年 = (g.p2.职级年 || 0) + 1
    if (g.zhijiIdx < 职级上限Of(g) && g.p2.职级年 >= 2 && g.p2.处分 === 0 && g.discipline.risk < 70 && chance(0.72)) {
      g.zhijiIdx++
      g.p2.职级年 = 0
      g.income.月工资 += 900
      g.p.人脉 = clamp(g.p.人脉 + 1, 0, 人脉上限(g))
      g.log.unshift({ t: `${g.date.y}年`, h: '职级晋升', kind: 'good', d: `经年度考核，你的职级由${职级名Of(g.zhijiIdx - 1)}晋升为${职级名Of(g.zhijiIdx)}，工资相应调整。` })
    }
  }

  /* 自动晋升 */
  if (g.status === '在职') {
    const ni = nextRankInfo(g)
    if (ni.can) doPromote(g, false)
    else if (ni.def && g.p2.任职年 >= ni.effMin && !promoteGateWhy(g, ni)) {
      g.log.unshift({ t: `${g.date.y}年`, h: '任职年限已到', kind: '', d: `你在现职级已任职 ${g.p2.任职年} 年，达到最低任职年限，但${perfLabel(g)}等条件尚未达标，组织暂未启动考察。` })
    }
  }

  yearWrapUp(g)
  lifeCheck(g)
  g.p.人脉 = Math.min(g.p.人脉, 人脉上限(g))

  /* 年度总结 */
  const 年末 = 快照(g)
  const 明细 = 差异(年初, 年末, true, perfLabel(g))
  const 收入 = netIncome(g) * 12
  const 支出 = livingCost(g) * 12
  const 职名 = (i: number) => (i < 0 ? '科员' : (ladder(g)[i] ? ladder(g)[i].名 : '上级职务'))
  const 职务变化 = 年末.职务 > 年初.职务
    ? `提任 ${职名(年末.职务)}${g._晋升消耗 ? `（晋升按规矩核减 ${fmt(g._晋升消耗)} ${perfLabel(g)}）` : ''}`
    : (年末.职务 < 年初.职务 ? `免去现职，降为${职名(年末.职务)}` : '无变动')
  g._晋升消耗 = 0
  const 职级变化 = 年末.职级 !== 年初.职级 ? `${职级名Of(年初.职级)} → ${职级名Of(年末.职级)}` : '无变动'
  g.yearSummary = {
    年: g.date.y - 1, 年龄: g.p.年龄 - 1, 职务: rankTitle(g), 状态: g.status,
    明细, 收入, 支出, 租金, 养车,
    结余: 收入 - 支出 + 租金 - 养车, 职务变化, 职级变化,
    施政数: 本年施政,
    记录: g.yearLog.slice().map((x) => (x.t === `${g.date.y}年` ? { ...x, t: `${g.date.y - 1}年` } : x)),
    事件: g._本年事件 || [],
    施政评价: (() => {
      let 正确 = 0
      let 模糊 = 0
      let 失当 = 0
      g.yearLog.forEach((x) => {
        if (/正确处置/.test(x.h)) 正确++
        else if (/处置平平/.test(x.h)) 模糊++
        else if (/处置失当/.test(x.h)) 失当++
      })
      return { 正确, 模糊, 失当 }
    })(),
    下一年: nextYearHintLocal(g),
  }
  g._本年事件 = []
  g._年初快照 = 年末
  g.yearLog = []
}

const 职级序列All = ['二级科员', '一级科员', '四级主任科员', '三级主任科员', '二级主任科员', '一级主任科员', '四级调研员', '三级调研员', '二级调研员', '一级调研员', '二级巡视员', '一级巡视员']
function 职级名Of(i: number): string {
  return 职级序列All[i] || '—'
}

function 职级上限Of(g: GameState): number {
  const map: Record<string, number> = { '-1': 1, '0': 3, '1': 5, '2': 7, '3': 9, '4': 10, '5': 11, '6': 11, '7': 11, '8': 11, '9': 11 }
  if (g.p.职业 !== '公务员') return 0
  const c = map[String(g.rankIdx)]
  return c == null ? 0 : c
}

function 二线年龄Of(g: GameState): number {
  const 女 = g.p.性别 === '女'
  if (g.rankIdx >= 6) return 女 ? 60 : 63
  if (g.rankIdx >= 3) return 女 ? 55 : 58
  return 女 ? 54 : 57
}

function nextYearHintLocal(g: GameState): string {
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

function makeCandidatesLocal(g: GameState) {
  return makeCandidates(g.p.性别, g.p.年龄)
}
