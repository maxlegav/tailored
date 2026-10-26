"""'Le but de la position': goal/plan text per mistake, from verified board facts + Stockfish threat (null-move) search."""
import json, sys, os
from multiprocessing import Pool
import chess, chess.engine
from classify import winp, VAL, balance, pv_swing
from explain import NAMES, ton, san_line, hanging

SF = os.path.expanduser("~/bin/stockfish")
eng = None
def init():
    global eng
    eng = chess.engine.SimpleEngine.popen_uci(SF); eng.configure({"Threads": 1, "Hash": 32})

def wp(info, color):
    s = info["score"].pov(color)
    return 100.0 if s.is_mate() and s.mate() > 0 else 0.0 if s.is_mate() else winp(s.score())

def threat(b, color):
    """What the opponent would do if it were his move (null move). Returns (san, pv_uci, drop) or None."""
    if b.is_check(): return None
    n = b.copy(); n.push(chess.Move.null())
    if not any(True for _ in n.legal_moves): return None
    base = eng.analyse(b, chess.engine.Limit(depth=12))
    info = eng.analyse(n, chess.engine.Limit(depth=12))
    if "pv" not in info: return None
    drop = wp(base, color) - wp(info, color)
    mate = info["score"].pov(color).is_mate() and info["score"].pov(color).mate() < 0
    pvu = [m.uci() for m in info["pv"][:6]]
    swing, _ = pv_swing(n.fen(), pvu, color, 4)
    if drop < 15 or not (mate or swing <= -1): return None
    return n.san(info["pv"][0]), pvu, drop, n.fen(), mate

def mobility(b, sq):
    return len(b.attacks(sq))

def passed(b, sq, color):
    f, r = chess.square_file(sq), chess.square_rank(sq)
    for s in b.pieces(chess.PAWN, not color):
        sf, sr = chess.square_file(s), chess.square_rank(s)
        if abs(sf - f) <= 1 and (sr > r if color == chess.WHITE else sr < r): return False
    return True

def worst_piece(b, color):
    c = [(mobility(b, s), s, p) for s, p in b.piece_map().items() if p.color == color and p.piece_type in (chess.KNIGHT, chess.BISHOP, chess.ROOK)]
    return min(c, key=lambda x: x[0]) if c else None

def de(sq): return chess.square_name(sq)

