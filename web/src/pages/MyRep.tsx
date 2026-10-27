import { useState } from 'react'
import type { Data } from '../types'
import { OpeningCard } from './Repertoire'

export default function MyRep({ data }: { data: Data }) {
  const [color, setColor] = useState<'white' | 'black'>('white')
  const list = (data.myrep || []).filter(o => o.color === color)
  return (
    <div className="page">
      <h1>Mon répertoire recommandé</h1>
      <p className="muted">Construit à partir de ton arbre et de ton style : Blancs 1.d4 + Nf3 (ton Bg5 en système Torre, Gambit Dame ou Catalane), Noirs la Française. Pour chaque variante : ce que tu joues, ce qu'on garde ou change, le plan, puis les idées à jouer sur l'échiquier.</p>
      <div className="seg">
        <button className={color === 'white' ? 'on' : ''} onClick={() => setColor('white')}>Blancs</button>
        <button className={color === 'black' ? 'on' : ''} onClick={() => setColor('black')}>Noirs</button>
      </div>
      {list.map(o => <OpeningCard key={o.id} o={o} />)}
    </div>
  )
}
