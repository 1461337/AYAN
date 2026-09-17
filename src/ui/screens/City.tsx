import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { 条线Of } from '../../domain/selectors'

export function City() {
  const game = useGame((s) => s.game)!
  const c = game.city
  const kv: [string, number, boolean][] = [
    ['财政收入', c.财政收入, c.财政收入 > 60], ['就业', c.就业, c.就业 > 55], ['房地产', c.房地产, c.房地产 > 50],
    ['产业结构', c.产业, c.产业 > 52], ['公共服务', c.公共服务, c.公共服务 > 55], ['交通', c.交通, c.交通 > 52],
    ['舆论环境', c.舆论, c.舆论 > 55], ['社会矛盾', c.矛盾, c.矛盾 < 45],
  ]
  return (
    <Card icon="🏗️" title={'城市发展 · ' + game.p.城市}>
      <div className="kv">
        {kv.map(([k, v, good]) => (
          <div className="k" key={k}><span>{k}</span><b className={good ? 'up' : 'dn'}>{v}</b></div>
        ))}
      </div>
      <div className="sec-title mt14">在建 / 在推进项目</div>
      <div className="box">
        <b>{game.p.城市.replace(/[市县委区镇]/g, '')}老城更新片区改造</b>（前期摸底阶段）<br />
        涉及三个街道、约 1200 户居民、两家国企厂区。财政缺口约 4.6 亿，社会资本方意向未定。<br />
        <span className="hint">项目进度：{game.flags['项目摸底完成'] ? '已形成摸底材料，等待上会' : '尚未形成完整材料'}</span>
      </div>
      <div className="box">
        <b>京州临港产业园二期</b><br />
        招商进度落后于计划，两家意向企业因用地指标问题在观望。<br />
        <span className="hint">与你所在单位的职责：{条线Of(game.p.单位) === '发改' ? '牵头' : (条线Of(game.p.单位) === '其他' ? '基本无关' : '配合')}</span>
      </div>
      <div className="hint">城市不会围着你转。你所在部门只是这座城市的一个环节。</div>
    </Card>
  )
}
