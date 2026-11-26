"""Builds the standalone website (GitHub Pages) into ../docs from the source parts in src/."""
import json, os, re, pathlib

BASE = pathlib.Path(__file__).parent
SRC = BASE / "src"
OUT = BASE.parent / "docs"
(OUT / "js").mkdir(parents=True, exist_ok=True)
(OUT / "icons").mkdir(parents=True, exist_ok=True)

def read(name):
    return (SRC / name).read_text(encoding="utf8")

def strip_script_tags(js):
    return "\n".join(l for l in js.split("\n") if l.strip() not in ("<script>", "</script>"))

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
       "font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://api.anthropic.com; "
       "worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; object-src 'none'; "
       "base-uri 'none'; form-action 'none'; upgrade-insecure-requests")

DESC = "يونس: منصة مذاكرة عربية مجانية. خطة يومية تُبنى على موادك، وعدسة تحلّ ما تصوّره، وترجمة لملفاتك، ومواد تخصصك في جامعتك، وغرفة تركيز ومراجعة متباعدة."

fonts = '<link rel="preload" href="fonts/lalezar-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="preload" href="fonts/readex-pro-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>\n<link rel="stylesheet" href="fonts/fonts.css">'
import shutil as _sh
_sh.rmtree(OUT / "fonts", ignore_errors=True)
_sh.copytree(BASE / "fonts", OUT / "fonts")
body = read("20-body.html").replace('<div class="shell" hidden>', read("25-landing.html") + '\n<div class="shell" hidden>', 1)


web = r'''window.IS_WEB_SITE=true;
T.ar.feats=T.ar.feats.slice(); T.ar.feats[3]=["اسأل يونس","مساعد محادثة يعرف خطتك وامتحاناتك ويبحث في ملفاتك، ومع مفتاحك يجيب عن أي سؤال دراسي بإجابات منظّمة."]; T.ar.feats[4]=["اختبار من ملفك","أسئلة إكمال فراغ تُولَّد من ملفك، تُصحَّح فوراً وتذهب أخطاؤك إلى دفترك."];
T.en.feats=T.en.feats.slice(); T.en.feats[3]=["Ask Younis","A chat assistant that knows your plan and exams, searches your files, and with your key answers any study question in clear steps."]; T.en.feats[4]=["Quizzes from your file","Fill-in-the-blank questions built from your file, graded instantly, with mistakes sent to your notebook."];
Object.assign(T.ar,{l_sub:"خطة مذاكرة يوماً بيوم تُبنى على موادك أنت، غرفة تركيز بأصوات هادئة، ملخصات واختبارات من ملفاتك، ومراجعة تثبّت المعلومة حتى يوم الامتحان.",tutorLede:"ارفع ملفات مادتك أو الصق المحتوى، واحصل على أهم ما فيه واختبار منه داخل متصفحك. وإذا فعّلت المعلّم الذكي بمفتاحك، يُرسل ما تطلب شرحه أو تحليله إلى Anthropic فقط."});
Object.assign(T.en,{l_sub:"A day-by-day study plan built on your own courses, a calm focus room, summaries and quizzes from your files, and review that makes it stick until exam day.",tutorLede:"Upload your course files or paste the content, and get its key points and a quiz from it inside your browser. If you turn on the AI tutor with your key, what you ask it to explain or analyse is sent to Anthropic only."});
Object.assign(T.ar,{
 title:"يونس | منصة المذاكرة الذكية",
 l_t4:"يعمل بدون إنترنت بعد أول زيارة",
 webAI:"جرّب المعلّم الذكي الكامل على نسخة Claude",
 tutorOff:"المعلّم في هذا الموقع يعمل بخوارزمية تحليل نصوص داخل متصفحك، بلا إرسال ملفاتك إلى أي خادم: ارفع ملف مادتك لتحصل على أهم جمله واختبار منه.",
 faqs:[["هل الموقع مجاني؟","نعم، بالكامل وبلا إعلانات ولا تسجيل."],["أين تُحفظ بياناتي؟ وهل يراها غيري؟","تُحفظ في متصفحك على جهازك فقط، ولا يراها أحد غيرك، ولا تُرسل إلى أي خادم إلا إذا فعّلت المعلّم الذكي بمفتاحك: عندها يُرسل ما تطلب شرحه أو تحليله إلى Anthropic مباشرة. نزّل نسخة احتياطية من صفحة «إنجازي» لتنقلها إلى جهاز آخر."],["هل يعمل بدون إنترنت؟","نعم، بعد أول زيارة يعمل الموقع بدون اتصال، ويمكنك تثبيته على شاشة جوالك كتطبيق."],["هل يناسب طلاب المدارس؟","نعم، فيه مسار للمدرسة وللتوجيهي والثانوية العامة، ومسار للجامعة."],["هل مواقيت الصلاة دقيقة؟","هي حسابات فلكية تقريبية قد تختلف دقائق عن التقويم الرسمي في بلدك، وتستطيع إيقافها في أي وقت."],["هل تُحفظ صوري وملفاتي التي أترجمها؟","لا. تُقرأ داخل متصفحك، ولا تُرسل إلا حين تطلب التحليل أو الترجمة، وتذهب مباشرة إلى Anthropic. أما خطط الجامعات الموثّقة فمأخوذة من المواقع الرسمية، وقائمة الجامعات من قاعدة بيانات مفتوحة."]]
});
Object.assign(T.en,{
 title:"Younis | Smart study platform",
 l_t4:"Works offline after your first visit",
 webAI:"Try the full AI tutor on the Claude version",
 tutorOff:"The tutor on this site runs a text-analysis algorithm inside your browser, without sending your files to any server: upload your course file to get its key sentences and a quiz from it.",
 faqs:[["Is it free?","Yes, completely, with no ads and no sign-up."],["Where is my data kept? Can others see it?","Only in your browser on your device, and nobody else can see it. Nothing is sent to a server unless you turn on the AI tutor with your key: then what you ask it to explain or analyse goes straight to Anthropic. Download a backup from Progress to move it to another device."],["Does it work offline?","Yes. After your first visit it works without a connection, and you can install it on your phone's home screen."],["Does it work for school students?","Yes. There's a track for school and the final school year, and one for university."],["Are prayer times exact?","They're approximate astronomical calculations that can differ by a few minutes from your country's official calendar, and you can turn them off any time."],["Are the photos and files I translate kept?","No. They're read inside your browser and sent only when you ask for an analysis or translation, straight to Anthropic. Verified university plans come from the official websites, and the university list from an open dataset."]]
});
'''
web += r'''T.ar.feats=T.ar.feats.concat([
 ["عدسة يونس","صوّر مسألة أو صفحة أو مخططاً، فيحلّها خطوة بخطوة أو يشرحها أو يستخرج نصها، ويحوّلها إلى بطاقات مراجعة."],
 ["ترجمة دقيقة لملفاتك","ارفع PDF أو Word أو عرضاً أو صورة، فيُترجم كاملاً مع الحفاظ على العناوين والجداول، وتنزّله ملف Word."],
 ["جامعتي وتخصصي","اختر جامعتك من أكثر من 10 آلاف جامعة، فتظهر لك تخصصاتها، ثم مواد خطتك فقط."],
 ["طريقك إلى التخرج","علّم ما نجحت فيه، فتعرف ساعاتك المتبقية والمواد المتاحة لك في الفصل القادم."]
]);
T.en.feats=T.en.feats.concat([
 ["Younis Lens","Snap a problem, page or diagram: it solves it step by step, explains it, transcribes it, or turns it into flashcards."],
 ["Accurate file translation","Upload a PDF, Word file, slides or a photo; it is translated in full, headings and tables kept, and you can download it as Word."],
 ["My university and major","Pick your university from over 10,000, see its majors, then only the courses of your own plan."],
 ["Your road to graduation","Mark what you've passed to see the hours you have left and which courses you can take next semester."]
]);
'''

