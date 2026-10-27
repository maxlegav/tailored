"""One-off: turn Silman exercise positions reconstructed from the PDF (kept outside the repo) into content/silman_exercises.json.
Only positions + page refs + engine checks are stored, no book text."""
import json, os, re, sys
import chess, chess.engine
FR = {'C': 'N', 'F': 'B', 'T': 'R', 'D': 'Q', 'R': 'K'}
CH = {2: "Les pièces légères", 3: "Tours et colonnes", 4: "Divagations psychologiques", 5: "Le tir à la cible",
      6: "La dualité statique-dynamique", 7: "L'espace", 8: "Les pions passés", 9: "Les autres déséquilibres"}
def concept(ch, page):
    if ch == 2: return "cavalier" if page < 443 else "gros_pion" if page < 455 else "fou_cavalier"
    return {3: "colonne", 6: "statique_dynamique", 7: "espace", 8: "pion_passe", 9: "desequilibres"}.get(ch)
def diff(s):
    if not s: return None
    s = s.translate(str.maketrans({'I': '1', 'l': '1', 'L': '1', 'J': '1', 'S': '5', ')': '', ']': ''})).replace(' ', '')
    m = re.match(r'(\d{4})(?:-(\d{4}))?', s.replace('·', '-'))
    return m and (m.group(1) + ('-' + m.group(2) if m.group(2) else '+'))
sols = json.load(open(sys.argv[1]))
eng = chess.engine.SimpleEngine.popen_uci(os.path.expanduser("~/bin/stockfish"))
out = []
for s in sols:
    if not s.get("fen") or not s.get("first"): continue
    b = chess.Board(s["fen"]); t = s["first"].strip('!?+#').replace('0-0-0', 'O-O-O').replace('0-0', 'O-O')
    if t[0] in FR: t = FR[t[0]] + t[1:]
    bm = b.parse_san(t)
    infos = eng.analyse(b, chess.engine.Limit(nodes=3_000_000), multipv=4)
    sc = lambda i: i["score"].pov(b.turn).score(mate_score=10000)
    best = sc(infos[0]); good = [i["pv"][0].uci() for i in infos if best - sc(i) <= 40]
    bi = eng.analyse(b, chess.engine.Limit(nodes=2_000_000), root_moves=[bm]); bsc = bi["score"].pov(b.turn).score(mate_score=10000)
    if best - bsc > 80: print("skip", s["ch"], s["page"], t, best, bsc); continue
    if bm.uci() not in good: good.append(bm.uci())
    out.append({"id": f"silman-{s['page']}", "fen": s["fen"], "color": "white" if b.turn else "black", "ch": s["ch"], "chapter": CH[s["ch"]],
                "concept": concept(s["ch"], s["page"]), "page": s["page"], "level": diff(s.get("diff")),
                "book_move": b.san(bm), "book_uci": bm.uci(), "good": good, "best_san": b.san(infos[0]["pv"][0]),
                "best_pv": [m.uci() for m in infos[0]["pv"][:8]], "eval": best})
eng.quit()
json.dump(out, open("content/silman_exercises.json", "w"), ensure_ascii=False, indent=0)
print(len(out), "exercises")
