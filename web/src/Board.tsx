import { Chessboard } from 'react-chessboard'

type Props = { fen: string; orientation?: 'white' | 'black'; arrows?: { from: string; to: string; color?: string }[]; onMove?: (from: string, to: string) => boolean; highlight?: Record<string, string> }
export default function Board({ fen, orientation = 'white', arrows = [], onMove, highlight = {} }: Props) {
  const squareStyles = Object.fromEntries(Object.entries(highlight).map(([sq, c]) => [sq, { background: c }]))
  return (
    <div className="board">
      <Chessboard options={{
        position: fen, boardOrientation: orientation, allowDragging: !!onMove,
        arrows: arrows.map(a => ({ startSquare: a.from, endSquare: a.to, color: a.color || 'rgba(0,160,60,0.8)' })),
        squareStyles,
        onPieceDrop: ({ sourceSquare, targetSquare }) => (onMove && targetSquare ? onMove(sourceSquare, targetSquare) : false),
        darkSquareStyle: { backgroundColor: '#739552' }, lightSquareStyle: { backgroundColor: '#ebecd0' },
      }} />
    </div>
  )
}
