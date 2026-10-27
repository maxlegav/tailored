import { useMemo } from 'react'
import { Chess } from 'chess.js'
import AnalysisBoard from './AnalysisBoard'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
export default function LinePlayer({ line, orientation }: { line: string; orientation: 'white' | 'black' }) {
  const ucis = useMemo(() => {
    const c = new Chess(); const out: string[] = []
    for (const s of line.split(' ').filter(Boolean)) { try { const m = c.move(s); out.push(m.from + m.to + (m.promotion || '')) } catch { break } }
    return out
  }, [line])
  return <AnalysisBoard key={line} fen={START} line={ucis} orientation={orientation} start={ucis.length} engineReply />
}
