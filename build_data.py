"""Builds web/public/data.json from analysis + profile (after humanize.py)."""
import json, sys, collections, io, time, os
import chess, chess.pgn
from classify import classify_game, winp, cp_of
from explain import explain, san_line

TAG_FR = {"pièce_déplacée_en_prise": "Pièce déplacée en prise", "matériel_perdu": "Menace ignorée / matériel perdu",
          "fourchette_subie": "Fourchette subie", "mat_concédé": "Mat concédé", "mat_manqué": "Mat manqué",
          "tactique_manquée": "Tactique manquée", "fourchette_manquée": "Fourchette manquée",
          "avantage_gâché": "Avantage gâché", "positionnel": "Erreur positionnelle (total)", "roque_affaibli": "Roque affaibli par un coup de pion", "structure_abîmée": "Structure de pions abîmée", "paire_de_fous_cédée": "Paire de fous cédée", "échange_mal_choisi": "Échange mal choisi", "pièce_passive": "Pièce rendue passive", "poussée_prématurée": "Poussée de pion prématurée", "roi_mal_placé": "Roi mal placé", "plan_flou": "Mauvais plan / coup sans but", "zeitnot": "Zeitnot (<20 s)"}
DRAWS = {'agreed','repetition','stalemate','insufficient','50move','timevsinsufficient'}
def result(g):
    r = g[g["color"]]["result"]; return 1.0 if r == "win" else 0.5 if r in DRAWS else 0.0
def key(fen): return " ".join(fen.split()[:4])

analysis = [json.loads(l) for l in open(sys.argv[1])]
prof = json.load(open(sys.argv[2]))
hum = {(m["url"], m["ply"]): m for m in prof["mistakes"]}

engine_best = {}
my_nodes = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0.0, 0.0]))
opp_nodes = collections.defaultdict(lambda: [0, 0.0, None, None])
mistakes = []; games = []; tagloss = collections.Counter(); tagn = collections.Counter()
phase = collections.defaultdict(lambda: [0, 0.0, 0]); clock = collections.defaultdict(lambda: [0, 0.0])
color_score = collections.defaultdict(lambda: [0, 0.0]); conv = [0, 0]; comeback = [0, 0]
classified = [classify_game(g) for g in analysis]
seen = collections.Counter((key(m["fen"]), m["san"]) for moves, _ in classified for m in moves if m["sev"])
visits = collections.Counter(key(m["fen"]) for moves, _ in classified for m in moves if m["move_no"] <= 15)
CHEAP = {"pièce_déplacée_en_prise", "matériel_perdu", "mat_concédé", "fourchette_subie"}
WEIGHT = {"habitude": 2.0, "comprehension": 1.0, "accident": 0.5, "zeitnot": 0.25}
def kind(m):
    if m["clk"] is not None and m["clk"] < 20: return "zeitnot"
    if seen[(key(m["fen"]), m["san"])] >= 2 or (m["move_no"] <= 15 and visits[key(m["fen"])] >= 5): return "habitude"
    if CHEAP & set(m["tags"]): return "accident"
    return "comprehension"
