import type { GameEvent, GameState } from './types'
import { clamp, fmt } from '../utils/format'
import { chance, pick } from './rng'
import { applyEffect, 涉案金额 } from './effects'

export function 处置结果(g: GameState, 从轻: -1 | 0 | 1): string {
  const risk = g.discipline.risk
  const 金额 = 涉案金额(g)
  const 案数 = (g.discipline.案件 || []).length
  let 严重 = 金额 / 10000 + risk * 0.6 + 案数 * 4 + 从轻 * 60
  严重 = Math.max(0, 严重 * (0.85 + Math.random() * 0.3))
  const 档 = 严重 < 25 ? 0 : 严重 < 60 ? 1 : 严重 < 130 ? 2 : 严重 < 280 ? 3 : 4
  let 文本: string
  if (档 === 0) {
    applyEffect(g, { 声望: -3, 廉政风险: -12 })
    g.discipline.records.unshift(`${g.date.y}年：接受谈话提醒。`)
    文本 = '经研究，决定对你进行谈话提醒。\n谈话结束后，你自己走回了办公室。这一次，组织给了你一个机会。'
  } else if (档 === 1) {
    g.discipline.影响期 = g.date.y + 1
    applyEffect(g, { 声望: -7, 上司: -5, 廉政风险: -14, 道德: -2 })
    g.discipline.records.unshift(`${g.date.y}年：受到诫勉谈话处理，影响期一年。`)
    文本 = '经研究，决定给予你诫勉谈话处理，影响期一年。\n影响期内不得提拔或者进一步使用。你的名字从当年的考察名单上被划掉了。'
  } else if (档 === 2) {
    g.p2.处分++
    g.discipline.已查金额 = (g.discipline.已查金额 || 0) + 金额
    g.discipline.案件 = []
    g.discipline.risk = Math.min(g.discipline.risk, 18)
    g.discipline.影响期 = g.date.y + 2
    applyEffect(g, { 声望: -14, 上司: -12, 廉政风险: -20, 道德: -3 })
    const 处 = pick(['党内警告', '党内严重警告', '记过', '记大过'])
    g.discipline.records.unshift(`${g.date.y}年：受到${处}处分。`)
    文本 = `经市纪委常委会会议研究并报市委批准，决定给予你${处}处分。\n处分决定在单位全体干部大会上宣读。你坐在第一排，从头到尾没有抬头。`
  } else if (档 === 3) {
    g.p2.处分++
    g.discipline.已查金额 = (g.discipline.已查金额 || 0) + 金额
    g.discipline.案件 = []
    g.discipline.risk = Math.min(g.discipline.risk, 12)
    g.rankIdx = Math.max(-1, g.rankIdx - 2)
    g.p2.任职年 = 0
    const 处 = pick(['撤销党内职务', '开除党籍、政务撤职'])
    g.discipline.records.unshift(`${g.date.y}年：被立案审查调查，给予${处}处分，免去现职。`)
    applyEffect(g, { 声望: -30, 上司: -25, 健康: -10, 道德: -4 })
    文本 = `经省纪委监委立案审查调查，决定给予你${处}处分，并免去现任职务。\n通报在省里发了通稿——严重违纪违法。你从办公室搬走的时候，只带走了两个纸箱。`
  } else {
    g.p2.处分++
    g.discipline.移送 = true
    g.over = true
    g.status = '死亡'
    g.endYear = g.date.y
    applyEffect(g, { 声望: -45, 上司: -30, 健康: -20 })
    g.discipline.records.unshift(`${g.date.y}年：严重违纪违法，被开除党籍、开除公职，涉嫌犯罪问题移送检察机关依法审查起诉。`)
    文本 = '经省纪委监委立案审查调查，查明你利用职务便利为他人谋取利益，非法收受财物数额特别巨大。\n决定给予你开除党籍、开除公职处分，涉嫌犯罪问题移送检察机关依法审查起诉。\n\n你被带走的那天，办公室的灯还亮着。'
  }
  g.log.unshift({ t: `${g.date.y}年`, h: '纪律审查', kind: 'bad', d: 文本 })
  return 文本
}

export function 生成调查事件(g: GameState, 触发点: string): GameEvent {
  void g
  return {
    类型: '纪律审查',
    标题: '纪委监委找你谈话',
    描述: 触发点 + '。市纪委监委的工作人员请你到谈话室，谈话从上午九点持续到下午三点，问的都是这些年的事——哪一年、哪一笔、谁经的手。',
    背景: '桌上放着一本台账。你看不清上面写了什么，但你知道那里面有你。',
    选项: [
      {
        text: '主动交代全部问题，包括组织还没有掌握的', hint: '争取从轻处理',
        resolve(g2) {
          const r = 处置结果(g2, -1)
          g2.discipline.records.unshift(`${g2.date.y}年：主动向组织交代问题，获得从轻处理。`)
          return '你把能想起来的每一笔都写了下去，一共写了十七页。\n交代完的那一刻，你反而觉得轻松了。\n\n' + r
        },
      },
      {
        text: '只说明组织已经掌握的部分', hint: '不说谎，但也不全说',
        resolve(g2) {
          const r = 处置结果(g2, 0)
          return '你只承认了台账上有的那几笔，其余的一概说记不清。\n办案人员没有追问，只是把记录推过来让你签字。\n\n' + r
        },
      },
      {
        text: '避重就轻，并设法与相关人员统一口径', hint: '对抗组织审查，性质就变了',
        resolve(g2) {
          applyEffect(g2, { 道德: -6, 声望: -8 })
          g2.discipline.records.unshift(`${g2.date.y}年：对抗组织审查，与他人串供。`)
          const r = 处置结果(g2, 1)
          return '你当晚给人打了两个电话。办案人员后来调取了通话记录——这一步，让你的问题从违纪变成了对抗组织审查。\n\n' + r
        },
      },
    ],
  }
}

export function disciplineTick(g: GameState): void {
  const r = g.discipline.risk
  if (r <= 0) return
  if (r >= 45 && chance(r / 500) && !g.pendingEvent) {
    g.pendingEvent = 生成调查事件(g, '你在任上，纪委收到了关于你的问题线索')
    g.pendingEvent.月 = Math.floor(Math.random() * 12) + 1
    return
  }
  if (chance(r / 160)) {
    if (chance(0.5)) {
      g.discipline.records.unshift(`${g.date.y}年：收到与你有关的信访反映，已登记。`)
      g.discipline.risk = clamp(r + 6, 0, 100)
      g.p.声望 = clamp(g.p.声望 - 4, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '被反映', kind: 'bad', d: '纪委收到一条与你有关的信访反映，暂未找你谈话。你从别人口里听到了这件事。' })
    } else {
      g.discipline.records.unshift(`${g.date.y}年：接受谈话提醒一次。`)
      g.discipline.risk = clamp(r - 10, 0, 100)
      g.p.上司 = clamp(g.p.上司 - 3, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '谈话提醒', kind: 'bad', d: '一位老领导把你叫到办公室，说了半小时，没提具体的事。你听懂了一半。' })
    }
  }
}

export function 廉政等级(r: number): string {
  return r === 0 ? '干净' : r <= 20 ? '低' : r <= 40 ? '需关注' : r <= 70 ? '较高' : '高危'
}

export function 涉案描述(g: GameState): string {
  return `已掌握在案 ${(g.discipline.案件 || []).length} 笔，合计 ${fmt(涉案金额(g))} 元`
}
