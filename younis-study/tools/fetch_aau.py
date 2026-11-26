"""Builds data/catalog/aau.json from Al-Ahliyya Amman University's official website.

What it does, step by step:
  1. Reads the list of undergraduate programs (English page).
  2. For each program, opens its page to find the official study-plan link and the Arabic page.
  3. Reads the study plan in English and in Arabic, and keeps every course:
     code, English name, Arabic name, credit hours, requirement group, prerequisites.
  4. Writes one compact JSON file the website loads when a student picks AAU.

Run it again whenever the university updates its plans:
    python3 tools/fetch_aau.py
Downloaded pages are cached in .cache/aau/ so a re-run only re-downloads with --fresh.
"""
import datetime
import hashlib
import html
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request

from bs4 import BeautifulSoup

BASE = "https://www.ammanu.edu.jo"
LIST_URL = BASE + "/admission/undergraduate-programs/"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "catalog" / "aau.json"
CACHE = ROOT / ".cache" / "aau"
UA = "Mozilla/5.0 (compatible; study-catalog-fetcher/1.0)"
FRESH = "--fresh" in sys.argv


def get(url: str) -> str:
    """Download a page (politely, one at a time) and cache it on disk."""
    CACHE.mkdir(parents=True, exist_ok=True)
    key = CACHE / (hashlib.sha256(url.encode()).hexdigest()[:24] + ".html")
    if key.exists() and not FRESH:
        return key.read_text(encoding="utf8")
    parts = urllib.parse.urlsplit(url)
    safe = urllib.parse.urlunsplit((parts.scheme, parts.netloc, urllib.parse.quote(parts.path), parts.query, ""))
    req = urllib.request.Request(safe, headers={"User-Agent": UA, "Accept-Language": "en,ar"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40 + attempt * 40) as r:
                text = r.read().decode("utf8", "replace")
            key.write_text(text, encoding="utf8")
            time.sleep(0.6)  # be gentle with the university's server
            return text
        except Exception as err:  # network hiccup: wait and retry
            if attempt == 3:
                raise
            print(f"  retry {attempt + 1} for {url}: {err}")
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("unreachable")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(text or "")).strip()


def soup(url: str) -> BeautifulSoup:
    return BeautifulSoup(get(url), "html.parser")


def arabic_link(page: BeautifulSoup) -> str | None:
    a = page.select_one("a.lang")
    if not a or not a.get("href"):
        return None
    return urllib.parse.urljoin(BASE, html.unescape(a["href"]))


KEYS = [  # words in the English or Arabic group title -> stable key (order matters)
    ("remedial", ["remedial", "استدراك"]),
    ("complementary", ["complementary", "تكميل"]),
    ("university", ["university", "جامعة"]),
    ("ancillary", ["ancillary", "supporting", "مساند"]),
    ("faculty", ["faculty", "college", "كلية"]),
    ("major", ["major", "specialization", "track", "تخصص", "المسار"]),
]


def group_key(*labels: str) -> str:
    text = " ".join(labels).lower()
    return next((k for k, words in KEYS if any(w in text for w in words)), "other")


CODE = re.compile(r"[A-Za-z]{0,3}\d{5,10}")


def parse_plan(page: BeautifulSoup) -> list[dict]:
    """Returns [{label, kind, hours, courses:[{code,name,cr,pre}]}] in page order."""
    out = []
    for el in page.find_all(["h1", "table"]):
        if el.name == "h1" and "sectiontitle" in (el.get("class") or []):
            t = clean(el.get_text(" "))
            hours = int((re.search(r"(\d+)\s*(?:Credit|ساعة|ساعات)", t) or re.search(r"(\d+)", t) or [0, 0])[1])
            if "heading12" in el["class"]:
                label = re.split(r"\s+-\s+|\s*وهي بواقع", t)[0].strip(" -:") if not t.startswith("-") else ""
                out.append({"label": label, "kind": None, "hours": hours, "courses": []})
            elif out:
                kind = "elective" if re.search(r"elective|اختياري", t, re.I) else "compulsory"
                if out[-1]["kind"] is None:
                    out[-1].update(kind=kind, hours=hours)
                else:
                    out.append({"label": out[-1]["label"], "kind": kind, "hours": hours, "courses": []})
        elif el.name == "table" and out:
            for tr in el.find_all("tr"):
                cells = {td.get("data-label", ""): clean(td.get_text(" ")) for td in tr.find_all("td")}
                if not cells:
                    continue
                vals = list(cells.values())
                code = cells.get("Course Code") or vals[0]
                if not CODE.fullmatch(code or ""):
                    continue
                out[-1]["courses"].append({
                    "code": code,
                    "name": cells.get("Course Name") or vals[1],
                    "cr": int(re.sub(r"\D", "", cells.get("Credit hours") or vals[2]) or 0),
                    "pre": cells.get("Pre-requisite", vals[3] if len(vals) > 3 else ""),
                })
    return [g for g in out if g["courses"]]


