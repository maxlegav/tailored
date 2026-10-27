"""Detect Silman imbalances on each training position (board facts only) -> data/silman.json {id: [[key, detail], ...]}."""
import json, sys
import chess

FILES = "abcdefgh"
def rel_rank(sq, c): r = chess.square_rank(sq); return r + 1 if c == chess.WHITE else 8 - r
def side(c, me): return "tu" if c == me else "il"

def passed(b, sq, c):
    f, r = chess.square_file(sq), chess.square_rank(sq)
    for s in b.pieces(chess.PAWN, not c):
        if abs(chess.square_file(s) - f) <= 1 and ((chess.square_rank(s) > r) if c == chess.WHITE else (chess.square_rank(s) < r)):
            return False
    return True

def outposts(b, c):
    out = []
    for sq in chess.SQUARES:
        if not 4 <= rel_rank(sq, c) <= 6 or chess.square_file(sq) in (0, 7): continue
        if not any(b.piece_at(a) == chess.Piece(chess.PAWN, c) for a in b.attackers(c, sq)): continue
        f, r = chess.square_file(sq), chess.square_rank(sq)
        if any(abs(chess.square_file(s) - f) == 1 and ((chess.square_rank(s) > r) if c == chess.WHITE else (chess.square_rank(s) < r))
               for s in b.pieces(chess.PAWN, not c)): continue
        p = b.piece_at(sq)
        if p and p.color == c and p.piece_type == chess.PAWN: continue
        out.append(sq)
    return out

def bad_bishop(b, c):
    for sq in b.pieces(chess.BISHOP, c):
        col = (chess.square_file(sq) + chess.square_rank(sq)) % 2
        same = [p for p in b.pieces(chess.PAWN, c) if (chess.square_file(p) + chess.square_rank(p)) % 2 == col]
        blocked = [p for p in same if b.piece_at(p + (8 if c == chess.WHITE else -8)) if 0 <= p + (8 if c == chess.WHITE else -8) < 64]
        mob = len(b.attacks(sq) & ~b.occupied_co[c])
        if len(same) >= 4 and len(blocked) >= 2 and mob <= 4: return sq
    return None

VAL = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9}
def material(b, c): return sum(len(b.pieces(t, c)) * v for t, v in VAL.items())
def undeveloped(b, c):
    home = [chess.B1, chess.G1, chess.C1, chess.F1] if c == chess.WHITE else [chess.B8, chess.G8, chess.C8, chess.F8]
    n = sum(1 for s in home if (p := b.piece_at(s)) and p.color == c and p.piece_type in (chess.KNIGHT, chess.BISHOP))
    k = b.king(c)
    return n + (1 if k in (chess.E1, chess.E8) else 0)
def space(b, c):
    return sum(1 for s in b.pieces(chess.PAWN, c) if chess.square_file(s) in (2, 3, 4, 5) and rel_rank(s, c) >= 5)

