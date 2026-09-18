import { create } from 'zustand'
import type { Effect, GameState, TabId } from '../domain/types'
import { newState, makeCandidates, type SetupForm } from '../domain/newGame'
import { applyEffect, 快照, 差异, perfLabel, 同步风险底线 } from '../domain/effects'
import { nextRankInfo } from '../domain/selectors'
import { doPromote, settlePosition, 向上社交 as 向上社交Domain } from '../domain/promotion'
import { buyAsset, sellAsset, repayDebt, repayLoan, netIncome } from '../domain/economy'
import { endYear as endYearDomain } from '../domain/year'
import { 题目套 } from '../domain/quiz'
import { EDU_UP, CERTS, 免费互动 } from '../data/static'
import { clamp, fmt } from '../utils/format'
import { rnd } from '../domain/rng'
import { clearSave, exportSaveFile, loadGame, parseSave, saveGame } from '../persistence/save'

export interface StoreState {
  game: GameState | null
  curTab: TabId
  toastMsg: string
  toastId: number
  showHelp: boolean
  start: (f: SetupForm) => void
  setTab: (t: TabId) => void
  toast: (msg: string) => void
  setHelp: (v: boolean) => void
  closeSummary: () => void
  shixi: (idx: number) => void
  answerQuiz: (k: number) => void
  applyPromote: () => void
  choosePos: (i: number) => void
  chooseEvent: (i: number) => void
  endYear: () => void
  healthFree: () => void
  healthPaid: () => void
  healthCare: () => void
  meetMore: () => void
  date: (id: string, type: string) => void
  marry: (id: string) => void
  spouse: (type: string) => void
  birth: () => void
  child: (id: string, type: string) => void
  rel: (id: string, type: string) => void
  向上社交: () => void
  buyHouse: (i: number, mode: 'full' | 'loan') => void
  buyCar: (i: number, mode: 'full' | 'loan') => void
  sell: (kind: '房' | '车', i: number) => void
  还负债: () => void
  结清贷款: (i: number) => void
  eduStart: (i: number) => void
  eduCancel: () => void
  certStart: (i: number) => void
  audit: () => void
  save: () => void
  load: () => void
  exportSave: () => void
  importGame: (text: string) => void
  reset: () => void
}

