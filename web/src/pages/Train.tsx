import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Data, Mistake } from '../types'
import Board from '../Board'
import Coach from '../Coach'
import { Md } from '../md'
import { dueIds, grade } from '../srs'
import { analyse } from '../lib/engine'
import { pieceList, sanLine, uciOf } from '../lib/chess'

const KINDS: Record<string, string> = {
  prio: 'Priorités : habitudes et compréhension', all: 'Toutes les positions',
  habitude: 'Habitudes à corriger', comprehension: 'Compréhension / plans', accident: 'Accidents (pièces en prise)', zeitnot: 'Zeitnot (< 20 s)',
}
export const KIND_LABEL: Record<string, string> = { habitude: 'Habitude', comprehension: 'Compréhension', accident: 'Accident', zeitnot: 'Zeitnot' }

export default function Train({ data }: { data: Data }) {
  const [params] = useSearchParams()
  const [tag, setTag] = useState<string>(params.get('tag') || '')
  const [kind, setKind] = useState<string>(params.get('kind') || 'prio')
  const [onlyFindable, setOnlyFindable] = useState(true)
  const pool = useMemo(() => data.mistakes.filter(m => (!tag || m.tags.includes(tag)) && (!onlyFindable || m.findable)
    && (kind === 'all' || (kind === 'prio' ? m.kind === 'habitude' || m.kind === 'comprehension' : m.kind === kind))), [data, tag, onlyFindable, kind])
  const [queue, setQueue] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const start = () => { setQueue(dueIds(shuffle(pool.map(m => m.id)), 10)); setIdx(0); setScore(0) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(start, [pool])
  const cur = queue[idx] ? data.mistakes.find(m => m.id === queue[idx]) : undefined
  return (
    <div className="page">
      <h1>Entraînement</h1>
      <p className="muted">Des positions tirées de <b>tes</b> parties. Trouve le bon coup, comprends le but, puis continue à jouer contre le moteur.</p>
      <div className="controls">
        <select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {data.tags.map(t => <option key={t.tag} value={t.tag}>{t.label} ({t.n})</option>)}
        </select>
        <label><input type="checkbox" checked={onlyFindable} onChange={e => setOnlyFindable(e.target.checked)} /> Seulement les coups à ma portée</label>
        <button onClick={start}>Nouvelle série ({Math.min(10, pool.length)})</button>
      </div>
      {cur && <Puzzle key={cur.id} m={cur} onDone={ok => { setScore(s => s + (ok ? 1 : 0)); setIdx(i => i + 1) }} n={idx + 1} total={queue.length} />}
      {pool.length === 0 && <p className="done">Aucune position pour ce filtre.</p>}
      {queue.length > 0 && !cur && <div className="done"><div className="big">{score}/{queue.length}</div><p>Série terminée. Les positions ratées reviendront demain.</p><button className="btn primary" onClick={start}>Encore une série</button></div>}
    </div>
  )
}

function context(m: Mistake, tried: string | null) {
  const side = m.color === 'white' ? 'Blancs' : 'Noirs'
  return `Position étudiée (FEN) : ${m.fen}
Max a les ${side}, trait à Max. Coup ${m.move_no}, phase : ${m.phase}${m.clk != null ? `, ${Math.round(m.clk)} s à la pendule (blitz 3+0)` : ''}.
Pièces :
${pieceList(m.fen)}
Dans la partie, Max a joué ${m.san} (chances de gain ${Math.round(m.wp_before)}% → ${Math.round(m.wp_after)}%). Suite qui punit : ${m.refutation_san}.
Meilleur coup selon Stockfish : ${m.best_san}. Ligne principale : ${sanLine(m.fen, m.best_pv)}.
Type d'erreur : ${m.kind || '?'} ; thèmes détectés : ${m.tags.join(', ')}.${m.findable != null ? ` Un joueur de 1900 trouve ${m.best_san} dans ${Math.round((m.p_best_human || 0) * 100)}% des cas (Maia).` : ''}
Explication déjà affichée à Max : ${m.text}
But de la position déjà affiché : ${m.goal || '—'}
${tried ? `Dans l'exercice, Max vient d'essayer ${tried}.` : ''}`
}

function Puzzle({ m, onDone, n, total }: { m: Mistake; onDone: (ok: boolean) => void; n: number; total: number }) {
  const [fen, setFen] = useState(m.fen)
  const [state, setState] = useState<'play' | 'ok' | 'ko' | 'free'>('play')
  const [tried, setTried] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const [last, setLast] = useState<[string, string] | undefined>()
  const [hist, setHist] = useState<string[]>([])
  const [thinking, setThinking] = useState(false)
  const me = m.color === 'white' ? 'w' : 'b'

  const tryMove = (from: string, to: string) => {
    const r = uciOf(m.fen, from, to); if (!r) return false
    const ok = m.good.some(g => g.slice(0, 4) === r.uci.slice(0, 4))
    setFen(r.fen); setLast([from, to]); setTried(r.san); setState(ok ? 'ok' : 'ko'); setSolved(ok); grade(m.id, ok)
    return true
  }
  const freeMove = (from: string, to: string) => {
    if (thinking) return false
    const r = uciOf(fen, from, to); if (!r) return false
    setHist(h => [...h, fen]); setFen(r.fen); setLast([from, to]); setThinking(true)
    analyse(r.fen, { movetime: 600 }).then(ls => {
      const u = ls[0]?.pv[0]
      const rr = u && uciOf(r.fen, u.slice(0, 2), u.slice(2, 4))
      if (rr) { setFen(rr.fen); setLast([u.slice(0, 2), u.slice(2, 4)]) }
      setThinking(false)
    })
    return true
  }
  const continueFrom = (f: string) => {
    setState('free'); setHist([]); setLast(undefined)
    const turnIsMe = f.split(' ')[1] === me
    if (turnIsMe) { setFen(f); return }
    setFen(f); setThinking(true)
    analyse(f, { movetime: 600 }).then(ls => {
      const u = ls[0]?.pv[0]; const rr = u && uciOf(f, u.slice(0, 2), u.slice(2, 4))
      if (rr) { setFen(rr.fen); setLast([u.slice(0, 2), u.slice(2, 4)]) }
      setThinking(false)
    })
  }
  const side = m.color === 'white' ? 'Blancs' : 'Noirs'
  const revealed = state !== 'play'
  return (
    <div className="puzzle">
      <div className="pz-board">
        <p className="muted">{n}/{total} · {m.phase} · coup {m.move_no} · tu as les {side}{m.clk != null ? ` · ${Math.round(m.clk)} s à la pendule` : ''}</p>
        <Board fen={fen} orientation={m.color} lastMove={last}
          onMove={state === 'play' ? tryMove : state === 'free' ? freeMove : undefined}
          arrows={state === 'ok' || state === 'ko' ? [{ from: m.best.slice(0, 2), to: m.best.slice(2, 4) }] : []} />
        {state === 'free' && <div className="row">
          <span className="small">{thinking ? 'Le moteur réfléchit…' : 'À toi : le moteur répond à chaque coup.'}</span>
          <button disabled={!hist.length || thinking} onClick={() => { setFen(hist[hist.length - 1]); setHist(h => h.slice(0, -1)); setLast(undefined) }}>↶ Annuler</button>
          <button onClick={() => { setFen(m.fen); setHist([]); setLast(undefined) }}>⟲ Départ</button>
        </div>}
      </div>
      <div className="pz-side">
        {state === 'play' && <p>À toi de jouer. Pendant la partie, tu avais joué <b>{m.san}</b>. Touche une pièce pour voir ses coups.</p>}
        {state === 'ok' && <p className="good">Bien joué : {tried} !</p>}
        {state === 'ko' && <p className="bad">{tried} n'est pas le bon coup. La flèche montre {m.best_san}.</p>}
        {revealed && <>
          {m.goal && <div className="goal"><div className="goal-h">Le but de la position</div><Md text={m.goal} /></div>}
          <div className="explain"><Md text={m.text} /><p className="muted">Ce qui s'est passé : {m.refutation_san}</p>
            <p className="small"><a href={m.url} target="_blank">Voir la partie sur chess.com</a></p></div>
          <div className="row">
            {state !== 'free' && <button onClick={() => continueFrom(fen)}>▶ Continuer à jouer</button>}
            {state !== 'free' && !solved && <button onClick={() => { const r = uciOf(m.fen, m.best.slice(0, 2), m.best.slice(2, 4)); if (r) continueFrom(r.fen) }}>▶ Jouer à partir de {m.best_san}</button>}
            <button className="btn primary" onClick={() => onDone(solved)}>Suivant →</button>
          </div>
          <Coach context={context(m, tried)} fen={m.fen} pov={me}
            suggestions={['Quel est le plan ici ?', `Pourquoi ${m.best_san} ?`, `Pourquoi ${m.san} était mauvais ?`, ...(tried && tried !== m.best_san && tried !== m.san ? [`Et ${tried}, pourquoi pas ?`] : [])]} />
        </>}
      </div>
    </div>
  )
}
function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
