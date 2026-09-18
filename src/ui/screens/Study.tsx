import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { Collapse } from '../components/Collapse'
import { CERTS, EDU_UP, eduIdx } from '../../data/static'
import { fmt } from '../../utils/format'

export function Study() {
  const game = useGame((s) => s.game)!
  const eduStart = useGame((s) => s.eduStart)
  const eduCancel = useGame((s) => s.eduCancel)
  const certStart = useGame((s) => s.certStart)
  const cur = game.p.学历
  const up = game.edu.在读
  const inOffice = ['公务员', '事业单位', '国企'].includes(game.p.职业) && game.status !== '退休'

  return (
    <Card icon="🎓" title="进修 · 在职在编在岗提升">
      <div className="kv">
        <div className="k"><span>当前学历</span><b>{cur}</b></div>
        <div className="k"><span>专业</span><b>{game.p.专业}</b></div>
        <div className="k"><span>政治面貌</span><b>{game.p.政治面貌}</b></div>
        <div className="k"><span>在编在岗</span><b className={inOffice ? 'up' : 'dn'}>{inOffice ? '是' : '否'}</b></div>
      </div>
      {up ? (
        <>
          <div className="sec-title mt14">在读中</div>
          <div className="box">
            <b>{up.名}</b><br />
            目标学历：{up.至}　已读 {up.年 - up.剩} / {up.年} 年　已投入 {fmt(up.已付)} 元
            <div className="bars mt8">
              {Array.from({ length: up.年 }, (_, i) => <i key={i} className={i < up.年 - up.剩 ? 'on' : ''} />)}
            </div>
            <span className="hint">每年占用 1 次行动；中途放弃不退费。</span>
          </div>
          <button className="btn-red gray" onClick={eduCancel}>中 途 放 弃</button>
        </>
      ) : null}
      <div className="sec-title mt14">在职学历提升（在编在岗）</div>
      {!inOffice ? <div className="box">你目前不在编在岗，可以自费报考，但拿不到委托培养与工龄衔接的政策便利。</div> : null}
      {EDU_UP.map((e, i) => {
        const ok = e.需.includes(cur)
        const busy = !!up
        const pay = game.cash >= Math.round(e.费 * 0.3)
        return (
          <button className="btn-line" key={e.名} disabled={!ok || busy || !pay} onClick={() => eduStart(i)}>
            {e.名}<span className="cost">{fmt(e.费)} 元</span>
            <small>
              目标学历：{e.至}　周期：{e.年} 年　前置学历要求：{e.需.join(' / ')}
              {ok ? '' : (eduIdx(cur) > eduIdx(e.至)
                ? <><br /><b className="ok-txt">你已取得{cur}学历，高于该层次</b></>
                : <><br /><b className="bad-txt">学历不符：该层次要求{e.需.join(' / ')}，当前为{cur}</b></>)}
              {busy ? <><br /><b className="bad-txt">正在攻读一项学历，无法同时进行。</b></> : null}
              <br />{e.注}
            </small>
          </button>
        )
      })}
      <Collapse title="职业资格与培训">
        {CERTS.map((c, i) => {
          const done = game.edu.证书.includes(c.名)
          const bad = c.限 && !c.限.includes(game.p.专业)
          return (
            <button className="btn-line" key={c.名} disabled={!!done || !!bad} onClick={() => certStart(i)}>
              {c.名}<span className="cost">{c.费 ? fmt(c.费) + ' 元' : '免费'}</span>
              <small>周期约 {c.年} 年　{done ? <b className="ok-txt">已取得</b> : bad ? <b className="bad-txt">专业不符（限{c.限!.join('/')}）</b> : '考核通过后生效'}</small>
            </button>
          )
        })}
      </Collapse>
      <div className="hint">县级及以上岗位普遍要求本科以上学历。</div>
    </Card>
  )
}