def resolve_prereqs(text: str, by_name: dict[str, str]) -> list[str]:
    """Turns "Data Structures, Algorithms Analysis and Design" into course codes.
    Course names can contain "and", so try each comma part whole before splitting it on "and"."""
    codes = []
    for part in re.split(r"\s*[,،/]\s*", text or ""):
        p = part.strip().lower()
        if not p:
            continue
        if p in by_name:
            codes.append(by_name[p])
            continue
        codes += [by_name[x.strip()] for x in re.split(r"\s+and\s+", p) if x.strip() in by_name]
    return list(dict.fromkeys(codes))


def main() -> None:
    listing = soup(LIST_URL)
    cards = []
    for card in listing.select("div.card.Program"):
        name = clean(card.select_one(".programgname").get_text())
        fac = clean(card.select_one(".heading16").get_text())
        nums = [clean(h.get_text()) for h in card.select("h3.heading10")]
        hours = int(re.sub(r"\D", "", nums[-1]) or 0) if nums else 0
        more = card.find_parent("div", class_="d-grid").select_one("a.programgmore")
        cards.append({"en": name, "fac": fac, "hours": hours, "url": urllib.parse.urljoin(BASE, more["href"])})
    print(f"{len(cards)} programs on the official list")

    faculties: dict[str, dict] = {}
    courses: dict[str, dict] = {}
    programs = []
    for i, c in enumerate(cards, 1):
        print(f"[{i}/{len(cards)}] {c['en']}")
        page = soup(c["url"])
        plan_a = page.find("a", href=re.compile(r"study-plan/\?major_no="))
        ar_url = arabic_link(page)
        ar_page = soup(ar_url) if ar_url else None
        title = ar_page.select_one("h1.card-title") if ar_page else None
        ar_name = clean(title.get_text()) if title else ""
        ar_fac = ""
        if ar_page:
            for h in ar_page.select("h1"):
                t = clean(h.get_text())
                if t.startswith("كلية") or "كلية" in t[:12]:
                    ar_fac = t
                    break
        f = faculties.setdefault(c["fac"], {"en": c["fac"], "ar": ar_fac})
        if ar_fac and not f["ar"]:
            f["ar"] = ar_fac
        prog = {
            "id": c["url"].rstrip("/").split("/")[-1],
            "en": c["en"],
            "ar": ar_name,
            "fac": c["fac"],
            "hours": c["hours"],
            "degree": "diploma" if "diploma" in c["en"].lower() else "bachelor",
            "page": c["url"],
        }
        if not plan_a:
            print("   no study plan link")
            programs.append(prog)
            continue
        plan_url = urllib.parse.urljoin(BASE, html.unescape(plan_a["href"]))
        try:
            plan_page = soup(plan_url)
        except Exception as err:  # the server sometimes times out on one plan: keep going, re-run later
            print(f"   could not download the plan ({err}); run again to retry")
            programs.append(prog)
            continue
        groups = parse_plan(plan_page)
        ar_plan_url = arabic_link(plan_page)
        ar_names: dict[str, str] = {}
        ar_groups: list[dict] = []
        if ar_plan_url:
            try:
                ar_groups = parse_plan(soup(ar_plan_url))
                for g in ar_groups:
                    for co in g["courses"]:
                        ar_names[co["code"]] = co["name"]
            except Exception as err:
                print(f"   Arabic plan unavailable ({err})")
        same_shape = len(ar_groups) == len(groups)
        by_name = {co["name"].lower(): co["code"] for g in groups for co in g["courses"]}
        prog["plan"] = plan_url
        prog["groups"] = []
        for gi, g in enumerate(groups):
            ar_label = ar_groups[gi]["label"] if same_shape else ""
            prog["groups"].append({
                "g": group_key(g["label"], ar_label),
                "label": {"en": g["label"] or ar_label, "ar": ar_label or g["label"]},
                "k": g["kind"] or "compulsory",
                "h": g["hours"],
                "c": [co["code"] for co in g["courses"]],
            })
            for co in g["courses"]:
                ar = ar_names.get(co["code"], "")
                entry = courses.setdefault(co["code"], {"en": co["name"] or ar, "ar": ar or co["name"], "cr": co["cr"]})
                if not entry["en"] and co["name"]:
                    entry["en"] = co["name"]
                if (not entry["ar"] or entry["ar"] == entry["en"]) and ar:
                    entry["ar"] = ar
                pre = resolve_prereqs(co["pre"], by_name)
                pre = [p for p in pre if p != co["code"]]
                if pre:
                    prog.setdefault("pre", {})[co["code"]] = pre
        total = sum(g["h"] for g in prog["groups"] if g["g"] not in ("complementary", "remedial"))
        print(f"   {sum(len(g['c']) for g in prog['groups'])} courses, plan hours {total}, official {c['hours']}")
        programs.append(prog)

    data = {
        "id": "aau",
        "name": {"en": "Al-Ahliyya Amman University", "ar": "جامعة عمّان الأهلية"},
        "country": "JO",
        "domain": "ammanu.edu.jo",
        "source": LIST_URL,
        "fetched": datetime.date.today().isoformat(),
        "verified": True,
        "faculties": list(faculties.values()),
        "programs": programs,
        "courses": courses,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"wrote {OUT} ({OUT.stat().st_size // 1024} KB): {len(programs)} programs, {len(courses)} unique courses")


if __name__ == "__main__":
    main()
