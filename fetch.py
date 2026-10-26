import json, urllib.request, time, sys
UA = {"User-Agent": "chess-coach (maxlemgav@gmail.com)"}
user, tc, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA)))
arch = get(f"https://api.chess.com/pub/player/{user}/games/archives")["archives"]
games = []
for u in reversed(arch):
    g = [x for x in get(u)["games"] if x.get("time_class") == tc and x.get("rules") == "chess"]
    games = sorted(g, key=lambda x: x["end_time"]) + games if False else games + sorted(g, key=lambda x: -x["end_time"])
    if len(games) >= n: break
    time.sleep(0.3)
games = games[:n]
json.dump(games, open(f"data/{tc}.json", "w"))
print(len(games), "games; from", time.strftime("%Y-%m-%d", time.gmtime(games[-1]["end_time"])), "to", time.strftime("%Y-%m-%d", time.gmtime(games[0]["end_time"])))
