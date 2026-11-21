<script>
/* ================= MASCOT ================= */
function owlSvg(cls,attrs){
  return '<svg class="owl '+(cls||"")+'" viewBox="0 0 120 132" '+(attrs||"")+' aria-hidden="true">'+
  '<ellipse class="wingL" cx="26" cy="84" rx="13" ry="26" fill="var(--owl-2)"/><ellipse class="wingR" cx="94" cy="84" rx="13" ry="26" fill="var(--owl-2)"/>'+
  '<ellipse cx="60" cy="84" rx="36" ry="42" fill="var(--owl)"/><ellipse cx="60" cy="96" rx="23" ry="27" fill="var(--belly)"/>'+
  '<path d="M50 88l5 4 5-4 5 4 5-4M48 100l6 4 6-4 6 4 6-4" stroke="var(--owl-2)" stroke-width="2" fill="none" stroke-linecap="round"/>'+
  '<g class="head"><path d="M26 36l4-20 15 11zM94 36l-4-20-15 11z" fill="var(--owl)"/><ellipse cx="60" cy="46" rx="38" ry="30" fill="var(--owl)"/>'+
  '<circle cx="44" cy="46" r="15" fill="var(--belly)"/><circle cx="76" cy="46" r="15" fill="var(--belly)"/>'+
  '<circle cx="45" cy="47" r="7" fill="#15213B"/><circle cx="75" cy="47" r="7" fill="#15213B"/><circle cx="47.5" cy="44.5" r="2.4" fill="#fff"/><circle cx="77.5" cy="44.5" r="2.4" fill="#fff"/>'+
  '<ellipse class="lid" cx="44" cy="46" rx="15.5" ry="15.5" fill="var(--owl-2)"/><ellipse class="lid" cx="76" cy="46" rx="15.5" ry="15.5" fill="var(--owl-2)"/>'+
  '<path d="M55 58l5 9 5-9z" fill="var(--beak)"/>'+
  '<path d="M30 19l30-12 30 12-30 12z" fill="#1B2440"/><path d="M43 24v9c10 5 24 5 34 0v-9" fill="#1B2440"/><path d="M89 19v16" stroke="var(--hl1)" stroke-width="2.5"/><circle cx="89" cy="37" r="3.5" fill="var(--hl1)"/></g>'+
  '<path d="M46 125h10M64 125h10" stroke="var(--beak)" stroke-width="5" stroke-linecap="round"/></svg>';
}
function owlCheer(){var o=document.querySelector("#helloOwl .owl"); if(!o) return; o.classList.remove("happy"); void o.getBBox(); o.classList.add("happy"); setTimeout(function(){o.classList.remove("happy")},2200)}

