import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { Collapse } from '../components/Collapse'
import { ALL_SHIXI, 题目套, 可用题目 } from '../../domain/quiz'
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
        <div className="box">你已到龄退休，不再担任现职。可安排家庭、资产与健康事务。</div>
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
    const { item, tier, variants } = 题目套(game.quiz.item, game.rankIdx)
    const set = variants[Math.min(game.quiz.variant, variants.length - 1)]
    const mo = game.p2.连续模糊 || 0
    return (
      <Card icon="❓" title={'处置问答 · ' + item.名}>
        <div className="tags">
          <span className="tag gray">{TIER_NAME[tier]}阶段</span>
          <span className="tag gold">作答正确可增加晋升条件</span>
          {mo > 0 ? <span className="tag red">已连续 {mo} 次模棱两可</span> : null}
        </div>
        <div className="sec-title">{set.q}</div>
        <div className="hint mb12">三个选项位置随机，系统不会提示哪个更合适。</div>
        {game.quiz.order.map((ai, k) => (
          <button className="btn-line" key={k} onClick={() => answerQuiz(k)}>{set.a[ai].文}</button>
        ))}
        <div className="hint">作答后本项工作才算完成，本年内不能重复开展。</div>
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
      <div className="hint mb12">每年随机 3 项，每项限一次；答对加分，答错扣分；连续模糊 3 次后每次扣分。</div>
      {game.shixiOrder.filter((idx) => 可用题目(game).includes(idx)).map((idx, i) => {
        const a = ALL_SHIXI[idx]
        if (!a) return null
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
          <div className="kv2 mb12">
            <div><span>下一职级</span><b>{ni.def.名}</b></div>
            <div><span>最低任职</span><b>{ni.effMin} 年（已任 {ni.served} 年）</b></div>
            <div><span>年龄线</span><b className={ni.超龄 ? 'bad-txt' : ''}>{ni.年龄线} 岁（现任 {game.p.年龄}）</b></div>
            <div><span>{game.p.职业 === '公务员' ? '政绩点' : '业绩点'}</span><b>{fmt(game.zhengji)} / {fmt(ni.def.门槛.政绩)}</b></div>
          </div>
          <Collapse title="晋升条件与把握">
            <div className="bar-row"><span>人脉</span><b>{Math.round(networkScore(game))}</b></div>
            <div className="bar"><i style={{ width: `${Math.round(networkScore(game))}%` }} /></div>
            <div className="bar-row mt8"><span>健康（要求 80）</span><b className={game.p.健康 < 70 ? 'bad-txt' : game.p.健康 < 80 ? '' : 'ok-txt'}>{game.p.健康}</b></div>
            <div className="bar"><i style={{ width: `${game.p.健康}%` }} /></div>
            <div className="hint mt8">
              硬性条件：能力 ≥ {ni.def.门槛.能力}、道德 ≥ {ni.def.门槛.道德}、领导评价 ≥ {ni.def.门槛.上司}
              {game.p.职业 === '公务员' && ni.idx >= 2 ? `；学历本科及以上（当前${game.p.学历}）` : ''}
            </div>
          </Collapse>
          <button className="btn-line" disabled={game.actions <= 0} onClick={applyPromote}>
            主动申请晋升 · 组织谈话<span className="cost">-1 行动</span>
            <small>进入考察，结果取决于六项指标。</small>
          </button>
        </>
      ) : null}
      <button className="btn-red gray mt12" onClick={endYear}>结束本年 · 推进时间 →</button>
    </Card>
  )
}
