import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
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
      <div className="sec-title">健康管理</div>
      <button className="btn-line" disabled={freeDone} onClick={healthFree}>
        年度体检与休养<span className="cost">每年一次 · 免费</span>
        <small>{freeDone ? '本年已经体检休养过了，下一年度可再次使用。' : '不占用行动额度。可提升健康 5—10 点。'}</small>
      </button>
      <button className="btn-line" disabled={game.actions <= 0 || game.cash < 8000} onClick={healthPaid}>
        抽出时间调养身体<span className="cost">-1 行动 · 3,000—8,000 元</span>
        <small>请中医调理、办健身卡、把作息彻底改过来。可提升健康 10—20 点。</small>
      </button>
      <button className="btn-line" disabled={game.actions <= 0 || game.cash < 50000} onClick={healthCare}>
        专业健康管理<span className="cost">-1 行动 · 20,000—50,000 元</span>
        <small>全面体检＋营养师＋私人教练＋短期疗养。可提升健康 20—25 点，费用不低。</small>
      </button>

      <div className="sec-title mt14">健康与人生的关系</div>
      <div className="box">
        · 健康低于 <b className="bad-txt">20</b>：强制死亡，人生结束。<br />
        · 健康低于 <b className="bad-txt">30</b>：强制退休，退出工作岗位。<br />
        · 健康 <b>80</b> 以上：满足承担更重岗位的身体要求。<br />
        · 健康低于 <b>70</b>：组织上会有所顾虑。<br />
        · 健康低于 <b>50</b>：组织暂不将你列入晋升考虑。
      </div>
      <div className="box">
        <b>身体变化规律</b><br />
        · 45 岁后每年下滑，55 岁后更快；施政与应酬会消耗身体，留有余力恢复更好。
      </div>
      <div className="hint">
        施政每年消耗 3—6 点健康，一次免费休养即可补回；健康一旦崩掉无法挽回。
      </div>
    </Card>
  )
}
