import type { Data } from '../types'

export default function Games({ data }: { data: Data }) {
  return (
    <div className="page">
      <h1>Tes parties</h1>
      <table><thead><tr><th>Date</th><th>Adversaire</th><th>Ouverture</th><th>Résultat</th><th>Grosses erreurs</th></tr></thead>
        <tbody>{data.games.slice(0, 200).map(g => (
          <tr key={g.url}>
            <td>{new Date(g.date * 1000).toLocaleDateString('fr-FR')}</td>
            <td>{g.color === 'white' ? '♔' : '♚'} {g.opp} ({g.opp_elo})</td>
            <td className="small">{g.opening}</td>
            <td className={g.score === 1 ? 'good' : g.score === 0 ? 'bad' : ''}>{g.score === 1 ? 'Gagné' : g.score === 0 ? 'Perdu' : 'Nulle'}</td>
            <td><a href={g.url} target="_blank">{g.n_mistakes}</a></td>
          </tr>))}</tbody></table>
    </div>
  )
}
