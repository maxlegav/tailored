"""Turn verified engine facts into French coaching text. Only states facts computed from the board."""
import chess

NAMES = {chess.PAWN: "pion", chess.KNIGHT: "cavalier", chess.BISHOP: "fou", chess.ROOK: "tour", chess.QUEEN: "dame", chess.KING: "roi"}
FEM = {chess.ROOK, chess.QUEEN}
def ton(pt): return ("ta " if pt in FEM else "ton ") + NAMES[pt]
def il(pt): return "elle" if pt in FEM else "il"
def protege(pt): return "protégée" if pt in FEM else "protégé"
CHEAP = {"pièce_déplacée_en_prise", "matériel_perdu", "mat_concédé", "fourchette_subie"}
VAL = {chess.PAWN: 1, chess.KNIGHT: 3, chess.BISHOP: 3, chess.ROOK: 5, chess.QUEEN: 9, chess.KING: 0}

def san_line(fen, pv, n=6):
    b = chess.Board(fen); out = []
    for u in pv[:n]:
        m = chess.Move.from_uci(u)
        if m not in b.legal_moves: break
        num = f"{b.fullmove_number}." if b.turn == chess.WHITE else (f"{b.fullmove_number}..." if not out else "")
        out.append(f"{num}{b.san(m)}"); b.push(m)
    return " ".join(out)

def hanging(board, color):
    """Pieces of `color` attacked and insufficiently defended (simple count)."""
    res = []
    for sq, p in board.piece_map().items():
        if p.color != color or p.piece_type == chess.KING: continue
        att = board.attackers(not color, sq)
        if not att: continue
        dfd = board.attackers(color, sq)
        cheapest = min(VAL[board.piece_at(a).piece_type] for a in att)
        if not dfd or cheapest < VAL[p.piece_type]:
            res.append((p.piece_type, chess.square_name(sq)))
    return res

def explain(m):
    """m: a mistake record from classify.py (with humanize.py fields)."""
    color = chess.WHITE if m["color"] == "white" else chess.BLACK
    b = chess.Board(m["fen"]); played = chess.Move.from_uci(m["uci"])
    after = b.copy(); after.push(played)
    parts = []
    loss = m["loss"]
    num = f"{m['move_no']}." if color == chess.WHITE else f"{m['move_no']}..."
    parts.append(f"Coup {num}{m['san']} : tes chances de gain passent de {m['wp_before']:.0f}% à {m['wp_after']:.0f}%.")
    tags = m["tags"]
    refut = san_line(after.fen(), m["refutation"])
    best = san_line(m["fen"], m["best_pv"])
    if "mat_concédé" in tags:
        parts.append(f"Ce coup permet un mat forcé : {refut}.")
    elif "pièce_déplacée_en_prise" in tags:
        p = after.piece_at(played.to_square)
        parts.append(f"{ton(p.piece_type).capitalize()} va sur {chess.square_name(played.to_square)}, où {il(p.piece_type)} n'est pas assez {protege(p.piece_type)}. Réponse de l'adversaire : {refut}.")
    elif "matériel_perdu" in tags or "fourchette_subie" in tags:
        hb = hanging(b, color); ha = hanging(after, color)
        new = [h for h in ha if h not in hb]
        if "fourchette_subie" in tags:
            parts.append(f"Ce coup autorise une fourchette : {refut}.")
        elif hb and not new:
            parts.append(f"Une menace existait déjà sur {ton(hb[0][0])} en {hb[0][1]} et ton coup ne la traite pas. Suite : {refut}.")
        else:
            parts.append(f"Ce coup perd du matériel : {refut}.")
    if "mat_manqué" in tags:
        parts.append(f"Il y avait un mat : {best}.")
    elif "fourchette_manquée" in tags:
        parts.append(f"Tu avais une fourchette : {best}.")
    elif "tactique_manquée" in tags:
        parts.append(f"Tu pouvais gagner du matériel : {best}.")
    if "avantage_gâché" in tags:
        parts.append("Tu étais gagnant : dans ce genre de position, cherche d'abord à simplifier et à neutraliser le contre-jeu.")
    POS = {"roque_affaibli": "Ce coup de pion affaiblit l'abri de ton roi : chaque pion avancé devant le roque crée des cases faibles que l'adversaire pourra occuper.",
           "structure_abîmée": "Ce coup te laisse un pion isolé ou doublé, une faiblesse durable que l'adversaire pourra attaquer.",
           "paire_de_fous_cédée": "Tu rends la paire de fous sans compensation : dans une position ouverte, deux fous valent souvent plus qu'un fou et un cavalier.",
           "échange_mal_choisi": "Cet échange aide l'adversaire : demande-toi toujours quelle pièce sort du jeu et laquelle reste. Échange tes mauvaises pièces, garde les bonnes.",
           "pièce_passive": "Après ce coup, ta pièce contrôle beaucoup moins de cases : une pièce passive, c'est une pièce en moins.",
           "poussée_prématurée": "Cette poussée de pion est prématurée : un pion ne recule jamais, et chaque poussée laisse des cases derrière lui.",
           "roi_mal_placé": "Ce déplacement du roi le met sur une mauvaise case.",
           "plan_flou": "Ce coup ne fait rien de concret, et l'adversaire en profite pour améliorer sa position."}
    sub = next((t for t in tags if t in POS), None)
    if sub:
        parts.append(POS[sub] + f" Le plan du moteur : {best}.")
    else:
        parts.append(f"Meilleur coup : **{m['best_san']}** ({best}).")
    if CHEAP & set(tags):
        parts.append("Ce n'est pas une question de niveau : une vérification de sécurité avant de jouer (« qu'est-ce qui est attaqué ? qu'est-ce que je laisse sans protection ? ») suffit à l'éviter.")
    elif m.get("findable") is False:
        parts.append("Note : ce coup est difficile à trouver même pour un joueur de 1900, pas de panique.")
    elif m.get("findable"):
        parts.append(f"Un joueur de ton niveau trouve {m['best_san']} dans {m['p_best_human']*100:.0f}% des cas : c'est un point à corriger.")
    if "zeitnot" in tags:
        parts.append(f"Il te restait {m['clk']:.0f} s à la pendule.")
    return " ".join(parts)

if __name__ == "__main__":
    import json, sys
    d = json.load(open(sys.argv[1]))
    for x in [x for x in d["mistakes"] if x["sev"] == "gaffe"][:6]:
        print("-", explain(x), x["url"], "\n")
