import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Square } from 'chess.js'
import Board from './Board'
import { analyse, type EngineLine } from './lib/engine'

type Mv = { uci: string; san: string; fen: string; before: string }
type Arrow = { from: string; to: string; color?: string }
type Props = {
  fen: string; line?: string[]; orientation?: 'white' | 'black'; arrows?: Arrow[]
  engineReply?: boolean; showIdeas?: boolean; start?: number; autoplay?: boolean; judge?: boolean
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

const art = (t: string) => (t === 'q' || t === 'r' ? 'sa ' : 'son ') + ({ p: 'pion', n: 'cavalier', b: 'fou', r: 'tour', q: 'dame', k: 'roi' } as Record<string, string>)[t]
function flip(fen: string) { const f = fen.split(' '); f[1] = f[1] === 'w' ? 'b' : 'w'; f[3] = '-'; return f.join(' ') }
function targets(fen: string, sq?: string) {
  try { const t = new Chess(fen); return t.moves({ verbose: true, ...(sq ? { square: sq as Square } : {}) }).filter(x => x.captured && x.captured !== 'k') } catch { return [] }
}
const hanging = (g: Chess, color: 'w' | 'b') => {
  const out: string[] = []
  for (const row of g.board()) for (const p of row) if (p && p.color === color && p.type !== 'k' && g.isAttacked(p.square, color === 'w' ? 'b' : 'w') && !g.isAttacked(p.square, color)) out.push(p.square)
  return out
}
export function describe(before: string, uci: string): string {
  try {
    const g0 = new Chess(before); const g = new Chess(before); const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' })
    const who = NAME[m.piece]; const parts: string[] = []; const me = m.color; const opp = me === 'w' ? 'b' : 'w'
    if (m.san.startsWith('O-O')) parts.push(m.san === 'O-O' ? 'petit roque : le roi se met à l\'abri et la tour entre en jeu' : 'grand roque : le roi part à l\'abri et la tour arrive tout de suite sur la colonne d')
    else if (m.captured) parts.push(`${who} prend ${NAME[m.captured]} en ${m.to}${!g.isAttacked(m.to as Square, opp) ? ' (personne ne peut reprendre)' : ''}`)
    else parts.push(`${who} va en ${m.to}`)
    if (m.promotion) parts.push(`et se transforme en ${NAME[m.promotion]}`)
    if (g.isCheckmate()) return parts.join(' ') + ', échec et mat'
    if (g.inCheck()) parts.push('avec échec')
    const why: string[] = []
    const mine = flip(g.fen())
    const hits = targets(mine, m.to).filter(x => VAL[x.captured!] > VAL[m.piece] || !g.isAttacked(x.to as Square, opp))
    if (hits.length) why.push(`attaque ${hits.map(h => `${art(h.captured!)} en ${h.to}`).join(' et ')}${hits.length > 1 ? ' : double attaque, il ne peut pas tout sauver' : ''}`)
    const was = new Set(targets(flip(before)).filter(x => x.from !== m.from).map(x => x.to))
    const disc = targets(mine).filter(x => x.from !== m.to && !was.has(x.to) && (VAL[x.captured!] > VAL[g.get(x.from as Square)!.type] || !g.isAttacked(x.to as Square, opp)))
    if (disc.length) why.push(`ouvre la ligne de ${NAME[g.get(disc[0].from as Square)!.type]} ${disc[0].from}, qui attaque maintenant ${art(disc[0].captured!)} en ${disc[0].to}`)
    if (g0.isAttacked(m.from as Square, opp) && !m.captured && !g.isAttacked(m.to as Square, opp) && m.piece !== 'p') why.push(`${who} était attaqué${m.piece === 'q' || m.piece === 'r' ? 'e' : ''} et se met à l'abri`)
    const h0 = hanging(g0, me).filter(x => x !== m.from); const h1 = new Set(hanging(g, me))
    const saved = h0.filter(x => !h1.has(x))
    if (saved.length && !g.inCheck()) why.push(`protège ${saved.map(x => `${NAME[g.get(x as Square)!.type]} ${x}`).join(' et ')}, qui n'était pas défendu`)
    if (g0.inCheck()) why.push('pare l\'échec')
    else {
      const bad = (fen: string, g1: Chess) => targets(fen).filter(x => VAL[x.captured!] > VAL[g1.get(x.from as Square)!.type] || !g1.isAttacked(x.to as Square, opp === 'w' ? 'b' : 'w'))
      const t0 = bad(g0.turn() === opp ? before : flip(before), g0).filter(x => x.to !== m.from)
      const t1 = new Set(bad(g.fen(), g).map(x => x.to))
      const gone = t0.filter(x => !t1.has(x.to) && !saved.includes(x.to))
      if (gone.length) why.push(`pare la menace : sans ce coup, il prenait ${NAME[g0.get(gone[0].to as Square)!.type]} en ${gone[0].to}`)
    }
    if (m.piece === 'p' && !m.captured) {
      const pawnHits = targets(mine, m.to).filter(x => x.captured === 'p')
      if (pawnHits.length && !hits.length) why.push(`attaque le pion ${pawnHits[0].to} : c'est une rupture qui ouvre des lignes`)
      else if ('de'.includes(m.to[0]) && !hits.length) why.push('prend de l\'espace au centre')
      else if (!hits.length && (me === 'w' ? Number(m.to[1]) >= 5 : Number(m.to[1]) <= 4)) why.push('gagne de l\'espace et fixe ses pions')
    }
    if (m.piece === 'k' && !m.san.startsWith('O-O') && g.board().flat().filter(Boolean).length <= 14) why.push('le roi s\'active : en finale, c\'est une pièce d\'attaque')
    if (!why.length && m.piece !== 'p' && m.piece !== 'k') {
      const mob = (fen: string, sq: string) => { try { return new Chess(fen).moves({ square: sq as Square }).length } catch { return 0 } }
      const a = mob(flip(g.fen()), m.to); const b0 = mob(g0.turn() === me ? before : flip(before), m.from)
      if (a > b0) why.push(`${who} est plus actif${m.piece === 'q' || m.piece === 'r' ? 'e' : ''} : ${a} cases contrôlées au lieu de ${b0}`)
    }
    if (!m.captured && g.isAttacked(m.to as Square, g.turn()) && !g.isAttacked(m.to as Square, m.color) && m.piece !== 'p') why.push(`attention : ${who} est en prise`)
    return parts.join(' ') + (why.length ? ' : ' + why.join(' ; ') : '')
  } catch { return '' }
}

const cpOf = (l?: EngineLine) => !l ? 0 : l.mate != null ? (l.mate > 0 ? 10000 - l.mate * 10 : -10000 - l.mate * 10) : (l.cp ?? 0)

export default function AnalysisBoard({ fen, line = [], orientation = 'white', arrows = [], engineReply, showIdeas = true, start = 0, autoplay, judge = true, onChange, onUserMove }: Props) {
  const orig = useMemo(() => build(fen, line), [fen, line])
  const [moves, setMoves] = useState<Mv[]>(orig)
  const [idx, setIdx] = useState(start)
  const [playing, setPlaying] = useState(false)
  const [thinking, setThinking] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const box = useRef<HTMLDivElement>(null)
  const [engineOn, setEngineOn] = useState(() => localStorage.getItem('tailored-evalbar') !== '0')
  const [ev, setEv] = useState<{ fen: string; cp: number; txt: string; best?: string } | null>(null)
  const req = useRef(0)
  const [verdict, setVerdict] = useState<{ ok: 'good' | 'meh' | 'bad'; s: string } | null>(null)
  useEffect(() => {
    if (!autoplay || !box.current) return
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { setIdx(0); setPlaying(true); io.disconnect() } }, { threshold: 0.6 })
    io.observe(box.current); return () => io.disconnect()
  }, [autoplay])
  const cur = idx === 0 ? fen : moves[idx - 1].fen
  useEffect(() => {
    if (!engineOn) return
    const id = ++req.current
    const t = window.setTimeout(() => {
      const g = new Chess(cur)
      if (g.isGameOver()) { const cp = g.isCheckmate() ? (g.turn() === 'w' ? -10000 : 10000) : 0; setEv({ fen: cur, cp, txt: g.isCheckmate() ? 'Mat' : '0,0' }); return }
      analyse(cur, { depth: 12 }).then(ls => {
        if (id !== req.current || !ls[0]) return
        const l = ls[0]; const sgn = g.turn() === 'w' ? 1 : -1
        const cp = sgn * cpOf(l)
        const txt = l.mate != null ? `M${Math.abs(l.mate)}` : `${cp > 0 ? '+' : ''}${(cp / 100).toFixed(1).replace('.', ',')}`
        setEv({ fen: cur, cp, txt, best: l.pv[0] ? build(cur, [l.pv[0]])[0]?.san : undefined })
      })
    }, 250)
    return () => window.clearTimeout(t)
  }, [cur, engineOn])
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
    const expected = moves[idx]
    if (expected?.uci.slice(0, 4) === uci.slice(0, 4)) { setIdx(idx + 1); setVerdict(judge ? { ok: 'good', s: `✓ ${m.san} : c'est le coup de la ligne.` } : null); return true }
    const list = push(moves, idx, cur, uci)
    if (!list) return true
    const before = cur; const san = m.san
    setVerdict(null)
    if (judge || engineReply) {
      setThinking(true)
      ;(async () => {
        const b0 = judge ? (await analyse(before, { movetime: 500 }))[0] : undefined
        const ls = g.isGameOver() ? [] : await analyse(g.fen(), { movetime: 600 })
        if (judge) {
          const after = g.isCheckmate() ? 10000 : -cpOf(ls[0])
          const loss = cpOf(b0) - after
          const best = b0?.pv[0] ? build(before, [b0.pv[0]])[0]?.san : undefined
          const alt = expected ? expected.san : best
          setVerdict(loss > 150 ? { ok: 'bad', s: `✗ ${san} est une erreur : tu perds environ ${(loss / 100).toFixed(1).replace('.', ',')} pion${loss >= 200 ? 's' : ''}.${alt ? ` Le bon coup était ${alt}.` : ''} Reviens en arrière (◀) et réessaie.` }
            : loss > 60 ? { ok: 'meh', s: `?! ${san} est imprécis.${alt ? ` Mieux : ${alt}.` : ''}` }
            : { ok: 'good', s: `✓ ${san} est un bon coup${expected ? `, aussi bon que ${expected.san}` : ''}.` })
        }
        const u = ls[0]?.pv[0]
        if (engineReply && u) push(list, list.length, g.fen(), u)
        setThinking(false)
      })()
    }
    return true
  }
  const last = idx > 0 ? moves[idx - 1] : undefined
  const next = moves[idx]
  const arr = [...(idx === 0 ? arrows : []), ...(next && !playing ? [{ from: next.uci.slice(0, 2), to: next.uci.slice(2, 4), color: 'rgba(0,140,220,0.7)' }] : [])]
  const changed = moves.length !== orig.length || moves.some((m, i) => m.uci !== orig[i]?.uci)
  const n0 = Number(fen.split(' ')[5]) || 1; const white0 = fen.split(' ')[1] === 'w'
  return (
    <div className="ab" ref={box}>
      <div className="ab-wrap">
        {engineOn && <div className={`evalbar${orientation === 'black' ? ' flip' : ''}`} title="Évaluation Stockfish">
          <div className="ev-w" style={{ height: `${ev ? Math.round(100 / (1 + Math.exp(-ev.cp / 250))) : 50}%` }} />
          <span className={`ev-t${(ev?.cp ?? 0) >= 0 ? ' w' : ''}`}>{ev?.txt ?? '…'}</span>
        </div>}
        <Board fen={cur} orientation={orientation} arrows={arr} lastMove={last ? [last.uci.slice(0, 2), last.uci.slice(2, 4)] : undefined} onMove={userMove} />
      </div>
      <div className="ab-ctl">
        <button onClick={() => { setPlaying(false); setIdx(0) }} aria-label="Début">|◀</button>
        <button onClick={() => { setPlaying(false); setIdx(i => Math.max(0, i - 1)) }} aria-label="Précédent">◀</button>
        <button className="primary" onClick={() => { if (idx >= moves.length) setIdx(0); setPlaying(p => !p) }}>{playing ? '❚❚' : '▶ Jouer'}</button>
        <button onClick={() => { setPlaying(false); setIdx(i => Math.min(moves.length, i + 1)) }} aria-label="Suivant">▶</button>
        <button onClick={() => { setPlaying(false); setIdx(moves.length) }} aria-label="Fin">▶|</button>
        <button className="eng" onClick={() => { localStorage.setItem('tailored-evalbar', engineOn ? '0' : '1'); setEngineOn(!engineOn) }} aria-label="Moteur">⚙ {engineOn ? 'Moteur' : 'Moteur off'}</button>
        {changed && <button onClick={() => { setPlaying(false); setMoves(orig); setIdx(0) }}>↺ Ligne d'origine</button>}
      </div>
      {engineOn && ev?.best && ev.fen === cur && <p className="small muted">Moteur : {ev.txt} · meilleur coup {ev.best}</p>}
      {thinking && <p className="small muted">Le moteur réfléchit…</p>}
      {verdict && <p className={`verdict ${verdict.ok}`}>{verdict.s}</p>}
      {showIdeas && last && <p className="ab-idea"><b>{last.san}</b> : {describe(last.before, last.uci)}</p>}
      {moves.length > 0 && <div className="ab-moves">{moves.map((m, i) => {
        const ply = i + (white0 ? 0 : 1); const num = ply % 2 === 0 ? `${n0 + ply / 2}.` : i === 0 ? `${n0}…` : ''
        return <span key={i} className={i === idx - 1 ? 'on' : i >= orig.length || m.uci !== orig[i]?.uci ? 'mine' : ''} onClick={() => { setPlaying(false); setIdx(i + 1) }}>{num}{m.san} </span>
      })}</div>}
    </div>
  )
}
