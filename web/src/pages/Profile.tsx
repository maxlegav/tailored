import type { Data } from '../types'
import { useState } from 'react'
import { stats } from '../srs'
import { isClosed, loadDB, mark } from '../progress'

const pct = (x: number) => `${Math.round(x * 100)}%`
export default function Profile({ data }: { data: Data }) {
  const s = stats()
  const tags = data.tags.filter(t => t.tag !== 'positionnel').sort((a, b) => b.loss - a.loss)
  const maxLoss = Math.max(...tags.map(t => t.loss))
  const top = [...tags].sort((a, b) => (b.core_loss ?? b.loss) - (a.core_loss ?? a.loss)).slice(0, 3)
  const k = data.kinds || {}
  const [db, setDb] = useState(loadDB)
  const hd = (ids: string[]) => ids.map(i => data.mistakes.find(m => m.id === i)?.date || 0)
  const allH = (data.habits || []).filter(h => h.n >= 2)
  const habits = allH.filter(h => !isClosed(db.habits[h.ids[0]], hd(h.ids))).slice(0, 5)
  const fixedN = allH.length - allH.filter(h => !isClosed(db.habits[h.ids[0]], hd(h.ids))).length
  const phases = ['ouverture', 'milieu', 'finale'].filter(p => data.phase[p])
  return (
    <div className="page">
      <h1>Ton profil</h1>
      <p className="muted">{data.n_games} dernières parties {data.time_class} de {data.user}</p>
      <div className="cards">
        <div className="card"><div className="big">{pct(data.color.white?.score ?? 0)}</div>avec les Blancs</div>
        <div className="card"><div className="big">{pct(data.color.black?.score ?? 0)}</div>avec les Noirs</div>
        <div className="card"><div className="big">{pct(data.conversion.won / Math.max(1, data.conversion.winning))}</div>des positions gagnantes converties</div>
        <div className="card"><div className="big">{s.mastered}</div>exercices maîtrisés</div>
      </div>
      <h2>Tes erreurs, par type</h2>
      <p className="muted">Toutes les erreurs n'ont pas le même poids. Une pièce laissée en prise ou un coup joué avec 5 s, ça arrive : on travaille un réflexe. Une erreur d'habitude ou de compréhension se répète, et c'est là qu'on gagne des points.</p>
      <div className="kinds">
        {[['habitude', 'Habitudes', "le même mauvais choix, encore et encore"], ['comprehension', 'Compréhension', "plan, structure, avantage gâché, avec le temps de réfléchir"], ['accident', 'Accidents', "pièce en prise, menace pas vue"], ['zeitnot', 'Zeitnot', "moins de 20 s : sauver la pendule d'abord"]].map(([id, l, d]) =>
          <a key={id} className="card" href={`#/entrainement?kind=${id}`}><b>{k[id]?.n ?? 0}</b><span style={{ color: '#fff', fontWeight: 700 }}>{l}</span><br /><span className="small">{d}</span></a>)}
      </div>
      {habits.length > 0 && <><h2>Tes habitudes à corriger</h2>
        <p className="muted">Coche « Corrigé » quand tu as compris : l'habitude disparaît, et revient seulement si tu la rejoues dans une nouvelle partie.{fixedN ? ` ${fixedN} déjà corrigée(s).` : ''}</p>
        {habits.map(h => <div key={h.ids[0]} className="planrow"><span className="rank">{h.n}×</span><a href={`#/entrainement?kind=habitude`} style={{ flex: 1 }}><b>{h.san}</b>, joué {h.n} fois dans la même position<br /><span className="small">s'entraîner sur cette position →</span></a>
          <button onClick={() => setDb(mark('habits', h.ids[0], true))}>✓ Corrigé</button></div>)}</>}
      <h2>Le plan du coach</h2>
      <p className="muted">Les 3 thèmes qui te coûtent le plus, accidents et zeitnot mis de côté.</p>
      <div className="plan">
        {top.map((t, i) => <a key={t.tag} className="planrow" href={`#/entrainement?tag=${encodeURIComponent(t.tag)}`}>
          <span className="rank">{i + 1}</span><span><b>{t.label}</b><br /><span className="small">{t.n} fois dans tes parties · s'entraîner →</span></span></a>)}
      </div>
      <h2>Où tu perds tes points</h2>
      <p className="muted">Classé par coût total (chances de gain perdues). À droite : combien de fois c'est arrivé.</p>
      {tags.map(t => (
        <div key={t.tag} className="barrow"><span>{t.label}</span>
          <div className="bar"><div style={{ width: `${(100 * t.loss) / maxLoss}%` }} /></div><span className="num">{t.n}×</span></div>
      ))}
      <h2>Par phase de jeu</h2>
      <table><thead><tr><th>Phase</th><th>Coups</th><th>Perte moy.</th><th>Grosses erreurs / 100 coups</th></tr></thead>
        <tbody>{phases.map(p => <tr key={p}><td>{p}</td><td>{data.phase[p].moves}</td><td>{data.phase[p].avg_loss}%</td><td>{data.phase[p].per100}</td></tr>)}</tbody></table>
      <h2>Selon ta pendule</h2>
      <table><thead><tr><th>Temps restant</th><th>Coups</th><th>Perte moy. par coup</th></tr></thead>
        <tbody>{['> 60 s', '30-60 s', '10-30 s', '< 10 s'].filter(k => data.clock[k]).map(k => <tr key={k}><td>{k}</td><td>{data.clock[k].moves}</td><td>{data.clock[k].avg_loss}%</td></tr>)}</tbody></table>
      <h2>Trouvable ou pas ?</h2>
      <p>Sur {data.findable.serious} grosses erreurs, <b>{data.findable.findable}</b> concernent un coup qu'un joueur de 1900 trouve régulièrement (modèle Maia). Ce sont celles à travailler en priorité ; les autres sont des coups « de moteur ».</p>
    </div>
  )
}