def goal(m):
    color = chess.WHITE if m["color"] == "white" else chess.BLACK
    b = chess.Board(m["fen"]); best = chess.Move.from_uci(m["best"]); pv = m["best_pv"]
    piece = b.piece_at(best.from_square); out = []
    th = threat(b, color)
    after_best = b.copy(); after_best.push(best)
    # 1. Situation
    w = m["wp_before"]
    sit = "Tu es gagnant" if w >= 80 else "Tu es mieux" if w >= 62 else "La position est équilibrée" if w >= 38 else "Tu es moins bien" if w >= 20 else "Tu es perdant"
    if th:
        tsan, tpv, drop, nfen, mate = th
        what = "un mat" if mate else f"de jouer {tsan}"
        r = chess.Board(nfen); tm = chess.Move.from_uci(tpv[0])
        if not mate and r.is_capture(tm):
            cap = r.piece_at(tm.to_square)
            what = f"de prendre {ton(cap.piece_type)} en {de(tm.to_square)} avec {tsan}" if cap else what
        sit += f", mais l'adversaire menace {what} ({san_line(nfen, tpv, 4)})."
    else:
        sit += "."
    out.append(sit)
    # 2. Objective of the best move
    gb = b.gives_check(best); cap = b.piece_at(best.to_square)
    mate_line = "mat_manqué" in m["tags"]
    nxt = chess.Move.from_uci(pv[1]) if len(pv) > 1 else None
    recapture = nxt is not None and nxt.to_square == best.to_square
    bal0 = balance(b, color); t = b.copy()
    for u in pv[:6]:
        mv = chess.Move.from_uci(u)
        if mv not in t.legal_moves: break
        t.push(mv)
    gain = balance(t, color) - bal0
    solved = bool(th) and gain >= 0
    if mate_line:
        obj = f"Le but : mater. {m['best_san']} lance une attaque forcée sur le roi adverse."
    elif b.is_castling(best):
        obj = f"Le but : mettre ton roi à l'abri avant d'ouvrir le jeu. {m['best_san']} connecte aussi tes tours."
    elif cap and recapture and gain < 2:
        why = []
        if th and solved: why.append("l'échange supprime la menace")
        if bal0 >= 2: why.append("tu as plus de matériel, et chaque échange rapproche une finale gagnante")
        if mobility(b, best.to_square) >= mobility(b, best.from_square) and cap.piece_type == piece.piece_type: why.append(f"tu élimines {'une' if cap.piece_type in (chess.ROOK, chess.QUEEN) else 'un'} {NAMES[cap.piece_type]} adverse plus {'active' if cap.piece_type in (chess.ROOK, chess.QUEEN) else 'actif'} que {'la tienne' if cap.piece_type in (chess.ROOK, chess.QUEEN) else 'le tien'}")
        if not why: why.append("après l'échange, ses pièces restantes sont moins bien placées que les tiennes")
        obj = f"Le but : échanger. {m['best_san']} parce que " + " et ".join(why) + "."
    elif gain >= 2:
        obj = f"Le but : gagner du matériel. Après {m['best_san']}, la suite te rapporte environ {gain} point{'s' if gain > 1 else ''} ({san_line(m['fen'], pv, 6)})."
    elif th and solved:
        if piece.piece_type != chess.PAWN and th and chess.Move.from_uci(th[1][0]).to_square == best.from_square:
            obj = f"Le but : sauver {ton(piece.piece_type)} en l'amenant sur une case sûre, et si possible plus active ({de(best.to_square)})."
        else:
            obj = f"Le but : parer la menace d'abord. {m['best_san']} la neutralise ; ce n'est qu'ensuite que tu peux penser à ton plan."
    elif piece.piece_type == chess.PAWN and cap:
        obj = f"Le but : ouvrir le jeu. La prise {m['best_san']} casse la structure adverse et ouvre des lignes pour tes pièces."
    elif piece.piece_type == chess.PAWN and any(b.piece_at(s) and b.piece_at(s).piece_type == chess.PAWN and b.piece_at(s).color != color for s in after_best.attacks(best.to_square)):
        obj = f"Le but : faire une rupture. {m['best_san']} attaque la chaîne de pions adverse pour ouvrir des lignes là où tes pièces sont prêtes."
    elif piece.piece_type == chess.PAWN and passed(b, best.from_square, color):
        obj = f"Le but : pousser ton pion passé. Chaque case gagnée oblige l'adversaire à bloquer avec une pièce."
    elif piece.piece_type == chess.KING and m["phase"] == "finale":
        obj = f"Le but : activer ton roi. En finale, le roi est une pièce d'attaque : {m['best_san']} le rapproche du centre et des pions."
    elif gb:
        obj = f"Le but : garder l'initiative. L'échec {m['best_san']} force la réponse et ne lui laisse pas le temps d'exécuter son plan."
    elif piece.piece_type != chess.PAWN and mobility(after_best, best.to_square) >= mobility(b, best.from_square) + 2:
        obj = f"Le but : activer {ton(piece.piece_type)}. En {de(best.to_square)}, {('elle' if piece.piece_type in (chess.ROOK, chess.QUEEN) else 'il')} contrôle {mobility(after_best, best.to_square)} cases au lieu de {mobility(b, best.from_square)}."
    else:
        obj = f"Le but : améliorer ta position sans rien lâcher. {m['best_san']} prépare la suite {san_line(m['fen'], pv, 5)}."
    out.append(obj)
    # 3. Plan for the next moves
    if w >= 70:
        plan = "Ensuite : simplifie. Échange les pièces (surtout les dames), protège tout ce qui pend et ne cherche pas le coup spectaculaire."
    elif m["phase"] == "finale":
        pp = [s for s in b.pieces(chess.PAWN, color) if passed(b, s, color)]
        plan = "Ensuite : active ton roi" + (f" et pousse ton pion passé {de(pp[0])}" if pp else " et crée un pion passé là où tu as la majorité") + "."
    else:
        wpz = worst_piece(t, color); weak = hanging(t, not color)
        bits = []
        if weak: bits.append(f"vise {('sa ' if weak[0][0] in (chess.ROOK, chess.QUEEN) else 'son ')}{NAMES[weak[0][0]]} en {weak[0][1]}, mal protégé{'e' if weak[0][0] in (chess.ROOK, chess.QUEEN) else ''}")
        if b.king(color) in (chess.E1, chess.E8) and b.has_castling_rights(color): bits.append("roque pour mettre ton roi à l'abri et connecter tes tours")
        elif wpz and wpz[0] <= 4: bits.append(f"améliore {ton(wpz[2].piece_type)} en {de(wpz[1])}, ta pièce la moins active")
        plan = ("Ensuite : " + ", puis ".join(bits) + ".") if bits else ""
    if plan: out.append(plan)
    return " ".join(out)

def run(m):
    try: return m["id"], goal(m)
    except Exception as e: return m["id"], None

if __name__ == "__main__":
    ms = json.load(open(sys.argv[1]))["mistakes"]
    out = sys.argv[2]; cache = json.load(open(out)) if os.path.exists(out) else {}
    todo = [m for m in ms if m["id"] not in cache]
    if len(sys.argv) > 3: todo = todo[:int(sys.argv[3])]
    print(len(todo), "positions", flush=True)
    with Pool(8, initializer=init) as p:
        for i, (k, g) in enumerate(p.imap_unordered(run, todo, chunksize=4)):
            if g: cache[k] = g
            if i % 200 == 0: print(i, flush=True)
    json.dump(cache, open(out, "w"), ensure_ascii=False)
