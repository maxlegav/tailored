import json, sys, io, os, re
from multiprocessing import Pool
import chess, chess.pgn, chess.engine

SF = os.path.expanduser("~/bin/stockfish")
NODES = int(os.environ.get("NODES", 250000))
USER = "maxthechessnoob"
eng = None

def init():
    global eng
    eng = chess.engine.SimpleEngine.popen_uci(SF)
    eng.configure({"Threads": 1, "Hash": 64})

def score(s):
    w = s.white()
    return {"mate": w.mate()} if w.is_mate() else {"cp": w.score()}

def run(g):
    game = chess.pgn.read_game(io.StringIO(g["pgn"]))
    color = "white" if g["white"]["username"].lower() == USER else "black"
    board = game.board()
    plies = []
    node = game
    while True:
        infos = eng.analyse(board, chess.engine.Limit(nodes=NODES), multipv=3) if not board.is_game_over() else []
        top = [{"uci": i["pv"][0].uci(), "s": score(i["score"]), "pv": [m.uci() for m in i["pv"][:10]]} for i in infos if "pv" in i]
        nxt = node.next()
        entry = {"fen": board.fen(), "top": top}
        if nxt:
            entry["move"] = nxt.move.uci()
            entry["san"] = board.san(nxt.move)
            c = nxt.clock()
            if c is not None: entry["clk"] = c
        plies.append(entry)
        if not nxt: break
        board.push(nxt.move)
        node = nxt
    return {"url": g["url"], "end_time": g["end_time"], "color": color, "tc": g["time_control"],
            "white": g["white"], "black": g["black"], "eco": g.get("eco"), "headers": dict(game.headers),
            "accuracies": g.get("accuracies"), "plies": plies}

if __name__ == "__main__":
    games = json.load(open(sys.argv[1]))
    out = sys.argv[2]
    done = set()
    if os.path.exists(out):
        done = {json.loads(l)["url"] for l in open(out)}
    todo = [g for g in games if g["url"] not in done]
    print(len(todo), "to analyse", flush=True)
    with Pool(8, initializer=init) as p, open(out, "a") as f:
        for i, r in enumerate(p.imap_unordered(run, todo, chunksize=2)):
            f.write(json.dumps(r) + "\n"); f.flush()
            if i % 25 == 0: print(i, flush=True)
