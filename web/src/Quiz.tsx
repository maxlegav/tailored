import { useState } from 'react'
import { Chess } from 'chess.js'
import type { Opening } from './types'
import Board from './Board'
import { describe } from './AnalysisBoard'
import { uciOf } from './lib/chess'
import { grade, load } from './srs'
import { dayKey, mark } from './progress'

export type Q = { id: string; fen: string; ucis: string[]; color: 'white' | 'black'; prefix: string; title: string; text: string; trap: boolean }

const key = (fen: string) => fen.split(' ').slice(0, 4).join(' ')
function walk(line: string) {
  const c = new Chess(); const out: { fen: string; san: string; uci: string }[] = []
  for (const s of line.split(' ').filter(Boolean)) {
    const fen = c.fen()
    try { const m = c.move(s); out.push({ fen, san: m.san, uci: m.from + m.to + (m.promotion || '') }) } catch { break }
  }
  return out
}
const moves = (sans: string[]) => sans.map((s, i) => i % 2 === 0 ? `${i / 2 + 1}.${s}` : s).join(' ')

/** Max-to-move positions of an opening's lines. keyOnly: only from where each line splits from the others (traps). */
export function questions(o: Opening, all: Opening[], keyOnly = false): Q[] {
  const lines = [{ line: o.line, title: o.line_title, text: o.line_text, trap: o.id.endsWith('pieges') },
    ...o.ideas.map(d => ({ line: d.line, title: d.title, text: d.text, trap: d.kind.startsWith('Piège') }))]
  const others = all.filter(x => x.color === o.color).flatMap(x => [x.line, ...x.ideas.map(d => d.line)]).map(l => l.split(' ').filter(Boolean))
  const mine = o.color === 'white' ? 0 : 1
  const out = new Map<string, Q>()
  for (const L of lines) {
    const toks = L.line.split(' ').filter(Boolean); const plies = walk(L.line)
    let from = 6
    if (keyOnly) {
      let d = 0
      for (const ot of others) { if (ot.join(' ') === toks.join(' ')) continue; let k = 0; while (k < toks.length && k < ot.length && ot[k] === toks[k]) k++; d = Math.max(d, k) }
      from = d >= plies.length ? plies.length - 2 : d - 2
    }
    plies.forEach((p, i) => {
      if (i % 2 !== mine || i < from) return
      const k = key(p.fen); const q = out.get(k)
      if (q) { if (!q.ucis.includes(p.uci)) q.ucis.push(p.uci); return }
      out.set(k, { id: `q:${k}`, fen: p.fen, ucis: [p.uci], color: o.color, prefix: moves(plies.slice(0, i).map(x => x.san)), title: L.title, text: L.text, trap: L.trap })
    })
  }
  return [...out.values()]
}

function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
function pick(qs: Q[], n: number) {
  const c = load(); const now = Date.now()
  const due = qs.filter(q => c[q.id] && c[q.id].due <= now).sort((a, b) => c[a.id].due - c[b.id].due)
  const fresh = shuffle(qs.filter(q => !c[q.id]))
  const rest = shuffle(qs.filter(q => c[q.id] && c[q.id].due > now)).sort((a, b) => c[a.id].box - c[b.id].box)
  return [...due.slice(0, 3), ...fresh, ...due.slice(3), ...rest].slice(0, n)
}
export const learnedN = (qs: Q[]) => { const c = load(); return qs.filter(q => (c[q.id]?.box ?? 0) >= 1).length }

export default function Quiz({ qs, n = 5, doneKey, onFinish }: { qs: Q[]; n?: number; doneKey: string; onFinish?: () => void }) {
  const [list, setList] = useState(() => pick(qs, n))
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const q = list[i]
  if (!list.length) return <p className="muted">Pas de position à demander dans cette ligne.</p>
  if (!q) return (
    <div className="done"><div className="big">{score}/{list.length}</div>
      <p>Quiz terminé. {learnedN(qs)}/{qs.length} positions de cette sélection déjà réussies. Les positions ratées reviennent demain.</p>
      <button className="btn primary" onClick={() => { setList(pick(qs, n)); setI(0); setScore(0) }}>Encore {n} questions</button></div>)
  return <QuizItem key={q.id + i} q={q} n={i + 1} total={list.length} onDone={ok => {
    setScore(s => s + (ok ? 1 : 0)); setI(i + 1)
    if (i + 1 >= list.length) { mark('series', `${dayKey()}:${doneKey}`, true); onFinish?.() }
  }} />
}

function QuizItem({ q, n, total, onDone }: { q: Q; n: number; total: number; onDone: (ok: boolean) => void }) {
  const [fen, setFen] = useState(q.fen)
  const [last, setLast] = useState<[string, string] | undefined>()
  const [tries, setTries] = useState(0)
  const [msg, setMsg] = useState('')
  const [res, setRes] = useState<{ ok: boolean; san: string; uci: string } | null>(null)
  const side = q.color === 'white' ? 'Blancs' : 'Noirs'
  const reveal = () => {
    const u = q.ucis[0]; const r = uciOf(q.fen, u.slice(0, 2), u.slice(2, 4))!
    setFen(r.fen); setLast([u.slice(0, 2), u.slice(2, 4)]); setRes({ ok: false, san: r.san, uci: u }); grade(q.id, false)
  }
  const tryMove = (from: string, to: string) => {
    if (res) return false
    const r = uciOf(q.fen, from, to); if (!r) return false
    const hit = q.ucis.find(u => u.slice(0, 4) === r.uci.slice(0, 4))
    if (hit) { setFen(r.fen); setLast([from, to]); setRes({ ok: tries === 0, san: r.san, uci: hit }); grade(q.id, tries === 0); return true }
    if (tries >= 1) { reveal(); return false }
    setTries(1); setMsg(`✗ ${r.san} : ce n'est pas le coup de ta ligne. Encore un essai.`); return false
  }
  return (
    <div className="puzzle">
      <div className="pz-board">
        <p className="muted">Question {n}/{total} · tu as les {side}</p>
        <Board fen={fen} orientation={q.color} lastMove={last} onMove={tryMove} />
      </div>
      <div className="pz-side">
        <p className="small muted">{q.title}</p>
        <p>Après <b>{q.prefix || 'le premier coup'}</b></p>
        {!res && <>
          <p><b>Que joues-tu ?</b>{q.trap ? ' Il y a un piège dans cette ligne.' : ''}</p>
          {msg && <p className="verdict bad">{msg}</p>}
          <div className="row"><button onClick={reveal}>Je ne sais pas, montre-moi</button></div>
        </>}
        {res && <>
          <p className={`verdict ${res.ok ? 'good' : 'meh'}`}>{res.ok ? `✓ ${res.san} : c'est ça !` : `Le coup de ta ligne : ${res.san}. Cette position reviendra demain.`}</p>
          <p>{describe(q.fen, res.uci)}</p>
          <div className="explain"><b>{q.title}</b><p>{q.text}</p></div>
          <div className="row"><button className="btn primary" onClick={() => onDone(res.ok)}>Suivant →</button></div>
        </>}
      </div>
    </div>)
}
