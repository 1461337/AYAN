import type { ReactNode } from 'react'

export function Card({ icon, title, children }: { icon: string; title: string; children: ReactNode }) {
  return (
    <div className="card">
      <div className="card-hd"><span className="ic">{icon}</span><h2>{title}</h2></div>
      <div className="card-bd">{children}</div>
    </div>
  )
}