export const useGame = create<StoreState>((set, get) => {
  const mutate = (fn: (g: GameState) => void) => {
    const cur = get().game
    if (!cur) return
    const g = { ...cur }
    fn(g)
    set({ game: g })
  }

  const toast = (msg: string) => {
    set((s) => ({ toastMsg: msg, toastId: s.toastId + 1 }))
  }

  const finish = (msg: string) => {
    toast(msg)
  }

  return {
    game: null,
    curTab: '年度',
    toastMsg: '',
    toastId: 0,
    showHelp: false,

    start: (f) => {
      const g = newState(f)
      g._年初快照 = 快照(g)
      set({ game: g, curTab: '年度' })
      finish('人生开始。你的选择会留下痕迹。')
    },

    setTab: (t) => set({ curTab: t }),
    toast,
    setHelp: (v) => set({ showHelp: v }),

    closeSummary: () => mutate((g) => { g.yearSummary = null }),

    shixi: (idx) => {
      const s = get()
      if (!s.game) return
      const { item: a, tier, variants } = 题目套(idx, s.game.rankIdx)
      if (!a) return
      const g = { ...s.game }
      if (g.status !== '在职') return finish('已退休，不再开展施政工作。')
      if (g.actions <= 0) return finish('本年行动额度已用完，请结束本年。')
      if (g.usedThisYear.includes(idx)) return finish('本年度该项工作已经开展过了。')
      g.actions--
      g.usedThisYear.push(idx)
      applyEffect(g, a.e)
      const 劳损 = rnd(1, 2)
      g.p.健康 = clamp(g.p.健康 - 劳损, 0, 100)
      g.yearLog.unshift({ t: `${g.date.y}年`, h: a.名, kind: '', d: a.desc + `（耗费精力，健康 -${劳损}）` })
      g.quiz = { item: idx, tier, variant: rnd(0, variants.length - 1), order: [0, 1, 2].sort(() => Math.random() - 0.5) }
      set({ game: g })
    },

    answerQuiz: (k) => {
      const s = get()
      if (!s.game || !s.game.quiz) return
      const quiz = s.game.quiz
      const g = { ...s.game }
      const { item, variants } = 题目套(quiz.item, g.rankIdx)
      const set_ = variants[Math.min(quiz.variant, variants.length - 1)]
      const a = set_.a[quiz.order[k]]
      if (!a) return
      const mark = a.判 === '正确' ? ['正确处置', 'good'] : a.判 === '模糊' ? ['处置平平', ''] : ['处置失当', 'bad']
      const gain: string[] = []
      if (a.判 === '模糊') {
        applyEffect(g, { 廉政风险: a.e.廉政风险 || 0 })
        g.p2.连续模糊 = (g.p2.连续模糊 || 0) + 1
        g.p2.累计模糊 = (g.p2.累计模糊 || 0) + 1
        if (g.p2.连续模糊 >= 3) {
          const nx = nextRankInfo(g)
          const base = nx.def ? nx.def.门槛.政绩 : 200
          const cut: Effect = { 政绩: -Math.max(8, Math.round(base * 0.02)), 能力: -1 }
          applyEffect(g, cut)
          gain.push(`已连续 ${g.p2.连续模糊} 次模棱两可：${perfLabel(g)} ${cut.政绩}、能力 ${cut.能力}`)
        } else {
          gain.push(`模棱两可 ${g.p2.连续模糊} / 3 次（不加不减，答对一次即清零）`)
        }
      } else {
        g.p2.连续模糊 = 0
        applyEffect(g, a.e)
        if (a.e.政绩) gain.push(`${perfLabel(g)} ${a.e.政绩 > 0 ? '+' : ''}${a.e.政绩}`)
        if (a.e.能力) gain.push(`能力 ${a.e.能力 > 0 ? '+' : ''}${a.e.能力}`)
        if (a.e.道德) gain.push(`道德 ${a.e.道德 > 0 ? '+' : ''}${a.e.道德}`)
        if (a.e.上司) gain.push(`领导评价 ${a.e.上司 > 0 ? '+' : ''}${a.e.上司}`)
        if (a.e.廉政风险) gain.push(`廉政风险 +${a.e.廉政风险}`)
        if (a.判 === '错误') {
          const cut: Effect = { 政绩: -Math.round(a.e.政绩 && a.e.政绩 < 0 ? -a.e.政绩 * 0.6 : 25), 道德: -1 }
          applyEffect(g, cut)
          gain.push(`直接扣除晋升条件：${perfLabel(g)} ${cut.政绩}、道德 ${cut.道德}`)
        }
      }
      g.yearLog.unshift({ t: `${g.date.y}年`, h: `${item.名} · ${mark[0]}`, kind: mark[1], d: a.fb })
      g.log.unshift({
        t: `${g.date.y}年`, h: `${item.名}（${mark[0]}）`, kind: mark[1],
        d: a.fb + '\n' + (a.判 === '正确' ? '这次处置被记入了你的工作实绩，成为晋升考察的加分项。'
          : a.判 === '模糊' ? `没有出错，也没有加分。你已经连续 ${g.p2.连续模糊} 次给出模棱两可的处置。`
            : '这件事留下了需要解释的地方，晋升所需的条件被直接扣减。'),
      })
      g.quiz = null
      set({ game: g })
      finish(`${mark[0]}　${gain.join('　') || '无变化'}`)
    },

    applyPromote: () => {
      const s = get()
      if (!s.game) return
      if (s.game.actions <= 0) return finish('本年行动额度已用完。')
      const g = { ...s.game }
      g.actions--
      const res = doPromote(g, true)
      set({ game: g })
      if (res.kind === 'toast' && res.msg) finish(res.msg)
    },

    choosePos: (i) => {
      const s = get()
      if (!s.game || !s.game.pendingPositions) return
      const pending = s.game.pendingPositions
      const g = { ...s.game }
      const p = pending[i]
      if (!p) return finish('请选择一个岗位。')
      settlePosition(g, p)
      g.pendingPositions = null
      g.pendingPosTitle = ''
      set({ game: g, curTab: '年度' })
      finish('已就任：' + p.名)
    },

    chooseEvent: (i) => {
      const s = get()
      if (!s.game || !s.game.pendingEvent) return
      const ev = s.game.pendingEvent
      const g = { ...s.game }
      const o = ev.选项[i]
      if (!o) return
      const 前 = 快照(g)
      const res = o.resolve(g)
      同步风险底线(g)
      const 后 = 快照(g)
      const 明细 = 差异(前, 后, false, perfLabel(g))
      const 好 = (后.政绩 - 前.政绩) + (后.声望 - 前.声望) + (后.道德 - 前.道德) + (后.上司 - 前.上司)
      const 坏 = (后.风险 - 前.风险)
      const 判定 = 坏 >= 12 ? '后果严重' : (好 >= 20 ? '处置得当，得到肯定' : 好 > 0 ? '处理尚可' : '处置失当')
      const 正文 = res + (明细 ? `\n奖惩结算：${明细}` : '') + `\n（${判定}）`
      g.log.unshift({ t: `${g.date.y}年 ${ev.月 || ''}月`, h: ev.标题, kind: o.kind || '', d: 正文 })
      g._本年事件 = g._本年事件 || []
      g._本年事件.push(`${ev.月 ? ev.月 + '月　' : ''}${ev.标题}${明细 ? '　' + 明细 : ''}`)
      g.pendingEvent = null
      set({ game: g })
      finish(明细 ? 判定 + '　' + 明细 : 判定)
    },

    endYear: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      g.yearLog = g.yearLog ? g.yearLog.slice() : []
      endYearDomain(g)
      saveGame(g)
      set({ game: g, curTab: g.over ? s.curTab : '年度' })
      finish(`进入 ${g.date.y} 年 · 已自动保存`)
    },

    healthFree: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (g.flags['本年免费健康']) return finish('本年已经体检休养过了，下一年度可再次使用。')
      const d = rnd(5, 10)
      g.flags['本年免费健康'] = true
      g.p.健康 = clamp(g.p.健康 + d, 0, 100)
      g.yearLog.unshift({ t: `${g.date.y}年`, h: '年度体检与休养', kind: 'good', d: `你安排了一次完整体检，按医嘱调整作息。健康 +${d}。` })
      set({ game: g })
      finish(`体检休养完成，健康 +${d}`)
    },

    healthPaid: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      const 费 = rnd(3000, 8000)
      if (g.cash < 费) return finish(`现金不足，需要 ${fmt(费)} 元。`)
      g.actions--
      g.cash -= 费
      const d = rnd(10, 20)
      g.p.健康 = clamp(g.p.健康 + d, 0, 100)
      g.yearLog.unshift({ t: `${g.date.y}年`, h: '调养身体', kind: 'good', d: `你请了中医调理，办了健身卡，推掉了整个月的应酬，花费 ${fmt(费)} 元。健康 +${d}。` })
      set({ game: g })
      finish(`调养完成，花费 ${fmt(费)} 元，健康 +${d}`)
    },

    healthCare: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      const 费 = rnd(20000, 50000)
      if (g.cash < 费) return finish(`现金不足，需要 ${fmt(费)} 元。`)
      g.actions--
      g.cash -= 费
      const d = rnd(20, 25)
      g.p.健康 = clamp(g.p.健康 + d, 0, 100)
      g.yearLog.unshift({ t: `${g.date.y}年`, h: '专业健康管理', kind: 'good', d: `你做了全面体检，配了营养师和私人教练，还去疗养了两周，花费 ${fmt(费)} 元。健康 +${d}。` })
      set({ game: g })
      finish(`健康管理完成，花费 ${fmt(费)} 元，健康 +${d}`)
    },

    meetMore: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      if (g.p.年龄 > 66) return finish('这个年纪，已经很少有人再给你介绍了。')
      if (g.candidates.length >= 6) return finish('同时认识的人已经够多了，先把关系理一理。')
      g.actions--
      const add = Math.min(6 - g.candidates.length, 2)
      const fresh = makeCandidates(g.p.性别, g.p.年龄).slice(0, add)
      fresh.forEach((c, i) => { c.id = 'cand' + Date.now() + i })
      g.candidates.push(...fresh)
      g.log.unshift({ t: `${g.date.y}年`, h: '经人介绍', kind: '', d: `朋友又介绍了 ${fresh.length} 位朋友。感情需要时间，也需要主动。` })
      set({ game: g })
      finish(`朋友介绍了 ${fresh.length} 位新朋友。`)
    },

    date: (id, type) => {
      const s = get()
      if (!s.game) return
      const c = s.game.candidates.find((x) => x.id === id)
      if (!c) return
      const g = { ...s.game }
      const conf: Record<string, { 钱: number; 加: [number, number]; 文: string }> = {
        '散步': { 钱: 0, 加: [2, 5], 文: '你们沿江边走了很久，聊起各自的工作和家里的事。' },
        '吃饭': { 钱: 500, 加: [6, 13], 文: '一起吃了顿饭。对方说，你比介绍人描述的更好相处。' },
        '看电影': { 钱: 200, 加: [5, 10], 文: '看了一场电影，散场后又站在路边聊了很久。' },
        '短途旅行': { 钱: 3000, 加: [12, 22], 文: '周末短途旅行，两天时间足够看清一个人，也足够让对方看清你。' },
        '看展': { 钱: 100, 加: [3, 7], 文: '你们在美术馆待了一下午，聊了很多与工作无关的事。' },
        '一起运动': { 钱: 0, 加: [2, 5], 文: '你们一起打了场球，出了一身汗，距离近了不少。' },
      }
      const cc = g.candidates.find((x) => x.id === id)!
      if (type === '表白') {
        if (cc.好感度 < 60) return finish('现在说这些还太早，对方有些尴尬。')
        if (g.actions <= 0) return finish('本年行动额度已用完。')
        g.actions--
        if (Math.random() < 0.5 + cc.好感度 / 400) {
          cc.好感度 = clamp(cc.好感度 + 8, 0, 100)
          cc.恋爱中 = true
          g.family.婚姻 = '恋爱中'
          g.log.unshift({ t: `${g.date.y}年`, h: '确定恋爱关系', kind: 'good', d: `你向${cc.姓名}表明心意，对方答应了。\n从此你的时间，有一部分不再属于自己。` })
          set({ game: g })
          finish('你们确定了恋爱关系。')
        } else {
          cc.好感度 = clamp(cc.好感度 - 4, 0, 100)
          set({ game: g })
          finish('对方说需要再想想。')
        }
        return
      }
      const 免费 = 免费互动.find((x) => x.名 === type)
      if (免费) {
        if (!cc.恋爱中) return finish('你们还没到这一步。')
        if (cc.本年约会 && cc.本年约会.includes(type)) return finish(`今年已经${type}过了。`)
        cc.本年约会 = [...(cc.本年约会 || []), type]
        const before = cc.好感度
        cc.好感度 = clamp(cc.好感度 + rnd(免费.加[0], 免费.加[1]), 0, 100)
        const d = cc.好感度 - before
        cc.memory.unshift(`${g.date.y}年：${免费.文.replace('{名}', cc.姓名)}好感度 +${d}。`)
        if (cc.memory.length > 5) cc.memory.pop()
        g.yearLog.unshift({ t: `${g.date.y}年`, h: `与${cc.姓名}· ${type}`, kind: '', d: 免费.文.replace('{名}', cc.姓名) })
        set({ game: g })
        finish(`${type}，好感度 +${d}（当前 ${cc.好感度}）`)
        return
      }
      const cfg = conf[type]
      if (!cfg) return
      if (g.cash < cfg.钱) return finish(`现金不足，需要 ${fmt(cfg.钱)} 元。`)
      if (cc.本年约会 && cc.本年约会.includes(type)) return finish(`今年已经和${cc.姓名}${type}过了。`)
      g.cash -= cfg.钱
      cc.本年约会 = [...(cc.本年约会 || []), type]
      const before = cc.好感度
      cc.好感度 = clamp(cc.好感度 + rnd(cfg.加[0], cfg.加[1]), 0, 100)
      const d = cc.好感度 - before
      cc.memory.unshift(`${g.date.y}年：你们${type}，好感度 +${d}。`)
      if (cc.memory.length > 5) cc.memory.pop()
      g.yearLog.unshift({ t: `${g.date.y}年`, h: `与${cc.姓名}约会 · ${type}`, kind: '', d: cfg.文 })
      set({ game: g })
      finish(`与${cc.姓名}${type}，好感度 +${d}（当前 ${cc.好感度}）`)
    },

    marry: (id) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const c = g.candidates.find((x) => x.id === id)
      if (!c) return
      if (c.好感度 < 80) return finish('好感度不足 80，对方还没有做好准备。')
      if (Math.abs(c.年龄 - g.p.年龄) > 14) return finish(`你们相差 ${Math.abs(c.年龄 - g.p.年龄)} 岁，对方家里不同意。`)
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      const cost = clamp(Math.round((netIncome(g) + (c.月收入 || 5200)) * rnd(5, 11)), 50000, 420000)
      if (g.cash < cost) return finish(`办婚事需要约 ${fmt(cost)} 元（约合双方收入的半年到一年），现金不足。`)
      g.actions--
      g.cash -= cost
      g.family.配偶 = {
        id: 'spouse', 姓名: c.姓名, 年龄: c.年龄, 身份: '你的配偶 · ' + c.职业, 职业: c.职业, 类别: c.类别,
        月收入: c.月收入, 养老金: 0, 退休: false,
        职级: Math.max(0, g.rankIdx - rnd(1, 2)),
        性格: c.性格, 好感度: 88, 面: '💑', 信任: 80, 公开: 60, 利益: 0, memory: [], notes: '你们在亲友的见证下办了婚事。',
      }
      g.family.婚姻 = '已婚'
      g.candidates = g.candidates.filter((x) => x.id !== id)
      g.log.unshift({ t: `${g.date.y}年`, h: '结婚', kind: 'good', d: `你和${c.姓名}（${c.职业}）登记结婚，办了一场不算铺张的婚礼，花费约 ${fmt(cost)} 元。\n从今天起，你的每一个决定都不再只影响自己。` })
      set({ game: g })
      finish('已结婚。家庭系统已开启。')
    },

    spouse: (type) => {
      const s = get()
      if (!s.game || !s.game.family.配偶) return
      const g = { ...s.game }
      const sp = g.family.配偶!
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      g.actions--
      g.flags['本年顾家'] = true
      let msg: string
      let d: number
      if (type === '陪伴') { d = rnd(4, 10); msg = `你推掉了两个饭局，在家待了一整天。${sp.姓名}嘴上说你无所事事，晚上却多做了两个菜。` }
      else if (type === '吃饭') { g.cash -= rnd(200, 600); d = rnd(3, 7); msg = '你们在外面吃了顿饭，聊了很多和单位无关的事。' }
      else if (type === '礼物') { g.cash -= rnd(1000, 6000); d = rnd(6, 14); msg = `你给${sp.姓名}买了一件礼物。${sp.好感度 < 50 ? '对方收下了，但没说什么。' : '对方很高兴。'}` }
      else { d = rnd(3, 8); msg = `你主动把家里的事分担了一部分。${sp.姓名}说：「难得。」` }
      sp.好感度 = clamp(sp.好感度 + d, 0, 100)
      sp.memory.unshift(`${g.date.y}年：${msg}`)
      if (sp.memory.length > 5) sp.memory.pop()
      g.yearLog.unshift({ t: `${g.date.y}年`, h: '家庭 · ' + type, kind: '', d: msg })
      set({ game: g })
      finish(`配偶好感度 +${d}（当前 ${sp.好感度}）`)
    },

    birth: () => {
      const s = get()
      if (!s.game || !s.game.family.配偶) return
      const g = { ...s.game }
      const sp = g.family.配偶!
      if (sp.好感度 < 80) return finish('配偶好感度不足 80，暂不考虑生育。')
      if (g.family.子女.length >= 3) return finish('三个孩子已经是这个家庭能承担的极限了。')
      if (g.family.上次生育年 && g.date.y - g.family.上次生育年 < 2) return finish('距离上一个孩子出生还不到两年，身体和精力都需要恢复。')
      if (sp.年龄 >= 42) return finish('配偶年龄偏大，医生建议不再考虑生育。')
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      const cost = clamp(Math.round(netIncome(g) * rnd(2, 5)), 20000, 180000)
      if (g.cash < cost) return finish(`生育与前期养育约需 ${fmt(cost)} 元，现金不足。`)
      g.actions--
      g.cash -= cost
      g.family.上次生育年 = g.date.y
      const 姓 = [g.p.姓名[0], sp.姓名[0]][Math.floor(Math.random() * 2)]
      const 名 = ['子涵', '思远', '一诺', '嘉禾', '若溪', '书言', '亦辰', '知遥', '沐阳', '念初'][Math.floor(Math.random() * 10)]
      const sex = Math.random() < 0.5 ? '男' : '女'
      const childObj = { id: 'child' + (g.family.子女.length + 1), 姓名: 姓 + 名, 性别: sex as '男' | '女', 年龄: 0, 好感度: 60, 性格: '还不知道', 备注: '你和' + sp.姓名 + '的孩子。' }
      g.family.子女.push(childObj)
      sp.好感度 = clamp(sp.好感度 + 8, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '孩子出生', kind: 'good', d: `你们的${sex === '男' ? '儿子' : '女儿'}出生了，取名${childObj.姓名}，花费约 ${fmt(cost)} 元。\n养育开支会随孩子长大逐年增加：现在每月约 1500 元，上学之后更多。` })
      set({ game: g })
      finish('家中添了一个孩子。')
    },

    child: (id, type) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const c = g.family.子女.find((x) => x.id === id)
      if (!c) return
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      g.actions--
      g.flags['本年顾家'] = true
      let d: number
      let msg: string
      if (type === '陪伴') { d = rnd(4, 10); msg = `你抽时间陪${c.姓名}玩了一下午，${c.年龄 < 6 ? '孩子笑得很大声' : '孩子跟你说了很多学校里的事'}。` }
      else { d = rnd(3, 8); msg = `你过问了${c.姓名}的学业。${c.年龄 < 6 ? '孩子还小，主要是陪着' : '孩子把成绩单拿给你看'}。` }
      c.好感度 = clamp(c.好感度 + d, 0, 100)
      g.yearLog.unshift({ t: `${g.date.y}年`, h: `家庭 · ${c.姓名}`, kind: '', d: msg })
      set({ game: g })
      finish(`亲子好感度 +${d}（当前 ${c.好感度}）`)
    },

    rel: (id, type) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const n = g.npcs.find((x) => x.id === id)
      if (!n) return
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      g.actions--
      let msg = ''
      if (type === '吃饭') {
        g.cash -= rnd(300, 900)
        n.好感度 = clamp(n.好感度 + rnd(4, 9), 0, 100)
        n.信任 = clamp(n.信任 + rnd(2, 5), -100, 100)
        msg = `你和${n.姓名}吃了一顿饭，聊了家里的事，也聊了单位的事。`
      } else if (type === '汇报') {
        if (id === 'leader') {
          n.信任 = clamp(n.信任 + rnd(3, 7), -100, 100)
          n.好感度 = clamp(n.好感度 + rnd(3, 7), 0, 100)
          applyEffect(g, { 上司: rnd(2, 4), 政绩: rnd(8, 16) })
        } else {
          n.信任 = clamp(n.信任 + rnd(1, 4), -100, 100)
          n.好感度 = clamp(n.好感度 + rnd(2, 5), 0, 100)
        }
        msg = `你向${n.姓名}汇报了近期工作，重点讲了${['项目进度', '群众反映的问题', '材料里的数据', '下一步安排'][Math.floor(Math.random() * 4)]}。`
      } else if (type === '帮忙') {
        if (Math.random() < 0.45) {
          n.信任 = clamp(n.信任 + 8, -100, 100)
          n.利益 = clamp(n.利益 + 10, -100, 100)
          if ((['公务员', '事业单位', '国企'] as string[]).includes(g.p.职业)) {
            applyEffect(g, { 声望: -2, 廉政风险: rnd(6, 14) })
            g.discipline.records.unshift(`${g.date.y}年：应${n.姓名}之请，就${['一个审批环节', '一笔资金拨付', '一次检查安排'][Math.floor(Math.random() * 3)]}打了招呼。`)
          } else {
            applyEffect(g, { 声望: -2 })
          }
          msg = `你帮${n.姓名}办了一件事。他连声道谢，但你知道这件事不完全符合程序。`
        } else {
          n.信任 = clamp(n.信任 - 3, -100, 100)
          n.好感度 = clamp(n.好感度 - 6, 0, 100)
          msg = `你拒绝了${n.姓名}的请托。他表示理解，但气氛明显冷了下来。`
        }
      } else if (type === '送礼') {
        g.cash -= rnd(2000, 12000)
        n.信任 = clamp(n.信任 + 5, -100, 100)
        n.利益 = clamp(n.利益 + 12, -100, 100)
        n.好感度 = clamp(n.好感度 + 5, 0, 100)
        if ((['公务员', '事业单位', '国企'] as string[]).includes(g.p.职业)) {
          applyEffect(g, { 廉政风险: rnd(8, 18) })
          g.discipline.records.unshift(`${g.date.y}年：向${n.姓名}送去${['两条烟', '一瓶酒', '一张购物卡', '一份土特产'][Math.floor(Math.random() * 4)]}。`)
        }
        msg = `你去了${n.姓名}家。东西他收下了，话也说得客气。`
      }
      n.memory.unshift(`${g.date.y}年：${msg}`)
      if (n.memory.length > 6) n.memory.pop()
      g.yearLog.unshift({ t: `${g.date.y}年`, h: `互动 · ${n.姓名}`, kind: '', d: msg })
      set({ game: g })
      finish(msg)
    },

    buyHouse: (i, mode) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const r = buyAsset(g, '房', i, mode)
      set({ game: g })
      finish(r.msg)
    },

    buyCar: (i, mode) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const r = buyAsset(g, '车', i, mode)
      set({ game: g })
      finish(r.msg)
    },

    sell: (kind, i) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const arr = kind === '房' ? g.assets.房产 : g.assets.车辆
      const it = arr[i]
      if (!it) return
      if (typeof window !== 'undefined' && !window.confirm(`确定出售「${it.名}」？`)) return
      const r = sellAsset(g, kind, i)
      set({ game: g })
      finish(r.msg)
    },

    还负债: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const r = repayDebt(g)
      set({ game: g })
      finish(r.msg)
    },

    结清贷款: (i) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const r = repayLoan(g, i)
      set({ game: g })
      finish(r.msg)
    },

    向上社交: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (!g.flags['首升换圈']) return finish('还没有进入新的圈层。')
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      g.actions--
      const 名字 = 向上社交Domain(g)
      g.log.unshift({ t: `${g.date.y}年`, h: '向上社交', kind: '', d: `你通过饭局与走访，结识了 ${名字}。关系网换了一部分。` })
      set({ game: g })
      finish(`结识了新的人脉：${名字}`)
    },

    eduStart: (i) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const e = EDU_UP[i]
      if (!e) return
      if (g.edu.在读) return finish('你正在攻读一项学历，无法同时进行。')
      if (!e.需.includes(g.p.学历)) return finish('学历不符，无法报考。')
      const first = Math.round(e.费 * 0.3)
      if (g.cash < first) return finish(`首期学费不足 ${fmt(first)} 元。`)
      g.cash -= first
      g.edu.在读 = { 名: e.名, 至: e.至, 年: e.年, 剩: e.年, 已付: first, 总费: e.费, 效: e.效 }
      g.log.unshift({ t: `${g.date.y}年`, h: '报名在职学历教育', kind: '', d: `你报名参加${e.名}，首期缴纳 ${fmt(first)} 元，总费用约 ${fmt(e.费)} 元，周期 ${e.年} 年。\n${e.注}` })
      set({ game: g })
      finish('已报名，开始在职攻读。')
    },

    eduCancel: () => {
      const s = get()
      if (!s.game || !s.game.edu.在读) return
      if (typeof window !== 'undefined' && !window.confirm('中途放弃将损失已缴费用，并留下一次未完成记录。确定？')) return
      const g = { ...s.game }
      const u = g.edu.在读!
      g.p.声望 = clamp(g.p.声望 - 4, 0, 100)
      g.log.unshift({ t: `${g.date.y}年`, h: '放弃在职学习', kind: 'bad', d: `你中止了${u.名}，已缴纳的 ${fmt(u.已付)} 元不再退还。单位里有人问起，你只说工作太忙。` })
      g.edu.在读 = null
      set({ game: g })
      finish('已放弃，学费不退。')
    },

    certStart: (i) => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      const c = CERTS[i]
      if (!c) return
      if (g.edu.证书.includes(c.名)) return finish('你已取得该项资格。')
      if (c.限 && !c.限.includes(g.p.专业)) return finish('专业不符，无法报考。')
      if (g.cash < c.费) return finish(`费用不足 ${fmt(c.费)} 元。`)
      g.cash -= c.费
      if (c.党校 || Math.random() < 0.55) {
        applyEffect(g, c.效)
        g.edu.证书.push(c.名)
        g.log.unshift({ t: `${g.date.y}年`, h: `取得${c.名}`, kind: 'good', d: `经过约 ${c.年} 年的准备，你通过了${c.名}。${c.党校 ? '培训班结业后，组织部的人记住了你的名字。' : '这张证书不会立刻改变什么，但迟早有用。'}` })
        set({ game: g })
        finish('已取得：' + c.名)
      } else {
        g.p.声望 = clamp(g.p.声望 - 2, 0, 100)
        g.log.unshift({ t: `${g.date.y}年`, h: `${c.名}未通过`, kind: 'bad', d: `你花了 ${fmt(c.费)} 元和 ${c.年} 年时间，最终没有通过${c.名}。工作和备考两头都没顾好。` })
        set({ game: g })
        finish('未通过，费用已支出。')
      }
    },

    audit: () => {
      const s = get()
      if (!s.game) return
      const g = { ...s.game }
      if (!(['公务员', '事业单位', '国企'] as string[]).includes(g.p.职业)) return finish('该操作仅适用于体制内身份。')
      if (g.actions <= 0) return finish('本年行动额度已用完。')
      g.actions--
      if (g.discipline.risk < 20 && Math.random() < 0.7) {
        applyEffect(g, { 政绩: 14, 道德: 2, 声望: 2 })
        g.log.unshift({ t: `${g.date.y}年`, h: '廉政自查', kind: 'good', d: '你对本人及分管领域做了风险梳理，形成书面报告上报。未发现问题。' })
        set({ game: g })
        finish('梳理完毕，未发现实质问题，形成了一份报告。')
      } else {
        g.discipline.risk = clamp(g.discipline.risk + rnd(3, 9), 0, 100)
        g.log.unshift({ t: `${g.date.y}年`, h: '廉政自查', kind: 'bad', d: '梳理中发现几处程序上的模糊地带，其中一处涉及你签过字的材料。你暂时无法完全说清。' })
        set({ game: g })
        finish('梳理中发现几处程序瑕疵，你需要时间解释。')
      }
    },

    save: () => {
      const s = get()
      if (!s.game) return
      finish(saveGame(s.game) ? '已保存到本机浏览器。' : '保存失败。')
    },

    exportSave: () => {
      const s = get()
      if (!s.game) return
      exportSaveFile(s.game)
      finish('已导出存档文件。')
    },

    importGame: (text) => {
      const g = parseSave(text)
      if (!g) return finish('存档文件无效。')
      set({ game: g, curTab: '年度' })
      finish('存档导入成功。')
    },

    load: () => {
      const g = loadGame()
      if (!g) return finish('没有找到存档。')
      set({ game: g, curTab: '年度' })
      finish('读取成功。')
    },

    reset: () => {
      if (typeof window !== 'undefined' && !window.confirm('重开人生？当前进度将丢失（不含已保存存档）。')) return
      clearSave()
      set({ game: null, curTab: '年度' })
    },
  }
})
