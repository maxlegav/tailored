import { useState } from 'react'
import type { Data } from '../types'
import Board from '../Board'
import LinePlayer from '../LinePlayer'
import type { Opening } from '../types'

export default function Repertoire({ data }: { data: Data }) {
  const [tab, setTab] = useState<'plans' | 'verdicts' | 'trouble' | 'comfort'>('plans')
  const nodes = data.repertoire.filter(r => r.verdict)
  return (
    <div className="page">
      <h1>Ton répertoire</h1>
      <div className="seg">
        <button className={tab === 'plans' ? 'on' : ''} onClick={() => setTab('plans')}>Plans ({data.openings?.length ?? 0})</button>
        <button className={tab === 'verdicts' ? 'on' : ''} onClick={() => setTab('verdicts')}>À corriger ({nodes.length})</button>
        <button className={tab === 'trouble' ? 'on' : ''} onClick={() => setTab('trouble')}>Lignes difficiles</button>
        <button className={tab === 'comfort' ? 'on' : ''} onClick={() => setTab('comfort')}>Tes points forts</button>
      </div>
      {tab === 'plans' && <>
        <p className="muted">Les lignes choisies à partir de tes parties : ce que tu joues, ce qu'on change, et surtout le plan. Appuie sur ▶ pour voir la suite. Évaluations vérifiées par Stockfish, de ton point de vue.</p>
        {(data.openings || []).map(o => <OpeningCard key={o.id} o={o} />)}</>}
      {tab === 'verdicts' && nodes.map(r => {
        const black = r.fen.split(' ')[1] === 'b'
        return (
          <div key={r.fen} className="item">
            <Board fen={r.fen} orientation={black ? 'black' : 'white'} />
            <div><p>{r.verdict}</p>
              <table><thead><tr><th>Coup</th><th>Parties</th><th>Points</th><th>Perte moy.</th></tr></thead>
                <tbody>{Object.entries(r.moves).sort((a, b) => b[1].n - a[1].n).map(([m, s]) => <tr key={m} className={m === r.main ? 'main' : ''}><td>{m}{m === r.engine ? ' ★' : ''}</td><td>{s.n}</td><td>{Math.round(s.score * 100)}%</td><td>{s.loss}%</td></tr>)}</tbody></table>
              <p className="muted">★ = choix du moteur{r.engine && !r.moves[r.engine] ? ` (${r.engine}, jamais joué par toi)` : ''}</p></div>
          </div>)
      })}
      {tab !== 'verdicts' && (tab === 'trouble' ? data.trouble : data.comfort).map(l => (
        <div key={l.fen} className="item">
          <Board fen={l.fen} orientation={l.fen.split(' ')[1] === 'b' ? 'black' : 'white'} />
          <div><p><b>{l.line}</b></p><p>{l.n} parties, {Math.round(l.score * 100)}% de points.</p></div>
        </div>))}
    </div>
  )
}

const fmt = (e?: number) => e == null ? '' : `${e > 0 ? '+' : ''}${e.toFixed(1)}`

function OpeningCard({ o }: { o: Opening }) {
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
