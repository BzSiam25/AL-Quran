"""
Rebuilds data/*.json and scripts/index-data.json from the quran-json npm package,
then injects the surah index into scripts/template.html to produce index.html.

Usage (from the project root):
    npm install quran-json
    python scripts/build_data.py
"""
import json, os

SRC = os.path.join("node_modules", "quran-json", "dist")
bn = json.load(open(os.path.join(SRC, "quran_bn.json"), encoding="utf-8"))
en = json.load(open(os.path.join(SRC, "quran_en.json"), encoding="utf-8"))
tr = json.load(open(os.path.join(SRC, "quran_transliteration.json"), encoding="utf-8"))

os.makedirs("data", exist_ok=True)
index = []
for b, e, t in zip(bn, en, tr):
    # each verse: [arabic, bangla, english, transliteration]
    verses = [[bv["text"], bv["translation"], ev["translation"], tv.get("transliteration", "")]
              for bv, ev, tv in zip(b["verses"], e["verses"], t["verses"])]
    with open(os.path.join("data", f"{b['id']}.json"), "w", encoding="utf-8") as f:
        json.dump(verses, f, ensure_ascii=False, separators=(",", ":"))
    # [number, arabic name, transliterated name, english meaning, bangla meaning, meccan/medinan, verse count]
    index.append([b["id"], b["name"], b["transliteration"], e["translation"], b["translation"], b["type"], b["total_verses"]])

idx = json.dumps(index, ensure_ascii=False, separators=(",", ":"))
open(os.path.join("scripts", "index-data.json"), "w", encoding="utf-8").write(idx)
tpl = open(os.path.join("scripts", "template.html"), encoding="utf-8").read()
page = tpl.replace("__INDEX__", idx)
cut = page.index("</style>") + len("</style>")
head = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
open("index.html", "w", encoding="utf-8").write(head + page[:cut] + "\n</head>\n<body>\n" + page[cut:] + "\n</body>\n</html>\n")
print("Built", len(index), "surahs")
