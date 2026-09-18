import type { ReactNode } from 'react'

export function Modal({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="modal">
      <div className="modal-mask">
        <div className={wide ? 'modal-box wide' : 'modal-box'}>{children}</div>
      </div>
    </div>
  )
}
