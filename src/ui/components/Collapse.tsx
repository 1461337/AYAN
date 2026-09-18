import { useState, type ReactNode } from 'react'

export function Collapse({ title, children, defaultOpen = false }: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="collapse">
      <button className="collapse-head" onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <span className="collapse-arrow">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="collapse-body">{children}</div> : null}
    </div>
  )
}