/* ================= COUNTRIES, PRAYER TIMES, HIJRI ================= */
var COUNTRIES=[["JO","الأردن","Jordan","عمّان","Amman",31.95,35.93,18,18],["SA","السعودية","Saudi Arabia","الرياض","Riyadh",24.71,46.68,18.5,"90"],["EG","مصر","Egypt","القاهرة","Cairo",30.04,31.24,19.5,17.5],["PS","فلسطين","Palestine","القدس","Jerusalem",31.77,35.21,18,18],["IQ","العراق","Iraq","بغداد","Baghdad",33.31,44.36,18,17],["SY","سوريا","Syria","دمشق","Damascus",33.51,36.29,18,17],["LB","لبنان","Lebanon","بيروت","Beirut",33.89,35.5,18,17],["KW","الكويت","Kuwait","الكويت","Kuwait City",29.37,47.98,18,17.5],["AE","الإمارات","UAE","أبوظبي","Abu Dhabi",24.45,54.38,18.2,18.2],["QA","قطر","Qatar","الدوحة","Doha",25.29,51.53,18,"90"],["BH","البحرين","Bahrain","المنامة","Manama",26.23,50.59,18.5,"90"],["OM","عُمان","Oman","مسقط","Muscat",23.59,58.41,18,18],["YE","اليمن","Yemen","صنعاء","Sanaa",15.37,44.19,18,17],["LY","ليبيا","Libya","طرابلس","Tripoli",32.89,13.19,18,17],["TN","تونس","Tunisia","تونس","Tunis",36.81,10.18,18,18],["DZ","الجزائر","Algeria","الجزائر","Algiers",36.75,3.06,18,17],["MA","المغرب","Morocco","الرباط","Rabat",34.02,-6.84,19,17],["SD","السودان","Sudan","الخرطوم","Khartoum",15.5,32.56,18,17]];
function country(code){return COUNTRIES.filter(function(c){return c[0]===code})[0]||COUNTRIES[0]}
function cName(c){return state.lang==="en"?c[2]:c[1]}
function cCity(c){return state.lang==="en"?c[4]:c[3]}
var prayCache={};
function prayTimes(date,c){
  var key=c[0]+iso(date); if(prayCache[key]) return prayCache[key];
  var R=Math.PI/180, sin=function(x){return Math.sin(x*R)}, cos=function(x){return Math.cos(x*R)}, tan=function(x){return Math.tan(x*R)};
  var asin=function(x){return Math.asin(x)/R}, acos=function(x){return Math.acos(x)/R}, atan2=function(y,x){return Math.atan2(y,x)/R}, acot=function(x){return Math.atan(1/x)/R};
  var fix=function(a,b){a=a-b*Math.floor(a/b); return a<0?a+b:a};
  var lat=c[5], lng=c[6], y=date.getFullYear(), m=date.getMonth()+1, d=date.getDate();
  if(m<=2){y--; m+=12}
  var A=Math.floor(y/100), B=2-A+Math.floor(A/4), JD=Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5-lng/360;
  function sun(jd){var D=jd-2451545, g=fix(357.529+0.98560028*D,360), q=fix(280.459+0.98564736*D,360), L=fix(q+1.915*sin(g)+0.02*sin(2*g),360), e=23.439-0.00000036*D, RA=atan2(cos(e)*sin(L),cos(L))/15; return {decl:asin(sin(e)*sin(L)),eqt:q/15-fix(RA,24)}}
  function mid(t){return fix(12-sun(JD+t).eqt,24)}
  function ang(a,t,ccw){var s=sun(JD+t), v=clamp((-sin(a)-sin(s.decl)*sin(lat))/(cos(s.decl)*cos(lat)),-1,1), T=acos(v)/15; return mid(t)+(ccw?-T:T)}
  function asr(t){var s=sun(JD+t); return ang(-acot(1+tan(Math.abs(lat-s.decl))),t)}
  var mg=ang(0.833,18/24), hrs=[ang(c[7],5/24,true),ang(0.833,6/24,true),mid(0.5)+1/60,asr(13/24),mg,c[8]==="90"?mg+1.5:ang(c[8],18/24)];
  var base=Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
  return (prayCache[key]=hrs.map(function(h){return new Date(base+(h-lng/15)*36e5)}));
}
function hm(d){return new Intl.DateTimeFormat(state.lang==="en"?"en-GB":"ar-JO-u-nu-latn",{hour:"numeric",minute:"2-digit"}).format(d)}
function hijri(d){
  try{return new Intl.DateTimeFormat(state.lang==="en"?"en-u-ca-islamic-umalqura":"ar-SA-u-ca-islamic-umalqura-nu-latn",{day:"numeric",month:"long",year:"numeric"}).format(d)}catch(e){return ""}
}
function nextPrayer(){
  var c=country(state.profile.country), now=new Date(), list=prayTimes(today(),c), i;
  for(i=0;i<6;i++) if(i!==1&&list[i]>now) return {i:i,t:list[i]};
  return {i:0,t:prayTimes(addDays(today(),1),c)[0]};
}
var lastPrayCheck=Date.now();
function prayCheck(){
  if(!state.profile.pray||!F.running||F.phase!=="focus"){lastPrayCheck=Date.now(); return}
  var now=Date.now(), list=prayTimes(today(),country(state.profile.country));
  for(var i=0;i<6;i++){if(i===1) continue; var t=+list[i]; if(t>lastPrayCheck&&t<=now){fPause(); chime(520); toast(L().prayAlert(L().prayNames[i])); break}}
  lastPrayCheck=now;
}

