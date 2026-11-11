import { useSearchParams } from 'react-router-dom'
import type { Data } from '../types'
import RepList from '../RepList'
import Quiz, { questions } from '../Quiz'

export default function MyRep({ data }: { data: Data }) {
  const [params] = useSearchParams()
  const reps = data.myrep || []
  const traps = params.get('quiz') === 'pieges' ? reps.filter(o => o.id.endsWith('pieges')).flatMap(o => questions(o, reps, true)) : []
  return (
    <div className="page">
      <h1>Mon répertoire</h1>
      <p className="muted">Les lignes à apprendre, coup par coup. Blancs : 1.d4 + Nf3 (ton Bg5 en système Torre, Gambit Dame ou Catalane). Noirs : la Française. Ouvre une ligne, regarde-la une fois en entier, puis fais le quiz : 5 positions, tu joues le coup. Les positions ratées reviennent le lendemain, et la ligne se coche toute seule quand tu as tout réussi.</p>
      {!!traps.length && <div className="lesson"><h2>Quiz pièges : trouve le coup piège, puis la punition</h2><Quiz qs={traps} doneKey="quiz-pieges" /></div>}
      <RepList key={params.toString()} list={reps} open={params.get('open')} quiz={params.get('quiz') === '1'} />
    </div>
  )
}
