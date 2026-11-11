import { useEffect, useRef, useState } from 'react'
import type { Opening } from './types'
import { OpeningCard } from './pages/Repertoire'
import { loadDB, mark } from './progress'
import Quiz, { learnedN, questions } from './Quiz'

const SIDES = [['white', 'Avec les Blancs'], ['black', 'Avec les Noirs']] as const

export default function RepList({ list, open: init, quiz }: { list: Opening[]; open?: string | null; quiz?: boolean }) {
  const [db, setDb] = useState(loadDB)
  const [open, setOpen] = useState<string | null>(init ?? null)
  const [mode, setMode] = useState<'voir' | 'quiz'>(quiz ? 'quiz' : 'voir')
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
              <div className="rep-h" onClick={() => { setOpen(open === o.id ? null : o.id); setMode('voir') }}>
                <span className="chev">{open === o.id ? '▾' : '▸'}</span>
                <span className="rep-t">{o.title}<br /><span className="small muted">{o.stats}</span></span>
                {done && <span className="tag idea">✓ apprise</span>}
              </div>
              {open === o.id && <>
                <div className="seg">
                  <button className={mode === 'voir' ? 'on' : ''} onClick={() => setMode('voir')}>1. Regarde la ligne une fois</button>
                  <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>2. Quiz : 5 positions</button>
                </div>
                {mode === 'quiz'
                  ? <Quiz key={o.id} qs={questions(o, list, o.id.endsWith('pieges'))} doneKey={o.id.endsWith('pieges') ? 'quiz-pieges' : 'quiz-rep'} onFinish={() => { const qs = questions(o, list, o.id.endsWith('pieges')); if (learnedN(qs) === qs.length) setDb(mark('reps', o.id, true)) }} />
                  : <><OpeningCard o={o} /><p className="small muted">Regarde la ligne avec ▶ jusqu'au bout, puis passe au quiz : on te montre une position, tu joues le coup. La ligne se coche toute seule quand tu as réussi toutes ses positions.</p></>}
                <label className="check"><input type="checkbox" checked={done} onChange={e => setDb(mark('reps', o.id, e.target.checked))} /> Ligne apprise : je la connais par cœur</label>
              </>}
            </div>)
        })}
      </details>)
  })}</>
}
