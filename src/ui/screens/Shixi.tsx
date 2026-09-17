import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { SHIXI } from '../../data/shixi'
import { nextRankInfo, networkScore, TIER_NAME } from '../../domain/selectors'
import { fmt } from '../../utils/format'

export function Shixi() {
  const game = useGame((s) => s.game)!
  const shixi = useGame((s) => s.shixi)
  const answerQuiz = useGame((s) => s.answerQuiz)
  const applyPromote = useGame((s) => s.applyPromote)
  const endYear = useGame((s) => s.endYear)

  if (game.status === '退休') {
    return (
      <Card icon="🧰" title="施政 · 已退休">
        <div className="box">
          你已于 {game.p.年龄} 岁到龄退休，不再担任现职。<br />
          现在可以做的是：照顾好家庭、打理资产、保养身体，看着这座城市继续往前走。
        </div>
        <div className="ap-row">
          本年剩余行动：<b>{game.actions} / {game.actionsMax} 次</b>
          <span className="dots">{Array.from({ length: game.actionsMax }, (_, i) => <i key={i} className={i < game.actions ? 'on' : ''} />)}</span>
        </div>
        <button className="btn-red gray" onClick={endYear}>结束本年 · 推进时间 →</button>
      </Card>
    )
  }

  const ni = nextRankInfo(game)

  if (game.quiz) {
    const item = SHIXI[game.quiz.item]
    const tier = game.quiz.tier
    const set = item.asks[tier][game.quiz.variant]
    const mo = game.p2.连续模糊 || 0
    return (
      <Card icon="❓" title={'处置问答 · ' + item.名}>
        <div className="tags">
          <span className="tag gray">{TIER_NAME[tier]}阶段</span>
          <span className="tag gold">作答正确可增加晋升条件</span>
          {mo > 0 ? <span className="tag red">已连续 {mo} 次模棱两可</span> : null}
        </div>
        <div className="sec-title">{set.q}</div>
        <div className="hint mb12">三个选项对应不同处置方式，位置随机，系统不会提示哪个更合适。</div>
        {game.quiz.order.map((ai, k) => (
          <button className="btn-line" key={k} onClick={() => answerQuiz(k)}>{set.a[ai].文}</button>
        ))}
        <div className="hint">作答后本项工作才算完成，且本年内该项工作不能重复开展。</div>
      </Card>
    )
  }

  return (
    <Card icon="🧰" title="施政 · 年度工作安排">
      <div className="ap-row">
        本年剩余行动：<b>{game.actions} / {game.actionsMax} 次</b>
        <span className="dots">{Array.from({ length: game.actionsMax }, (_, i) => <i key={i} className={i < game.actions ? 'on' : ''} />)}</span>
        <span className="hint right">{game.date.y} 年度</span>
      </div>
      <div className="hint mb12">
        每年随机 3 项，每项限一次。答对加分；模棱两可不加不减，连续 3 次后每次扣减，答对即清零；答错直接扣减。
      </div>
      {game.shixiOrder.map((idx, i) => {
        const a = SHIXI[idx]
        const used = game.usedThisYear.includes(idx)
        return (
          <button className="btn-line" key={idx} disabled={game.actions <= 0 || used} onClick={() => shixi(idx)}>
            <span className="idx">{i + 1}</span>{a.名}
            {used ? <span className="cost">本年已开展</span> : <span className="cost">-1 行动</span>}
            <small>{a.desc}{used ? '' : '　选择后需作答处置问题'}</small>
          </button>
        )
      })}
      <div className="box mt12">每年 5 次行动，由施政、家庭、关系、廉政与学习共用。</div>

      {ni.def ? (
        <>
          <div className="sec-title mt14">晋升</div>
          <div className="box">
            <div className="kv2">
              <div><span>下一职级</span><b>{ni.def.名}</b></div>
              <div><span>最低任职</span><b>{ni.effMin} 年（已任 {ni.served} 年）</b></div>
              <div><span>提任年龄界限</span><b className={ni.超龄 ? 'bad-txt' : ''}>{ni.年龄线} 岁（现任 {game.p.年龄} 岁）</b></div>
              <div><span>工作平台</span><b>{game.p.平台}{game.p.挂职 ? '（挂职）' : ''}</b></div>
              <div><span>{game.p.职业 === '公务员' ? '政绩点' : '业绩点'}</span><b>{fmt(game.zhengji)} / 要求 {fmt(ni.def.门槛.政绩)}</b></div>
            </div>
            <div className="mt8">
              <div className="bar-row"><span>人脉（晋升中分量最重的一项）</span><b>{Math.round(networkScore(game))}</b></div>
              <div className="bar"><i style={{ width: `${Math.round(networkScore(game))}%` }} /></div>
              <div className="hint mt6">由综合人脉、关键人物的信任与好感度构成；职位越高，圈子越大。</div>
            </div>
            <div className="mt8">
              <div className="bar-row"><span>健康（承担更重岗位的身体条件）</span><b className={game.p.健康 < 70 ? 'bad-txt' : game.p.健康 < 80 ? '' : 'ok-txt'}>{game.p.健康}</b></div>
              <div className="bar"><i style={{ width: `${game.p.健康}%` }} /></div>
              <div className="hint mt6">晋升要求 80 以上；低于 70 会明显降低把握。</div>
            </div>
            <div className="hint mt6">
              硬性条件：能力 ≥ {ni.def.门槛.能力}、道德 ≥ {ni.def.门槛.道德}、领导评价 ≥ {ni.def.门槛.上司}
              {ni.idx >= 2 ? `；学历须本科及以上（当前${game.p.学历}，${['高中/中专', '大专'].includes(game.p.学历) ? '不满足' : '满足'}）` : ''}
            </div>
          </div>
          <button className="btn-line" disabled={game.actions <= 0} onClick={applyPromote}>
            主动申请晋升 · 组织谈话<span className="cost">-1 行动</span>
            <small>进入考察程序，结果取决于六项指标。</small>
          </button>
        </>
      ) : null}
      <button className="btn-red gray mt12" onClick={endYear}>结束本年 · 推进时间 →</button>
    </Card>
  )
}
