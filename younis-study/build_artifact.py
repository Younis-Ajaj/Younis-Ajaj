"""Builds the single-file Claude artifact version of Younis as exam-plan.html."""
import pathlib
BASE = pathlib.Path(__file__).parent
SRC = BASE / "src"
read = lambda n: (SRC / n).read_text(encoding="utf8")
body = read("20-body.html").replace('<div class="shell" hidden>', read("25-landing.html") + '\n<div class="shell" hidden>', 1)
js = "".join(read(f) for f in ["40-core.js", "50-plan.js", "60-today.js", "70-tutor.js", "71-lens.js", "72-translate.js", "73-uni.js", "75-site.js", "77-ai.js", "78-chat.js", "79-extra.js", "80-rest.js"])
js = "\n".join(l for l in js.split("\n") if l.strip() not in ("<script>", "</script>"))
out = read("00-head.html") + read("10-style.css") + read("15-style2.css") + read("16-style3.css") + body + read("30-i18n.js") + read("35-i18n2.js") + read("36-i18n3.js") + "<script>\n" + js + "\n</script>\n"
(BASE / "exam-plan.html").write_text(out, encoding="utf8")
print("built exam-plan.html,", len(out), "bytes")
