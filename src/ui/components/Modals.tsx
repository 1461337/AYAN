import { useGame } from '../../store/gameStore'
import { Modal } from './Modal'
import { posHint } from '../../domain/promotion'
import { 人脉上限 } from '../../domain/effects'
import { fmt } from '../../utils/format'

export function Modals() {
  const game = useGame((s) => s.game)
  if (!game) return null
  const y = game.yearSummary
  if (y) return <YearSummary />
  if (game.pendingPositions && game.pendingPositions.length) return <PositionPicker />
  return null
}

function YearSummary() {
  const game = useGame((s) => s.game)!
  const closeSummary = useGame((s) => s.closeSummary)
  const y = game.yearSummary!
  const 记录 = Array.isArray(y.记录) ? y.记录 : []
  const 事件 = Array.isArray(y.事件) ? y.事件 : []
  const 施政类 = /^(下基层调研检查|推进重点项目|协调跨部门事项|接待群众来访|材料报送与数据核实)/
  const 大事 = 记录
    .filter((x) => !施政类.test(x.h) && !/互动 ·/.test(x.h))
    .map((x) => '· ' + (x.t ? x.t.replace(/^\d+年\s*/, '') : '') + ' ' + x.h.replace(/（[^）]*）$/, '').trim())
    .slice(0, 6)
  return (
    <Modal>
      <div className="card-hd"><span className="ic">📅</span><h2>{y.年} 年度总结</h2></div>
      <div className="card-bd">
        <div className="tags">
          <span className="tag green">{y.年龄} 岁</span>
          <span className="tag gold">{y.职务}</span>
          <span className="tag gray">本年完成施政 {y.施政数} 项</span>
        </div>
        <div className="sumbox"><span>本年变化</span>{y.明细 || '平稳度过'}</div>
        <div className="sumbox"><span>家庭收支</span>收入 {fmt(y.收入)}　支出 {fmt(y.支出)}　
          结余 <b className={y.结余 >= 0 ? 'ok-txt' : 'bad-txt'}>{y.结余 >= 0 ? '+' : '-'}¥{fmt(Math.abs(y.结余))}</b></div>
        <div className="sumbox"><span>职务职级</span>职务：{y.职务变化}　职级：{y.职级变化}</div>
        <div className="sumbox"><span>人脉圈子</span>{game.p.人脉} / {人脉上限(game)}（与当前岗位层级相匹配）</div>
        {事件.length ? <div className="sumbox"><span>突发事件</span>{事件.map((x, i) => <span key={i}>· {x}<br /></span>)}</div> : null}
        {大事.length ? <div className="sumbox"><span>本年记事</span>{大事.map((x, i) => <span key={i}>{x}<br /></span>)}</div> : null}
        <div className="sumbox next"><span>下一年</span>{y.下一年}</div>
        <button className="btn-red" onClick={closeSummary}>进入 {game.date.y} 年 →</button>
      </div>
    </Modal>
  )
}

function PositionPicker() {
  const game = useGame((s) => s.game)!
  const choosePos = useGame((s) => s.choosePos)
  const list = game.pendingPositions!
  return (
    <Modal>
      <div className="card-hd"><span className="ic">🏅</span><h2>组织谈话 · 拟任岗位</h2></div>
      <div className="card-bd">
        <div className="txt">
          <p>组织部门找你谈话，拟提任你为 <span className="hl">{game.pendingPosTitle}</span>，以下岗位只能选择一个。</p>
        </div>
        {list.map((p, i) => (
          <button className="btn-line" key={p.名 + i} onClick={() => choosePos(i)}>
            {p.名}
            <small>
              <b>级别：{p.级别 || game.pendingPosTitle}{p.条线 ? `　条线：${p.条线}` : ''}{p.党政 ? '　党委序列' : ''}</b><br />
              {posHint(p)}
            </small>
          </button>
        ))}
        <div className="hint">决定之后不可更改。</div>
      </div>
    </Modal>
  )
}
