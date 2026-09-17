import { useEffect } from 'react'
import { useGame } from './store/gameStore'
import { Header } from './ui/components/Header'
import { Nav } from './ui/components/Nav'
import { Modals } from './ui/components/Modals'
import { HelpModal } from './ui/components/HelpModal'
import { Toast } from './ui/components/Toast'
import { Setup } from './ui/screens/Setup'
import { Events } from './ui/screens/Events'
import { Shixi } from './ui/screens/Shixi'
import { City } from './ui/screens/City'
import { People } from './ui/screens/People'
import { Study } from './ui/screens/Study'
import { Assets } from './ui/screens/Assets'
import { Integrity } from './ui/screens/Integrity'
import { Archive } from './ui/screens/Archive'
import { Health } from './ui/screens/Health'
import { End } from './ui/screens/End'
import type { TabId } from './domain/types'
import styles from './App.module.css'

const VIEWS: Record<TabId, () => React.ReactElement> = {
  事件: Events,
  施政: Shixi,
  城建: City,
  人脉: People,
  进修: Study,
  资产: Assets,
  廉政: Integrity,
  档案: Archive,
  健康: Health,
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
