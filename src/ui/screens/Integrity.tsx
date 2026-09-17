import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { 影响期内, 涉案金额 } from '../../domain/effects'
import { luxuryCount } from '../../domain/economy'
import { 廉政等级 } from '../../domain/discipline'
import { fmt } from '../../utils/format'

export function Integrity() {
  const game = useGame((s) => s.game)!
  const audit = useGame((s) => s.audit)
  const r = game.discipline.risk
  const lvl = 廉政等级(r)
  const color = r > 70 ? 'var(--red-700)' : r > 40 ? '#b06a1e' : 'var(--green)'
  const lux = luxuryCount(game)
  const isPub = ['公务员', '事业单位', '国企'].includes(game.p.职业)
  return (
    <Card icon="⚠️" title="廉政 · 纪律不会自动放过谁">
      <div className="kv">
        <div className="k"><span>风险指数</span><b style={{ color }}>{r}</b></div>
        <div className="k"><span>当前等级</span><b style={{ color }}>{lvl}</b></div>
        <div className="k"><span>处分记录</span><b>{game.p2.处分} 次</b></div>
        <div className="k"><span>嘉奖记录</span><b className="up">{game.p2.嘉奖} 次</b></div>
      </div>
      {lux > 0 && isPub ? (
        <div className="box warn-box">
          <b className="bad-txt">超标资产提示</b><br />
          名下 {lux} 项资产明显超出正常工资水平，每年考察都可能被要求说明来源。
        </div>
      ) : null}
      {game.discipline.案件 && game.discipline.案件.length ? (
        <>
          <div className="sec-title mt14">问题线索</div>
          <div className="box warn-box">
            <b className="bad-txt">已掌握在案 {game.discipline.案件.length} 笔，合计 {fmt(涉案金额(game))} 元</b><br />
            {game.discipline.案件.slice(-4).map((c, i) => <span key={i}>· {c.年}年　{c.事由}　{fmt(c.金额)} 元<br /></span>)}
            <span className="hint">每一笔都记在案上，构成风险下限，不会随时间冲淡。</span>
          </div>
        </>
      ) : null}
      {影响期内(game) ? <div className="box warn-box">正处于影响期（至 {game.discipline.影响期} 年底），期间不得提拔或者进一步使用。</div> : null}
      {game.discipline.已查金额 ? <div className="box">历年已被查处的涉案金额合计 <b className="bad-txt">{fmt(game.discipline.已查金额)}</b> 元。</div> : null}
      <div className="sec-title mt14">纪律日志</div>
      <div className="box">
        {game.discipline.records.length ? game.discipline.records.map((x, i) => <span key={i}>· {x}<br /></span>) : '暂无异常记录。'}
      </div>
      <div className="hint">过去的行为不会消失，收下的每一笔都会留在案卷里。</div>
      <button className="btn-line" disabled={game.actions <= 0 || game.status === '退休'} onClick={audit}>
        主动梳理本人及分管领域的廉政风险点<span className="cost">-1 行动</span>
        <small>可能降低风险，也可能暴露更多问题。</small>
      </button>
    </Card>
  )
}
