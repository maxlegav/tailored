import { useEffect, useRef, useState } from 'react'
import type { Opening } from './types'
import { OpeningCard } from './pages/Repertoire'
import { loadDB, mark } from './progress'

const SIDES = [['white', 'Avec les Blancs'], ['black', 'Avec les Noirs']] as const

export default function RepList({ list, open: init }: { list: Opening[]; open?: string | null }) {
  const [db, setDb] = useState(loadDB)
  const [open, setOpen] = useState<string | null>(init ?? null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (init) ref.current?.scrollIntoView({ block: 'start' }) }, [init])
  return <>{SIDES.map(([c, label]) => {
    const all = list.filter(o => o.color === c)
    if (!all.length) return null
    const n = all.filter(o => db.reps[o.id]).length
    return (
      <details key={c} className="sect" open>
        <summary>{label} <span className="cnt">{n}/{all.length} apprise{n > 1 ? 's' : ''}</span></summary>
        {all.map(o => {
          const done = !!db.reps[o.id]
          return (
            <div key={o.id} className={`repitem${done ? ' done' : ''}`} ref={o.id === init ? ref : undefined}>
              <div className="rep-h" onClick={() => setOpen(open === o.id ? null : o.id)}>
                <span className="chev">{open === o.id ? '▾' : '▸'}</span>
                <span className="rep-t">{o.title}<br /><span className="small muted">{o.stats}</span></span>
                {done && <span className="tag idea">✓ apprise</span>}
              </div>
              {open === o.id && <>
                <OpeningCard o={o} />
                <label className="check"><input type="checkbox" checked={done} onChange={e => setDb(mark('reps', o.id, e.target.checked))} /> Ligne apprise : je la connais par cœur</label>
              </>}
            </div>)
        })}
      </details>)
  })}</>
}
