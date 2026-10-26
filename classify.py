import json, math, sys, collections
import chess
from positional import subtype

VAL = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}
NAMES = {chess.PAWN: "pion", chess.KNIGHT: "cavalier", chess.BISHOP: "fou", chess.ROOK: "tour", chess.QUEEN: "dame", chess.KING: "roi"}

def cp_of(s, pov_white):
    if "mate" in s:
        m = s["mate"]; v = 10000 - abs(m) * 10
        v = v if m > 0 else -v
    else:
        v = s["cp"]
    return v if pov_white else -v

def winp(cp):
    cp = max(-1000, min(1000, cp))
    return 50 + 50 * (2 / (1 + math.exp(-0.00368208 * cp)) - 1)

def material(board, color):
    return sum(VAL[p.piece_type] for p in board.piece_map().values() if p.color == color)

def balance(board, color):
    return material(board, color) - material(board, not color)

def nonpawn(board):
    return sum(VAL[p.piece_type] for p in board.piece_map().values() if p.piece_type not in (chess.PAWN, chess.KING))

def phase(board, ply):
    if ply < 20 and nonpawn(board) >= 50: return "ouverture"
    if nonpawn(board) <= 26: return "finale"
    return "milieu"

def pv_swing(fen, pv, color, depth=8):
    b = chess.Board(fen); start = balance(b, color); worst = best = start
    events = []
    for u in pv[:depth]:
        m = chess.Move.from_uci(u)
        if m not in b.legal_moves: break
        mover = b.turn
        if b.is_capture(m):
            cap = b.piece_at(m.to_square) or chess.Piece(chess.PAWN, not mover)
            events.append(("capture", mover, cap.piece_type, chess.square_name(m.to_square)))
        b.push(m)
        # fork: moved piece attacks >=2 enemy pieces worth more than pawn (or king)
        pt = b.piece_at(m.to_square)
        if pt:
            targets = [b.piece_at(s) for s in b.attacks(m.to_square) if b.piece_at(s) and b.piece_at(s).color != mover]
            big = [t for t in targets if t.piece_type == chess.KING or VAL[t.piece_type] >= max(3, VAL[pt.piece_type])]
            if len(big) >= 2: events.append(("fork", mover, pt.piece_type, chess.square_name(m.to_square)))
        bal = balance(b, color); worst = min(worst, bal); best = max(best, bal)
    return balance(b, color) - start, events

def classify_game(g):
    color = chess.WHITE if g["color"] == "white" else chess.BLACK
    plies = g["plies"]; out = []
    max_wp = 0
    for i, p in enumerate(plies[:-1]):
        b = chess.Board(p["fen"])
        if b.turn != color or not p["top"] or not plies[i+1]["top"] and not chess.Board(plies[i+1]["fen"]).is_game_over():
            continue
        best = p["top"][0]
        before = winp(cp_of(best["s"], color == chess.WHITE))
        max_wp = max(max_wp, before)
        nb = chess.Board(plies[i+1]["fen"])
        if nb.is_checkmate(): after = 100
        elif nb.is_game_over(): after = 50
        else: after = winp(cp_of(plies[i+1]["top"][0]["s"], color == chess.WHITE))
        loss = max(0, before - after)
        sev = "gaffe" if loss >= 30 else "erreur" if loss >= 20 else "imprécision" if loss >= 10 else None
        rec = {"ply": i, "move_no": i // 2 + 1, "san": p["san"], "uci": p["move"], "best": best["uci"],
               "best_san": b.san(chess.Move.from_uci(best["uci"])), "wp_before": round(before, 1), "wp_after": round(after, 1),
               "loss": round(loss, 1), "sev": sev, "phase": phase(b, i), "clk": p.get("clk"), "fen": p["fen"]}
        if sev:
            tags = []
            refut = plies[i+1]["top"][0]["pv"] if plies[i+1]["top"] else []
            r_swing, r_ev = pv_swing(plies[i+1]["fen"], refut, color)
            b_swing, b_ev = pv_swing(p["fen"], best["pv"], color)
            nt = plies[i+1]["top"][0]["s"] if plies[i+1]["top"] else None
            if nt and "mate" in nt and cp_of(nt, color == chess.WHITE) < 0: tags.append("mat_concédé")
            if "mate" in best["s"] and cp_of(best["s"], color == chess.WHITE) > 0: tags.append("mat_manqué")
            if r_swing <= -2:
                moved_sq = chess.Move.from_uci(p["move"]).to_square
                first_cap = next((e for e in r_ev if e[0] == "capture" and e[1] != color), None)
                if first_cap and first_cap[3] == chess.square_name(moved_sq): tags.append("pièce_déplacée_en_prise")
                else: tags.append("matériel_perdu")
            if r_swing <= -2 and any(e[0] == "fork" and e[1] != color for e in r_ev): tags.append("fourchette_subie")
            if b_swing >= 2 and r_swing > -2: tags.append("tactique_manquée")
            if b_swing >= 2 and any(e[0] == "fork" and e[1] == color for e in b_ev): tags.append("fourchette_manquée")
            if before >= 70 and after < 60: tags.append("avantage_gâché")
            if not tags: tags += ["positionnel", subtype(p["fen"], p["move"], color)]
            if p.get("clk") is not None and p["clk"] < 20: tags.append("zeitnot")
            bm = chess.Move.from_uci(best["uci"])
            rec["best_forcing"] = b.is_capture(bm) or b.gives_check(bm)
            rec["gap2"] = round(before - winp(cp_of(p["top"][1]["s"], color == chess.WHITE)), 1) if len(p["top"]) > 1 else None
            rec["good"] = [t["uci"] for t in p["top"] if before - winp(cp_of(t["s"], color == chess.WHITE)) < 4]
            rec["tags"] = tags; rec["refutation"] = refut[:8]; rec["best_pv"] = best["pv"][:8]
        out.append(rec)
    return out, max_wp

if __name__ == "__main__":
    for line in open(sys.argv[1]):
        g = json.loads(line); moves, mw = classify_game(g)
        for m in moves:
            if m["sev"]: print(g["color"], m["move_no"], m["san"], "best", m["best_san"], m["loss"], m["sev"], m["phase"], m["clk"], m["tags"])
