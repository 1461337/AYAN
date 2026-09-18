import { describe, expect, it } from 'vitest'
import { useGame } from './gameStore'
import { ALL_SHIXI, makeShixiOrder, 可用题目, 题目套 } from '../domain/quiz'
import type { Job } from '../domain/types'

describe('存档与感情线动作', () => {
  it('七种职业题库索引有效，且能完成一轮施政问答', () => {
    const jobs: Job[] = ['公务员', '事业单位', '国企', '企业', '记者', '教师', '医生']
    for (const job of jobs) {
      useGame.getState().start({ name: '测试', sex: '男', age: 24, major: '法学', job })
      const g = useGame.getState().game!
      expect(g.shixiOrder.length).toBe(3)
      for (const idx of g.shixiOrder) expect(ALL_SHIXI[idx]).toBeTruthy()
      useGame.getState().shixi(g.shixiOrder[0])
      expect(useGame.getState().game!.quiz).not.toBeNull()
      useGame.getState().answerQuiz(0)
      expect(useGame.getState().game!.quiz).toBeNull()
    }
  })
  it('请朋友介绍是“增加”对象，最多 6 位', () => {
    useGame.getState().start({ name: '测试', sex: '男', age: 26, major: '法学', job: '公务员' })
    expect(useGame.getState().game!.candidates.length).toBe(2)
    useGame.getState().meetMore()
    expect(useGame.getState().game!.candidates.length).toBe(4)
    useGame.getState().meetMore()
    expect(useGame.getState().game!.candidates.length).toBe(6)
    useGame.getState().meetMore()
    expect(useGame.getState().game!.candidates.length).toBe(6)
  })

  it('表白成功后出现免费互动，且不消耗行动点', () => {
    useGame.getState().start({ name: '测试', sex: '男', age: 26, major: '法学', job: '公务员' })
    const g0 = useGame.getState().game!
    const c = g0.candidates[0]
    c.好感度 = 90
    const 行动前 = g0.actions
    useGame.getState().date(c.id, '表白')
    const g1 = useGame.getState().game!
    const c1 = g1.candidates.find((x) => x.id === c.id)!
    if (c1.恋爱中) {
      const 钱前 = g1.cash
      useGame.getState().date(c.id, '日常关心')
      const g2 = useGame.getState().game!
      expect(g2.actions).toBe(g1.actions)
      expect(g2.cash).toBe(钱前)
      expect(g2.candidates.find((x) => x.id === c.id)!.好感度).toBeGreaterThanOrEqual(c1.好感度)
    } else {
      expect(g1.actions).toBe(行动前 - 1)
    }
  })

  it('职级变化后旧题库条目会被拦截并刷新', () => {
    useGame.getState().start({ name: '测试', sex: '男', age: 52, major: '法学', job: '公务员' })
    const g = useGame.getState().game!
    g.rankIdx = 6
    g.shixiOrder = makeShixiOrder(g)
    const 高条目 = g.shixiOrder.find((i) => (ALL_SHIXI[i].职级范围?.[0] ?? 0) >= 4)
    expect(高条目).toBeDefined()
    g.rankIdx = 2
    useGame.getState().shixi(高条目!)
    const g2 = useGame.getState().game!
    expect(g2.quiz).toBeNull()
    const 池 = 可用题目(g2)
    expect(g2.shixiOrder.every((i) => 池.includes(i))).toBe(true)
  })

  it('高职级题套只出对应阶段的题', () => {
    const 省部 = ALL_SHIXI.findIndex((x) => x.名.includes('·省部'))
    const 厅局 = ALL_SHIXI.findIndex((x) => x.名.includes('·厅局'))
    expect(题目套(省部, 7).tier).toBe(4)
    expect(题目套(厅局, 4).tier).toBe(3)
    expect(题目套(厅局, 2).tier).toBe(3)
  })

  it('配偶与子女有免费互动，子女成年后不再只聊学校', () => {
    useGame.getState().start({ name: '测试', sex: '男', age: 40, major: '法学', job: '公务员' })
    const g = useGame.getState().game!
    g.family.配偶 = {
      id: 'sp', 姓名: '配偶', 年龄: 38, 身份: '公务员', 职业: '公务员', 类别: '公务员',
      月收入: 8000, 养老金: 0, 退休: false, 性格: '温和', 好感度: 40, 面: '👩',
      信任: 50, 公开: 0, 利益: 0, memory: [], notes: '', 本年互动: [],
    }
    g.family.子女 = [{ id: 'c1', 姓名: '小明', 性别: '男', 年龄: 25, 好感度: 40, 性格: '独立', 备注: '已工作', 独立: true, 本年互动: [] }]
    const 行动 = g.actions
    useGame.getState().spouse('一起散步')
    let g1 = useGame.getState().game!
    expect(g1.actions).toBe(行动)
    expect(g1.family.配偶!.好感度).toBeGreaterThan(40)
    useGame.getState().spouse('一起散步')
    expect(useGame.getState().game!.family.配偶!.好感度).toBe(g1.family.配偶!.好感度)
    const 前 = g1.family.子女![0].好感度
    useGame.getState().child('c1', '通个电话')
    g1 = useGame.getState().game!
    expect(g1.actions).toBe(行动)
    expect(g1.family.子女![0].好感度).toBeGreaterThan(前)
    const 校园 = g1.yearLog.filter((l) => /学校|功课|成绩|作业/.test(l.d))
    expect(校园.length).toBe(0)
    useGame.getState().child('c1', '教育')
    const 成年语 = useGame.getState().game!.yearLog[0].d
    expect(成年语).toMatch(/工作|生活/)
  })
})
