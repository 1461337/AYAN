import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { nextRankInfo, indicatorList } from '../../domain/selectors'
import { fmt } from '../../utils/format'

export function Events() {
  const game = useGame((s) => s.game)!
  const chooseEvent = useGame((s) => s.chooseEvent)
  const setTab = useGame((s) => s.setTab)
  const endYear = useGame((s) => s.endYear)
  const pendingEvent = game.pendingEvent

  if (pendingEvent) {
    return (
      <Card icon="⚠️" title="突发事件 · 待决策">
        <div className="tags">
          <span className="tag red">待你决定</span>
          <span className="tag gray">{pendingEvent.类型}</span>
          <span className="tag gray">{game.date.y} 年 {pendingEvent.月 || '?'} 月</span>
        </div>
        <div className="sec-title">{pendingEvent.标题}</div>
        <div className="txt"><p>{pendingEvent.描述}</p></div>
        {pendingEvent.背景 ? <div className="box">{pendingEvent.背景}</div> : null}
        <div className="mt6">
          {pendingEvent.月 ? <div className="hint mb12">这件事发生在 {game.date.y} 年 {pendingEvent.月} 月。不同的处置方式，会带来不同的奖励与后果。</div> : null}
          {pendingEvent.选项.map((o, i) => (
            <button className="btn-line" key={i} onClick={() => chooseEvent(i)}>
              {o.text}
              {o.hint ? <small>{o.hint}</small> : null}
            </button>
          ))}
        </div>
        <div className="hint">每个选项都会留下痕迹。系统不会告诉你哪个“正确”。</div>
      </Card>
    )
  }

  const ni = nextRankInfo(game)
  return (
    <>
      {game.date.y - (game.beginYear || game.date.y) < 3 && game.status !== '退休' ? (
        <div className="card" style={{ borderColor: '#e8d5a8', background: '#fffdf4', marginBottom: 12 }}>
          <div className="card-bd" style={{ padding: '13px 14px' }}>
            <div className="sec-title" style={{ color: '#9a7a24', borderLeftColor: '#e8c56a' }}>上手指引（前三年显示）</div>
            <div className="hint" style={{ margin: 0, lineHeight: 1.85 }}>
              每年有 <b>5 次行动</b>，建议这样分配：<b>3 次施政</b>（做实事，积累政绩）
              ＋ <b>1 次向领导汇报</b>（提升领导评价）＋ <b>剩下的留给家庭、健康或廉政梳理</b>。<br />
              晋升要看 <b>六项指标</b>：政绩、能力、道德、领导评价、人脉、健康。点开「🧰 施政」页能看到每一项的完成情况与差距。<br />
              任职年限一到会自动进入考察；考察没通过也不会白费，补齐差距可以再申请。<br />
              第一次晋升的把握本来就不小，先把政绩和领导评价养起来，再去申请。<br />
              <b>岗位的轻重，组织上不会明说</b>——同样是"副市长"，市委常委和普通副市长分量完全不同。哪一步值得走，要你自己判断。
            </div>
          </div>
        </div>
      ) : null}

      <Card icon="📋" title="年度生活与工作">
        <div className="tags">
          <span className="tag green">{game.date.y} 年度</span>
          <span className="tag gold">本年无突发事件</span>
          <span className="tag gray">按年推进</span>
          {game.status === '退休' ? <span className="tag gray">已退休</span> : null}
        </div>
        <div className="box">
          当前健康：<b className={game.p.健康 < 30 ? 'bad-txt' : game.p.健康 < 80 ? '' : 'ok-txt'}>{game.p.健康}</b>
          <div className="bar"><i style={{ width: `${game.p.健康}%` }} /></div>
          <span className="hint">健康是六项晋升指标之一。可免费休养 +5—10，或花行动与现金调养 +10—20、专业健康管理 +20—25，详见「🩺 健康」页。</span>
        </div>

        {game.status !== '退休' && ni.def ? (
          <>
            <div className="sec-title mt14">晋升指标（共 6 项）</div>
            <div className="note">
              下一职级：<span className="big">{ni.def.名}</span>　最低任职 <span className="big">{ni.effMin}</span> 年（已任 {ni.served} 年）　提任年龄界限 <span className="big">{ni.年龄线}</span> 岁<br />
              工作平台：<b>{game.p.平台}{game.p.挂职 ? '（挂职中）' : ''}</b>{ni.early ? <span className="ok-txt">　多项指标表现突出，组织上会考虑提前</span> : null}
              {ni.超龄 ? <><br /><span className="bad-txt">已超过提任该级职务的年龄界限，组织上不再考虑实职提拔。</span></> : null}
              <div className="bars">{Array.from({ length: ni.effMin }, (_, i) => <i key={i} className={i < ni.served ? 'on' : ''} />)}</div>
            </div>
            <div className="ind-list">
              {indicatorList(game, ni.def).map((x) => {
                const 档 = x.已达60 ? 'top' : x.已达20 ? 'ok' : x.当前 >= x.门槛 ? 'ok' : x.当前 >= x.门槛 * 0.7 ? '' : 'bad'
                const tag = x.已达60 ? '位列前茅' : x.已达20 ? '表现突出' : x.当前 >= x.门槛 ? '已达到要求' : x.当前 >= x.门槛 * 0.7 ? '尚需努力' : '差距较大'
                return (
                  <div className="ind" key={x.名}>
                    <span className="ind-name">{x.名}</span>
                    <span className="ind-val">{fmt(x.当前)}<em> / 要求 {fmt(x.门槛)}</em></span>
                    <span className={`ind-tag ${档}`}>{tag}</span>
                  </div>
                )
              })}
            </div>
            <div className="hint">六项指标中，若四项「表现突出」，组织上会考虑提前 1—2 年提拔；若四项「位列前茅」，可提前 3—4 年。</div>
          </>
        ) : null}

        <div className="sec-title mt14">本年度工作安排</div>
        <div className="txt">
          <p>本模拟器<b>按年推进</b>：每年一次工作安排，共 <b>5 次</b>行动额度。</p>
          <p>行动用于施政、感情与家庭、协调关系、廉政梳理和在职学习；用完后点「结束本年」。</p>
          <p>职务晋升有最低任职年限，<b>年限一到会自动进入考察程序</b>，也可以主动申请。</p>
        </div>
        <div className="ap-row">
          本年剩余行动：<b>{game.actions} / {game.actionsMax} 次</b>
          <span className="dots">{Array.from({ length: game.actionsMax }, (_, i) => <i key={i} className={i < game.actions ? 'on' : ''} />)}</span>
        </div>
        {game.status === '退休'
          ? <button className="btn-red gray" onClick={endYear}>结束本年 · 推进时间 →</button>
          : (
            <>
              <button className="btn-red" onClick={() => setTab('施政')}>前往安排本年工作 →</button>
              <button className="btn-red gray" onClick={endYear}>结束本年 · 推进时间 →</button>
            </>
          )}
        {game.yearLog.length ? (
          <div className="mt14">
            {game.yearLog.map((l, i) => (
              <div className={`log-item ${l.kind || ''}`} key={i}>
                <div className="t">本年纪录</div>
                <div className="h">{l.h}</div>
                <div className="d">{l.d}</div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  )
}
