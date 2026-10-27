import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import Board from './Board'
import { analyse } from './lib/engine'

type Mv = { uci: string; san: string; fen: string; before: string }
type Arrow = { from: string; to: string; color?: string }
type Props = {
  fen: string; line?: string[]; orientation?: 'white' | 'black'; arrows?: Arrow[]
  engineReply?: boolean; showIdeas?: boolean; start?: number
  onChange?: (fen: string, sans: string[]) => void
  onUserMove?: (from: string, to: string, fen: string) => boolean | void
}
const NAME: Record<string, string> = { p: 'le pion', n: 'le cavalier', b: 'le fou', r: 'la tour', q: 'la dame', k: 'le roi' }
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 }

function build(fen: string, line: string[]): Mv[] {
  const g = new Chess(fen); const out: Mv[] = []
  for (const u of line) {
    const before = g.fen()
    try { const m = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }); out.push({ uci: u, san: m.san, fen: g.fen(), before }) } catch { break }
  }
  return out
}

export function describe(before: string, uci: string): string {
  try {
    const g = new Chess(before); const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' })
    const who = NAME[m.piece]; const parts: string[] = []
    if (m.san.startsWith('O-O')) parts.push(m.san === 'O-O' ? 'petit roque : le roi se met à l\'abri et la tour entre en jeu' : 'grand roque')
    else if (m.captured) parts.push(`${who} prend ${NAME[m.captured]} en ${m.to}`)
    else if (m.piece !== 'p' && m.piece !== 'k' && /[18]/.test(m.from) && Number(before.split(' ')[5]) <= 15) parts.push(`${who} se développe en ${m.to}`)
    else parts.push(`${who} va en ${m.to}`)
    if (m.promotion) parts.push(`et se transforme en ${NAME[m.promotion]}`)
    if (g.isCheckmate()) parts.push('échec et mat')
    else if (g.inCheck()) parts.push('avec échec')
    // threats created by the moved piece
    const f = g.fen().split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'
    try {
      const t = new Chess(f.join(' '))
      const hits = t.moves({ square: m.to as Square, verbose: true }).filter(x => x.captured)
        .filter(x => VAL[x.captured!] > VAL[m.piece] || !g.isAttacked(x.to as Square, g.turn()) || x.captured === 'k')
        .filter(x => x.captured !== 'k')
      if (hits.length) parts.push(`et attaque ${hits.map(h => `${NAME[h.captured!]} ${h.to}`).join(' et ')}${hits.length > 1 ? ' (double attaque)' : ''}`)
    } catch { /* side to move in check: skip threat scan */ }
    if (!m.captured && g.isAttacked(m.to as Square, g.turn()) && !g.isAttacked(m.to as Square, m.color) && m.piece !== 'p') parts.push(`(attention : ${who} est en prise)`)
    return parts.join(' ')
  } catch { return '' }
}

export default function AnalysisBoard({ fen, line = [], orientation = 'white', arrows = [], engineReply, showIdeas = true, start = 0, onChange, onUserMove }: Props) {
  const orig = useMemo(() => build(fen, line), [fen, line])
  const [moves, setMoves] = useState<Mv[]>(orig)
  const [idx, setIdx] = useState(start)
  const [playing, setPlaying] = useState(false)
  const [thinking, setThinking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const cur = idx === 0 ? fen : moves[idx - 1].fen
  useEffect(() => { onChange?.(cur, moves.slice(0, idx).map(m => m.san)) }, [cur]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!playing) return
    if (idx >= moves.length) { setPlaying(false); return }
    timer.current = window.setTimeout(() => setIdx(i => i + 1), 1100)
    return () => window.clearTimeout(timer.current)
  }, [playing, idx, moves.length])
  const push = (base: Mv[], at: number, before: string, uci: string) => {
    const nm = build(before, [uci])[0]; if (!nm) return null
    const list = [...base.slice(0, at), nm]; setMoves(list); setIdx(at + 1); return list
  }
  const userMove = (from: string, to: string) => {
    if (thinking) return false
    const g = new Chess(cur); let m
    try { m = g.move({ from, to, promotion: 'q' }) } catch { return false }
    const uci = from + to + (m.promotion || '')
    if (onUserMove && onUserMove(from, to, g.fen()) === false) return false
    setPlaying(false)
    if (moves[idx]?.uci.slice(0, 4) === uci.slice(0, 4)) { setIdx(idx + 1); return true }
    const list = push(moves, idx, cur, uci)
    if (list && engineReply && !g.isGameOver()) {
      setThinking(true)
      analyse(g.fen(), { movetime: 600 }).then(ls => {
        const u = ls[0]?.pv[0]; if (u) push(list, list.length, g.fen(), u)
        setThinking(false)
      })
    }
    return true
  }
  const last = idx > 0 ? moves[idx - 1] : undefined
  const next = moves[idx]
  const arr = [...(idx === 0 ? arrows : []), ...(next && !playing ? [{ from: next.uci.slice(0, 2), to: next.uci.slice(2, 4), color: 'rgba(0,140,220,0.7)' }] : [])]
  const changed = moves.length !== orig.length || moves.some((m, i) => m.uci !== orig[i]?.uci)
  const n0 = Number(fen.split(' ')[5]) || 1; const white0 = fen.split(' ')[1] === 'w'
  return (
    <div className="ab">
      <Board fen={cur} orientation={orientation} arrows={arr} lastMove={last ? [last.uci.slice(0, 2), last.uci.slice(2, 4)] : undefined} onMove={userMove} />
      <div className="ab-ctl">
        <button onClick={() => { setPlaying(false); setIdx(0) }} aria-label="Début">⏮</button>
        <button onClick={() => { setPlaying(false); setIdx(i => Math.max(0, i - 1)) }} aria-label="Précédent">◀</button>
        <button className="primary" onClick={() => { if (idx >= moves.length) setIdx(0); setPlaying(p => !p) }}>{playing ? '❚❚' : '▶ Jouer'}</button>
        <button onClick={() => { setPlaying(false); setIdx(i => Math.min(moves.length, i + 1)) }} aria-label="Suivant">▶</button>
        <button onClick={() => { setPlaying(false); setIdx(moves.length) }} aria-label="Fin">⏭</button>
        {changed && <button onClick={() => { setPlaying(false); setMoves(orig); setIdx(0) }}>↺ Ligne d'origine</button>}
      </div>
      {thinking && <p className="small muted">Le moteur réfléchit…</p>}
      {showIdeas && last && <p className="ab-idea"><b>{last.san}</b> : {describe(last.before, last.uci)}</p>}
      {moves.length > 0 && <div className="ab-moves">{moves.map((m, i) => {
        const ply = i + (white0 ? 0 : 1); const num = ply % 2 === 0 ? `${n0 + ply / 2}.` : i === 0 ? `${n0}…` : ''
        return <span key={i} className={i === idx - 1 ? 'on' : i >= orig.length || m.uci !== orig[i]?.uci ? 'mine' : ''} onClick={() => { setPlaying(false); setIdx(i + 1) }}>{num}{m.san} </span>
      })}</div>}
    </div>
  )
}
