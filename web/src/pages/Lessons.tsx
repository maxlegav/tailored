import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Data } from '../types'
import { Md } from '../md'
import Board from '../Board'

export default function Lessons({ data }: { data: Data }) {
  const [open, setOpen] = useState<string | null>(data.lessons?.[0]?.id ?? null)
  if (!data.lessons?.length) return <div className="page"><h1>Cours</h1><p>Les cours arrivent bientôt.</p></div>
  return (
    <div className="page">
      <h1>Cours</h1>
      {data.lessons.map(l => (
        <div key={l.id} className="lesson">
          <h2 onClick={() => setOpen(open === l.id ? null : l.id)}>{l.title}</h2>
          {open === l.id && <><Md text={l.body} />
            {(l.mistakes || []).map(id => data.mistakes.find(m => m.id === id)).filter(m => !!m).map(m => (
              <div key={m!.id} className="item"><Board fen={m!.fen} orientation={m!.color} arrows={[{ from: m!.best.slice(0, 2), to: m!.best.slice(2, 4) }, { from: m!.uci.slice(0, 2), to: m!.uci.slice(2, 4), color: 'rgba(200,60,60,0.8)' }]} />
                <div><Md text={m!.text} /><p className="muted">Flèche rouge : ton coup. Flèche verte : le bon coup. <a href={m!.url} target="_blank">Partie</a></p></div></div>))}
            {l.tag && <Link className="btn" to={`/entrainement?tag=${encodeURIComponent(l.tag)}`}>S'entraîner sur ce thème</Link>}</>}
        </div>))}
    </div>
  )
}
