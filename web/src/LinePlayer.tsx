import { useEffect, useMemo, useState } from 'react'
import { Chess } from 'chess.js'
import Board from './Board'

export default function LinePlayer({ line, orientation }: { line: string; orientation: 'white' | 'black' }) {
  const steps = useMemo(() => {
    const c = new Chess(); const out = [{ fen: c.fen(), san: '', from: '', to: '', label: '' }]
    for (const s of line.split(' ')) {
      const no = c.moveNumber(); const w = c.turn() === 'w'
      const mv = c.move(s)
      out.push({ fen: c.fen(), san: mv.san, from: mv.from, to: mv.to, label: w ? `${no}.` : '' })
    }
    return out
  }, [line])
  const [i, setI] = useState(steps.length - 1)
  const [playing, setPlaying] = useState(false)
  useEffect(() => { setI(steps.length - 1); setPlaying(false) }, [steps])
  useEffect(() => {
    if (!playing) return
    if (i >= steps.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setI(i + 1), 750)
    return () => clearTimeout(t)
  }, [playing, i, steps.length])
  const s = steps[Math.min(i, steps.length - 1)]
  const play = () => { if (i >= steps.length - 1) setI(0); setPlaying(true) }
  return (
    <div className="player">
      <Board fen={s.fen} orientation={orientation} lastMove={s.from ? [s.from, s.to] : undefined} />
      <div className="row">
        <button onClick={() => { setPlaying(false); setI(0) }} aria-label="Début">|◀</button>
        <button onClick={() => { setPlaying(false); setI(Math.max(0, i - 1)) }} aria-label="Précédent">◀</button>
        {playing ? <button className="btn primary" onClick={() => setPlaying(false)}>❚❚ Pause</button>
          : <button className="btn primary" onClick={play}>▶ Play</button>}
        <button onClick={() => { setPlaying(false); setI(Math.min(steps.length - 1, i + 1)) }} aria-label="Suivant">▶</button>
        <button onClick={() => { setPlaying(false); setI(steps.length - 1) }} aria-label="Fin">▶|</button>
      </div>
      <div className="moves">{steps.slice(1).map((m, k) => (
        <span key={k} className={k + 1 === i ? 'mv on' : 'mv'} onClick={() => { setPlaying(false); setI(k + 1) }}>{m.label}{m.san}</span>))}</div>
    </div>
  )
}