/* ================= COURSE CATALOG ================= */
var CAT={
 school:"الرياضيات|Mathematics;العلوم|Science;الفيزياء|Physics;الكيمياء|Chemistry;الأحياء|Biology;اللغة العربية|Arabic;اللغة الإنجليزية|English;التربية الإسلامية|Islamic Education;الاجتماعيات|Social Studies;الحاسوب|Computer Science",
 tawjihiSci:"الرياضيات|Mathematics;الفيزياء|Physics;الكيمياء|Chemistry;الأحياء|Biology;علوم الأرض والبيئة|Earth and Environmental Science;اللغة العربية|Arabic;اللغة الإنجليزية|English;التربية الإسلامية|Islamic Education;التاريخ|History",
 tawjihiLit:"اللغة العربية|Arabic;اللغة الإنجليزية|English;التربية الإسلامية|Islamic Education;التاريخ|History;الجغرافيا|Geography;الرياضيات|Mathematics;الحاسوب|Computer Science",
 it:"البرمجة 1|Programming 1;البرمجة الكائنية|Object-Oriented Programming;تراكيب البيانات|Data Structures;الخوارزميات|Algorithms;قواعد البيانات|Databases;شبكات الحاسوب|Computer Networks;أنظمة التشغيل|Operating Systems;تطوير تطبيقات الإنترنت|Web Application Development;الذكاء الاصطناعي|Artificial Intelligence;تعلّم الآلة|Machine Learning;الإحصاء والاحتمالات|Probability and Statistics;الرياضيات المتقطعة|Discrete Mathematics;الجبر الخطي|Linear Algebra",
 med:"التشريح|Anatomy;علم وظائف الأعضاء|Physiology;الكيمياء الحيوية|Biochemistry;علم الأدوية|Pharmacology;الأحياء الدقيقة|Microbiology;علم الأمراض|Pathology;أساسيات التمريض|Nursing Fundamentals;الإحصاء الحيوي|Biostatistics",
 eng:"التفاضل والتكامل|Calculus;الفيزياء الهندسية|Engineering Physics;الاستاتيكا|Statics;الدارات الكهربائية|Electric Circuits;الرسم الهندسي|Engineering Drawing;المعادلات التفاضلية|Differential Equations;البرمجة للمهندسين|Programming for Engineers",
 bus:"مبادئ المحاسبة|Principles of Accounting;مبادئ الإدارة|Principles of Management;الاقتصاد الجزئي|Microeconomics;الاقتصاد الكلي|Macroeconomics;مبادئ التسويق|Principles of Marketing;الإدارة المالية|Financial Management;الإحصاء للأعمال|Business Statistics",
 gen:"اللغة العربية|Arabic Language;اللغة الإنجليزية|English Language;مهارات الاتصال|Communication Skills;التربية الوطنية|National Education;الثقافة الإسلامية|Islamic Culture;مهارات الحاسوب|Computer Skills"
};
function catList(k){return CAT[k].split(";").map(function(p){var s=p.split("|"); return state.lang==="en"?s[1]:s[0]})}
function catGroups(o){
  if(o.stage===0) return ["school"];
  if(o.stage===1) return o.branch===0?["tawjihiSci"]:o.branch===1?["tawjihiLit"]:["tawjihiSci","tawjihiLit"];
  var g=["it","med","eng","bus","gen"], m=(o.major||"").toLowerCase();
  var hit=/بيان|حاسوب|برمج|معلومات|ذكاء|شبك|data|comput|software|\bit\b|ai/.test(m)?"it":/طب|تمريض|صيدل|صح|med|nurs|pharm|health/.test(m)?"med":/هندس|engin/.test(m)?"eng":/محاسب|إدار|اقتصاد|تسويق|مال|busin|account|econ|market|financ/.test(m)?"bus":"";
  if(hit) g=[hit].concat(g.filter(function(x){return x!==hit}));
  return g;
}

