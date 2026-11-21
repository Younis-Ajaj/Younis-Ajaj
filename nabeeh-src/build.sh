cd "$(dirname "$0")"
python3 - <<'PY'
body=open('20-body.html',encoding='utf8').read()
land=open('25-landing.html',encoding='utf8').read()
body=body.replace('<div class="shell">',land+'\n<div class="shell">',1)
js=''.join(open(f,encoding='utf8').read() for f in ['40-core.js','50-plan.js','60-today.js','70-tutor.js','75-site.js','80-rest.js'])
js='\n'.join(l for l in js.split('\n') if l.strip() not in ('<script>','</script>'))
out=open('00-head.html',encoding='utf8').read()+open('10-style.css',encoding='utf8').read()+open('15-style2.css',encoding='utf8').read()+body+open('30-i18n.js',encoding='utf8').read()+open('35-i18n2.js',encoding='utf8').read()+'<script>\n'+js+'\n</script>\n'
open('exam-plan.html','w',encoding='utf8').write(out)
import re
for i,s in enumerate(re.findall(r'<script>(.*?)</script>',out,re.S)): open(f's{i}.js','w',encoding='utf8').write(s)
print(len(out))
PY
for f in s0.js s1.js s2.js; do node --check $f || echo "FAIL $f"; done