plans = json.load(open("data/plans.json")) if os.path.exists("data/plans.json") else {}
kinds = collections.defaultdict(lambda: [0, 0.0]); coreloss = collections.Counter(); coren = collections.Counter()
habits = collections.defaultdict(list)
for g, (moves, max_wp) in zip(analysis, classified):
    s = result(g); col = g["color"] == "white"
    color_score[g["color"]][0] += 1; color_score[g["color"]][1] += s
    if max_wp >= 85: conv[0] += 1; conv[1] += s == 1
    plies = g["plies"]
    for i, p in enumerate(plies[:24]):
        b = chess.Board(p["fen"])
        if not p.get("move"): break
        if p["top"]: engine_best[key(p["fen"])] = (b.san(chess.Move.from_uci(p["top"][0]["uci"])), p["top"][0]["uci"])
        if (b.turn == chess.WHITE) != col and i + 1 < len(plies):
            nk = key(plies[i+1]["fen"]); o = opp_nodes[nk]; o[0] += 1; o[1] += s; o[2] = plies[i+1]["fen"]
            o[3] = " ".join(x for x in chess.Board().variation_san([chess.Move.from_uci(q["move"]) for q in plies[:i+1]]).split())
    worst = None
    for m in moves:
        if m["move_no"] <= 12:
            d = my_nodes[key(m["fen"])][m["san"]]; d[0] += 1; d[1] += s; d[2] += m["loss"]
        ph = phase[m["phase"]]; ph[0] += 1; ph[1] += m["loss"]; ph[2] += bool(m["sev"] in ("gaffe", "erreur"))
        if m["clk"] is not None:
            bk = "< 10 s" if m["clk"] < 10 else "10-30 s" if m["clk"] < 30 else "30-60 s" if m["clk"] < 60 else "> 60 s"
            clock[bk][0] += 1; clock[bk][1] += m["loss"]
        if m["sev"]:
            h = hum.get((g["url"], m["ply"]), {})
            m.update({k: h[k] for k in ("p_best_human", "p_played_human", "findable") if k in h})
            m["color"] = g["color"]; m["url"] = g["url"]; m["date"] = g["end_time"]
            m["kind"] = kind(m)
            for t in m["tags"]:
                tagloss[t] += m["loss"]; tagn[t] += 1
                if m["kind"] in ("habitude", "comprehension"): coreloss[t] += m["loss"] * WEIGHT[m["kind"]]; coren[t] += 1
            if m["sev"] in ("gaffe", "erreur"):
                kinds[m["kind"]][0] += 1; kinds[m["kind"]][1] += m["loss"]
                m["text"] = explain(m); m["id"] = f'{g["url"].split("/")[-1]}-{m["ply"]}'
                if m["id"] in plans: m["goal"] = plans[m["id"]]
                if m["kind"] == "habitude" and seen[(key(m["fen"]), m["san"])] >= 2: habits[(key(m["fen"]), m["san"])].append(m["id"])
                m["refutation_san"] = san_line(chess.Board(m["fen"]).fen(), [m["uci"]] + m["refutation"], 7)
                mistakes.append({k: m[k] for k in ("id", "fen", "san", "uci", "best", "best_san", "good", "loss", "sev", "phase", "clk", "tags", "text", "url", "date", "color", "move_no", "wp_before", "wp_after", "findable", "p_best_human", "best_pv", "refutation_san", "kind", "goal") if k in m})
                if not worst or m["loss"] > worst["loss"]: worst = m
    opp = g["black"] if col else g["white"]
    games.append({"url": g["url"], "date": g["end_time"], "color": g["color"], "score": s, "opp": opp["username"], "opp_elo": opp["rating"],
                  "elo": (g["white"] if col else g["black"])["rating"], "opening": (g.get("eco") or "").split("/")[-1].replace("-", " "),
                  "n_mistakes": sum(1 for m in moves if m["sev"] in ("gaffe", "erreur")), "worst": worst and worst["id"]})

# repertoire verdicts
rep = []
for k, mv in my_nodes.items():
    tot = sum(v[0] for v in mv.values())
    if tot < 8: continue
    stats = {san: {"n": v[0], "score": round(v[1]/v[0], 2), "loss": round(v[2]/v[0], 1)} for san, v in mv.items()}
    main = max(stats, key=lambda x: stats[x]["n"]); ms = stats[main]
    eb = engine_best.get(k)
    alts = [s for s in stats if s != main and stats[s]["n"] >= 3 and stats[s]["loss"] < ms["loss"] - 2 and stats[s]["score"] >= ms["score"]]
    verdict = None
    ex = lambda m: f"{m} ({stats[m]['n']} fois, {stats[m]['score']*100:.0f}% de points)"
    if ms["loss"] >= 5:
        if alts: verdict = f"Tu joues surtout {ex(main)}, mais ce coup te coûte en moyenne {ms['loss']:.0f}% de chances de gain. Tu joues déjà parfois {ex(alts[0])} : garde celui-là."
        elif eb and ms["score"] >= 0.55: verdict = f"Tu joues surtout {ex(main)}. Ça marche en blitz car tes adversaires ne trouvent pas la réfutation, mais le moteur le juge imprécis (−{ms['loss']:.0f}% en moyenne). À surveiller ; le coup propre est {eb[0]}."
        elif eb: verdict = f"Tu joues surtout {ex(main)}, et ce coup te coûte en moyenne {ms['loss']:.0f}% de chances de gain. Remplace-le par {eb[0]}."
    elif alts:
        verdict = f"{ex(alts[0])} te réussit mieux que {ex(main)} ici."
    elif ms["score"] <= 0.4 and ms["n"] >= 8:
        verdict = f"Le coup {main} est correct selon le moteur, mais tu ne marques que {ms['score']*100:.0f}% des points ici : le problème vient de la suite, pas de ce coup."
    rep.append({"fen": k + " 0 1", "total": tot, "moves": stats, "main": main, "engine": eb and eb[0], "verdict": verdict})