/* ================= LANDING ================= */
var FEAT_IC=["i-plan","i-stats","i-focus","i-tutor","i-today","i-review","i-fire","i-grades"];
function renderLanding(){
  var l=L();
  $("featGrid").innerHTML=l.feats.map(function(f,i){return '<article class="fcard reveal"><div class="ic" style="background:var('+HL[i%6]+')"><svg><use href="#'+FEAT_IC[i]+'"/></svg></div><h3>'+esc(f[0])+'</h3><p>'+esc(f[1])+'</p></article>'}).join("");
  $("howGrid").innerHTML=l.hows.map(function(h,i){return '<div class="st3 reveal"><span class="n">'+(i+1)+'</span><h3>'+esc(h[0])+'</h3><p>'+esc(h[1])+'</p></div>'}).join("");
  var glyph=["ع","هـ","☾","✓","❝"];
  $("arabList").innerHTML=l.arabs.map(function(a,i){return '<li class="reveal"><i style="background:var('+HL[(i+2)%6]+')">'+glyph[i]+'</i><div><b>'+esc(a[0])+'</b><span>'+esc(a[1])+'</span></div></li>'}).join("");
  $("faqList").innerHTML=l.faqs.map(function(f){return '<details><summary>'+esc(f[0])+'</summary><p>'+esc(f[1])+'</p></details>'}).join("");
  $("pvRings").innerHTML=[[82,"--hl3",l.l_pv2],[61,"--hl1",l.l_pv1],[38,"--hl2",l.demoNames[3]]].map(function(r){return '<div class="ring">'+ringSvg(r[0],r[1],76)+'<span class="nm">'+esc(r[2])+'</span></div>'}).join("");
  var c=country(state.profile.country), t=new Date(), np=nextPrayerFor(c);
  $("mkGreg").textContent=dayFmt(today()); $("mkHijri").textContent=hijri(t);
  $("mkPrayLbl").textContent=l.mkPrayLbl(cCity(c));
  var list=prayTimes(today(),c);
  $("mkPray").innerHTML=[0,2,3,4,5].map(function(i){return '<div'+(i===np?' class="nx"':'')+'>'+esc(l.prayNames[i])+'<b>'+hm(list[i])+'</b></div>'}).join("");
  $("mkQuote").textContent=l.quotes[1];
  $("ctaOwl").innerHTML=owlSvg(); if(!$("sceneOwl").firstChild) $("sceneOwl").innerHTML=owlSvg("",'x="466" y="212" width="80" height="88"');
  qa("[data-go-app]").forEach(function(b){b.textContent=state.onboarded?l.openApp:l.startNow});
  $("lLang").textContent=l.lang; $("lTheme").innerHTML=$("themeBtn").innerHTML;
  animateRings($("pvRings")); observeReveal();
}
function nextPrayerFor(c){var now=new Date(), list=prayTimes(today(),c); for(var i=0;i<6;i++) if(i!==1&&list[i]>now) return i; return 0}
var revObs=null;
function observeReveal(){
  if(reduce||!("IntersectionObserver" in window)) return;
  if(!revObs) revObs=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in"); revObs.unobserve(e.target)}})},{threshold:.15});
  qa(".reveal:not(.in)").forEach(function(el){revObs.observe(el)});
}
document.addEventListener("click",function(e){
  var j=e.target.closest("[data-jump]"); if(j){var el=$(j.dataset.jump); if(el) el.scrollIntoView({behavior:"smooth",block:"start"}); return}
  if(e.target.closest("[data-go-app]")){if(state.onboarded) location.hash="today"; else openOnb()}
});
$("lLang").onclick=function(){$("langBtn").click()};
$("lTheme").onclick=function(){$("themeBtn").click(); $("lTheme").innerHTML=$("themeBtn").innerHTML};

