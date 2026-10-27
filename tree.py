"""Opening tree per colour from Max's games: his moves, the replies, results, engine verdicts -> data/tree.json"""
import json, sys, math, collections
import chess
from classify import classify_game
MAXPLY = 16
def wp(cp): return 100 / (1 + math.exp(-0.00368208 * cp))
def sc(s): return s.get("cp", 10000 if s.get("mate", 0) > 0 else -10000) if "cp" in s else (10000 if s["mate"] > 0 else -10000)
analysis = [json.loads(l) for l in open(sys.argv[1])]
openings = json.load(open("content/openings.json"))
def new(): return {"n": 0, "pts": 0.0, "loss": 0.0, "nl": 0, "kids": {}}
roots = {"white": new(), "black": new()}
for g in analysis:
    r = g[g["color"]]["result"]; s = 1.0 if r == "win" else 0.5 if r in ("agreed", "repetition", "stalemate", "insufficient", "50move", "timevsinsufficient") else 0.0
    moves, _ = classify_game(g); loss = {m["ply"]: m["loss"] for m in moves}
    node = roots[g["color"]]; node["n"] += 1; node["pts"] += s
    for i, p in enumerate(g["plies"][:MAXPLY]):
        if not p.get("move"): break
        k = node["kids"].setdefault(p["san"], new() | {"uci": p["move"]})
        k["n"] += 1; k["pts"] += s
        if i in loss: k["loss"] += loss[i]; k["nl"] += 1
        node["fen"] = p["fen"]
        if p["top"]:
            b = chess.Board(p["fen"]); t = p["top"][0]
            node["best"] = b.san(chess.Move.from_uci(t["uci"])); node["best_uci"] = t["uci"]
            node["eval"] = sc(t["s"]) * (1 if b.turn == chess.WHITE else -1)
        node = k
def prune(node, me_to_move, depth, line):
    kids = sorted(node["kids"].items(), key=lambda kv: -kv[1]["n"])
    keep = [(s, k) for s, k in kids if k["n"] >= 3][:6]
    out = {"n": node["n"], "score": round(node["pts"] / node["n"], 2)}
    for f in ("fen", "best", "best_uci", "eval"):
        if f in node: out[f] = node[f]
    out["kids"] = []
    for san, k in keep:
        c = prune(k, not me_to_move, depth + 1, line + [san])
        c["san"] = san; c["uci"] = k["uci"]
        if me_to_move and k["nl"]:
            c["loss"] = round(k["loss"] / k["nl"], 1)
            if c["loss"] >= 8 and node.get("best") and node["best"] != san:
                c["verdict"] = "bad" if c["score"] < 0.55 else "risky"
            elif c["loss"] >= 4 and c["score"] >= 0.55:
                c["verdict"] = "idea"
        out["kids"].append(c)
    return out
tree = {}
for col, root in roots.items():
    tree[col] = prune(root, col == "white", 0, [])
# link the opening plans (content/openings.json) to the node reached by their recommended line
for o in openings:
    node = tree[o["color"]]; depth = 0
    for san in o["line"].split():
        nxt = next((k for k in node["kids"] if k["san"] == san), None)
        if not nxt: break
        node = nxt; depth += 1
    if depth >= 2: node.setdefault("plans", []).append(o["id"])
json.dump(tree, open(sys.argv[2], "w"), ensure_ascii=False)
def count(n): return 1 + sum(count(k) for k in n["kids"])
print({c: count(t) for c, t in tree.items()})