rep.sort(key=lambda x: -x["total"])
trouble = [{"fen": v[2], "line": v[3], "n": v[0], "score": round(v[1]/v[0], 2)} for v in opp_nodes.values() if v[0] >= 8 and v[1]/v[0] <= 0.4]
trouble.sort(key=lambda x: x["score"])
comfort = [{"fen": v[2], "line": v[3], "n": v[0], "score": round(v[1]/v[0], 2)} for v in opp_nodes.values() if v[0] >= 8 and v[1]/v[0] >= 0.62]
comfort.sort(key=lambda x: -x["score"])

out = {"generated": int(time.time()), "user": "maxthechessnoob", "time_class": "blitz", "n_games": len(analysis),
       "color": {c: {"n": v[0], "score": round(v[1]/v[0], 3)} for c, v in color_score.items()},
       "conversion": {"winning": conv[0], "won": conv[1]},
       "phase": {k: {"moves": v[0], "avg_loss": round(v[1]/v[0], 2), "serious": v[2], "per100": round(100*v[2]/v[0], 2)} for k, v in phase.items()},
       "clock": {k: {"moves": v[0], "avg_loss": round(v[1]/v[0], 2)} for k, v in clock.items()},
       "tags": [{"tag": t, "label": TAG_FR[t], "n": tagn[t], "loss": round(tagloss[t]), "core_n": coren[t], "core_loss": round(coreloss[t])} for t in sorted(tagloss, key=lambda t: -tagloss[t])],
       "kinds": {k: {"n": v[0], "loss": round(v[1])} for k, v in kinds.items()},
       "openings": json.load(open("content/openings.json")) if os.path.exists("content/openings.json") else [],
       "habits": sorted(({"san": k[1], "n": seen[k], "ids": v} for k, v in habits.items()), key=lambda h: -h["n"])[:20],
       "findable": {"serious": len(mistakes), "findable": sum(1 for m in mistakes if m.get("findable"))},
       "repertoire": rep[:80], "trouble": trouble[:15], "comfort": comfort[:15], "mistakes": mistakes, "games": sorted(games, key=lambda x: -x["date"])}
import os
if os.path.exists("content/lessons.json"):
    ids = {m["id"] for m in mistakes}
    out["lessons"] = [dict(l, mistakes=[i for i in l.get("mistakes", []) if i in ids]) for l in json.load(open("content/lessons.json"))]
if os.path.exists("content/silman.json"):
    out["book"] = json.load(open("content/silman.json"))
    sil = json.load(open("data/silman.json")) if os.path.exists("data/silman.json") else {}
    for m in mistakes:
        if m["id"] in sil: m["silman"] = sil[m["id"]]
    if os.path.exists("content/silman_exercises.json"): out["book_ex"] = json.load(open("content/silman_exercises.json"))
    if os.path.exists("content/silman_guide.json"): out["book_guide"] = json.load(open("content/silman_guide.json"))
if os.path.exists("data/tree.json"): out["tree"] = json.load(open("data/tree.json"))
json.dump(out, open("web/public/data.json", "w"), ensure_ascii=False)
print("ok", len(mistakes), "mistakes", len(rep), "rep nodes", len(trouble), "trouble", len(comfort), "comfort")
for r in rep[:40]:
    if r["verdict"]: print(r["main"], r["total"], r["verdict"])
