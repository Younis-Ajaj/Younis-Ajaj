// End-to-end checks for the Younis study website (docs/), served over HTTP with its real CSP.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'docs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const results = []; let failures = 0;
function check(name, ok, info) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  — ' + info : '')); if (!ok) failures++; }
const LONG = Array.from({ length: 14 }, (_, i) => 'اختبار الفرضيات أداة إحصائية تستخدم لتقييم الادعاءات حول المجتمع الإحصائي اعتماداً على بيانات العينة رقم ' + i + '. القيمة الاحتمالية تقيس احتمال الحصول على نتائج متطرفة بافتراض صحة فرضية العدم في التجربة ' + i + '. مستوى الدلالة يحدد عتبة رفض الفرضية الصفرية عند الباحث في الدراسة ' + i + '.').join('\n');
function sse(text) {
  const ev = (t, d) => 'event: ' + t + '\ndata: ' + JSON.stringify(d) + '\n\n';
  return ev('message_start', { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }) +
    ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }) +
    ev('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text } }) +
    ev('content_block_stop', { type: 'content_block_stop', index: 0 }) +
    ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } }) +
    ev('message_stop', { type: 'message_stop' });
}
(async () => {
  const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d) }) }).listen(8770);
  const URL0 = 'http://localhost:8770/';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/New_York', acceptDownloads: true });
  let apiCalls = 0; let lastApiHeaders = null; let lastBody = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    apiCalls++; lastApiHeaders = await route.request().allHeaders();
    const body = JSON.parse(route.request().postData() || '{}'); lastBody = body;
    const prompt = JSON.stringify(body.messages || '');
    let text = 'شرح تجريبي من المعلّم.';
    if (prompt.includes('mind map')) text = JSON.stringify({ center: 'الفرضيات', branches: [{ title: 'فرضية العدم', children: ['H0', 'رفض'] }, { title: 'الدلالة', children: ['alpha'] }, { title: 'القيمة الاحتمالية', children: ['p-value'] }, { title: 'الأخطاء', children: ['النوع الأول', 'النوع الثاني'] }] });
    else if (prompt.includes('multiple-choice')) text = JSON.stringify({ questions: [{ q: 'ما مستوى الدلالة الشائع؟', options: ['0.05', '0.5', '5', '50'], answer: 0, why: 'الأكثر استخداماً' }, { q: 'ماذا تعني H0؟', options: ['فرضية العدم', 'البديلة', 'العينة', 'المجتمع'], answer: 0, why: 'تعريف' }] });
    else if (prompt.includes('most exam-relevant flashcards')) text = JSON.stringify({ cards: [{ q: 'ما القيمة الاحتمالية؟', a: 'احتمال نتائج متطرفة بافتراض H0' }, { q: 'ما الخطأ من النوع الأول؟', a: 'رفض H0 وهي صحيحة' }] });
    else if (prompt.includes('Feynman')) text = JSON.stringify({ score: 84, good: ['فهمت H0'], gaps: ['الدلالة'], wrong: [], better: 'شرح أفضل', next: 'سؤال' });
    await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: sse(text) });
  });
  const p = await ctx.newPage(); const errs = []; const csp = [];
  const D = async () => { for (let i = 0; i < 6 && await p.isVisible('#modal'); i++) { await p.click('#mdOk'); await p.waitForTimeout(150) } };
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); if (/Content.Security.Policy/i.test(m.text())) csp.push(m.text()) });

  await D();
  // 1. landing
  await p.goto(URL0); await p.waitForTimeout(1500); await D();
  check('landing shows for a new visitor', await p.isVisible('#landing') && !(await p.isVisible('.shell')));
  check('brand is Younis', (await p.textContent('.lnav .brand b')).trim() === 'يونس');
  await D();
  // 2. onboarding
  await p.click('.lhero [data-go-app]');
  await p.click('#onbNext'); check('onboarding requires a stage', await p.isVisible('#onbErr'));
  await p.fill('#oName', 'سارة'); await p.click('[data-of="stage"][data-ov="2"]'); await p.click('#onbNext');
  await p.fill('#oMajor', 'علم البيانات'); await p.check('#oPray'); await p.click('#onbNext');
  await p.click('#onbNext'); check('onboarding requires a course', await p.isVisible('#onbErr'));
  for (const n of ['تعلّم الآلة', 'قواعد البيانات']) await p.click('[data-pick="' + n + '"]');
  await p.fill('#oCustom', 'مادة خاصة'); await p.click('#oAdd');
  check('custom course added', (await p.$$('[data-pick][aria-pressed="true"]')).length === 3);
  await p.click('#onbNext'); await p.click('#onbNext'); check('onboarding requires dates', await p.isVisible('#onbErr'));
  for (const q of await p.$$('[data-oq][data-days="14"]')) await q.click();
  await p.click('#onbNext'); await p.fill('#oHours', '5').catch(() => { }); await p.click('#onbNext'); await p.waitForTimeout(1200);
  await D();
  check('plan built and Today shown', await p.isVisible('#v-today') && (await p.$$('#todayList .block')).length > 0);
  check('greeting uses the name', (await p.textContent('#greet')).includes('سارة'));
  check('prayer card shown', await p.isVisible('#prayBox'));
  const fajr = await p.textContent('#prayBox .prayrow div >> nth=0'); check('Amman Fajr shows in Amman morning time on a New York device', /[0-9]:[0-9]{2}\s*ص/.test(fajr), fajr);
  check('insights card shown', await p.isVisible('#insBox'));
  await D();
  // planner invariants
  await p.evaluate(() => location.hash = 'plan'); await p.waitForTimeout(500);
  const caps = await p.$$eval('#days .day', ds => ds.map(d => ({ u: [...d.querySelectorAll('input[data-u]')].reduce((a, i) => a + (+i.dataset.u), 0), exam: !!d.querySelector('.exam-row') })));
  const hours = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).hours);
  check('no day exceeds daily hours', caps.every(c => c.u / 2 <= hours + 1e-9), 'hours=' + hours);
  check('exam days are at most half load', caps.every(c => !c.exam || c.u / 2 <= hours / 2 + 1e-9));
  await D();
  // 3. sessions and XP
  const xp0 = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).xp);
  await p.check('#days .day:not(.past) input[data-k] >> nth=0'); await p.waitForTimeout(300); await D();
  const xp1 = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).xp);
  check('checking a session gives XP', xp1 === xp0 + 20, xp0 + '→' + xp1);
  await p.uncheck('#days .day:not(.past) input[data-k] >> nth=0'); await p.waitForTimeout(300);
  check('unchecking removes XP', (await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).xp)) === xp0);
  await D();
  // 4. missed sessions
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('studyplan.v1')); const d = new Date(); d.setDate(d.getDate() - 3); s.start = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); s.updated = Date.now(); localStorage.setItem('studyplan.v1', JSON.stringify(s)) });
  await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => location.hash = 'plan'); await p.waitForTimeout(400);
  check('missed-sessions banner appears', await p.isVisible('#missBanner'));
  await p.click('#missBtn'); await p.waitForTimeout(400);
  check('reschedule clears the banner', !(await p.isVisible('#missBanner')));
  await D();
  // chat, basic mode
  await p.evaluate(() => location.hash = 'chat'); await p.waitForTimeout(400);
  check('chat shows basic mode without a key', (await p.textContent('#chatMode')).includes('الأساسي'));
  await p.click('#chatSug button >> nth=0'); await p.waitForTimeout(300);
  const todayReply = await p.textContent('#chatLog .msg.bot >> nth=-1');
  check('chat answers "what to study today" from the plan', /جلسات|أنجزت/.test(todayReply), todayReply.slice(0, 60));
  await p.fill('#chatIn', 'متى امتحاني القادم؟'); await p.press('#chatIn', 'Enter'); await p.waitForTimeout(300);
  check('chat lists upcoming exams', (await p.textContent('#chatLog .msg.bot >> nth=-1')).includes('امتحاناتك'));
  await p.fill('#chatIn', 'كيف أستخدم البطاقات؟'); await p.click('#chatSend'); await p.waitForTimeout(300);
  check('chat explains a tool with a formatted answer', (await p.$$('#chatLog .msg.bot >> nth=-1 >> h4')).length === 1 && (await p.$$('#chatLog .msg.bot >> nth=-1 >> li')).length >= 3);
  await p.fill('#chatIn', '<img src=x onerror=alert(1)>'); await p.click('#chatSend'); await p.waitForTimeout(300);
  check('chat escapes HTML from the user', (await p.$$('#chatLog img')).length === 0);
  await D();
  // 5. review cards
  await p.evaluate(() => location.hash = 'review'); await p.waitForTimeout(300);
  await p.fill('#cQ', 'ما H0؟'); await p.fill('#cA', 'فرضية العدم'); await p.click('#cAdd');
  await D(); await p.click('#cStart'); await p.click('#cFlash'); await p.click('#cYes'); await p.waitForTimeout(300); await D();
  const card = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).cards.slice(-1)[0]);
  check('spaced repetition moves a known card to box 1, due tomorrow', card.box === 1 && card.due > new Date().toISOString().slice(0, 10), JSON.stringify({ box: card.box, due: card.due }));
  await D();
  // 6. basic tutor (no key)
  await p.evaluate(() => location.hash = 'tutor'); await p.waitForTimeout(300);
  check('AI-only tools hidden without a key', !(await p.isVisible('[data-mode="map"]')));
  check('key box shown on the website', await p.isVisible('#aiKeyBox'));
  await p.fill('#tNotes', LONG); await p.click('[data-mode="summary"]'); await p.waitForTimeout(300);
  check('basic summary works', (await p.textContent('#tutorOut')).length > 100);
  await p.click('[data-mode="quiz"]'); await p.waitForTimeout(300);
  const nq = (await p.$$('#quiz .q')).length; check('basic quiz has questions', nq >= 3, 'n=' + nq);
  await p.click('#gradeBtn'); await p.waitForTimeout(300); await D();
  check('unanswered quiz fills the mistake notebook', (await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).mistakes.length)) >= nq);
  await D();
  // 7. AI with own key (mocked API)
  await p.fill('#aiKey', 'bad'); await p.click('#aiSave'); await p.waitForTimeout(200);
  check('bad key format rejected', !(await p.isVisible('#aiTest')));
  await p.fill('#aiKey', 'sk-ant-test-0000000000000000000000000000'); await p.click('#aiSave'); await p.waitForTimeout(1500); await D();
  check('key activates the AI tutor', await p.isVisible('[data-mode="map"]') && await p.isVisible('#aiTest'));
  await p.fill('#tCourse', 'إحصاء'); await p.fill('#tTopic', 'اختبار الفرضيات');
  await p.click('[data-mode="explain"]'); await p.waitForTimeout(1500); await D();
  check('explain streams the AI answer', (await p.textContent('#tutorOut')).includes('شرح تجريبي'));
  check('request sends the key with the browser-access header', !!lastApiHeaders && lastApiHeaders['authorization'] === 'Bearer sk-ant-test-0000000000000000000000000000' && lastApiHeaders['anthropic-dangerous-direct-browser-access'] === 'true', lastApiHeaders ? Object.keys(lastApiHeaders).join(',') : 'none');
  check('request body uses claude-opus-5-5 with fallbacks', !!lastBody && lastBody.model === 'claude-opus-5-5' && lastBody.fallbacks === 'default', lastBody ? lastBody.model + ' / ' + JSON.stringify(lastBody.fallbacks) : 'none');
  await p.click('[data-mode="map"]'); await p.waitForTimeout(1500); await D();
  check('mind map renders', (await p.$$('#tutorExtra .mapnode')).length >= 8);
  await p.check('#examMode'); await p.click('[data-mode="quiz"]'); await p.waitForTimeout(1500); await D();
  check('timed AI quiz renders with timer', (await p.$$('#quiz .q')).length === 2 && await p.isVisible('#examLeft'));
  await p.click('[data-mode="cards"]'); await p.waitForTimeout(1500); await D();
  await p.click('#acAdd'); await p.waitForTimeout(300); await D();
  check('AI cards added to the deck', (await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).cards.length)) >= 3);
  await p.click('[data-mode="feynman"]'); await p.fill('#feyIn', 'فرضية العدم هي الادعاء الذي نختبره ونرفضه إذا كانت القيمة الاحتمالية أصغر من مستوى الدلالة المختار مسبقاً.'); await p.click('#feyGo'); await p.waitForTimeout(1500); await D();
  check('Feynman score shown', (await p.textContent('#feyOut')).includes('84'));
  await p.evaluate(() => location.hash = 'chat'); await p.waitForTimeout(300);
  check('chat switches to AI mode with a key', (await p.textContent('#chatMode')).includes('الذكاء'));
  await p.fill('#chatIn', 'اشرح لي القيمة الاحتمالية'); await p.click('#chatSend'); await p.waitForTimeout(1500); await D();
  check('chat streams the AI answer', (await p.textContent('#chatLog .msg.bot >> nth=-1')).includes('شرح تجريبي'));
  check('chat sends tutor instructions with the question', !!lastBody && JSON.stringify(lastBody.messages).includes('You are Younis') && JSON.stringify(lastBody.messages).includes('القيمة الاحتمالية'));
  await p.evaluate(() => location.hash = 'stats'); await p.waitForTimeout(300);
  await p.click('#repBtn'); await p.waitForTimeout(1500); await D();
  check('weekly AI report written', (await p.textContent('#repOut')).length > 5);
  await p.evaluate(() => location.hash = 'review'); await p.waitForTimeout(300);
  await p.click('#mistAIBtn'); await p.waitForTimeout(1500); await D();
  check('mistake analysis written', (await p.textContent('#mistAIOut')).length > 5);
  check('key never stored in backup state', !(await p.evaluate(() => localStorage.getItem('studyplan.v1'))).includes('sk-ant-'));
  await D();
  // 8. grades
  await p.evaluate(() => location.hash = 'grades'); await p.waitForTimeout(300);
  await p.fill('#gNow', '45'); await p.fill('#gFinal', '40');
  const g = await p.textContent('#gOut'); check('final calculator: need 15 of 40 for 60', g.includes('15 من 40'), g.slice(0, 80));
  await p.evaluate(() => { document.querySelectorAll('#gpaRows select').forEach((s, i) => { s.value = i % 2 ? 'B' : 'A'; s.dispatchEvent(new Event('input', { bubbles: true })) }) });
  const nr = (await p.$$('#gpaRows select')).length; let sum = 0; for (let i = 0; i < nr; i++) sum += (i % 2 ? 3 : 4); const exp = (sum / nr).toFixed(2);
  const gp = await p.textContent('#gpaOut'); check('GPA of alternating A/B matches hand calculation', gp.trim() === exp, gp + ' vs ' + exp + ' (' + nr + ' rows)');
  await D();
  // 9. export / import
  await p.evaluate(() => location.hash = 'stats'); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#expBtn')]);
  const file = path.join(require('os').tmpdir(), 'younis-backup-test.json'); await dl.saveAs(file);
  const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
  check('backup exports state', Array.isArray(exported.subjects) && exported.subjects.length === 3 && !JSON.stringify(exported).includes('sk-ant-'));
  await D();
  // 10. language switch
  await p.click('#langBtn'); await p.waitForTimeout(400);
  check('English switches direction', (await p.evaluate(() => document.documentElement.dir)) === 'ltr');
  await p.evaluate(() => location.hash = 'tutor'); await p.waitForTimeout(300);
  check('key box follows language', (await p.textContent('#aiKeyBox')).includes('AI tutor'));
  await p.click('#langBtn'); await p.waitForTimeout(300);
  await D();
  // 11. wipe clears key
  await p.evaluate(() => location.hash = 'stats'); await p.waitForTimeout(300);
  await p.click('#wipeBtn'); await p.click('#wipeYes'); await p.waitForTimeout(400);
  check('erase removes the saved key', !(await p.evaluate(() => (sessionStorage.getItem('younis.ak') || '') + (localStorage.getItem('younis.ak') || ''))));
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('no CSP violations', csp.length === 0, csp.slice(0, 2).join(' | '));
  check('mocked API was called', apiCalls >= 8, 'calls=' + apiCalls);

  await D();
  // 12. focus timer with a fake clock
  const fctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const f = await fctx.newPage();
  await f.clock.install(); await f.goto(URL0); await f.waitForTimeout(500);
  await f.evaluate(() => { localStorage.setItem('studyplan.v1', JSON.stringify({ lang: 'ar', onboarded: true, subjects: [], hours: 4, off: -1, done: {}, built: false, scores: [] })) });
  await f.goto(URL0 + '#focus'); await f.waitForTimeout(500);
  await f.click('#fStart'); await f.clock.fastForward('25:05'); await f.waitForTimeout(300);
  const fm = await f.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).focusMin);
  check('25-minute focus session is logged', fm === 25, 'focusMin=' + fm);
  check('break starts after focus', (await f.textContent('#fPhase')).includes('استراحة'));
  await fctx.close();

  await D();
  // 13. mobile overflow in both languages, all views
  const m = await b.newPage({ viewport: { width: 375, height: 800 } }); const over = [];
  await m.goto(URL0); await m.waitForTimeout(800);
  for (const lang of ['ar', 'en']) {
    await m.evaluate(l => { const s = JSON.parse(localStorage.getItem('studyplan.v1') || '{}'); s.lang = l; s.onboarded = true; localStorage.setItem('studyplan.v1', JSON.stringify(s)) }, lang);
    for (const v of ['welcome', 'today', 'chat', 'plan', 'focus', 'tutor', 'review', 'stats', 'grades']) { await m.goto(URL0 + '#' + v); await m.waitForTimeout(350); const w = await m.evaluate(() => document.documentElement.scrollWidth); if (w > 375) over.push(lang + ':' + v + '=' + w + ' ' + await m.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > 375.5 || b.left < -0.5) }).slice(0, 4).map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + '[' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().right) + ']').join('|'))) }
  }
  check('no horizontal overflow at 375px', over.length === 0, over.join(', '));

  await D();
  // 14. accessibility (axe) on landing and app views
  const actx = await b.newContext({ bypassCSP: true, viewport: { width: 1280, height: 900 } }); const a = await actx.newPage();
  await a.goto(URL0); await a.waitForTimeout(800); const axeOut = [];
  for (const v of ['welcome', 'today', 'chat', 'plan', 'focus', 'tutor', 'review', 'stats', 'grades']) {
    if (v === 'today') await a.evaluate(() => { const s = JSON.parse(localStorage.getItem('studyplan.v1') || '{}'); s.onboarded = true; localStorage.setItem('studyplan.v1', JSON.stringify(s)) });
    await a.goto(URL0 + '#' + v); await a.waitForTimeout(500);
    const r = await a.evaluate(AXE + ';axe.run(document,{resultTypes:["violations"]}).then(r=>r.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id+"("+v.nodes.length+")"))');
    if (r.length) axeOut.push(v + ': ' + r.join(','));
  }
  check('no serious/critical accessibility issues', axeOut.length === 0, axeOut.join(' | '));
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log('\n' + (results.length - failures) + '/' + results.length + ' passed');
})();
