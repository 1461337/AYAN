import { useGame } from '../../store/gameStore'
import type { TabId } from '../../domain/types'
import { cx } from '../../utils/format'
import styles from './Nav.module.css'

const TABS: { id: TabId; icon: string }[] = [
  { id: '事件', icon: '🗓️' }, { id: '施政', icon: '🧰' }, { id: '城建', icon: '🏗️' },
  { id: '人脉', icon: '🕸️' }, { id: '进修', icon: '🎓' }, { id: '资产', icon: '💰' },
  { id: '廉政', icon: '⚠️' }, { id: '档案', icon: '📁' }, { id: '健康', icon: '🩺' },
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
