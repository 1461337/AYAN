import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { Collapse } from '../components/Collapse'
import { healthLevel } from '../../domain/selectors'

export function Health() {
  const game = useGame((s) => s.game)!
  const healthFree = useGame((s) => s.healthFree)
  const healthPaid = useGame((s) => s.healthPaid)
  const healthCare = useGame((s) => s.healthCare)
  const [lv, cls, tip] = healthLevel(game.p.健康)
  const freeDone = !!game.flags['本年免费健康']
  return (
    <Card icon="🩺" title="健康 · 身体是一切的前提">
      <div className="box">
        <div className="bar-row"><span>当前健康值</span><b className={cls}>{game.p.健康} / 100（{lv}）</b></div>
        <div className="bar"><i style={{ width: `${game.p.健康}%` }} /></div>
        <span className="hint">{tip}</span>
      </div>
      <button className="btn-line" disabled={freeDone} onClick={healthFree}>
        年度体检与休养<span className="cost">每年一次 · 免费</span>
        <small>{freeDone ? '本年已休养，下一年度可用。' : '提升健康 5—10 点，不占行动。'}</small>
      </button>
      <button className="btn-line" disabled={game.actions <= 0 || game.cash < 8000} onClick={healthPaid}>
        抽出时间调养身体<span className="cost">-1 行动 · 3,000—8,000 元</span>
        <small>健康 +10—20。</small>
      </button>
      <button className="btn-line" disabled={game.actions <= 0 || game.cash < 50000} onClick={healthCare}>
        专业健康管理<span className="cost">-1 行动 · 20,000—50,000 元</span>
        <small>健康 +20—25。</small>
      </button>
      <Collapse title="健康规则">
        <div className="hint" style={{ margin: 0 }}>
          低于 <b className="bad-txt">20</b> 强制死亡，低于 <b className="bad-txt">30</b> 强制退休；晋升要求 80，低于 70 会降低把握。<br />
          45 岁后逐年下滑，55 岁后更快；施政每年消耗 3—6 点，一次免费休养即可补回。
        </div>
      </Collapse>
    </Card>
  )
}
