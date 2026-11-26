// End-to-end checks for the Younis website (docs/), served over HTTP with its real CSP.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..', '..', 'docs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const results = []; let failures = 0;
function check(name, ok, info) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  — ' + info : '')); if (!ok) failures++; }
const LONG = Array.from({ length: 14 }, (_, i) => 'اختبار الفرضيات أداة إحصائية تستخدم لتقييم الادعاءات حول المجتمع الإحصائي اعتماداً على بيانات العينة رقم ' + i + '. القيمة الاحتمالية تقيس احتمال الحصول على نتائج متطرفة بافتراض صحة فرضية العدم في التجربة ' + i + '. مستوى الدلالة يحدد عتبة رفض الفرضية الصفرية عند الباحث في الدراسة ' + i + '.').join('\n');
function sseSearch(text, url) {
  const ev = (t, d) => 'event: ' + t + '\ndata: ' + JSON.stringify(d) + '\n\n';
  return ev('message_start', { type: 'message_start', message: { id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }) +
    ev('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'web_search_tool_result', tool_use_id: 'srvtoolu_1', content: [{ type: 'web_search_result', url: url, title: 'Official page', encrypted_content: 'x', page_age: null }] } }) +
    ev('content_block_stop', { type: 'content_block_stop', index: 0 }) +
    ev('content_block_start', { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } }) +
    ev('content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: text } }) +
    ev('content_block_stop', { type: 'content_block_stop', index: 1 }) +
    ev('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } }) +
    ev('message_stop', { type: 'message_stop' });
}
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
  let apiCalls = 0; let lastApiHeaders = null; let lastBody = null; let trCalls = 0; let searchCalls = 0; let lastSearch = null;
  await ctx.route('https://api.anthropic.com/**', async route => {
    apiCalls++; lastApiHeaders = await route.request().allHeaders();
    const body = JSON.parse(route.request().postData() || '{}'); lastBody = body;
    const prompt = JSON.stringify(body.messages || '');
    let text = 'شرح تجريبي من المعلّم.';
    if (prompt.includes('mind map')) text = JSON.stringify({ center: 'الفرضيات', branches: [{ title: 'فرضية العدم', children: ['H0', 'رفض'] }, { title: 'الدلالة', children: ['alpha'] }, { title: 'القيمة الاحتمالية', children: ['p-value'] }, { title: 'الأخطاء', children: ['النوع الأول', 'النوع الثاني'] }] });
    else if (prompt.includes('multiple-choice')) text = JSON.stringify({ questions: [{ q: 'ما مستوى الدلالة الشائع؟', options: ['0.05', '0.5', '5', '50'], answer: 0, why: 'الأكثر استخداماً' }, { q: 'ماذا تعني H0؟', options: ['فرضية العدم', 'البديلة', 'العينة', 'المجتمع'], answer: 0, why: 'تعريف' }] });
    else if (prompt.includes('most exam-relevant flashcards')) text = JSON.stringify({ cards: [{ q: 'ما القيمة الاحتمالية؟', a: 'احتمال نتائج متطرفة بافتراض H0' }, { q: 'ما الخطأ من النوع الأول؟', a: 'رفض H0 وهي صحيحة' }] });
    else if (prompt.includes('Feynman')) text = JSON.stringify({ score: 84, good: ['فهمت H0'], gaps: ['الدلالة'], wrong: [], better: 'شرح أفضل', next: 'سؤال' });
    else if (prompt.includes('Create up to 12 flashcards')) text = JSON.stringify({ cards: [{ q: 'ما ناتج 6×7؟', a: '42' }, { q: 'ما الجذر التربيعي لـ 49؟', a: '7' }] });
    else if (prompt.includes('Solve the problem')) text = '## الحل\n1. نضرب 6 في 7.\n2. نتحقق: 42 ÷ 7 = 6.\n\n| الخطوة | الناتج |\n|---|---|\n| 6×7 | 42 |\n\n**الجواب النهائي:** 42';
    else if (String(body.system || '').includes('professional academic translator')) { trCalls++; text = 'ترجمة الجزء ' + trCalls; }
    else if (prompt.includes('Extract the study plan below')) text = JSON.stringify({ total_hours: 9, groups: [{ name: 'Major requirements', kind: 'compulsory', hours: 9, courses: [{ code: 'CS101', name: 'Programming 1', cr: 3, pre: [] }, { code: 'CS102', name: 'Programming 2', cr: 3, pre: ['CS101'] }, { code: 'CS201', name: 'Data Structures', cr: 3, pre: ['CS102'] }] }] });
    if (body.tools && body.tools.some(t => t.type === 'web_search_20260209')) {
      searchCalls++; lastSearch = body;
      const progs = '```json\n' + JSON.stringify({ programs: [{ en: 'Computer Science', ar: 'علم الحاسوب', faculty: 'King Abdullah II School of IT', url: 'https://ju.edu.jo/cs' }, { en: 'Data Science', ar: '', faculty: 'IT', url: '' }] }) + '\n```';
      const plan = '```json\n' + JSON.stringify({ total_hours: 12, source: 'https://ju.edu.jo/plan.pdf', groups: [{ name: 'University requirements', kind: 'compulsory', hours: 3, courses: [{ code: 'UNI101', name: 'Arabic Skills', cr: 3, pre: [] }] }, { name: 'Major requirements', kind: 'compulsory', hours: 9, courses: [{ code: 'CS1', name: 'Intro to CS', cr: 3, pre: [] }, { code: 'CS2', name: 'Programming', cr: 3, pre: ['CS1'] }, { code: 'CS3', name: 'Algorithms', cr: 3, pre: ['CS2'] }] }] }) + '\n```';
      await route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream', 'access-control-allow-origin': '*' }, body: sseSearch(prompt.includes('list of undergraduate programs') ? 'Found the list.\n' + progs : 'Found the plan.\n' + plan, 'https://ju.edu.jo/programs') });
      return;
    }
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
  // timetable import (no AI: local parser)
  await p.click('#impToggle'); await p.fill('#impText', 'إحصاء حيوي 2027-01-10 الساعة 9:00\nالأحد ١٢/١/٢٠٢٧ - الشبكات\nfinal: Physics 15/01/2027');
  await p.click('#impGo'); await p.waitForTimeout(300);
  const impN = (await p.$$('#impOut [data-imp]')).length; check('timetable parser finds 3 exams (Arabic digits, weekday, mixed formats)', impN === 3, 'found ' + impN);
  await p.click('#impAdd'); await p.waitForTimeout(300);
  const subNames = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).subjects.map(s => s.name + '@' + s.date).join(' | '));
  check('imported exams added to the plan', /الشبكات@2027-01-12/.test(subNames) && /Physics@2027-01-15/.test(subNames), subNames);
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
  // 7b. Lens: real photo -> resized image block -> streamed, rendered answer
  await p.evaluate(() => location.hash = 'lens'); await p.waitForTimeout(400);
  check('lens page needs no key prompt once AI is on', !(await p.isVisible('#lensKey')));
  // a 12-megapixel "phone photo" (4000×3000) made in the page, then uploaded like a real file
  const big = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 4000; c.height = 3000; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 4000, 3000); x.fillStyle = '#123'; x.font = '200px serif'; x.fillText('6 × 7 = ?', 800, 1500); return c.toDataURL('image/png').split(',')[1] });
  const bigFile = path.join(require('os').tmpdir(), 'younis-12mp.png'); fs.writeFileSync(bigFile, Buffer.from(big, 'base64'));
  await p.setInputFiles('#imgFile', bigFile); await p.waitForTimeout(1500);
  const dims = await p.textContent('#imgThumbs small');
  const [tw, th] = dims.split('×').map(Number);
  check('12 MP photo resized to Claude\'s vision budget (≤2576px, ≤3.75MP, ratio kept)', Math.max(tw, th) <= 2576 && tw * th <= 3.75e6 && tw * th > 3.6e6 && Math.abs(tw / th - 4 / 3) < 0.01, dims);
  await p.click('#lensGo'); await p.waitForTimeout(1500);
  const img = (lastBody.messages[0].content || []).find(c => c.type === 'image');
  check('request carries a base64 JPEG image block', !!img && img.source.media_type === 'image/jpeg' && img.source.data.length > 10000);
  check('lens sends a system prompt and high effort for solving', String(lastBody.system).includes('Younis') && lastBody.output_config.effort === 'high');
  check('answer rendered as safe markdown with a table', await p.isVisible('#lensOut table') && (await p.textContent('#lensOut')).includes('42'));
  await p.click('#imgThumbs [data-rot="0"]'); await p.waitForTimeout(600);
  check('rotate swaps width and height', (await p.textContent('#imgThumbs small')) === th + '×' + tw);
  await p.click('[data-lm="cards"]'); await p.click('#lensGo'); await p.waitForTimeout(1500);
  const cardsBefore = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).cards.length);
  await p.click('#lensCardAdd'); await p.waitForTimeout(300);
  const cardsAfter = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).cards.length);
  check('photo turned into review flashcards', cardsAfter === cardsBefore + 2, cardsBefore + ' -> ' + cardsAfter);
  // translation: long text is split into parts and every part is translated in order
  await p.click('#lensTabT'); await p.waitForTimeout(200);
  const para = 'Hypothesis testing is a statistical method used to decide whether the data support a claim about a population. ';
  const longText = Array.from({ length: 3 }, () => para.repeat(40)).join('\n\n');
  await p.fill('#trText', longText); await p.selectOption('#trTo', 'ar');
  const parts = await p.textContent('#trInfo');
  trCalls = 0; await p.click('#trGo'); await p.waitForTimeout(3000);
  const trOut = await p.textContent('#trOut');
  check('long text translated in 3 parts, in order', trCalls === 3 && trOut.indexOf('ترجمة الجزء 1') < trOut.indexOf('ترجمة الجزء 3'), parts + ' / calls=' + trCalls);
  check('translation output is right-to-left for Arabic', (await p.getAttribute('#trOut', 'dir')) === 'rtl');
  const [docx] = await Promise.all([p.waitForEvent('download'), p.click('#trDocx')]);
  const dpath = path.join(require('os').tmpdir(), 'younis-tr-test.docx'); await docx.saveAs(dpath);
  const zbuf = fs.readFileSync(dpath);
  check('translation downloads as a real Word file', docx.suggestedFilename().endsWith('.docx') && zbuf.slice(0, 2).toString() === 'PK' && zbuf.includes(Buffer.from('word/document.xml')));

  await D();
  // 7c. My university: verified catalog (AAU) -> major -> tracker
  await p.evaluate(() => location.hash = 'uni'); await p.waitForTimeout(800);
  await p.selectOption('#uniCountry', 'JO'); await p.waitForTimeout(500);
  await p.fill('#uniSearch', 'ahliyya'); await p.waitForTimeout(300);
  check('university search finds AAU and marks it verified', await p.isVisible('#uniList .vtag'));
  await p.click('#uniList button'); await p.waitForTimeout(800);
  const nProg = (await p.$$('[data-u="prog"]')).length;
  check('verified catalog lists only this university\'s majors', nProg >= 40, 'programs=' + nProg);
  await p.fill('#majSearch', 'Data Science'); await p.waitForTimeout(700);
  await p.click('[data-u="prog"]'); await p.waitForTimeout(800);
  const crs = (await p.$$('.crs li')).length;
  check('major shows its own study plan courses', crs >= 55, 'courses=' + crs);
  const pct0 = await p.textContent('.bigpct');
  await p.click('[data-u="st"][data-c="01006145"][data-v="d"]'); await p.waitForTimeout(400);
  check('passing a 3-hour course adds 3 hours', (await p.textContent('.grad')).includes('3 من 132'), (await p.textContent('.grad p')).slice(0, 60));
  check('its dependent course becomes available next semester', (await p.textContent('.nextlist')).includes('البرمجة') || (await p.textContent('.nextlist')).includes('Programming'));
  await p.click('[data-u="st"][data-c="01006146"][data-v="n"]'); await p.waitForTimeout(300);
  await p.click('[data-u="toplan"]'); await p.waitForTimeout(300);
  const subs = await p.evaluate(() => JSON.parse(localStorage.getItem('studyplan.v1')).subjects.map(s => s.name));
  check('courses I take now go into my study plan', subs.some(n => /برمجة|Programming/.test(n)), subs.join(','));
  // AI search path for a university without a verified plan, limited to its own domain
  await p.click('[data-u="chuni"]'); await p.waitForTimeout(600);
  await p.fill('#uniSearch', 'University of Jordan'); await p.waitForTimeout(300);
  check('search ranks the exact name first', (await p.textContent('#uniList button')).includes('University of Jordan') && !(await p.textContent('#uniList button')).includes('Science'), await p.textContent('#uniList button'));
  await p.click('#uniList button'); await p.waitForTimeout(600);
  await p.click('[data-u="aiprogs"]'); await p.waitForTimeout(1500);
  check('AI search is restricted to the university\'s domain', !!lastSearch && lastSearch.tools[0].allowed_domains[0] === 'ju.edu.jo', lastSearch ? JSON.stringify(lastSearch.tools[0]) : 'none');
  check('AI-found majors listed with sources', (await p.$$('[data-u="aiprog"]')).length === 2 && await p.isVisible('.srcline a'));
  await p.click('[data-u="aiprog"]'); await p.waitForTimeout(1500);
  check('AI-found plan shows courses, tagged for checking', (await p.$$('.crs li')).length === 4 && await p.isVisible('.vtag.ai'));
  const srcHref = await p.getAttribute('.srcline a', 'href');
  check('source links are https with noopener', /^https:/.test(srcHref) && (await p.getAttribute('.srcline a', 'rel')).includes('noopener'));
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
  check('backup exports state', Array.isArray(exported.subjects) && exported.subjects.length >= 3 && !JSON.stringify(exported).includes('sk-ant-'));
  check('file inputs have unique ids', await p.evaluate(() => document.querySelectorAll('#impFile').length === 1 && !!document.getElementById('ttFile')));
  await p.setInputFiles('#impFile', file); await p.waitForTimeout(500);
  const okMsg = await p.evaluate(() => T.ar.impOk);
  check('backup restore works', (await p.textContent('#toast')) === okMsg, await p.textContent('#toast'));
  await D();
  const [cardDl] = await Promise.all([p.waitForEvent('download'), p.click('#shareBtn')]);
  check('progress card downloads as a PNG', cardDl.suggestedFilename() === 'younis-progress.png' && await p.isVisible('#sharePrev img'));
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
    for (const v of ['welcome', 'today', 'chat', 'lens', 'plan', 'focus', 'tutor', 'review', 'uni', 'stats', 'grades']) { await m.goto(URL0 + '#' + v); await m.waitForTimeout(350); const w = await m.evaluate(() => document.documentElement.scrollWidth); if (w > 375) over.push(lang + ':' + v + '=' + w + ' ' + await m.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > 375.5 || b.left < -0.5) }).slice(0, 4).map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) + '[' + Math.round(e.getBoundingClientRect().left) + ',' + Math.round(e.getBoundingClientRect().right) + ']').join('|'))) }
  }
  check('no horizontal overflow at 375px', over.length === 0, over.join(', '));

  await D();
  // 14. accessibility (axe) on landing and app views
  const actx = await b.newContext({ bypassCSP: true, viewport: { width: 1280, height: 900 } }); const a = await actx.newPage();
  await a.goto(URL0); await a.waitForTimeout(800); const axeOut = [];
  for (const v of ['welcome', 'today', 'chat', 'lens', 'plan', 'focus', 'tutor', 'review', 'uni', 'stats', 'grades']) {
    if (v === 'today') await a.evaluate(() => { const s = JSON.parse(localStorage.getItem('studyplan.v1') || '{}'); s.onboarded = true; localStorage.setItem('studyplan.v1', JSON.stringify(s)) });
    await a.goto(URL0 + '#' + v); await a.waitForTimeout(500);
    const r = await a.evaluate(AXE + ';axe.run(document,{resultTypes:["violations"]}).then(r=>r.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id+"("+v.nodes.length+")"))');
    if (r.length) axeOut.push(v + ': ' + r.join(','));
  }
  check('no serious/critical accessibility issues', axeOut.length === 0, axeOut.join(' | '));
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log('\n' + (results.length - failures) + '/' + results.length + ' passed');
})();
