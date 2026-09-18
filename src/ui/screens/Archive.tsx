import { useState } from 'react'
import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { Collapse } from '../components/Collapse'
import { rankTitle } from '../../domain/selectors'
import { 职级序列 } from '../../data/static'

export function Archive() {
  const game = useGame((s) => s.game)!
  const [展开, set展开] = useState(false)

  const pos = game.positions.length
    ? game.positions.map((p, i) => <span key={i}>· {p.年}年　{p.职级}　{p.岗位}<br /></span>)
    : '尚无任职记录'
  const fam: string[] = []
  fam.push(game.family.配偶 ? `配偶：${game.family.配偶.姓名}（好感度 ${game.family.配偶.好感度}）` : '配偶：无')
  game.family.子女.forEach((c) => fam.push(`子女：${c.姓名}（${c.年龄}岁）`))

  return (
    <Card icon="📁" title="档案 · 过去必须留下痕迹">
      <Collapse title="个人档案">
        <div className="kv">
          <div className="k"><span>姓名</span><b>{game.p.姓名}</b></div>
          <div className="k"><span>年龄</span><b>{game.p.年龄}</b></div>
          <div className="k"><span>学历 / 专业</span><b>{game.p.学历} · {game.p.专业}</b></div>
          <div className="k"><span>职务 / 职级</span><b>{rankTitle(game)}{game.p.职业 === '公务员' ? ' · ' + 职级序列[game.zhijiIdx] : ''}</b></div>
          <div className="k"><span>出生地 / 家庭</span><b>{game.p.出生地} · {game.p.家庭背景}</b></div>
          <div className="k"><span>工作平台</span><b>{game.p.平台 || '—'}{game.p.挂职 ? ' · 挂职' + game.p.挂职.层级 : ''}</b></div>
          <div className="k"><span>人事关系</span><b>{game.p.选调生 ? '省委组织部（选调生）' : (game.p.单位 || '—')}</b></div>
          <div className="k"><span>任现职年限</span><b>{game.p2.任职年} 年</b></div>
        </div>
        <div className="hint mt8">长期目标：{game.p.目标}</div>
      </Collapse>
      <Collapse title="家庭与任职经历">
        <div className="box">{fam.map((x, i) => <span key={i}>{x}<br /></span>)}</div>
        <div className="box">{pos}</div>
        {game.edu.证书.length ? <div className="box">{game.edu.证书.map((c, i) => <span key={i}>· {c}<br /></span>)}</div> : null}
      </Collapse>
      <div className="sec-title">人生轨迹</div>
      <div className="hint mb8">{展开 ? '显示全部记录' : `仅显示近 3 年（${game.date.y - 2}—${game.date.y}）`}</div>
      {(() => {
        const 全部 = game.log
        const 近3年 = 全部.filter((x) => {
          const m = x.t.match(/(\d{4})/)
          return m ? Number(m[1]) >= game.date.y - 2 : true
        })
        const 显示 = 展开 ? 全部 : 近3年
        return (
          <>
            {显示.map((x, i) => (
              <div className={`log-item ${x.kind || ''}`} key={i}>
                <div className="t">{x.t}</div><div className="h">{x.h}</div><div className="d">{x.d}</div>
              </div>
            ))}
            {全部.length > 近3年.length ? (
              <button className="btn-plain mt8" onClick={() => set展开((v) => !v)}>
                {展开 ? '收起，只看近 3 年' : `展开全部（共 ${全部.length} 条）`}
              </button>
            ) : null}
          </>
        )
      })()}
    </Card>
  )
}
