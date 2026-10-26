"""Sub-classify 'positionnel' mistakes using board features (verified, no engine guessing)."""
import chess

def pawn_files(b, c): return [chess.square_file(s) for s in b.pieces(chess.PAWN, c)]
def isolated(b, c):
    f = pawn_files(b, c); return sum(1 for x in f if (x - 1) not in f and (x + 1) not in f)
def doubled(b, c):
    f = pawn_files(b, c); return sum(f.count(x) - 1 for x in set(f))
def king_shield(b, c):
    k = b.king(c)
    if k is None: return 0
    r = 1 if c == chess.WHITE else -1; n = 0
    for df in (-1, 0, 1):
        for dr in (1, 2):
            f, rk = chess.square_file(k) + df, chess.square_rank(k) + r * dr
            if 0 <= f < 8 and 0 <= rk < 8:
                p = b.piece_at(chess.square(f, rk)); n += bool(p and p.piece_type == chess.PAWN and p.color == c)
    return n
def mobility(b, c):
    t = b.copy(); t.turn = c; return t.legal_moves.count()

def subtype(fen, uci, color):
    b = chess.Board(fen); m = chess.Move.from_uci(uci); a = b.copy(); a.push(m)
    p = b.piece_at(m.from_square); opp = not color
    if p.piece_type == chess.PAWN and king_shield(a, color) < king_shield(b, color) and b.king(color) in (chess.G1, chess.H1, chess.B1, chess.C1, chess.G8, chess.H8, chess.B8, chess.C8):
        return "roque_affaibli"
    if isolated(a, color) + doubled(a, color) > isolated(b, color) + doubled(b, color):
        return "structure_abîmée"
    if b.is_capture(m) and len(b.pieces(chess.BISHOP, color)) == 2 and p.piece_type == chess.BISHOP:
        return "paire_de_fous_cédée"
    if b.is_capture(m) and p.piece_type != chess.PAWN:
        return "échange_mal_choisi"
    if p.piece_type != chess.PAWN and mobility(a, color) < mobility(b, color) - 4:
        return "pièce_passive"
    if p.piece_type == chess.PAWN:
        return "poussée_prématurée"
    if p.piece_type == chess.KING:
        return "roi_mal_placé"
    return "plan_flou"
