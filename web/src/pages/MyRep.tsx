import { useSearchParams } from 'react-router-dom'
import type { Data } from '../types'
import RepList from '../RepList'

export default function MyRep({ data }: { data: Data }) {
  const [params] = useSearchParams()
  return (
    <div className="page">
      <h1>Mon répertoire</h1>
      <p className="muted">Les lignes à apprendre, coup par coup. Blancs : 1.d4 + Nf3 (ton Bg5 en système Torre, Gambit Dame ou Catalane). Noirs : la Française. Ouvre une ligne, joue-la sur l'échiquier, puis coche « apprise » : elle se replie et le profil te propose la suivante.</p>
      <RepList list={data.myrep || []} open={params.get('open')} />
    </div>
  )
}
