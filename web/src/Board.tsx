import { useEffect, useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess, type Square } from 'chess.js'
import { ctx } from './ctx'

type Arrow = { from: string; to: string; color?: string }
type Props = {
  fen: string; orientation?: 'white' | 'black'; arrows?: Arrow[]
  onMove?: (from: string, to: string) => boolean
  highlight?: Record<string, string>; lastMove?: [string, string]
}

const SEL = 'rgba(255, 255, 51, 0.5)'
const LAST = 'rgba(255, 255, 51, 0.35)'
const DOT = 'radial-gradient(circle, rgba(0,0,0,.18) 24%, transparent 26%)'
const RING = 'radial-gradient(circle, transparent 58%, rgba(0,0,0,.18) 60%)'

export default function Board({ fen, orientation = 'white', arrows = [], onMove, highlight = {}, lastMove }: Props) {
  useEffect(() => { ctx.fen = fen; return () => { if (ctx.fen === fen) ctx.fen = '' } }, [fen])
  const [sel, setSel] = useState<{ fen: string; sq: string } | null>(null)
  const selected = sel && sel.fen === fen ? sel.sq : null
  const game = useMemo(() => { try { return new Chess(fen) } catch { return null } }, [fen])
  const targets = useMemo(() => (selected && game ? game.moves({ square: selected as Square, verbose: true }) : []), [selected, game])

  const ownPiece = (sq: string) => { const p = game?.get(sq as Square); return !!p && p.color === game!.turn() }
  const click = (sq: string) => {
    if (!onMove) return
    if (selected && targets.some(t => t.to === sq)) { setSel(null); onMove(selected, sq); return }
    setSel(ownPiece(sq) && sq !== selected ? { fen, sq } : null)
  }

  const squareStyles: Record<string, React.CSSProperties> = {}
  if (lastMove) for (const s of lastMove) squareStyles[s] = { background: LAST }
  for (const [s, c] of Object.entries(highlight)) squareStyles[s] = { background: c }
  if (selected) squareStyles[selected] = { background: SEL }
  for (const t of targets) squareStyles[t.to] = { ...squareStyles[t.to], backgroundImage: t.captured ? RING : DOT }

  return (
    <div className="board">
      <Chessboard options={{
        position: fen, boardOrientation: orientation, allowDragging: !!onMove, animationDurationInMs: 220,
        arrows: arrows.map(a => ({ startSquare: a.from, endSquare: a.to, color: a.color || 'rgba(0,160,60,0.8)' })),
        squareStyles,
        canDragPiece: ({ square }) => !!square && ownPiece(square),
        onPieceDrag: ({ square }) => { if (square && ownPiece(square)) setSel({ fen, sq: square }) },
        onSquareClick: ({ square }) => click(square),
        onPieceDrop: ({ sourceSquare, targetSquare }) => { setSel(null); return !!(onMove && targetSquare && onMove(sourceSquare, targetSquare)) },
        darkSquareStyle: { backgroundColor: '#739552' }, lightSquareStyle: { backgroundColor: '#ebecd0' },
      }} />
    </div>
  )
}
