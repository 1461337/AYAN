import { useEffect } from 'react'
import { useGame } from './store/gameStore'
import { Header } from './ui/components/Header'
import { Nav } from './ui/components/Nav'
import { Modals } from './ui/components/Modals'
import { HelpModal } from './ui/components/HelpModal'
import { Toast } from './ui/components/Toast'
import { Setup } from './ui/screens/Setup'
import { Events } from './ui/screens/Events'
import { Politics } from './ui/screens/Politics'
import { People } from './ui/screens/People'
import { Life } from './ui/screens/Life'
import { Assets } from './ui/screens/Assets'
import { Records } from './ui/screens/Records'
import { End } from './ui/screens/End'
import type { TabId } from './domain/types'
import styles from './App.module.css'

const VIEWS: Record<TabId, () => React.ReactElement> = {
  年度: Events,
  政务: Politics,
  人脉: People,
  生活: Life,
  资产: Assets,
  档案: Records,
}

export default function App() {
  const game = useGame((s) => s.game)
  const curTab = useGame((s) => s.curTab)
  const gameOver = useGame((s) => !!s.game?.over)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [curTab, gameOver])

  if (!game) {
    return (
      <>
        <Setup />
        <Toast />
      </>
    )
  }

  const View = VIEWS[curTab]
  return (
    <div id="app">
      <Header />
      <div className={styles.layout}>
        <main className={styles.view}>{game.over ? <End /> : <View />}</main>
        <Nav />
      </div>
      <Modals />
      <HelpModal />
      <Toast />
    </div>
  )
}
