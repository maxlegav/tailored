import { useMemo, useState } from 'react'
import AnalysisBoard from './AnalysisBoard'
import type { TreeNode } from './types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const VERD: Record<string, [string, string]> = { bad: ['À changer', 'bad'], risky: ['Risqué', 'warn'], idea: ['Coup d\'idée', 'idea'] }

export default function RepTree({ tree, onPlan }: { tree: { white: TreeNode; black: TreeNode }; onPlan: (id: string) => void }) {
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [path, setPath] = useState<number[]>([])
  const nodes = useMemo(() => { const out = [tree[color]]; for (const i of path) out.push(out[out.length - 1].kids[i]); return out }, [tree, color, path])
  const node = nodes[nodes.length - 1]
  const myTurn = (path.length % 2 === 0) === (color === 'white')
  const ucis = nodes.slice(1).map(n => n.uci!)
  const mine = (e?: number) => e == null ? '' : (() => { const v = (color === 'white' ? e : -e) / 100; return `${v > 0 ? '+' : ''}${v.toFixed(1)}` })()
  const go = (p: number[]) => setPath(p)
  return (
    <div>
      <div className="seg">
        <button className={color === 'white' ? 'on' : ''} onClick={() => { setColor('white'); setPath([]) }}>Avec les Blancs ({tree.white.n})</button>
        <button className={color === 'black' ? 'on' : ''} onClick={() => { setColor('black'); setPath([]) }}>Avec les Noirs ({tree.black.n})</button>
      </div>
      <div className="opening">
        <div><AnalysisBoard key={color + path.join('.')} fen={START} line={ucis} start={ucis.length} orientation={color} showIdeas={false}
          onUserMove={(from, to) => { const k = node.kids.findIndex(c => c.uci?.slice(0, 4) === from + to); if (k >= 0) { go([...path, k]); return false } }} /></div>
        <div>
          <div className="crumbs"><span onClick={() => go([])}>Départ</span>{nodes.slice(1).map((n, i) => <span key={i} onClick={() => go(path.slice(0, i + 1))}> › {n.san}</span>)}</div>
          <p className="small muted">{node.n} parties ici · {Math.round(node.score * 100)} % de points{node.eval != null ? ` · moteur ${mine(node.eval)} pour toi` : ''}{node.best ? ` · coup du moteur : ${node.best}` : ''}</p>
          {node.plans?.map(id => <button key={id} className="btn" onClick={() => onPlan(id)}>Voir le plan de cette ouverture</button>)}
          <p className="small muted"><span className="dot good" /> bon <span className="dot ok" /> jouable <span className="dot bad" /> {myTurn ? 'mauvais' : 'dangereux pour toi'} · jugé selon le moteur ET tes résultats</p>
          <h3>{myTurn ? 'Ce que tu joues ici' : 'Ce que l\'adversaire joue ici'}</h3>
          {!node.kids.length && <p className="muted">Pas assez de parties pour aller plus loin (minimum 3).</p>}
          {node.kids.map((k, i) => {
            const v = k.verdict && VERD[k.verdict]
            return (
              <div key={k.san} className="tnode" onClick={() => go([...path, i])}>
                <div className="tn-h"><span className={`dot ${k.grade || 'none'}`} /><b>{k.san}</b>{k.san === node.best && <span className="evalchip">★ moteur</span>}{v && <span className={`tag ${v[1]}`}>{v[0]}</span>}
                  <span className="tn-s">{k.n} parties · {Math.round(k.score * 100)} %</span></div>
                <div className="bar"><div style={{ width: `${Math.round(k.score * 100)}%` }} /></div>
                {!myTurn && k.grade === 'good' && <p className="small">Imprécis de sa part (environ {((k.delta || 0) / 100).toFixed(1)} pour toi) : la position s'améliore pour toi ici.</p>}
                {!myTurn && k.grade === 'bad' && <p className="small">Bonne réponse de sa part : la position se complique pour toi ({((k.delta || 0) / 100).toFixed(1)}). C'est ici qu'il faut connaître ton plan.</p>}
                {myTurn && k.grade === 'good' && !k.verdict && <p className="small">Bon coup : il garde ou améliore la position.</p>}
                {k.verdict === 'bad' && <p className="small">Tu le joues souvent mais tu perds en moyenne {k.loss} % de chances de gain sur ce coup. Joue plutôt <b>{node.best}</b>.</p>}
                {k.verdict === 'risky' && <p className="small">Mauvais selon le moteur (−{k.loss} %), mais il te réussit encore. Garde-le seulement si tu as un piège précis en tête, sinon passe à <b>{node.best}</b>.</p>}
                {k.verdict === 'idea' && <p className="small">Pas le meilleur coup du moteur (−{k.loss} %, il préfère {node.best}), mais tu marques {Math.round(k.score * 100)} % avec : c'est une position qui te va, tu peux le garder.</p>}
              </div>)
          })}
        </div>
      </div>
    </div>
  )
}
