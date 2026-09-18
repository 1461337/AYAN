import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { 年度关键词, 年度项目, 年度主题 } from '../../data/era'

export function City() {
  const game = useGame((s) => s.game)!
  const c = game.city
  const 主题 = 年度主题(game.date.y)
  const 关键词 = 年度关键词(game.date.y)
  const 项目 = 年度项目(game.date.y, game.p.城市, c)
  const kv: [string, number, boolean][] = [
    ['财政收入', c.财政收入, c.财政收入 > 60], ['就业', c.就业, c.就业 > 55], ['房地产', c.房地产, c.房地产 > 50],
    ['产业结构', c.产业, c.产业 > 52], ['公共服务', c.公共服务, c.公共服务 > 55], ['交通', c.交通, c.交通 > 52],
    ['舆论环境', c.舆论, c.舆论 > 55], ['社会矛盾', c.矛盾, c.矛盾 < 45],
  ]
  return (
    <Card icon="🏗️" title={`城市发展 · ${game.p.城市}`}>
      <div className="tags">
        <span className="tag green">{game.date.y} 年</span>
        <span className="tag gold">{主题}</span>
        {关键词.map((k) => <span className="tag gray" key={k}>{k}</span>)}
      </div>
      <div className="kv">
        {kv.map(([k, v, good]) => (
          <div className="k" key={k}><span>{k}</span><b className={good ? 'up' : 'dn'}>{v}</b></div>
        ))}
      </div>
      <div className="sec-title mt14">本年在推进项目</div>
      {项目.map((p) => (
        <div className="box" key={p.名}>
          <b>{p.名}</b>　<span className={p.进度 >= 55 ? 'ok-txt' : 'bad-txt'}>{p.阶段}</span>
          <div className="bar"><i style={{ width: `${p.进度}%` }} /></div>
          <span className="hint">{p.描述}</span>
        </div>
      ))}
    </Card>
  )
}
