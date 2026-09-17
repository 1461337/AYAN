import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { ladder, rankTitle } from '../../domain/selectors'
import { 职级序列 } from '../../data/static'

export function Archive() {
  const game = useGame((s) => s.game)!
  const save = useGame((s) => s.save)
  const load = useGame((s) => s.load)
  const reset = useGame((s) => s.reset)

  const pos = game.positions.length
    ? game.positions.map((p, i) => <span key={i}>· {p.年}年　{p.职级}　{p.岗位}<br /></span>)
    : '尚无任职记录'
  const fam: string[] = []
  fam.push(game.family.配偶 ? `配偶：${game.family.配偶.姓名}（好感度 ${game.family.配偶.好感度}）` : '配偶：无')
  game.family.子女.forEach((c) => fam.push(`子女：${c.姓名}（${c.年龄}岁）`))

  return (
    <Card icon="📁" title="档案 · 过去必须留下痕迹">
      <div className="kv">
        <div className="k"><span>姓名</span><b>{game.p.姓名}</b></div>
        <div className="k"><span>年龄</span><b>{game.p.年龄}</b></div>
        <div className="k"><span>学历 / 专业</span><b>{game.p.学历} · {game.p.专业}</b></div>
        <div className="k"><span>专业匹配度</span><b>{game.p.专业匹配度}%</b></div>
        <div className="k"><span>职务 / 职级</span><b>{rankTitle(game)}{game.p.职业 === '公务员' ? ' · ' + 职级序列[game.zhijiIdx] : ''}</b></div>
        <div className="k"><span>出生地 / 家庭</span><b>{game.p.出生地} · {game.p.家庭背景}</b></div>
        <div className="k"><span>工作平台</span><b>{game.p.平台 || '—'}{game.p.挂职 ? ' · 挂职' + game.p.挂职.层级 : ''}</b></div>
        <div className="k"><span>人事关系</span><b>{game.p.选调生 ? '省委组织部（选调生）' : (game.p.单位 || '—')}</b></div>
        {game.p.挂职 ? <div className="k"><span>挂职单位</span><b>{game.p.挂职.单位}（至 {game.p.挂职.结束年} 年）</b></div> : null}
        <div className="k"><span>政治面貌</span><b>{game.p.政治面貌}{game.p.选调生 ? '（选调生）' : ''}</b></div>
        <div className="k"><span>任现职年限</span><b>{game.p2.任职年} 年</b></div>
      </div>
      <div className="sec-title mt14">长期目标</div>
      <div className="box">{game.p.目标}</div>
      <div className="sec-title">家庭</div>
      <div className="box">{fam.map((x, i) => <span key={i}>{x}<br /></span>)}</div>
      <div className="sec-title">任职经历</div>
      <div className="box">{pos}</div>
      {game.edu.证书.length ? (
        <>
          <div className="sec-title">已取得资格</div>
          <div className="box">{game.edu.证书.map((c, i) => <span key={i}>· {c}<br /></span>)}</div>
        </>
      ) : null}
      <div className="sec-title">人生轨迹</div>
      {game.log.map((x, i) => (
        <div className={`log-item ${x.kind || ''}`} key={i}>
          <div className="t">{x.t}</div><div className="h">{x.h}</div><div className="d">{x.d}</div>
        </div>
      ))}
      <div className="btn-row">
        <button className="btn-ghost" onClick={save}>保存存档</button>
        <button className="btn-ghost" onClick={load}>读取存档</button>
        <button className="btn-ghost" onClick={reset}>重开人生</button>
      </div>
      <div className="hint mt8">当前职位：{rankTitle(game)}（{ladder(game).length} 级序列中的第 {game.rankIdx + 1} 级）</div>
    </Card>
  )
}
