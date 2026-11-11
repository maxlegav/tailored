import { useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { useSearchParams } from 'react-router-dom'
import type { BookEx, Data, Mistake } from '../types'
import BookBox, { conceptsFor } from '../BookBox'
import Board from '../Board'
import Coach from '../Coach'
import { Md } from '../md'
import { dueIds, grade } from '../srs'
import AnalysisBoard, { describe } from '../AnalysisBoard'
import { pieceList, sanLine, uciOf } from '../lib/chess'
import { dayKey, mark } from '../progress'

const KINDS: Record<string, string> = {
  semaine: 'Exos de la semaine (tes parties des 7 derniers jours)', prio: 'Priorités : habitudes et compréhension', all: 'Toutes les positions',
  habitude: 'Habitudes à corriger', comprehension: 'Compréhension / plans', accident: 'Accidents (pièces en prise)', zeitnot: 'Zeitnot (< 20 s)',
  livre: 'Exercices du livre de Silman',
}
const WHY: Record<string, string> = {
  semaine: 'Les positions de tes parties de cette semaine où tu as raté un coup à ta portée. Elles changent à chaque mise à jour du lundi.',
  prio: 'Les positions de tes parties où tu as raté un coup à ta portée, par habitude ou par manque de plan. C\'est là que tu gagnes le plus de points.',
  all: 'Toutes les positions de tes parties où tu as fait une grosse erreur.',
  habitude: 'Les positions où tu refais le même mauvais coup. Le but : remplacer le réflexe par le bon coup.',
  comprehension: 'Les positions où tu avais le temps mais pas le bon plan. Lis bien le « but de la position » après chaque coup.',
  accident: 'Les positions où tu as laissé une pièce ou raté une menace simple.',
  zeitnot: 'Les positions jouées avec moins de 20 s. Le but : le coup simple et sûr.',
  livre: 'Les exercices du livre de Silman, à résoudre comme dans le livre.',
}
export const KIND_LABEL: Record<string, string> = { habitude: 'Habitude', comprehension: 'Compréhension', accident: 'Accident', zeitnot: 'Zeitnot' }

export default function Train({ data }: { data: Data }) {
  const [params] = useSearchParams()
  const [tag, setTag] = useState<string>(params.get('tag') || '')
  const [kind, setKind] = useState<string>(params.get('kind') || 'prio')
  const [silman, setSilman] = useState<string>(params.get('silman') || '')
  const [onlyFindable, setOnlyFindable] = useState(true)
  const [withObvious, setWithObvious] = useState(false)
  useEffect(() => { setTag(params.get('tag') || ''); setKind(params.get('kind') || 'prio'); setSilman(params.get('silman') || '') }, [params])
  const bookEx = useMemo(() => (data.book_ex || []).map(e => fromBook(e, data)), [data])
  const pool = useMemo(() => kind === 'livre' ? bookEx.filter(m => !silman || m.tags.includes(silman)) : data.mistakes.filter(m => (!tag || m.tags.includes(tag)) && (!onlyFindable || m.findable)
    && (!silman || !data.book || conceptsFor(m, data.book, 3).includes(silman)) && (withObvious || !obvious(m))
    && (kind === 'all' || (kind === 'semaine' ? m.date > data.generated - 7 * 86400 : kind === 'prio' ? m.kind === 'habitude' || m.kind === 'comprehension' : m.kind === kind))), [data, tag, onlyFindable, kind, silman, bookEx, withObvious])
  const all = kind === 'livre' ? bookEx : data.mistakes
  const [queue, setQueue] = useState<string[]>([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const start = () => {
    const recent = pool.filter(m => m.date > data.generated - 7 * 86400)
    const ids = [...shuffle(recent), ...shuffle(pool.filter(m => !recent.includes(m)))].map(m => m.id)
    setQueue(dueIds(ids, 10)); setIdx(0); setScore(0)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(start, [pool])
  const cur = queue[idx] ? all.find(m => m.id === queue[idx]) : undefined
  return (
    <div className="page">
      <h1>Entraînement</h1>
      <div className="goal"><div className="goal-h">Ce que tu travailles : {[KINDS[kind], tag && (data.tags.find(t => t.tag === tag)?.label || tag), silman && data.book?.concepts[silman]?.title].filter(Boolean).join(' · ')}</div>
        {WHY[kind] || WHY.prio} {pool.length} positions dans cette sélection. Comment faire : trouve le coup sur l'échiquier. Si c'est faux, tu réessaies autant que tu veux ; « Montre-moi le coup » si tu bloques. À la fin, l'explication. Une série = 10 positions. Celles que tu rates reviennent demain, celles que tu trouves reviennent de plus en plus tard.</div>
      <details className="filters"><summary>Changer de thème</summary>
      <div className="controls">
        <select value={kind} onChange={e => setKind(e.target.value)}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <select value={tag} onChange={e => setTag(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {data.tags.map(t => <option key={t.tag} value={t.tag}>{t.label} ({t.n})</option>)}
        </select>
        {data.book && <select value={silman} onChange={e => setSilman(e.target.value)}>
          <option value="">Tous les thèmes de {data.book.book.short}</option>
          {Object.entries(data.book.concepts).map(([k, c]) => <option key={k} value={k}>{data.book!.book.short} : {c.title}</option>)}
        </select>}
        <label><input type="checkbox" checked={withObvious} onChange={e => setWithObvious(e.target.checked)} /> Inclure les coups évidents (prises, gaffes à punir)</label>
        <label><input type="checkbox" checked={onlyFindable} onChange={e => setOnlyFindable(e.target.checked)} /> Seulement les coups à ma portée</label>
        <button onClick={start}>Nouvelle série ({Math.min(10, pool.length)})</button>
      </div>
      </details>
      {cur && <Puzzle key={cur.id} m={cur} book={data} onDone={ok => { setScore(s => s + (ok ? 1 : 0)); setIdx(i => i + 1) }} n={idx + 1} total={queue.length} />}
      {pool.length === 0 && <p className="done">Aucune position pour ce filtre.</p>}
      {queue.length > 0 && !cur && <SeriesDone kind={kind} />}
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

type Step = { before: string; uci: string; san: string; after: string; num: string; forcing: boolean }
function solution(m: Mistake): Step[] {
  const g = new Chess(m.fen); const out: Step[] = []
  for (const u of m.best_pv.slice(0, 5)) {
    const before = g.fen(); const no = g.moveNumber(); const w = g.turn() === 'w'
    let mv; try { mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }) } catch { break }
    out.push({ before, uci: u, san: mv.san, after: g.fen(), num: w ? `${no}.` : `${no}…`, forcing: !!mv.captured || g.inCheck() })
  }
  // keep asking for the next move only while the line is forcing (captures, checks), like a puzzle
  let n = 1
  while (n + 1 < out.length && (out[n - 1].forcing || out[n].forcing)) n += 2
  return out.slice(0, n)
}
const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
function material(fen: string, me: 'w' | 'b') {
  let s = 0; for (const row of new Chess(fen).board()) for (const p of row) if (p) s += (p.color === me ? 1 : -1) * VAL[p.type]
  return s
}
function bilan(m: Mistake, me: 'w' | 'b') {
  const g = new Chess(m.fen)
  for (const u of m.best_pv) { try { g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }) } catch { break } }
  if (g.isCheckmate()) return 'La ligne finit par un mat.'
  const d = material(g.fen(), me) - material(m.fen, me)
  if (d >= 1) return `Bilan de la ligne : tu gagnes ${d >= 9 ? 'la dame' : d >= 5 ? 'une tour' : d >= 3 ? 'une pièce' : d === 2 ? 'deux pions' : 'un pion'} (+${d}).`
  if (d <= -1) return `Bilan de la ligne : tu rends ${-d} point${d < -1 ? 's' : ''} de matériel, mais ta position compense (sinon le moteur ne le jouerait pas).`
  return 'Bilan de la ligne : le matériel reste égal, tu gagnes en position.'
}
const cleanGoal = (g?: string) => g?.replace(/ \S+ prépare la suite [^]*?\.(?=\s|$)/, '').trim()

function Puzzle({ m, book, onDone, n, total }: { m: Mistake; book: Data; onDone: (ok: boolean) => void; n: number; total: number }) {
  const isBook = m.id.startsWith('silman-')
  const steps = useMemo(() => solution(m), [m])
  const [ply, setPly] = useState(0)
  const [fen, setFen] = useState(m.fen)
  const [last, setLast] = useState<[string, string] | undefined>()
  const [msg, setMsg] = useState<{ c: 'good' | 'bad' | 'meh' | 'info'; s: string } | null>(null)
  const [errors, setErrors] = useState(0)
  const [helped, setHelped] = useState(false)
  const [hint, setHint] = useState(false)
  const [done, setDone] = useState(false)
  const graded = useRef(false)
  const me = m.color === 'white' ? 'w' : 'b'
  const finish = (clean: boolean) => { setDone(true); if (!graded.current) { graded.current = true; grade(m.id, clean) } }
  const advance = (k: number, clean: boolean) => {
    const st = steps[k]; setFen(st.after); setLast([st.uci.slice(0, 2), st.uci.slice(2, 4)]); setHint(false)
    if (k + 1 >= steps.length) { setPly(k + 1); finish(clean); return }
    setPly(k + 1)
    window.setTimeout(() => {
      const r = steps[k + 1]; setFen(r.after); setLast([r.uci.slice(0, 2), r.uci.slice(2, 4)]); setPly(k + 2)
      if (k + 2 >= steps.length) finish(clean)
    }, 600)
  }
  const tryMove = (from: string, to: string) => {
    if (done || ply % 2 === 1) return false
    const r = uciOf(fen, from, to); if (!r) return false
    const exp = steps[ply]; const u = r.uci.slice(0, 4)
    if (u === exp.uci.slice(0, 4) || (ply === 0 && u === m.best.slice(0, 4))) {
      const left = (steps.length - ply - 1) / 2
      setMsg({ c: 'good', s: `✓ ${r.san} !${left ? ` L'adversaire répond. Trouve le coup suivant (encore ${left}).` : ''}` })
      advance(ply, errors === 0 && !helped); return true
    }
    if (ply === 0 && m.good.some(g => g.slice(0, 4) === u)) { setMsg({ c: 'meh', s: `${r.san} n'est pas mauvais, mais il y a plus fort. Cherche encore.` }); return false }
    setErrors(e => e + 1)
    setMsg({ c: 'bad', s: ply === 0 && !isBook && u === m.uci.slice(0, 4) ? `✗ ${r.san}, c'est le coup de la partie : ${m.refutation_san}. Réessaie.` : `✗ ${r.san} : non. Réessaie.` })
    return false
  }
  const show = () => { const st = steps[ply]; setHelped(true); setMsg({ c: 'info', s: `Le coup était ${st.san}.${ply + 1 < steps.length ? ' Trouve le suivant.' : ''}` }); advance(ply, false) }
  const side = m.color === 'white' ? 'Blancs' : 'Noirs'
  const red = m.uci && !isBook ? [{ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), color: 'rgba(200,60,60,0.75)' }] : []
  const clean = errors === 0 && !helped
  const mineN = (steps.length + 1) / 2
  return (
    <div className="puzzle">
      <div className="pz-board">
        <p className="muted">{n}/{total} · {isBook ? m.phase : `${m.phase} · coup ${m.move_no}`} · tu as les {side}{m.clk != null ? ` · ${Math.round(m.clk)} s à la pendule` : ''}</p>
        {done
          ? <AnalysisBoard fen={m.fen} line={m.best_pv} orientation={m.color} engineReply arrows={red} />
          : <Board fen={fen} orientation={m.color} lastMove={last} onMove={tryMove} highlight={hint ? { [steps[ply].uci.slice(0, 2)]: 'rgba(0,140,220,0.45)' } : {}} />}
        {done && <p className="small muted">Revois la ligne avec ▶. Tu peux aussi essayer d'autres coups : le moteur te dit si c'est bon ou pas.</p>}
      </div>
      <div className="pz-side">
        {!done && <>
          <p>{isBook ? `Trait aux ${side}. Liste les déséquilibres, puis cherche le coup qui en profite.` : <>Trait aux {side}. Dans la partie, tu avais joué <b>{m.san}</b>. Trouve mieux.</>}{mineN > 1 && ` Il y a ${mineN} coups à trouver : l'adversaire répond entre chaque.`}</p>
          {msg && <p className={`verdict ${msg.c}`}>{msg.s}</p>}
          <div className="row">
            {!hint && <button onClick={() => { setHint(true); setHelped(true) }}>Indice : la pièce à jouer</button>}
            <button onClick={show}>Montre-moi le coup</button>
          </div>
        </>}
        {done && <>
          <p className={`verdict ${clean ? 'good' : 'meh'}`}>{clean ? 'Résolu sans erreur !' : `Résolu${errors ? ` avec ${errors} erreur${errors > 1 ? 's' : ''}` : ''}${helped ? ' avec de l\'aide' : ''}. Cette position reviendra demain.`}</p>
          <div className="goal"><div className="goal-h">Pourquoi ça marche</div>
            <ol className="whyline">{steps.map((st, i) => <li key={i} className={i % 2 ? 'opp' : ''}><b>{st.num}{st.san}</b> : {describe(st.before, st.uci)}{i % 2 ? ' (réponse de l\'adversaire)' : ''}</li>)}</ol>
            <p>{bilan(m, me)}{!isBook && ` Avec la bonne suite, tes chances de gain restent à ${Math.round(m.wp_before)} %. Après ${m.san} dans la partie, elles tombent à ${Math.round(m.wp_after)} %.`}</p>
            {cleanGoal(m.goal) && <Md text={cleanGoal(m.goal)!} />}
          </div>
          <div className="explain"><Md text={m.text} />{!isBook && <><p className="muted">Ce qui s'est passé : {m.refutation_san}</p>
            <p className="small"><a href={m.url} target="_blank">Voir la partie sur chess.com</a></p></>}</div>
          <BookBox m={m} book={book.book} />
          <div className="row"><button className="btn primary" onClick={() => onDone(clean)}>Suivant →</button></div>
          <Coach context={context(m, null)} fen={m.fen} pov={me}
            suggestions={['Quel est le plan ici ?', `Pourquoi ${m.best_san} ?`, ...(isBook ? ['Quels sont les déséquilibres ?'] : [`Pourquoi ${m.san} était mauvais ?`])]} />
        </>}
      </div>
    </div>
  )
}
export function obvious(m: Mistake) {
  const p = m.p_best_human ?? 0
  return p >= 0.6 || (/[x+#]/.test(m.best_san) && p >= 0.25) || m.tags.includes('mat_manqué')
}
function fromBook(e: BookEx, data: Data): Mistake {
  const c = e.concept && data.book?.concepts[e.concept]
  const pv = sanLine(e.fen, e.best_pv, 6)
  const best = e.book_uci || e.best_pv[0]
  const ex = e.n ? `Exercice ${e.ch}.${e.n} du livre (énoncé p. ${e.ex_page})` : `Exercice du chapitre ${e.ch}`
  const sol = e.sol_exact ? `solution p. ${e.page}` : `solutions du chapitre à partir de la p. ${e.page}`
  const text = e.book_move
    ? `${ex}, ${sol}. Le coup de Silman : **${e.book_move}**.${e.best_san !== e.book_move ? ` Stockfish propose aussi ${e.best_san} (${pv}).` : ` Suite du moteur : ${pv}.`}`
    : `${ex}, ${sol}. Le coup du moteur : **${e.best_san}** (${pv}). Silman explique l'idée en mots dans sa solution : compare avec ton raisonnement.`
  return {
    id: e.id, fen: e.fen, san: '', uci: best, best, best_san: e.book_move || e.best_san, good: e.good, loss: 0, sev: '',
    phase: `Silman ${e.n ? `${e.ch}.${e.n}` : `ch. ${e.ch}`}, ${e.chapter}${e.level ? ` · niveau ${e.level}` : ''}`,
    tags: e.concept ? [e.concept] : [], url: '', date: 0, color: e.color, move_no: Number(e.fen.split(' ')[5]), wp_before: 50, wp_after: 50, best_pv: e.best_pv, refutation_san: '',
    text, goal: c ? `${c.title} : ${c.question}` : undefined,
  }
}
function shuffle<T>(a: T[]) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
function SeriesDone({ kind }: { kind: string }) {
  useEffect(() => { mark('series', `${dayKey()}:${kind}`, true) }, [kind])
  return null
}