/* ================= ONBOARDING ================= */
var O=null;
function openOnb(){
  var p=state.profile||{};
  O={step:0,name:p.name||"",stage:p.stage>=0?p.stage:-1,country:p.country||guessCountry(),branch:p.branch||0,major:p.major||"",pray:!!p.pray,picks:[],dates:{},hours:state.hours||4,off:state.off,time:p.time||1};
  $("onb").hidden=false; renderOnb();
}
function guessCountry(){
  try{var tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"", map={Amman:"JO",Riyadh:"SA",Cairo:"EG",Gaza:"PS",Hebron:"PS",Baghdad:"IQ",Damascus:"SY",Beirut:"LB",Kuwait:"KW",Dubai:"AE",Qatar:"QA",Bahrain:"BH",Muscat:"OM",Aden:"YE",Tripoli:"LY",Tunis:"TN",Algiers:"DZ",Casablanca:"MA",Khartoum:"SD"};
    for(var k in map) if(tz.indexOf(k)>=0) return map[k];}catch(e){}
  return "JO";
}
function onbSeg(field,labels,val){return '<div class="seg">'+labels.map(function(x,i){return '<button type="button" data-of="'+field+'" data-ov="'+i+'" aria-pressed="'+(i===val)+'">'+esc(x)+'</button>'}).join("")+'</div>'}
function renderOnb(){
  var l=L(), o=l.onb, s=O.step, h="";
  $("onbDots").innerHTML=[0,1,2,3,4].map(function(i){return '<i class="'+(i===s?"on":i<s?"done":"")+'"></i>'}).join("");
  $("onbOwl").innerHTML=owlSvg(s===4?"happy":""); $("onbSay").textContent=o.say[s];
  if(s===0){
    h='<h2>'+esc(o.h[0])+'</h2><div style="margin:10px 0 16px"><label for="oName">'+esc(o.nameL)+'</label><input type="text" id="oName" autocomplete="given-name" placeholder="'+esc(o.nameP)+'" value="'+esc(O.name)+'"></div>'+
      '<span class="lab">'+esc(o.stageQ)+'</span><div class="bigseg">'+o.stages.map(function(st,i){return '<button type="button" data-of="stage" data-ov="'+i+'" aria-pressed="'+(O.stage===i)+'"><svg><use href="#'+["i-review","i-grades","i-tutor"][i]+'"/></svg><b>'+esc(st[0])+'</b><small>'+esc(st[1])+'</small></button>'}).join("")+'</div>';
  }else if(s===1){
    h='<h2>'+esc(o.h[1])+'</h2><div class="grid g2" style="margin-top:10px"><div><label for="oCountry">'+esc(o.countryL)+'</label><select id="oCountry">'+COUNTRIES.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===O.country?" selected":"")+'>'+esc(cName(c))+'</option>'}).join("")+'</select></div>'+
      (O.stage===2?'<div><label for="oMajor">'+esc(o.majorL)+'</label><input type="text" id="oMajor" placeholder="'+esc(o.majorP)+'" value="'+esc(O.major)+'"></div>':'<div><span class="lab">'+esc(o.branchQ)+'</span>'+onbSeg("branch",o.branches,O.branch)+'</div>')+'</div>'+
      '<label class="row c" style="gap:10px;margin-top:16px;color:var(--ink);font-size:.95rem"><input type="checkbox" id="oPray"'+(O.pray?" checked":"")+' style="width:20px;height:20px;accent-color:var(--ink)">'+esc(o.prayL)+'</label>';
  }else if(s===2){
    h='<h2>'+esc(o.h[2])+'</h2><p class="small">'+esc(o.picked(O.picks.length))+'</p>'+catGroups(O).map(function(g){
      return '<div class="catg"><h4>'+esc(l.cats[g])+'</h4><div class="chips">'+catList(g).map(function(n){return '<button type="button" data-pick="'+esc(n)+'" aria-pressed="'+(O.picks.indexOf(n)>=0)+'">'+esc(n)+'</button>'}).join("")+'</div></div>';
    }).join("")+
      (O.picks.filter(function(n){return !catGroups(O).some(function(g){return catList(g).indexOf(n)>=0})}).length?'<div class="catg"><div class="chips">'+O.picks.filter(function(n){return !catGroups(O).some(function(g){return catList(g).indexOf(n)>=0})}).map(function(n){return '<button type="button" data-pick="'+esc(n)+'" aria-pressed="true">'+esc(n)+'</button>'}).join("")+'</div></div>':'')+
      '<div class="row c" style="margin-top:14px"><div class="field"><input type="text" id="oCustom" placeholder="'+esc(o.customP)+'" aria-label="'+esc(o.customP)+'"></div><button class="btn sm" type="button" id="oAdd">'+esc(o.addCustom)+'</button></div>';
  }else if(s===3){
    h='<h2>'+esc(o.h[3])+'</h2><div class="onbsubs" style="margin-top:10px">'+O.picks.map(function(n,i){
      var d=O.dates[n]||(O.dates[n]={date:"",diff:1});
      return '<div class="onbsub"><span class="nm"><i class="swatch" style="background:var('+HL[i%6]+')"></i>'+esc(n)+'</span><input type="date" data-od="'+esc(n)+'" value="'+esc(d.date)+'" aria-label="'+esc(l.date)+'">'+
        '<div class="quick">'+o.quick.map(function(q){return '<button type="button" data-oq="'+esc(n)+'" data-days="'+q[1]+'">'+esc(q[0])+'</button>'}).join("")+'<div style="flex:1 1 180px">'+
        '<div class="seg">'+l.diff.map(function(x,k){return '<button type="button" data-odf="'+esc(n)+'" data-ov="'+k+'" aria-pressed="'+(d.diff===k)+'">'+esc(x)+'</button>'}).join("")+'</div></div></div></div>';
    }).join("")+'</div>';
  }else{
    h='<h2>'+esc(o.h[4])+'</h2><div style="margin-top:10px"><label for="oHours">'+esc(l.hoursQ)+'</label><div class="range-row"><input type="range" id="oHours" min="1" max="12" step="0.5" value="'+O.hours+'"><output id="oHoursOut">'+dur(O.hours*2)+'</output></div></div>'+
      '<div class="grid g2" style="margin-top:12px"><div><label for="oOff">'+esc(l.offQ)+'</label><select id="oOff"><option value="-1">'+esc(l.off0)+'</option><option value="5">'+esc(l.fri)+'</option><option value="6">'+esc(l.sat)+'</option><option value="0">'+esc(l.sun)+'</option></select></div>'+
      '<div><span class="lab">'+esc(o.timeQ)+'</span>'+onbSeg("time",o.times,O.time)+'</div></div>';
  }
  $("onbStep").innerHTML=h; $("onbErr").hidden=true;
  if(s===4) $("oOff").value=String(O.off);
  $("onbBack").textContent=o.back; $("onbBack").style.visibility=s?"visible":"hidden";
  $("onbNext").textContent=s===4?o.finish:o.next; $("onbDemo").textContent=o.skipDemo; $("onbDemo").hidden=s!==0;
}
function onbErr(m){var e=$("onbErr"); e.textContent=m; e.hidden=false}
$("onbStep").addEventListener("click",function(e){
  var b=e.target.closest("[data-of]");
  if(b){O[b.dataset.of]=+b.dataset.ov; qa('[data-of="'+b.dataset.of+'"]',$("onbStep")).forEach(function(x){x.setAttribute("aria-pressed",String(x===b))}); return}
  var p=e.target.closest("[data-pick]");
  if(p){var n=p.dataset.pick, i=O.picks.indexOf(n); if(i>=0) O.picks.splice(i,1); else if(O.picks.length<12) O.picks.push(n); renderOnb(); return}
  if(e.target.id==="oAdd"){var v=$("oCustom").value.trim(); if(v&&O.picks.indexOf(v)<0&&O.picks.length<12){O.picks.push(v.slice(0,40)); renderOnb(); $("oCustom").focus()} return}
  var q=e.target.closest("[data-oq]");
  if(q){var d=O.dates[q.dataset.oq]; d.date=iso(addDays(today(),+q.dataset.days)); var inp=$("onbStep").querySelector('[data-od="'+CSS.escape(q.dataset.oq)+'"]'); if(inp) inp.value=d.date; return}
  var df=e.target.closest("[data-odf]");
  if(df){O.dates[df.dataset.odf].diff=+df.dataset.ov; qa('[data-odf="'+CSS.escape(df.dataset.odf)+'"]',$("onbStep")).forEach(function(x){x.setAttribute("aria-pressed",String(x===df))})}
});
$("onbStep").addEventListener("input",function(e){
  var t=e.target;
  if(t.id==="oName") O.name=t.value.slice(0,30);
  else if(t.id==="oMajor") O.major=t.value.slice(0,60);
  else if(t.id==="oCountry") O.country=t.value;
  else if(t.id==="oPray") O.pray=t.checked;
  else if(t.id==="oHours"){O.hours=+t.value; $("oHoursOut").textContent=dur(O.hours*2)}
  else if(t.id==="oOff") O.off=+t.value;
  else if(t.dataset.od) O.dates[t.dataset.od].date=t.value;
});
$("onbStep").addEventListener("change",function(e){var t=e.target; if(t.id==="oCountry") O.country=t.value; if(t.id==="oPray") O.pray=t.checked; if(t.id==="oOff") O.off=+t.value});
$("onbStep").addEventListener("keydown",function(e){if(e.target.id==="oCustom"&&e.key==="Enter"){e.preventDefault(); $("oAdd").click()}});
$("onbBack").onclick=function(){if(O.step>0){O.step--; renderOnb()}};
$("onbX").onclick=function(){$("onb").hidden=true; if(location.hash==="#start") history.replaceState(null,"",location.pathname+location.search); go()};
$("onbDemo").onclick=function(){
  loadDemo(); state.onboarded=true; state.profile=Object.assign(state.profile||{},{name:O.name}); save(); renderForm(); build(true);
  $("onb").hidden=true; location.hash="today"; renderAll(); celebrate();
};
$("onbNext").onclick=function(){
  var o=L().onb;
  if(O.step===0&&O.stage<0){onbErr(state.lang==="en"?"Choose your stage.":"اختر مرحلتك."); return}
  if(O.step===2&&!O.picks.length){onbErr(o.eSubs); return}
  if(O.step===3){
    var t=today(), bad=O.picks.some(function(n){var d=O.dates[n]; if(!d||!d.date) return true; var x=diffDays(t,parse(d.date)); return isNaN(x)||x<1||x>120});
    if(bad){onbErr(o.eDates); return}
  }
  if(O.step<4){O.step++; renderOnb(); $("onbStep").scrollIntoView({block:"nearest"}); return}
  finishOnb();
};
function finishOnb(){
  var l=L();
  state.profile={name:O.name.trim(),stage:O.stage,country:O.country,branch:O.branch,major:O.major.trim(),pray:O.pray,time:O.time};
  state.subjects=[]; state.done={}; state.bank={}; state.demo=false;
  state.cards=state.cards.filter(function(c){return !c.demo});
  O.picks.forEach(function(n){var d=O.dates[n]; addSubject({name:n,date:d.date,diff:d.diff,ready:0,ch:6})});
  state.hours=O.hours; state.off=O.off; state.onboarded=true; state.gpa.rows=[];
  state.tutor=Object.assign(state.tutor||{},{level:O.stage===2?"uni":"school",major:O.stage===2?O.major.trim():"",course:O.picks[0]||""});
  save(); renderForm(); build(true);
  $("onb").hidden=true; location.hash="today"; renderAll(); celebrate();
  showModal("owl",l.onb.done,l.onb.doneText);
}

