import { useState } from 'react'
import type { Data } from '../types'
import Board from '../Board'

export default function Repertoire({ data }: { data: Data }) {
  const [tab, setTab] = useState<'verdicts' | 'trouble' | 'comfort'>('verdicts')
  const nodes = data.repertoire.filter(r => r.verdict)
  return (
    <div className="page">
      <h1>Ton répertoire</h1>
      <div className="seg">
        <button className={tab === 'verdicts' ? 'on' : ''} onClick={() => setTab('verdicts')}>À corriger ({nodes.length})</button>
        <button className={tab === 'trouble' ? 'on' : ''} onClick={() => setTab('trouble')}>Lignes difficiles</button>
        <button className={tab === 'comfort' ? 'on' : ''} onClick={() => setTab('comfort')}>Tes points forts</button>
      </div>
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