# pre-fill Arabic text so the first paint is complete (better speed, layout stability and SEO)
import subprocess
_i18n = strip_script_tags(read("30-i18n.js") + read("35-i18n2.js") + read("36-i18n3.js"))
_js = "var window={};" + _i18n + "\n" + web + "\nconst o={};for(const k in T.ar){if(typeof T.ar[k]==='string')o[k]=T.ar[k]}process.stdout.write(JSON.stringify(o));"
AR = json.loads(subprocess.run(["node", "-e", _js], capture_output=True, text=True, check=True).stdout)
import html as _html
def _fill(m):
    key = m.group(2)
    return m.group(1) + _html.escape(AR[key], quote=False) + m.group(3) if key in AR else m.group(0)
body = re.sub(r'(<[a-z0-9]+\b[^>]*\sdata-t="([A-Za-z0-9_]+)"[^>]*>)(</)', _fill, body)
def _ph(m):
    key = m.group(2)
    return m.group(1) + ' placeholder="' + _html.escape(AR[key]) + '"' if key in AR else m.group(1)
body = re.sub(r'(<(?:input|textarea)\b[^>]*\sdata-tp="([A-Za-z0-9_]+)")', _ph, body)
# buttons whose text JavaScript sets: write the first-visit text into the HTML so nothing shifts on load
body = re.sub(r'(<button[^>]*\sdata-go-app[^>]*>)(</button>)', lambda m: m.group(1) + _html.escape(AR["startNow"], quote=False) + m.group(2), body)
body = body.replace('<button class="iconbtn" id="lLang" type="button"></button>', '<button class="iconbtn" id="lLang" type="button">' + _html.escape(AR["lang"], quote=False) + '</button>')

head = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<meta name="referrer" content="no-referrer">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#F4F6FB" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0A1020" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="يونس | منصة المذاكرة الذكية">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/logo.svg" type="image/svg+xml">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<title>يونس | منصة المذاكرة الذكية</title>
{fonts}
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
"""
html = (head + read("10-style.css") + read("15-style2.css") + read("16-style3.css") + "</head>\n<body>\n" + body +
        '<script defer src="js/i18n.js"></script>\n<script defer src="js/web.js"></script>\n<script defer src="js/app.js"></script>\n</body>\n</html>\n')
(OUT / "index.html").write_text(html, encoding="utf8")

(OUT / "js" / "i18n.js").write_text(strip_script_tags(read("30-i18n.js") + read("35-i18n2.js") + read("36-i18n3.js")), encoding="utf8")
app = "".join(read(f) for f in ["40-core.js", "50-plan.js", "60-today.js", "70-tutor.js", "71-lens.js", "72-translate.js", "73-uni.js", "75-site.js", "77-ai.js", "78-chat.js", "79-extra.js", "80-rest.js"])
(OUT / "js" / "app.js").write_text(strip_script_tags(app), encoding="utf8")

(OUT / "js" / "web.js").write_text(web, encoding="utf8")

# ---- university data: world directory (one file per country) + verified study plans ----
DATA = BASE / "data"
_sh.rmtree(OUT / "data", ignore_errors=True)
(OUT / "data" / "unis").mkdir(parents=True)
(OUT / "data" / "catalog").mkdir(parents=True)
for f in (DATA / "unis").iterdir():
    _sh.copy(f, OUT / "data" / "unis" / f.name)
cat_index = []
for f in sorted((DATA / "catalog").glob("*.json")):
    if f.name == "index.json":
        continue
    c = json.loads(f.read_text(encoding="utf8"))
    _sh.copy(f, OUT / "data" / "catalog" / f.name)
    cat_index.append({"id": c["id"], "dom": c["domain"], "cc": c["country"], "name": c["name"],
                      "programs": len(c["programs"]), "fetched": c["fetched"]})
(OUT / "data" / "catalog" / "index.json").write_text(json.dumps(cat_index, ensure_ascii=False, separators=(",", ":")), encoding="utf8")

assets = ["./", "./index.html", "./js/i18n.js", "./js/web.js", "./js/app.js", "./manifest.webmanifest", "./fonts/fonts.css", "./icons/icon-192.png", "./icons/icon-512.png", "./data/unis/index.json", "./data/catalog/index.json"]
import hashlib
ver = hashlib.sha256((html + (OUT / "js" / "app.js").read_text(encoding="utf8") + (OUT / "js" / "i18n.js").read_text(encoding="utf8") + web).encode("utf8")).hexdigest()[:10]
sw = """const CACHE="younis-%s";
const ASSETS=%s;
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==self.location.origin) return;
  e.respondWith(fetch(e.request).then(res=>{
    if(res.ok&&res.type==="basic"){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return res;
  }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match("./index.html"))));
});
""" % (ver, json.dumps(assets))
(OUT / "sw.js").write_text(sw, encoding="utf8")

if (BASE / "assets" / "icons").exists():
    for f in (BASE / "assets" / "icons").iterdir():
        _sh.copy(f, OUT / "icons" / f.name)
(OUT / "screenshots").mkdir(exist_ok=True)
for f in ["landing.png", "mobile-dark.png"]:
    if (BASE / "assets" / f).exists():
        _sh.copy(BASE / "assets" / f, OUT / "screenshots" / f)
manifest = {"id": "./", "name": "يونس | منصة المذاكرة الذكية", "short_name": "يونس", "description": DESC, "lang": "ar", "dir": "rtl",
            "start_url": "./", "scope": "./", "display": "standalone", "orientation": "any", "background_color": "#F4F6FB", "theme_color": "#18284D",
            "categories": ["education", "productivity"],
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                      {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
                      {"src": "icons/logo.svg", "sizes": "any", "type": "image/svg+xml"}],
            "shortcuts": [{"name": "اسأل يونس", "url": "./#chat", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
                          {"name": "عدسة يونس", "url": "./#lens", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
                          {"name": "جامعتي", "url": "./#uni", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
                          {"name": "غرفة التركيز", "url": "./#focus", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]},
                          {"name": "اليوم", "url": "./#today", "icons": [{"src": "icons/icon-192.png", "sizes": "192x192"}]}],
            "screenshots": [{"src": "screenshots/landing.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide", "label": "الصفحة الرئيسية"},
                            {"src": "screenshots/mobile-dark.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow", "label": "على الجوال"}]}
(OUT / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf8")
(OUT / ".nojekyll").write_text("", encoding="utf8")
(OUT / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf8")
print("built", sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()), "bytes")