/* ================= TODAY EXTRAS: greeting, hijri, prayer, exam eve ================= */
function renderTodayExtras(){
  var l=L(), p=state.profile||{}, h=new Date().getHours(), g=l.greet[h<12?0:h<21?1:2];
  $("greet").textContent=(p.name?l.greetName(g,p.name):g)+(state.lang==="en"?" · ":" · ")+dayFmt(today());
  $("hijri").textContent=hijri(new Date());
  if(!$("helloOwl").firstChild) $("helloOwl").innerHTML=owlSvg();
  var pb=$("prayBox");
  if(p.pray){
    var c=country(p.country), np=nextPrayer(), list=prayTimes(today(),c), mins=Math.max(0,Math.round((np.t-new Date())/6e4));
    pb.hidden=false;
    pb.innerHTML='<div class="pray"><div style="flex:1 1 160px"><span class="soft small">'+esc(l.prayNext)+' · '+esc(cCity(c))+'</span><div class="pn">'+esc(l.prayNames[np.i])+' <span class="num" style="font-size:1rem">'+hm(np.t)+'</span></div><span class="soft small">'+esc(l.prayIn(mins))+'</span></div></div>'+
      '<div class="prayrow">'+[0,2,3,4,5].map(function(i){return '<div'+(i===np.i?' class="nx"':'')+'>'+esc(l.prayNames[i])+'<b>'+hm(list[i])+'</b></div>'}).join("")+'</div>';
  }else pb.hidden=true;
  var eb=$("eveBox"), t=today(), subs=current?current.subs:[];
  var tom=subs.filter(function(s){return diffDays(t,s.d)===1})[0], tod=subs.filter(function(s){return diffDays(t,s.d)===0})[0];
  var s=tod||tom;
  if(!s){eb.hidden=true; return}
  var key=s.id+"|"+iso(s.d)+(tod?"|d":"|e"), items=tod?l.dayItems:l.eveItems, st=(state.eve&&state.eve[key])||{};
  eb.hidden=false;
  eb.innerHTML='<div class="row c" style="justify-content:space-between"><h3>'+esc(tod?l.eveToday(s.name):l.eveH(s.name))+'</h3>'+(tom&&!tod?'<a class="btn sm" href="#review">'+esc(l.dueGo)+'</a>':'')+'</div><ul>'+
    items.map(function(x,i){return '<li><label><input type="checkbox" data-eve="'+esc(key)+'" data-ei="'+i+'"'+(st[i]?" checked":"")+'>'+esc(x)+'</label></li>'}).join("")+'</ul>';
}
document.addEventListener("change",function(e){
  var t=e.target; if(!t.dataset||!t.dataset.eve) return;
  state.eve=state.eve||{}; var k=t.dataset.eve; state.eve[k]=state.eve[k]||{}; state.eve[k][t.dataset.ei]=t.checked; save();
});

