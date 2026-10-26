import { Chess } from 'chess.js'

const NAME: Record<string, string> = { k: 'Roi', q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier', p: 'pion' }

export function sanLine(fen: string, uci: string[], n = 8) {
  const c = new Chess(fen); const out: string[] = []
  for (const u of uci.slice(0, n)) {
    const turn = c.turn(); const no = c.moveNumber()
    let mv
    try { mv = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || 'q' }) } catch { break }
    out.push(turn === 'w' ? `${no}.${mv.san}` : out.length === 0 ? `${no}...${mv.san}` : mv.san)
  }
  return out.join(' ')
}

export function pieceList(fen: string) {
  const c = new Chess(fen); const side: Record<string, string[]> = { w: [], b: [] }
  for (const row of c.board()) for (const p of row) if (p) side[p.color].push(`${NAME[p.type]} ${p.square}`)
  return `Blancs : ${side.w.join(', ')}\nNoirs : ${side.b.join(', ')}`
}

export function uciOf(fen: string, from: string, to: string) {
  const c = new Chess(fen)
  try { const mv = c.move({ from, to, promotion: 'q' }); return { uci: from + to + (mv.promotion || ''), san: mv.san, fen: c.fen() } } catch { return null }
}
