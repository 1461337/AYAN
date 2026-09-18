import { describe, expect, it } from 'vitest'
import { useGame } from './gameStore'
import { ALL_SHIXI } from '../domain/quiz'
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
})
