"""Builds the standalone website (GitHub Pages) into /home/user/Younis-Ajaj/docs from the shared source parts."""
import json, os, re, pathlib

SRC = pathlib.Path(__file__).parent
OUT = SRC.parent / "docs"
(OUT / "js").mkdir(parents=True, exist_ok=True)
(OUT / "icons").mkdir(parents=True, exist_ok=True)

def read(name):
    return (SRC / name).read_text(encoding="utf8")

def strip_script_tags(js):
    return "\n".join(l for l in js.split("\n") if l.strip() not in ("<script>", "</script>"))

CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
       "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://api.anthropic.com; "
       "worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; object-src 'none'; "
       "base-uri 'none'; form-action 'none'; upgrade-insecure-requests")

DESC = "نبيه: منصة مذاكرة عربية مجانية. خطة يومية تُبنى على موادك، غرفة تركيز، مراجعة متباعدة، دفتر أخطاء، ومواقيت الصلاة."

fonts = "\n".join(l for l in read("00-head.html").split("\n") if "fonts.g" in l)
body = read("20-body.html").replace('<div class="shell">', read("25-landing.html") + '\n<div class="shell">', 1)

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
<meta property="og:title" content="نبيه | منصة المذاكرة">
<meta property="og:description" content="{DESC}">
<meta property="og:type" content="website">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="icons/icon-192.png">
<title>نبيه | منصة المذاكرة</title>
{fonts}
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
"""
html = (head + read("10-style.css") + read("15-style2.css") + "</head>\n<body>\n" + body +
        '<script src="js/i18n.js"></script>\n<script src="js/web.js"></script>\n<script src="js/app.js"></script>\n</body>\n</html>\n')
(OUT / "index.html").write_text(html, encoding="utf8")

(OUT / "js" / "i18n.js").write_text(strip_script_tags(read("30-i18n.js") + read("35-i18n2.js")), encoding="utf8")
app = "".join(read(f) for f in ["40-core.js", "50-plan.js", "60-today.js", "70-tutor.js", "75-site.js", "77-ai.js", "80-rest.js"])
(OUT / "js" / "app.js").write_text(strip_script_tags(app), encoding="utf8")

web = r'''window.IS_WEB_SITE=true;
T.ar.feats=T.ar.feats.slice(); T.ar.feats[3]=["ملخّص من ملفاتك","ارفع PDF أو Word أو PowerPoint فيستخرج أهم الجمل والمصطلحات داخل متصفحك."]; T.ar.feats[4]=["اختبار من ملفك","أسئلة إكمال فراغ تُولَّد من ملفك، تُصحَّح فوراً وتذهب أخطاؤك إلى دفترك."];
T.en.feats=T.en.feats.slice(); T.en.feats[3]=["Summaries from your files","Upload a PDF, Word or PowerPoint file and get its key sentences and terms, inside your browser."]; T.en.feats[4]=["Quizzes from your file","Fill-in-the-blank questions built from your file, graded instantly, with mistakes sent to your notebook."];
Object.assign(T.ar,{l_sub:"خطة مذاكرة يوماً بيوم تُبنى على موادك أنت، غرفة تركيز بأصوات هادئة، ملخصات واختبارات من ملفاتك، ومراجعة تثبّت المعلومة حتى يوم الامتحان.",tutorLede:"ارفع ملفات مادتك أو الصق المحتوى، واحصل على أهم ما فيه واختبار منه داخل متصفحك. وإذا فعّلت المعلّم الذكي بمفتاحك، يُرسل ما تطلب شرحه أو تحليله إلى Anthropic فقط."});
Object.assign(T.en,{l_sub:"A day-by-day study plan built on your own courses, a calm focus room, summaries and quizzes from your files, and review that makes it stick until exam day.",tutorLede:"Upload your course files or paste the content, and get its key points and a quiz from it inside your browser. If you turn on the AI tutor with your key, what you ask it to explain or analyse is sent to Anthropic only."});
Object.assign(T.ar,{
 title:"نبيه | منصة المذاكرة",
 l_t4:"يعمل بدون إنترنت بعد أول زيارة",
 webAI:"جرّب المعلّم الذكي الكامل على نسخة Claude",
 tutorOff:"المعلّم في هذا الموقع يعمل بخوارزمية تحليل نصوص داخل متصفحك، بلا إرسال ملفاتك إلى أي خادم: ارفع ملف مادتك لتحصل على أهم جمله واختبار منه.",
 faqs:[["هل الموقع مجاني؟","نعم، بالكامل وبلا إعلانات ولا تسجيل."],["أين تُحفظ بياناتي؟ وهل يراها غيري؟","تُحفظ في متصفحك على جهازك فقط، ولا يراها أحد غيرك، ولا تُرسل إلى أي خادم إلا إذا فعّلت المعلّم الذكي بمفتاحك: عندها يُرسل ما تطلب شرحه أو تحليله إلى Anthropic مباشرة. نزّل نسخة احتياطية من صفحة «إنجازي» لتنقلها إلى جهاز آخر."],["هل يعمل بدون إنترنت؟","نعم، بعد أول زيارة يعمل الموقع بدون اتصال، ويمكنك تثبيته على شاشة جوالك كتطبيق."],["هل يناسب طلاب المدارس؟","نعم، فيه مسار للمدرسة وللتوجيهي والثانوية العامة، ومسار للجامعة."],["هل مواقيت الصلاة دقيقة؟","هي حسابات فلكية تقريبية قد تختلف دقائق عن التقويم الرسمي في بلدك، وتستطيع إيقافها في أي وقت."]]
});
Object.assign(T.en,{
 title:"Nabeeh | Study platform",
 l_t4:"Works offline after your first visit",
 webAI:"Try the full AI tutor on the Claude version",
 tutorOff:"The tutor on this site runs a text-analysis algorithm inside your browser, without sending your files to any server: upload your course file to get its key sentences and a quiz from it.",
 faqs:[["Is it free?","Yes, completely, with no ads and no sign-up."],["Where is my data kept? Can others see it?","Only in your browser on your device, and nobody else can see it. Nothing is sent to a server unless you turn on the AI tutor with your key: then what you ask it to explain or analyse goes straight to Anthropic. Download a backup from Progress to move it to another device."],["Does it work offline?","Yes. After your first visit it works without a connection, and you can install it on your phone's home screen."],["Does it work for school students?","Yes. There's a track for school and the final school year, and one for university."],["Are prayer times exact?","They're approximate astronomical calculations that can differ by a few minutes from your country's official calendar, and you can turn them off any time."]]
});
'''
(OUT / "js" / "web.js").write_text(web, encoding="utf8")

assets = ["./", "./index.html", "./js/i18n.js", "./js/web.js", "./js/app.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"]
import hashlib
ver = hashlib.sha256((html + (OUT / "js" / "app.js").read_text(encoding="utf8") + (OUT / "js" / "i18n.js").read_text(encoding="utf8") + web).encode("utf8")).hexdigest()[:10]
sw = """const CACHE="nabeeh-%s";
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

manifest = {"name": "نبيه | منصة المذاكرة", "short_name": "نبيه", "description": DESC, "lang": "ar", "dir": "rtl",
            "start_url": "./", "scope": "./", "display": "standalone", "background_color": "#F4F6FB", "theme_color": "#15213B",
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
                      {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
(OUT / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf8")
(OUT / ".nojekyll").write_text("", encoding="utf8")
(OUT / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf8")
print("built", sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file()), "bytes")
