"""Check every opening line is legal and store Stockfish's evaluation at the end of each line (Max's point of view)."""
import chess, chess.engine, json, os, sys
path = sys.argv[1] if len(sys.argv) > 1 else "content/openings.json"
O = json.load(open(path))
eng = chess.engine.SimpleEngine.popen_uci(os.path.expanduser("~/bin/stockfish")); eng.configure({"Threads": 8, "Hash": 512})
def check(line, color):
    b = chess.Board()
    for t in line.split(): b.push_san(t)
    s = eng.analyse(b, chess.engine.Limit(nodes=3_000_000))["score"].pov(chess.WHITE if color == "white" else chess.BLACK)
    return round(s.score(mate_score=10000) / 100, 1)
for o in O:
    o["line_eval"] = check(o["line"], o["color"])
    for i in o["ideas"]: i["eval"] = check(i["line"], o["color"])
    print(o["id"], o["line_eval"], [i["eval"] for i in o["ideas"]])
eng.quit()
json.dump(O, open(path, "w"), ensure_ascii=False, indent=1)
