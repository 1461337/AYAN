import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { Collapse } from '../components/Collapse'
import { CARS, HOUSES } from '../../data/static'
import {
  isPublicJob, livingCost, loanRate, luxuryCount, monthly, netIncome,
  个税, 五险一金, 年养车成本, 年租金收入, 实发, totalMonthly,
} from '../../domain/economy'
import { fmt } from '../../utils/format'

export function Assets() {
  const game = useGame((s) => s.game)!
  const buyHouse = useGame((s) => s.buyHouse)
  const buyCar = useGame((s) => s.buyCar)
  const sell = useGame((s) => s.sell)
  const 还负债 = useGame((s) => s.还负债)
  const 结清贷款 = useGame((s) => s.结清贷款)

  const a = game.assets
  const totalLoan = game.loans.reduce((x, l) => x + l.余额, 0) + game.负债
  const limit = Math.round(netIncome(game) * 0.55)
  const used = totalMonthly(game)
  const pub = isPublicJob(game)
  const lux = luxuryCount(game)
  const usedPct = Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const 房价指数 = game.market?.房价 || 1
  const 市价 = (base: number) => Math.round(base * 房价指数)

  return (
    <Card icon="💰" title="资产 · 每一分钱都要有来源">
      <div className="kv">
        <div className="k"><span>现金 / 存款</span><b>{fmt(game.cash)}</b></div>
        <div className="k"><span>月收入{game.status === '退休' ? '（养老金）' : ''}</span><b>{fmt(netIncome(game))}</b></div>
        <div className="k"><span>月供合计（上限 {fmt(limit)}）</span><b className={used > limit * 0.8 ? 'dn' : 'up'}>{fmt(used)}</b></div>
        <div className="k"><span>负债合计</span><b className={totalLoan ? 'dn' : ''}>{fmt(totalLoan)}</b></div>
      </div>
      <div className="bar mt8"><i style={{ width: `${usedPct}%` }} /></div>

      <Collapse title="工资条与每年收支">
        <div className="box">
          应发 <b>{fmt(game.income.月工资)}</b>　五险一金 <b className="dn">-{fmt(五险一金(game))}</b>　个税 <b className="dn">-{fmt(个税(game))}</b>　
          实发 <b>{fmt(实发(game))}</b> 元 / 月<br />
          公积金账户 <b className="ok-txt">{fmt(game.fund || 0)}</b> 元（可用于购房与还贷）<br />
          家庭年收入 <b>{fmt(netIncome(game) * 12)}</b>　年支出 <b>{fmt(livingCost(game) * 12)}</b>　年供 <b>{fmt(used * 12)}</b>
          {年租金收入(game) ? <>　租金 <b className="ok-txt">+{fmt(年租金收入(game))}</b></> : null}
          {年养车成本(game) ? <>　养车 <b className="dn">-{fmt(年养车成本(game))}</b></> : null}<br />
          年终净结余 <b>{fmt((netIncome(game) - livingCost(game) - used) * 12 + 年租金收入(game) - 年养车成本(game))}</b> 元
        </div>
      </Collapse>
      {lux > 0 && pub && game.status !== '退休' ? (
        <div className="box warn-box">
          <b className="bad-txt">廉政提示</b>：名下 {lux} 项资产明显超出工资水平，每年考察都可能被要求说明来源。
        </div>
      ) : null}

      <div className="sec-title">名下资产</div>
      {a.房产.length ? a.房产.map((x, i) => {
        const 增值 = (x.市值 || 0) - (x.购入价 || 0)
        const 年租 = x.自住 ? 0 : Math.round((x.市值 || 0) * 0.014)
        return (
          <button className="btn-line" key={i} onClick={() => sell('房', i)}>
            {x.名}{x.自住 ? <span className="tag green fr">自住</span> : <span className="tag gray fr">出租</span>}
            <span className="cost">市值 {fmt(x.市值 || 0)}</span>
            <small>
              约 {x.面积 || '—'}㎡　{x.购入年 || ''} 年购入 / {fmt(x.购入价 || 0)} 元<br />
              较购入价 {增值 >= 0 ? <b className="ok-txt">涨 {fmt(增值)}</b> : <b className="bad-txt">跌 {fmt(-增值)}</b>} 元　
              {x.自住 ? '当前自住，无租金' : '年租金约 ' + fmt(年租) + ' 元'}<br />
              点此出售：按市值成交，扣约 2% 中介与税费
            </small>
          </button>
        )
      }) : (
        <div className="box">
          名下暂无住房，现居：{game.housing}。{pub ? `你是${game.p.职业}，可申请公积金贷款，利率约 3.1%。` : '商业贷款年利率约 4.2%。'}<br />
          房价随本地房地产市场涨跌，长期看并不保证只涨不跌。
        </div>
      )}
      {a.车辆.length ? a.车辆.map((v, i) => (
        <button className="btn-line" key={i} onClick={() => sell('车', i)}>
          {v.名}
          <span className="cost">残值 {fmt(v.市值 || 0)}</span>
          <small>
            {v.购入年 || ''} 年购入 / {fmt(v.总价 || 0)} 元　已使用 {Math.max(0, game.date.y - (v.购入年 || game.date.y))} 年<br />
            车辆每年折旧约 15%，另需保险保养油费约 {fmt(Math.round((v.总价 || 0) * 0.03))} 元 / 年<br />
            点此出售：按当前残值成交
          </small>
        </button>
      )) : <div className="box">名下暂无车辆。车贷年利率约 4.8%，期限 3—5 年。</div>}

      {game.负债 > 0 ? (
        <div className="box warn-box">
          <b>待偿负债：{fmt(game.负债)} 元</b>（助学贷款等）<br />
          <button className="btn-plain mt8" disabled={game.cash <= 0} onClick={还负债}>
            偿还负债（可用现金 {fmt(game.cash)} 元）
          </button>
        </div>
      ) : null}

      {game.loans.length ? (
        <>
          <div className="sec-title">贷款明细</div>
          {game.loans.map((l, i) => (
            <div className="box" key={i}>
              · <b>{l.名}</b><br />余额 {fmt(l.余额)} 元　月供 {fmt(l.月供)} 元　
              年利率 {l.利率}%　剩余 {l.总月 - l.已还} / {l.总月} 期<br />
              <button className="btn-plain mt8" disabled={game.cash < l.余额 * 1.01} onClick={() => 结清贷款(i)}>
                提前结清（需 {fmt(l.余额 + Math.round(l.余额 * 0.01))} 元）
              </button>
            </div>
          ))}
        </>
      ) : null}

      <div className="sec-title">购房（房价随市场浮动 · 指数 {房价指数.toFixed(2)}）</div>
      {HOUSES.map((h, i) => {
        const 总价 = 市价(h.总价)
        const down = Math.round(总价 * h.首付比)
        const pr = 总价 - down
        const rate = loanRate(game, '房')
        const pay = monthly(pr, rate, h.年)
        const okPay = pay + used <= limit
        const okDown = game.cash >= down
        const okFull = game.cash >= 总价
        return (
          <div className="npc" key={i}>
            <div className="npc-top">
              <div className="npc-main">
                <div className="npc-name">{h.名}{h.奢侈 ? <em>超标</em> : null}</div>
                <div className="hint">现价 {fmt(总价)}（基准 {fmt(h.总价)}）　首付 {fmt(down)}　贷款 {fmt(pr)}　{h.年} 年　利率 {rate}%　月供 {fmt(pay)} 元</div>
              </div>
            </div>
            <div className="npc-act">
              <button disabled={!okFull} onClick={() => buyHouse(i, 'full')}>全款购买<br /><small>{okFull ? `需 ${fmt(总价)} 元` : '现金不足'}</small></button>
              <button disabled={!okPay || !okDown} onClick={() => buyHouse(i, 'loan')}>按揭购买<br /><small>{okPay ? (okDown ? `首付 ${fmt(down)} 元` : '首付不足') : '月供超限'}</small></button>
            </div>
          </div>
        )
      })}
      <Collapse title="购车">
        {CARS.map((c, i) => {
          const down = Math.round(c.总价 * c.首付比)
          const pr = c.总价 - down
          const rate = loanRate(game, '车')
          const pay = monthly(pr, rate, c.年)
          const okPay = pay + used <= limit
          const okDown = game.cash >= down
          const okFull = game.cash >= c.总价
          return (
            <div className="npc" key={i}>
              <div className="npc-top">
                <div className="npc-main">
                  <div className="npc-name">{c.名}{c.奢侈 ? <em>超标</em> : null}</div>
                  <div className="hint">总价 {fmt(c.总价)}　首付 {fmt(down)}　贷款 {fmt(pr)}　{c.年} 年　利率 {rate}%　月供 {fmt(pay)} 元</div>
                </div>
              </div>
              <div className="npc-act">
                <button disabled={!okFull} onClick={() => buyCar(i, 'full')}>全款购买<br /><small>{okFull ? `需 ${fmt(c.总价)} 元` : '现金不足'}</small></button>
                <button disabled={!okPay || !okDown} onClick={() => buyCar(i, 'loan')}>按揭购买<br /><small>{okPay ? (okDown ? `首付 ${fmt(down)} 元` : '首付不足') : '月供超限'}</small></button>
              </div>
            </div>
          )
        })}
      </Collapse>
      {a.投资.length ? (
        <Collapse title="投资与产业">
          <div className="box">{a.投资.map((x, i) => <span key={i}>· {x}<br /></span>)}</div>
        </Collapse>
      ) : null}
      <div className="hint">资产、贷款与月供逐年真实结算；逾期会形成不良记录。</div>
    </Card>
  )
}
