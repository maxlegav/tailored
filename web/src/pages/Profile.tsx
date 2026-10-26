import type { Data } from '../types'
import { stats } from '../srs'

const pct = (x: number) => `${Math.round(x * 100)}%`
export default function Profile({ data }: { data: Data }) {
  const s = stats()
  const tags = data.tags.filter(t => t.tag !== 'positionnel').sort((a, b) => b.loss - a.loss)
  const maxLoss = Math.max(...tags.map(t => t.loss))
  const top = tags.slice(0, 3)
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
      <h2>Le plan du coach</h2>
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
