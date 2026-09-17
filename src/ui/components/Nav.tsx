import { useGame } from '../../store/gameStore'
import type { TabId } from '../../domain/types'
import { cx } from '../../utils/format'
import styles from './Nav.module.css'

const TABS: { id: TabId; icon: string; desc: string }[] = [
  { id: '年度', icon: '📅', desc: '推进年份、处理突发事件、查看年度总结' },
  { id: '政务', icon: '🏛️', desc: '施政工作、晋升考察、城市发展' },
  { id: '人脉', icon: '🕸️', desc: '家庭、感情与社会关系' },
  { id: '生活', icon: '🌿', desc: '健康管理与在职进修' },
  { id: '资产', icon: '💰', desc: '收支、房产车辆与贷款' },
  { id: '档案', icon: '📁', desc: '廉政记录与个人履历' },
]

export function Nav() {
  const cur = useGame((s) => s.curTab)
  const setTab = useGame((s) => s.setTab)
  const over = useGame((s) => s.game?.over)
  return (
    <nav className={styles.nav}>
      {TABS.map((t) => (
        <button
          key={t.id}
          title={t.desc}
          className={cx(styles.tab, cur === t.id && styles.on)}
          onClick={() => { if (!over) setTab(t.id) }}
        >
          <span className={styles.ni}>{t.icon}</span>
          <span className={styles.nl}>{t.id}</span>
        </button>
      ))}
    </nav>
  )
}
