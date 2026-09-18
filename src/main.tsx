import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import App from './App.tsx'
import { useGame } from './store/gameStore'
import { installDeviceWatch } from './ui/device'
import type { TabId } from './domain/types'

installDeviceWatch()

// 本地验收入口：?demo=1 快速进入一局游戏，可加 &tab=生活 指定页签
const params = new URLSearchParams(location.search)
if (import.meta.env.DEV && params.has('demo')) {
  useGame.getState().start({ name: '陆承宇', sex: '男', age: 24, major: '法学', job: '公务员' })
  const t = params.get('tab')
  if (t) useGame.getState().setTab(t as TabId)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