def detect(fen, me, move_no):
    b = chess.Board(fen); op = not me; out = []
    nb = {c: len(b.pieces(chess.BISHOP, c)) for c in (me, op)}; nn = {c: len(b.pieces(chess.KNIGHT, c)) for c in (me, op)}
    queens = bool(b.pieces(chess.QUEEN, me) or b.pieces(chess.QUEEN, op))
    # king in centre
    for c in (op, me):
        k = b.king(c)
        if move_no >= 10 and queens and k is not None and chess.square_file(k) in (3, 4) and rel_rank(k, c) <= 2:
            other = b.king(not c)
            if other is not None and chess.square_file(other) not in (3, 4):
                out.append(["roi_centre", "Son roi est resté au centre, le tien est à l'abri." if c == op else "Ton roi est encore au centre, le sien est à l'abri."])
                break
    # development
    if move_no <= 16:
        d = undeveloped(b, op) - undeveloped(b, me)
        if abs(d) >= 2: out.append(["developpement", "Tu as une avance de développement." if d > 0 else "Il a une avance de développement."])
    # material
    dm = material(b, me) - material(b, op)
    if abs(dm) >= 2: out.append(["materiel", f"Tu as {dm} points de matériel en plus." if dm > 0 else f"Tu as {-dm} points de matériel en moins."])
    # passed pawns
    for c in (me, op):
        ps = [s for s in b.pieces(chess.PAWN, c) if passed(b, s, c) and rel_rank(s, c) >= 4]
        if ps:
            s = max(ps, key=lambda x: rel_rank(x, c))
            out.append(["pion_passe", f"{'Tu as' if c == me else 'Il a'} un pion passé en {chess.square_name(s)}."]); break
    # isolated pawn
    for c in (op, me):
        files = [chess.square_file(s) for s in b.pieces(chess.PAWN, c)]
        iso = [s for s in b.pieces(chess.PAWN, c) if chess.square_file(s) in (2, 3, 4) and (chess.square_file(s) - 1) not in files and (chess.square_file(s) + 1) not in files]
        if iso:
            out.append(["pion_isole", f"{'Son' if c == op else 'Ton'} pion {chess.square_name(iso[0])} est isolé."]); break
    # doubled pawns
    for c in (op, me):
        files = [chess.square_file(s) for s in b.pieces(chess.PAWN, c)]
        dbl = sorted({f for f in files if files.count(f) > 1})
        if dbl:
            out.append(["pions_faibles", f"{'Il a' if c == op else 'Tu as'} des pions doublés en colonne {FILES[dbl[0]]}."]); break
    # minor pieces
    if nb[me] == 2 and nb[op] < 2: out.append(["paire_de_fous", "Tu as la paire de fous."])
    elif nb[op] == 2 and nb[me] < 2: out.append(["paire_de_fous", "Il a la paire de fous."])
    if nb[me] > nb[op] and nn[op] > nn[me]: out.append(["fou_cavalier", "Fou contre cavalier : tu as le fou."])
    elif nb[op] > nb[me] and nn[me] > nn[op]: out.append(["fou_cavalier", "Fou contre cavalier : tu as le cavalier."])
    if nb[me] == 1 and nb[op] == 1:
        cm = [(chess.square_file(s) + chess.square_rank(s)) % 2 for s in b.pieces(chess.BISHOP, me)][0]
        co = [(chess.square_file(s) + chess.square_rank(s)) % 2 for s in b.pieces(chess.BISHOP, op)][0]
        if cm != co: out.append(["fous_opposes", "Fous de couleurs opposées."])
    for c in (me, op):
        s = bad_bishop(b, c)
        if s is not None:
            out.append(["gros_pion", f"{'Ton' if c == me else 'Son'} fou {chess.square_name(s)} est bloqué derrière ses pions (un « gros pion »)."]); break
    # outposts
    if nn[me]:
        ops = outposts(b, me)
        occ = [s for s in ops if (p := b.piece_at(s)) and p.color == me and p.piece_type == chess.KNIGHT]
        if occ: out.append(["cavalier", f"Ton cavalier occupe l'avant-poste {chess.square_name(occ[0])}."])
        elif ops: out.append(["cavalier", f"Avant-poste pour ton cavalier : {', '.join(chess.square_name(s) for s in ops[:2])}."])
    if nn[op]:
        ops = outposts(b, op)
        if ops and not any(x[0] == "cavalier" for x in out): out.append(["cases_faibles", f"Case faible dans ton camp : {chess.square_name(ops[0])} (avant-poste pour son cavalier)."])
    # open files
    rooks = {c: b.pieces(chess.ROOK, c) | b.pieces(chess.QUEEN, c) for c in (me, op)}
    if b.pieces(chess.ROOK, me) or b.pieces(chess.ROOK, op):
        for f in range(8):
            if any(chess.square_file(s) == f for s in b.pieces(chess.PAWN, me) | b.pieces(chess.PAWN, op)): continue
            mine = any(chess.square_file(s) == f for s in b.pieces(chess.ROOK, me)); his = any(chess.square_file(s) == f for s in b.pieces(chess.ROOK, op))
            if mine and not his: d = f"Tu contrôles la colonne {FILES[f]} ouverte."
            elif his and not mine: d = f"Il contrôle la colonne {FILES[f]} ouverte."
            elif not mine and not his: d = f"Colonne {FILES[f]} ouverte : personne ne l'a encore prise."
            else: continue
            out.append(["colonne", d]); break
    # space
    ds = space(b, me) - space(b, op)
    if abs(ds) >= 2: out.append(["espace", "Tu as plus d'espace au centre." if ds > 0 else "Il a plus d'espace au centre : tu es à l'étroit."])
    return out[:4]

if __name__ == "__main__":
    data = json.load(open(sys.argv[1]))
    res = {m["id"]: detect(m["fen"], chess.WHITE if m["color"] == "white" else chess.BLACK, m["move_no"]) for m in data["mistakes"]}
    json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False)
    from collections import Counter
    print(len(res), Counter(k for v in res.values() for k, _ in v).most_common())
