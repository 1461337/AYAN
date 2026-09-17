import { useGame } from '../../store/gameStore'
import { ladder, nextRankInfo, rankTitle } from '../../domain/selectors'
import { 职级序列 } from '../../data/static'
import { fmt } from '../../utils/format'
import styles from './Header.module.css'

export function Header() {
  const game = useGame((s) => s.game)
  const setHelp = useGame((s) => s.setHelp)
  if (!game) return null
  const t = rankTitle(game)
  const ni = nextRankInfo(game)
  const jobTag = game.p.职业 === '公务员' ? 职级序列[game.zhijiIdx] : '职业序列'
  const hp = game.p.健康
  const hpCls = hp < 20 ? 'bad' : hp < 30 ? 'bad' : hp < 50 ? 'warn' : hp < 80 ? 'warn' : ''
  const stats: [string, number][] = [
    ['能力', game.p.能力], ['道德', game.p.道德], ['人脉', game.p.人脉], ['上司', game.p.上司], ['声望', game.p.声望],
  ]
  const avatar = game.p.职业 === '公务员' ? '🧑‍💼' : game.p.职业 === '教师' ? '👩‍🏫' : game.p.职业 === '医生' ? '👨‍⚕️' : game.p.职业 === '记者' ? '📰' : '🧑'

  return (
    <header className={styles.hdr}>
      <div className={styles.hdrInner}>
        <div className={styles.hdrTop}>
          <div className={styles.hdrTitle}>
            <div className={styles.rankName}>
              {t}
              <small>{jobTag}</small>
              {game.p.选调生 ? <small className="tag-xd">选调生</small> : null}
              {game.status === '退休' ? <small className="tag-xd">退休</small> : null}
              {game.family.婚姻 === '已婚' ? <small className="tag-xd">已婚</small> : null}
            </div>
            <div className={styles.rankMeta}>
              {game.p.单位} · <b>{game.p.城市}</b> · {game.p.平台 || ''} · {game.date.y}年 · {game.p.年龄}岁 · {game.p.学历} · 目标：{game.rankIdx >= ladder(game).length - 1 ? '已 达 巅 峰' : game.p.目标}
            </div>
            <div className={styles.rankNext}>
              {game.status === '退休'
                ? '已退休 · 每年可安排家庭、资产与健康事务'
                : (ni.def
                  ? <>下一职级：<b>{ni.def.名}</b>　最低任职 <b>{ni.effMin}</b> 年（已任 {ni.served} 年）</>
                  : '已达本序列最高职级')}
            </div>
          </div>
          <div className={styles.hdrRight}>
            <button className={styles.iconBtn} title="说明" onClick={() => setHelp(true)}>?</button>
            <div className={styles.avatar}>{avatar}</div>
            <div className={styles.zhiji}><b>{fmt(game.zhengji)}</b>政绩点</div>
          </div>
        </div>
        <div className={styles.stats}>
          {stats.map(([k, v]) => (
            <div className="chip" key={k}>{k}<b>{v}</b></div>
          ))}
          <div className={`chip ${hpCls}`}>健康<b>{hp}</b></div>
          <div className={`chip ${game.discipline.risk > 50 ? 'bad' : game.discipline.risk > 20 ? 'warn' : ''}`}>廉政风险<b>{game.discipline.risk}</b></div>
          <div className="chip">现金<b>{fmt(game.cash)}</b></div>
        </div>
      </div>
      <div className={styles.goldLine} />
    </header>
  )
}
