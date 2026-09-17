import { useGame } from '../../store/gameStore'

export function Toast() {
  const msg = useGame((s) => s.toastMsg)
  const id = useGame((s) => s.toastId)
  if (!id || !msg) return null
  return <div className="toast show" key={id}>{msg}</div>
}
