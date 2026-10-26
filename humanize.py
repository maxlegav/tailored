import json, sys, warnings
warnings.filterwarnings("ignore")
from maia2 import model, inference
ELO = int(sys.argv[2]) if len(sys.argv) > 2 else 1900
m = model.from_pretrained(type="blitz", device="cpu", save_root="./maia2_models")
prep = inference.prepare()
d = json.load(open(sys.argv[1]))
for x in d["mistakes"]:
    probs, _ = inference.inference_each(m, prep, x["fen"], ELO, ELO)
    x["p_best_human"] = round(probs.get(x["best"], 0.0), 3)
    x["p_played_human"] = round(probs.get(x["uci"], 0.0), 3)
    x["human_top"] = list(probs.items())[:3]
    # findable: a 1900 plays the engine move often enough
    x["findable"] = x["p_best_human"] >= 0.15
json.dump(d, open(sys.argv[1], "w"), ensure_ascii=False)
f = [x for x in d["mistakes"] if x["sev"] in ("gaffe", "erreur")]
print(len(f), "serious;", sum(x["findable"] for x in f), "findable by a 1900")
