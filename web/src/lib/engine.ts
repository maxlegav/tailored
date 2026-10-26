export type EngineLine = { pv: string[]; cp?: number; mate?: number; depth: number }

let worker: Worker | null = null
let queue: Promise<unknown> = Promise.resolve()

function get() {
  if (!worker) {
    worker = new Worker(new URL('engine/stockfish-18-lite-single.js', document.baseURI))
    worker.postMessage('uci')
    worker.postMessage('isready')
  }
  return worker
}

// Scores are from the side to move's point of view.
export function analyse(fen: string, opts: { movetime?: number; depth?: number; multipv?: number } = {}): Promise<EngineLine[]> {
  const run = () => new Promise<EngineLine[]>(resolve => {
    const w = get(); const n = opts.multipv || 1
    const lines: EngineLine[] = []
    const onMsg = (e: MessageEvent) => {
      const s = String(e.data)
      if (s.startsWith('info') && s.includes(' pv ')) {
        const k = Number(/ multipv (\d+)/.exec(s)?.[1] || 1) - 1
        const cp = / score cp (-?\d+)/.exec(s); const mate = / score mate (-?\d+)/.exec(s)
        lines[k] = { pv: s.split(' pv ')[1].trim().split(' '), depth: Number(/ depth (\d+)/.exec(s)?.[1]),
          cp: cp ? Number(cp[1]) : undefined, mate: mate ? Number(mate[1]) : undefined }
      } else if (s.startsWith('bestmove')) {
        w.removeEventListener('message', onMsg); resolve(lines.filter(Boolean))
      }
    }
    w.addEventListener('message', onMsg)
    w.postMessage(`setoption name MultiPV value ${n}`)
    w.postMessage(`position fen ${fen}`)
    w.postMessage(opts.depth ? `go depth ${opts.depth}` : `go movetime ${opts.movetime || 700}`)
  })
  const p = queue.then(run, run)
  queue = p
  return p
}

export function winPct(l: EngineLine) {
  if (l.mate != null) return l.mate > 0 ? 100 : 0
  const cp = Math.max(-1000, Math.min(1000, l.cp || 0))
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1)
}