/* ================= PROFILE (in Progress) ================= */
function renderProfile(){
  var l=L(), p=state.profile||{};
  $("profBox").innerHTML='<h3>'+esc(l.profH)+'</h3><p class="soft small" style="margin:2px 0 12px">'+esc(l.profLede)+'</p><div class="grid g3">'+
    '<div><label for="pName">'+esc(l.profName)+'</label><input type="text" id="pName" value="'+esc(p.name||"")+'" autocomplete="given-name"></div>'+
    '<div><label for="pCountry">'+esc(l.profCountry)+'</label><select id="pCountry">'+COUNTRIES.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===(p.country||"JO")?" selected":"")+'>'+esc(cName(c))+'</option>'}).join("")+'</select></div>'+
    '<div><span class="lab">'+esc(l.profTime)+'</span><div class="seg">'+l.onb.times.map(function(x,i){return '<button type="button" data-pt="'+i+'" aria-pressed="'+(i===(p.time==null?1:p.time))+'">'+esc(x)+'</button>'}).join("")+'</div></div></div>'+
    '<div class="row c" style="margin-top:14px;justify-content:space-between"><label class="row c" style="gap:10px;margin:0;color:var(--ink)"><input type="checkbox" id="pPray"'+(p.pray?" checked":"")+' style="width:20px;height:20px;accent-color:var(--ink)">'+esc(l.profPray)+'</label><button class="btn sm ghost" type="button" id="pRedo">'+esc(l.profRedo)+'</button></div>';
}
document.addEventListener("input",function(e){
  var t=e.target; if(!state.profile) state.profile={};
  if(t.id==="pName"){state.profile.name=t.value.slice(0,30); save()}
});
document.addEventListener("change",function(e){
  var t=e.target; if(!state.profile) state.profile={};
  if(t.id==="pCountry"){state.profile.country=t.value; save()}
  if(t.id==="pPray"){state.profile.pray=t.checked; save()}
});
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-pt]"); if(b){state.profile=state.profile||{}; state.profile.time=+b.dataset.pt; save(); qa("[data-pt]").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))}); return}
  if(e.target.id==="pRedo") openOnb();
});
</script>
