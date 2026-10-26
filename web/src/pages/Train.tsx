import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Chess } from 'chess.js'
import type { Data, Mistake } from '../types'
import Board from '../Board'
import { Md } from '../md'
import { dueIds, grade } from '../srs'

export default function Train({ data }: { data: Data }) {
  const [params] = useSearchParams()
  const [tag, setTag] = useState<string>(params.get('tag') || '')
  const [onlyFindable, setOnlyFindable] = useState(true)
  const pool = useMemo(() => data.mistakes.filter(m => (!tag || m.tags.includes(tag)) && (!onlyFindable || m.findable)), [data, tag, onlyFindable])
  const [queue, setQueue] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const start = () => { setQueue(dueIds(shuffle(pool.map(m => m.id)), 10)); setIdx(0) }
  const cur = queue[idx] ? data.mistakes.find(m => m.id === queue[idx]) : undefined
  return (
    <div className="page">
      <h1>Entraînement</h1>
      <p className="muted">Des positions tirées de <b>tes</b> parties, là où tu t'es trompé. Trouve le bon coup. Les ratés reviennent plus souvent.</p>
      <div className="controls">
        <select value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {data.tags.map(t => <option key={t.tag} value={t.tag}>{t.label} ({t.n})</option>)}
        </select>
        <label><input type="checkbox" checked={onlyFindable} onChange={e => setOnlyFindable(e.target.checked)} /> Seulement les coups à ma portée</label>
        <button onClick={start}>Nouvelle série ({Math.min(10, pool.length)})</button>
      </div>
      {cur && <Puzzle key={cur.id} m={cur} onDone={() => setIdx(i => i + 1)} n={idx + 1} total={queue.length} />}
      {queue.length > 0 && !cur && <p className="done">Série terminée. Reviens demain pour les répétitions.</p>}
    </div>
  )
}

function Puzzle({ m, onDone, n, total }: { m: Mistake; onDone: () => void; n: number; total: number }) {
  const [fen, setFen] = useState(m.fen)
  const [state, setState] = useState<'play' | 'ok' | 'ko'>('play')
  const [tried, setTried] = useState<string | null>(null)
  const onMove = (from: string, to: string) => {
    if (state !== 'play') return false
    const c = new Chess(m.fen)
    let mv
    try { mv = c.move({ from, to, promotion: 'q' }) } catch { return false }
    const uci = from + to + (mv.promotion ? mv.promotion : '')
    const ok = m.good.some(g => g.slice(0, 4) === uci.slice(0, 4))
    setFen(c.fen()); setTried(mv.san); setState(ok ? 'ok' : 'ko'); grade(m.id, ok)
    return true
  }
  const side = m.color === 'white' ? 'Blancs' : 'Noirs'
  return (
    <div className="puzzle">
      <p className="muted">{n}/{total} · {m.phase} · coup {m.move_no} · tu as les {side}{m.clk != null ? ` · ${Math.round(m.clk)} s à la pendule` : ''}</p>
      <Board fen={fen} orientation={m.color} onMove={state === 'play' ? onMove : undefined}
        arrows={state !== 'play' ? [{ from: m.best.slice(0, 2), to: m.best.slice(2, 4) }] : []} />
      {state === 'play' && <p>À toi de jouer. Pendant la partie, tu avais joué <b>{m.san}</b>.</p>}
      {state === 'ok' && <p className="good">Bien joué : {tried} !</p>}
      {state === 'ko' && <p className="bad">{tried} n'est pas le bon coup. La flèche montre {m.best_san}.</p>}
      {state !== 'play' && <div className="explain"><Md text={m.text} /><p className="muted">Ce qui s'est passé : {m.refutation_san}</p>
        <p><a href={m.url} target="_blank">Voir la partie sur chess.com</a></p>
        <button onClick={onDone}>Suivant</button></div>}
    </div>
  )
}
function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
