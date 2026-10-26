# Tailored

Coach d'échecs personnel pour maxthechessnoob (chess.com) : Stockfish trouve les coups, Maia 1900 dit s'ils sont humainement trouvables, l'app explique en français et entraîne sur tes propres erreurs.

App : https://maxlegav.github.io/tailored/

```
./setup.sh   # Stockfish, venv (chess, maia2), npm
./sync.sh    # fetch last 365 days, analyse new games, rebuild, deploy gh-pages + analysis-cache
```

Pipeline (Python 3, `.venv` with `chess`, `maia2`; Stockfish binary at `~/bin/stockfish`):

```
python3 fetch.py maxthechessnoob blitz 365                         # last 365 days, chess.com public API -> data/blitz.json
python3 analyze.py data/blitz.json data/blitz_analysis.jsonl       # Stockfish, resumable
.venv/bin/python profile.py data/blitz_analysis.jsonl              # mistakes -> data/profile.json
.venv/bin/python humanize.py data/profile.json                     # Maia 1900: is the best move findable?
.venv/bin/python build_data.py data/blitz_analysis.jsonl data/profile.json   # -> web/public/data.json (+ content/lessons.json)
cd web && npm install && npm run build                             # PWA in web/dist
```

- `classify.py`: per-move win% loss, severity, phase, clock, tactical/positional tags (from engine lines + board facts).
- `explain.py`: French explanations generated only from verified facts.
- `content/lessons.json`: lessons written by the coach (Devin) from the profile.
