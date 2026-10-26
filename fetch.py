import json, urllib.request, time, sys
UA = {"User-Agent": "tailored-chess-coach (maxlemgav@gmail.com)"}
user, tc, days = sys.argv[1], sys.argv[2], int(sys.argv[3])
since = time.time() - days * 86400
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA)))
arch = get(f"https://api.chess.com/pub/player/{user}/games/archives")["archives"]
games = []
for u in reversed(arch):
    y, m = map(int, u.split("/")[-2:])
    if (y, m) < tuple(map(int, time.strftime("%Y %m", time.gmtime(since)).split())): break
    games += [x for x in get(u)["games"] if x.get("time_class") == tc and x.get("rules") == "chess" and x["end_time"] >= since]
    time.sleep(0.3)
games.sort(key=lambda x: -x["end_time"])
json.dump(games, open(f"data/{tc}.json", "w"))
print(len(games), "games; from", time.strftime("%Y-%m-%d", time.gmtime(games[-1]["end_time"])), "to", time.strftime("%Y-%m-%d", time.gmtime(games[0]["end_time"])))
