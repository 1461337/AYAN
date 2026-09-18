import { useGame } from '../../store/gameStore'
import { ladder, rankTitle } from '../../domain/selectors'
import { 职级序列 } from '../../data/static'
import { 涉案金额 } from '../../domain/effects'
import { fmt } from '../../utils/format'

export function End() {
  const game = useGame((s) => s.game)!
  const save = useGame((s) => s.save)
  const reset = useGame((s) => s.reset)
  const last = game.positions[0]
  const houses = game.assets.房产.length
    ? game.assets.房产.map((x, i) => <span key={i}>{x.名}（{x.自住 ? '自住' : '出租'}，市值 {fmt(x.市值 || 0)} 元）<br /></span>)
    : '无'
  const cars = game.assets.车辆.length
    ? game.assets.车辆.map((v, i) => <span key={i}>{v.名}（残值 {fmt(v.市值 || 0)} 元）<br /></span>)
    : '无'
  const loan = game.loans.reduce((a, l) => a + l.余额, 0) + game.负债
  const 房值 = game.assets.房产.reduce((a, x) => a + (x.市值 || x.购入价 || 0), 0)
  const 车值 = game.assets.车辆.reduce((a, v) => a + (v.市值 || 0), 0)
  const netWorth = game.cash + 房值 + 车值 - loan
  const kids = game.family.子女.length
    ? game.family.子女.map((c, i) => <span key={i}>{c.姓名}（{c.年龄}岁，{c.备注}）<br /></span>)
    : '无'
  const rep = game.p.声望
  const repText = rep >= 85 ? '群众口碑极好，被许多人记住' : rep >= 70 ? '口碑良好，同事与群众评价正面' : rep >= 50 ? '评价尚可，是个本分的干部或从业者' : rep >= 30 ? '评价一般，有过争议' : '评价不高，留下过一些非议'

  return (
    <div className="card">
      <div className="card-hd"><span className="ic">🕯️</span><h2>人生终章</h2></div>
      <div className="card-bd">
        <div className="txt">
          <p><b>{game.p.姓名}</b>，{game.p.性别}，{game.p.出生地}人，{game.beginYear || game.date.y}年参加工作，{game.endYear || game.date.y}年去世，享年 <span className="hl">{game.p.年龄}</span> 岁。</p>
        </div>
        <div className="sec-title">最后职务</div>
        <div className="box">
          职务层级：<b>{last ? last.职级 : '无'}</b>　具体岗位：<b>{rankTitle(game) || '无'}</b><br />
          {game.p.职业 === '公务员' ? <>最后职级：<b>{职级序列[game.zhijiIdx]}</b><br /></> : null}
          {game.p.选调生 ? '身份：省委组织部选调生' : null}
          {game.p.选调生 ? <br /> : null}
          任职经历：<br />
          {game.positions.length ? game.positions.map((p, i) => <span key={i}>· {p.年}年　{p.职级}　{p.岗位}<br /></span>) : '无'}
        </div>
        <div className="sec-title">资产与负债</div>
        <div className="box">
          现金存款：<b>{fmt(game.cash)}</b> 元<br />
          房产：<b>{houses}</b><br />
          车辆：<b>{cars}</b><br />
          剩余负债：<b>{fmt(loan)}</b> 元<br />
          净资产（估算）：<b>{fmt(netWorth)}</b> 元
        </div>
        <div className="sec-title">家庭</div>
        <div className="box">
          婚姻：<b>{game.family.婚姻}</b>{game.family.配偶 ? `　配偶：${game.family.配偶.姓名}（${game.family.配偶.身份}）` : ''}<br />
          子女：<br />{kids}
        </div>
        <div className="sec-title">廉政结局</div>
        {game.discipline.移送 ? (
          <div className="box warn-box" style={{ background: '#f7dede', borderColor: '#e0a8a8' }}>
            <b className="bad-txt">严重违纪违法，被开除党籍、开除公职，移送检察机关依法审查起诉。</b><br />
            涉案金额合计 <b>{fmt(涉案金额(game))}</b> 元，共 {(game.discipline.案件 || []).length} 笔。<br />
            <span className="hint">此前的职务、荣誉与待遇一并终止。</span>
          </div>
        ) : game.p2.处分 ? (
          <div className="box warn-box">
            职业生涯中受到 <b>{game.p2.处分}</b> 次处分。已掌握在案涉案金额 {fmt(涉案金额(game))} 元。
          </div>
        ) : (
          <div className="box"><b className="ok-txt">一生未受处分，未发现问题线索。</b><br />在那个位置上待了这么多年，档案里干干净净。</div>
        )}
        <div className="sec-title">名誉与社会评价</div>
        <div className="box">
          公开声誉：<b>{rep}</b>　{repText}<br />
          领导评价：<b>{game.p.上司}</b>　道德评价：<b>{game.p.道德}</b><br />
          人脉：<b>{game.p.人脉}</b>　专业能力：<b>{game.p.能力}</b><br />
          处分记录：<b>{game.p2.处分}</b> 次　嘉奖记录：<b>{game.p2.嘉奖}</b> 次<br />
          廉政风险终值：<b>{game.discipline.risk}</b>
        </div>
        <div className="sec-title">人生轨迹</div>
        {game.log.slice(0, 24).map((x, i) => (
          <div className={`log-item ${x.kind || ''}`} key={i}>
            <div className="t">{x.t}</div><div className="h">{x.h}</div><div className="d">{x.d}</div>
          </div>
        ))}
        <div className="btn-row">
          <button className="btn-ghost" onClick={save}>保存存档</button>
          <button className="btn-ghost" onClick={reset}>重新开始一生</button>
        </div>
        <div className="hint mt8">本序列共 {ladder(game).length} 级，你走到了第 {game.rankIdx + 1} 级。</div>
      </div>
    </div>
  )
}
