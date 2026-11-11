"""Blitz trap finder: in Max's frequent opening positions, find sound moves (Stockfish) where the most natural 1900 reply (Maia2) loses >= 1.5 pawns. Output: data/traps.json, verify each trap before adding it to content/repertoire.json."""
import json, io, collections, os, sys, warnings
warnings.filterwarnings("ignore")
import chess, chess.pgn, chess.engine
from maia2 import model, inference
os.chdir(os.path.dirname(os.path.abspath(__file__)))
M = model.from_pretrained(type="blitz", device="cpu", save_root="./maia2_models"); prep = inference.prepare()
eng = chess.engine.SimpleEngine.popen_uci(os.path.expanduser("~/bin/stockfish")); eng.configure({"Threads": 7, "Hash": 1024})
me = 'maxthechessnoob'
cnt = collections.Counter(); col = {}
for g in json.load(open('data/blitz.json')):
    w = g['white']['username'].lower() == me
    p = chess.pgn.read_game(io.StringIO(g['pgn'])); b = p.board()
    for i, mv in enumerate(p.mainline_moves()):
        if i >= 24: break
        if (b.turn == chess.WHITE) == w:
            k = b.epd(); cnt[k] += 1; col[k] = w
        b.push(mv)
for o in json.load(open('content/repertoire.json')):
    for ln in [o['line']] + [x['line'] for x in o['ideas']]:
        b = chess.Board()
        for s in ln.split():
            if (b.turn == chess.WHITE) == (o['color'] == 'white'):
                k = b.epd(); cnt[k] += 6; col[k] = o['color'] == 'white'
            b.push_san(s)
pos = [k for k, n in cnt.most_common() if n >= 4][:int(sys.argv[1]) if len(sys.argv) > 1 else 160]
print(len(pos), 'positions', flush=True)
def sc(b, n=600_000, mpv=1):
    r = eng.analyse(b, chess.engine.Limit(nodes=n), multipv=mpv)
    return [(x['score'].pov(not b.turn if False else b.turn).score(mate_score=3000), x['pv']) for x in r]
out = []
for ii, k in enumerate(pos):
    if ii % 20 == 0: print("progress", ii, len(out), flush=True)
    b = chess.Board(k + ' 0 1'); mine = b.turn
    cands = sc(b, 800_000, 6); best = cands[0][0]
    for s, pv in cands:
        if s < best - 100 or s < -50: continue
        q = b.copy(); q.push(pv[0])
        if q.is_game_over(): continue
        probs, _ = inference.inference_each(M, prep, q.fen(), 1900, 1900)
        for r, p in sorted(probs.items(), key=lambda x: -x[1])[:4]:
            if p < 0.15: continue
            t = q.copy(); t.push(chess.Move.from_uci(r))
            if t.is_game_over(): continue
            v = sc(t, 600_000)[0]; gain = v[0] - s
            if gain >= 150:
                line = b.variation_san([pv[0], chess.Move.from_uci(r)] + v[1][:5])
                out.append(dict(fen=b.fen(), n=cnt[k], white=col[k], move=b.san(pv[0]), eval=s, reply=t.peek().uci(), p=round(p, 2), gain=gain, line=line, score=round(p * min(gain, 900) * (cnt[k] ** .5))))
                print(out[-1], flush=True)
json.dump(sorted(out, key=lambda x: -x['score']), open('data/traps.json', 'w'), ensure_ascii=False, indent=1)
eng.quit()
