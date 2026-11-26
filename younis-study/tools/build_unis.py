"""Builds data/unis/ (the world university directory) from the open Hipo dataset.

Source: https://github.com/Hipo/university-domains-list (MIT License, see data/unis/LICENSE.txt).
Output:
  data/unis/index.json   -> [["JO", 29], ["SA", 63], ...]   country code + number of universities
  data/unis/JO.json      -> [["Al-Ahliyya Amman University", "ammanu.edu.jo"], ...]
One small file per country, so the website downloads only the country the student picks.

    python3 tools/build_unis.py path/to/world_universities_and_domains.json
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "unis"


def main(src: str) -> None:
    rows = json.loads(pathlib.Path(src).read_text(encoding="utf8"))
    by_cc: dict[str, dict[str, str]] = {}
    for r in rows:
        cc = (r.get("alpha_two_code") or "").upper()
        name = " ".join((r.get("name") or "").split())
        if len(cc) != 2 or not name:
            continue
        domain = (r.get("domains") or [""])[0].lower()
        by_cc.setdefault(cc, {}).setdefault(name, domain)  # drop exact duplicates
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("??.json"):
        old.unlink()
    index = []
    for cc, unis in sorted(by_cc.items()):
        items = sorted(([n, d] for n, d in unis.items()), key=lambda x: x[0].lower())
        (OUT / f"{cc}.json").write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
        index.append([cc, len(items)])
    (OUT / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf8")
    total = sum(n for _, n in index)
    print(f"{total} universities in {len(index)} countries -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1])
