"""One-off: Silman exercise positions recognised from the PDF diagrams (PDF kept outside the repo) -> content/silman_exercises.json.
Stores only positions, exercise numbers, page refs and engine checks, no book text.
Usage: silman_book.py recog_final.json diagrams.json old_exercises.json exercises_pages.json"""
import json, os, sys
import chess, chess.engine
R, D, OLD, EXP = (json.load(open(a)) for a in sys.argv[1:5])
FIX = {"diag/2_10.png": {"c4": "P"}, "diag/2_12.png": {"c8": "q"}, "diag/6_02.png": {"g8": "k", "d3": "B"}}
SKIP = {"diag/4_02.png", "diag/6_04.png"}
CH = {2: "Les pièces légères", 3: "Tours et colonnes", 4: "Divagations psychologiques", 5: "Le tir à la cible",
      6: "La dualité statique-dynamique", 7: "L'espace", 8: "Les pions passés", 9: "Les autres déséquilibres"}
SOL = {3: 476, 4: 484, 5: 527, 6: 539, 7: 553, 8: 563, 9: 575}
SEC = {2: 52, 3: 131, 4: 155, 5: 274, 6: 298, 7: 350, 8: 386, 9: 421}
def concept(ch, n):
    if ch == 2: return "cavalier" if n <= 9 else "gros_pion" if n <= 16 else "fou_cavalier"
    if ch == 4: return "materiel" if n <= 9 else "menaces" if n <= 15 else "initiative" if n <= 22 else "patience"
    if ch == 9: return "ouverture" if n <= 5 else "desequilibres"
    return {3: "colonne", 5: "pions_faibles", 6: "statique_dynamique", 7: "espace", 8: "pion_passe"}[ch]
def sol_page(ch, n): return SOL[ch] if ch != 2 else (431 if n <= 9 else 443 if n <= 16 else 455)
expage = {(a, b): c for a, b, c, _ in EXP}
old = {e["fen"].split()[0]: e for e in OLD}
eng = chess.engine.SimpleEngine.popen_uci(os.path.expanduser("~/bin/stockfish")); eng.configure({"Threads": 8})
out = []
for d in sorted(D, key=lambda x: (x["ch"], x["n"])):
    f = d["file"]; r = R.get(f)
    if not r or f in SKIP: continue
    b = chess.Board(r["fen"] + " w - - 0 1")
    for sq, p in FIX.get(f, {}).items(): b.set_piece_at(chess.parse_square(sq), chess.Piece.from_symbol(p))
    o = old.get(b.board_fen())
    side = d["side"] or (o and o["color"][0])
    if not side: continue
    b.turn = side == "w"
    # castling rights when king and rook stand on their home squares
    cr = "".join(c for c, k, rk in (("K", "e1", "h1"), ("Q", "e1", "a1"), ("k", "e8", "h8"), ("q", "e8", "a8"))
                 if b.piece_at(chess.parse_square(k)) == chess.Piece.from_symbol("K" if c.isupper() else "k")
                 and b.piece_at(chess.parse_square(rk)) == chess.Piece.from_symbol("R" if c.isupper() else "r"))
    b.set_castling_fen(cr or "-")
    if not b.is_valid() or b.is_game_over(): print("invalid", f); continue
    infos = eng.analyse(b, chess.engine.Limit(nodes=4_000_000), multipv=4)
    sc = lambda i: i["score"].pov(b.turn).score(mate_score=10000)
    best = sc(infos[0]); good = [i["pv"][0].uci() for i in infos if best - sc(i) <= 40]
    e = {"id": f"silman-{d['ch']}-{d['n']}", "fen": b.fen(), "color": "white" if b.turn else "black", "ch": d["ch"], "n": d["n"],
         "chapter": CH[d["ch"]], "concept": concept(d["ch"], d["n"]), "ex_page": expage.get((d["ch"], d["n"]), SEC[d["ch"]]),
         "page": o["page"] if o else sol_page(d["ch"], d["n"]), "sol_exact": bool(o), "level": o and o.get("level"),
         "best_san": b.san(infos[0]["pv"][0]), "best_pv": [m.uci() for m in infos[0]["pv"][:8]], "eval": best, "good": good}
    if o:
        e["book_move"], e["book_uci"] = o["book_move"], o["book_uci"]
        if o["book_uci"] not in good: e["good"].append(o["book_uci"])
    out.append(e)
eng.quit()
json.dump(out, open("content/silman_exercises.json", "w"), ensure_ascii=False, indent=0)
print(len(out), "exercises,", sum(1 for e in out if e.get("book_move")), "with Silman's move")
