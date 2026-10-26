import json, sys, collections, chess
from classify import classify_game, winp, cp_of

DRAWS = {'agreed','repetition','stalemate','insufficient','50move','timevsinsufficient'}
def result(g):
    r = g[g["color"]]["result"]
    return 1.0 if r == "win" else 0.5 if r in DRAWS else 0.0

def key(fen): return " ".join(fen.split()[:4])

games = [json.loads(l) for l in open(sys.argv[1])]
nodes = collections.defaultdict(lambda: collections.defaultdict(lambda: {"n": 0, "score": 0.0, "loss": 0.0, "eval12": 0.0}))
mist = []; stats = collections.Counter(); conv = {"winning": 0, "won": 0}; clockb = collections.defaultdict(lambda: [0, 0.0])
for g in games:
    s = result(g); moves, max_wp = classify_game(g); col = g["color"] == "white"
    if max_wp >= 85:
        conv["winning"] += 1; conv["won"] += s == 1
    # eval after ~opening (ply 24 or last)
    p24 = g["plies"][min(24, len(g["plies"]) - 1)]
    ev = winp(cp_of(p24["top"][0]["s"], col)) if p24["top"] else 50
    for m in moves:
        if m["move_no"] <= 12:
            d = nodes[key(m["fen"])][m["san"]]
            d["n"] += 1; d["score"] += s; d["loss"] += m["loss"]; d["eval12"] += ev
        if m["clk"] is not None:
            b = "<10s" if m["clk"] < 10 else "<30s" if m["clk"] < 30 else "<60s" if m["clk"] < 60 else "60s+"
            clockb[b][0] += 1; clockb[b][1] += m["loss"]
        if m["sev"]:
            m["url"] = g["url"]; m["color"] = g["color"]; mist.append(m)
            stats[(m["sev"], m["phase"])] += 1
            for t in m["tags"]: stats[("tag", t)] += 1

print("games", len(games), "moves/mistakes", len(mist))
for k, v in sorted(stats.items()): print(k, v)
print("conversion", conv)
for b, (n, l) in clockb.items(): print("clock", b, n, "avg loss", round(l / n, 2))
print("\n== repertoire decision points (n>=6)")
rep = []
for fen, mv in nodes.items():
    tot = sum(d["n"] for d in mv.values())
    if tot < 6: continue
    rep.append((tot, fen, {k: {"n": d["n"], "score": round(d["score"]/d["n"], 2), "avg_loss": round(d["loss"]/d["n"], 1), "wp_after_opening": round(d["eval12"]/d["n"], 1)} for k, d in mv.items()}))
rep.sort(key=lambda x: -x[0])
for tot, fen, mv in rep[:60]:
    bad = any(v["avg_loss"] >= 6 and v["n"] >= 4 for v in mv.values()) or len([v for v in mv.values() if v["n"] >= 3]) >= 2
    if bad: print(tot, fen, json.dumps(mv, ensure_ascii=False))
json.dump({"mistakes": mist, "repertoire": rep, "conv": conv}, open("data/profile.json", "w"), ensure_ascii=False)
