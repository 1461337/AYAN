import { describe, expect, it } from 'vitest'
import { useGame } from './gameStore'

describe('存档与感情线动作', () => {
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
