import { useRef } from 'react'
import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { nextRankInfo, indicatorList } from '../../domain/selectors'
import { lastSaveTime } from '../../persistence/save'
import { fmt } from '../../utils/format'

function SaveCard() {
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const exportSave = useGame((s) => s.exportSave)
  const importGame = useGame((s) => s.importGame)
  const reset = useGame((s) => s.reset)
  useGame((s) => s.toastId)
  const fileRef = useRef<HTMLInputElement>(null)
  const t = lastSaveTime()
  return (
    <div className="card" style={{ borderColor: '#e8c56a', background: '#fffdf4', marginBottom: 12 }}>
      <div className="card-bd" style={{ padding: '11px 13px' }}>
        <div className="ap-row" style={{ marginBottom: 8 }}>
          <span className="sec-title" style={{ margin: 0, color: '#9a7a24', borderLeftColor: '#e8c56a' }}>存档</span>
          <span className="hint" style={{ margin: 0 }}>每年结束自动保存 · 上次保存：{t || '尚未保存'}</span>
        </div>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <button className="btn-plain" onClick={save}>保存存档</button>
          <button className="btn-plain" onClick={load}>读取存档</button>
          <button className="btn-plain" onClick={exportSave}>导出存档</button>
          <button className="btn-plain" onClick={() => fileRef.current?.click()}>导入存档</button>
          <button className="btn-plain" onClick={reset}>重开人生</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            importGame(await f.text())
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export function Events() {
  const game = useGame((s) => s.game)!
  const chooseEvent = useGame((s) => s.chooseEvent)
  const setTab = useGame((s) => s.setTab)
  const endYear = useGame((s) => s.endYear)
  const pendingEvent = game.pendingEvent

  if (pendingEvent) {
    return (
      <>
        <SaveCard />
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
      </>
    )
  }

  const ni = nextRankInfo(game)
  return (
    <>
      <SaveCard />
      {game.date.y - (game.beginYear || game.date.y) < 3 && game.status !== '退休' ? (
        <div className="card" style={{ borderColor: '#e8d5a8', background: '#fffdf4', marginBottom: 12 }}>
          <div className="card-bd" style={{ padding: '13px 14px' }}>
            <div className="sec-title" style={{ color: '#9a7a24', borderLeftColor: '#e8c56a' }}>上手指引（前三年显示）</div>
            <div className="hint" style={{ margin: 0, lineHeight: 1.75 }}>
              每年 5 次行动，建议 3 次施政 + 1 次向领导汇报，其余留给家庭、健康或廉政。<br />
              晋升看六项指标，完成情况见「🏛️ 政务」页；任职年限一到自动进入考察。
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
          <span className="hint">健康是六项晋升指标之一，可免费休养 +5—10，详见「🌿 生活」页。</span>
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
            <div className="hint">四项「表现突出」可提前 1—2 年提拔，四项「位列前茅」可提前 3—4 年。</div>
          </>
        ) : null}

        <div className="sec-title mt14">本年度工作安排</div>
        <div className="txt">
          <p>每年 5 次行动，由施政、家庭、关系、廉政与学习共用；用完后结束本年。</p>
          <p>任职年限一到自动进入考察，也可主动申请；岗位大概率在本地区产生。</p>
        </div>
        <div className="ap-row">
          本年剩余行动：<b>{game.actions} / {game.actionsMax} 次</b>
          <span className="dots">{Array.from({ length: game.actionsMax }, (_, i) => <i key={i} className={i < game.actions ? 'on' : ''} />)}</span>
        </div>
        {game.status === '退休'
          ? <button className="btn-red gray" onClick={endYear}>结束本年 · 推进时间 →</button>
          : (
            <>
              <button className="btn-red" onClick={() => setTab('政务')}>前往安排本年工作 →</button>
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
