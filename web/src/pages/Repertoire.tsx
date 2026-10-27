import { useState } from 'react'
import type { Data } from '../types'
import Board from '../Board'
import LinePlayer from '../LinePlayer'
import RepTree, { fixes } from '../RepTree'
import type { Opening } from '../types'

export default function Repertoire({ data }: { data: Data }) {
  const [tab, setTab] = useState<'tree' | 'plans' | 'verdicts' | 'trouble' | 'comfort'>(data.tree ? 'tree' : 'plans')
  const [focus, setFocus] = useState<string | null>(null)
  const fx = data.tree ? fixes(data.tree) : []
  const [init, setInit] = useState<{ color: 'white' | 'black'; path: number[] } | undefined>()
  return (
    <div className="page">
      <h1>Ton répertoire</h1>
      <div className="seg">
        {data.tree && <button className={tab === 'tree' ? 'on' : ''} onClick={() => setTab('tree')}>Ton arbre</button>}
        <button className={tab === 'plans' ? 'on' : ''} onClick={() => { setFocus(null); setTab('plans') }}>Plans ({data.openings?.length ?? 0})</button>
        <button className={tab === 'verdicts' ? 'on' : ''} onClick={() => setTab('verdicts')}>À corriger ({fx.length})</button>
        <button className={tab === 'trouble' ? 'on' : ''} onClick={() => setTab('trouble')}>Lignes difficiles</button>
        <button className={tab === 'comfort' ? 'on' : ''} onClick={() => setTab('comfort')}>Tes points forts</button>
      </div>
      {tab === 'tree' && data.tree && <><p className="muted">Ton répertoire tel que tu le joues vraiment, tiré de tes parties. Touche un coup (ou joue-le sur l'échiquier) pour descendre dans l'arbre.</p>
        <RepTree key={init ? init.color + init.path.join('.') : 'root'} init={init} tree={data.tree} onPlan={id => { setFocus(id); setTab('plans') }} /></>}
      {tab === 'plans' && <>
        <p className="muted">Les lignes choisies à partir de tes parties : ce que tu joues, ce qu'on change, et surtout le plan. Appuie sur ▶ pour voir la suite. Évaluations vérifiées par Stockfish, de ton point de vue.</p>
        {(data.openings || []).filter(o => !focus || o.id === focus).map(o => <OpeningCard key={o.id} o={o} />)}
        {focus && <button className="btn" onClick={() => setFocus(null)}>Voir tous les plans</button>}</>}
      {tab === 'verdicts' && <><p className="muted">Les coups de ton arbre qui te coûtent vraiment des points, du plus coûteux au moins coûteux. Les coups « d'idée » qui te réussissent ne sont pas ici : on les garde.</p>
        {fx.map(f => {
          const moves = f.line.map((s, i) => (f.color === 'white' ? i % 2 === 0 : i % 2 === 1) && i === f.line.length - 1 ? `[${s}]` : s)
          return (
            <div key={f.color + f.path.join('.')} className="fix">
              <div className="small muted">{f.color === 'white' ? 'Avec les Blancs' : 'Avec les Noirs'}</div>
              <p><b>{moves.join(' ')}</b></p>
              <p>Tu joues <b>{f.node.san}</b> ({f.node.n} parties, {Math.round(f.node.score * 100)} % de points) et tu y perds en moyenne {f.node.loss} % de chances de gain.
                {f.node.verdict === 'bad' ? <> À la place : <b>{f.parent.best}</b>.</> : <> Il te réussit encore, mais il ne tient que si l'adversaire se trompe. L'alternative sûre : <b>{f.parent.best}</b>.</>}</p>
              <button className="btn" onClick={() => { setInit({ color: f.color, path: f.path.slice(0, -1) }); setTab('tree') }}>Voir dans l'arbre et comparer</button>
            </div>)
        })}</>}
      {(tab === 'trouble' || tab === 'comfort') && (tab === 'trouble' ? data.trouble : data.comfort).map(l => (
        <div key={l.fen} className="item">
          <Board fen={l.fen} orientation={l.fen.split(' ')[1] === 'b' ? 'black' : 'white'} />
          <div><p><b>{l.line}</b></p><p>{l.n} parties, {Math.round(l.score * 100)}% de points.</p></div>
        </div>))}
    </div>
  )
}

const fmt = (e?: number) => e == null ? '' : `${e > 0 ? '+' : ''}${e.toFixed(1)}`

export function OpeningCard({ o }: { o: Opening }) {
  const [k, setK] = useState(-1)
  const idea = k >= 0 ? o.ideas[k] : null
  return (
    <div className="opening">
      <div><LinePlayer key={idea ? idea.line : o.line} line={idea ? idea.line : o.line} orientation={o.color} /></div>
      <div>
        <h3>{o.title}</h3>
        <p className="small">{o.color === 'white' ? 'Avec les Blancs' : 'Avec les Noirs'} · {o.stats}</p>
        <div className="choice"><div><span className="small">Tu joues</span><br /><b>{o.yours}</b></div><div className="rec"><span className="small">À la place</span><br /><b>{o.rec}</b></div></div>
        <p>{o.why}</p>
        <div className="goal"><div className="goal-h">Le plan</div><ol className="plan-list">{o.plan.map((p, i) => <li key={i}>{p}</li>)}</ol></div>
        <div className="ideas">
          <button className={k < 0 ? 'on' : ''} onClick={() => setK(-1)}>{o.line_title}</button>
          {o.ideas.map((d, i) => <button key={i} className={k === i ? 'on' : ''} onClick={() => setK(i)}>{d.kind} : {d.title}</button>)}
        </div>
        <div className={idea && idea.kind.startsWith('Piège') ? 'trap' : 'explain'} style={{ paddingTop: 10 }}>
          <b>{idea ? idea.title : o.line_title}</b><span className="evalchip">{fmt(idea ? idea.eval : o.line_eval)}</span>
          <p>{idea ? idea.text : o.line_text}</p>
        </div>
      </div>
    </div>
  )
}
