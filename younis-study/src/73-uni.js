<script>
/* ================= My university: country -> university -> major -> courses, and the graduation tracker ================= */
/* Data layers, from most to least trusted:
   1. data/catalog/*.json  official study plans scraped from the university's own site (tools/fetch_aau.py)
   2. AI search            Claude + web search limited to the university's domain, with sources shown
   3. Manual               the student pastes or uploads their own study plan
   The world list of universities (data/unis/*.json) comes from the open Hipo dataset (MIT). */
var uniIdx=null, catIdx=null, uniCountry={}, catCache={}, uniCtl=null, uniBusyMsg="", uniFac="", uniQ="", uniShow="all", uniManualOpen=false;
var uniDraft={name:"",text:""}, uniTyping=0, GROUP_ORDER=["university","faculty","major","ancillary","other","remedial","complementary"];

function getJSON(path){return fetch("data/"+path).then(function(r){if(!r.ok) throw new Error(r.status); return r.json()})}
function uniState(){var u=state.uni; if(!u.st||typeof u.st!=="object") u.st={}; if(!(u.perSem>=6)) u.perSem=15; return u}
function regionName(cc){try{return new Intl.DisplayNames([state.lang==="en"?"en":"ar"],{type:"region"}).of(cc)}catch(e){return cc}}
function loc(o){if(!o) return ""; if(typeof o==="string") return o; return (state.lang!=="en"&&o.ar)?o.ar:(o.en||o.ar||"")}
function fold(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g,"").replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim()}
function matches(hay,q){var h=fold(hay); return fold(q).split(" ").every(function(w){return !w||h.indexOf(w)>=0})}
function safeUrl(u){return typeof u==="string"&&/^https:\/\/[^\s"<>]+$/.test(u)?u:""}
function link(u,text){u=safeUrl(u); return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+esc(text||u)+'</a>':esc(text||"")}
/* Best first guess for the country: the device's time zone, then the browser's region, then Jordan. */
var TZ_CC={"Asia/Amman":"JO","Asia/Riyadh":"SA","Asia/Dubai":"AE","Asia/Kuwait":"KW","Asia/Qatar":"QA","Asia/Bahrain":"BH","Asia/Muscat":"OM","Africa/Cairo":"EG","Asia/Baghdad":"IQ","Asia/Damascus":"SY","Asia/Beirut":"LB","Asia/Gaza":"PS","Asia/Hebron":"PS","Africa/Casablanca":"MA","Africa/Algiers":"DZ","Africa/Tunis":"TN","Africa/Tripoli":"LY","Africa/Khartoum":"SD","Asia/Aden":"YE","Europe/Istanbul":"TR","Asia/Kuala_Lumpur":"MY","Europe/London":"GB","Europe/Berlin":"DE","Europe/Paris":"FR"};
function guessCountry(){
  var has=function(c){return c&&uniIdx.some(function(x){return x[0]===c})}, tz="";
  try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||""}catch(e){}
  if(has(TZ_CC[tz])) return TZ_CC[tz];
  var m=(navigator.language||"").match(/-([A-Za-z]{2})$/), r=m?m[1].toUpperCase():"";
  return has(r)?r:"JO";
}
function loadIndexes(){
  if(uniIdx&&catIdx) return Promise.resolve();
  return Promise.all([getJSON("unis/index.json"),getJSON("catalog/index.json")]).then(function(r){uniIdx=r[0]; catIdx=r[1]});
}
function catFor(dom){return (catIdx||[]).filter(function(c){return c.dom===dom})[0]||null}
function loadCountry(cc){return uniCountry[cc]?Promise.resolve(uniCountry[cc]):getJSON("unis/"+cc+".json").then(function(a){uniCountry[cc]=a; return a})}
function loadCat(id){return catCache[id]?Promise.resolve(catCache[id]):getJSON("catalog/"+id+".json").then(function(c){catCache[id]=c; return c})}

function stepsHtml(n){
  var l=L();
  return '<ol class="steps">'+l.uniSteps.map(function(s,i){return '<li class="'+(i<n?"done":i===n?"on":"")+'"><b>'+(i<n?"✓":i+1)+'</b>'+esc(s)+'</li>'}).join("")+'</ol>';
}
function busyHtml(){
  if(!uniBusyMsg) return "";
  return '<div class="banner" style="margin-bottom:14px"><p role="status">'+esc(uniBusyMsg)+'</p><button class="btn sm ghost" type="button" data-u="stop">'+esc(L().stop)+'</button></div>';
}
function renderUni(){
  var box=$("uniBody"), u=uniState(), l=L();
  if(!IS_WEB){box.innerHTML='<p class="banner">'+esc(l.uniWebOnly)+'</p>'; return Promise.resolve()}
  return loadIndexes().then(function(){
    if(!u.dom) return renderUniPick();
    if(!u.pid) return renderMajorPick();
    return renderTracker();
  }).catch(function(){box.innerHTML='<p class="error">'+esc(l.uniLoadFail)+'</p>'});
}
onRoute.uni=renderUni;

/* ---------- step 1: country and university ---------- */
function renderUniPick(){
  var u=state.uni, l=L(), lang=state.lang==="en"?"en":"ar";
  var cc=u.cc||guessCountry();
  var countries=uniIdx.map(function(x){return {cc:x[0],n:x[1],name:regionName(x[0])}}).sort(function(a,b){return a.name.localeCompare(b.name,lang)});
  $("uniBody").innerHTML=stepsHtml(0)+'<div class="sheet tape">'+
    '<div class="row"><div class="field" style="flex:1 1 220px"><label for="uniCountry">'+esc(l.uniCountry)+'</label><select id="uniCountry">'+countries.map(function(c){return '<option value="'+esc(c.cc)+'"'+(c.cc===cc?" selected":"")+'>'+esc(c.name)+' ('+c.n+')</option>'}).join("")+'</select></div>'+
    '<div class="field" style="flex:2 1 280px"><label for="uniSearch">'+esc(l.uniSearch)+'</label><input type="search" id="uniSearch" autocomplete="off" placeholder="'+esc(l.uniSearchP)+'" value="'+esc(uniQ)+'"></div></div>'+
    '<ul class="pick" id="uniList" aria-label="'+esc(l.uniSearch)+'"></ul>'+
    '<p class="soft small" style="margin:10px 0 0">'+esc(l.uniDataNote)+'</p></div>';
  u.cc=cc; fillUniList();
}
function fillUniList(){
  var l=L(), cc=state.uni.cc, list=$("uniList"); if(!list) return;
  loadCountry(cc).then(function(arr){
    if(state.uni.cc!==cc||!$("uniList")) return;
    var rows=arr.map(function(x,i){var c=catFor(x[1]); return {i:i,name:x[0],dom:x[1],cat:c}}).filter(function(r){return matches(r.name+" "+r.dom+" "+(r.cat?r.cat.name.ar+" "+r.cat.name.en:""),uniQ)});
    var phrase=fold(uniQ);
    rows.forEach(function(r){var n=fold(r.name), at=phrase?n.indexOf(phrase):-1; r.score=(r.cat?4:0)+(at===0?2:0)+(at>=0?1:0)});
    rows.sort(function(a,b){return (b.score-a.score)||(a.i-b.i)});
    list.innerHTML=rows.length?rows.slice(0,300).map(function(r){
      return '<li><button type="button" data-u="uni" data-i="'+r.i+'"><span><span class="rtl">'+esc(r.cat?loc(r.cat.name):r.name)+'</span><span class="sub">'+esc(r.cat&&state.lang!=="en"?r.name+" · "+r.dom:r.dom)+'</span></span>'+(r.cat?'<span class="vtag">✓ '+esc(l.uniVerified)+'</span>':'')+'</button></li>';
    }).join(""):'<li class="empty">'+esc(l.uniNoMatch)+'</li>';
  }).catch(function(){list.innerHTML='<li class="empty">'+esc(l.uniLoadFail)+'</li>'});
}

/* ---------- step 2: the major ---------- */
function uniHeader(withMajor){
  var u=state.uni, l=L(), c=catFor(u.dom);
  return '<div class="uni-head"><div><h2>'+esc(c?loc(c.name):u.uname)+'</h2><p class="soft small">'+esc(regionName(u.cc))+' · <bdi>'+esc(u.dom)+'</bdi></p></div>'+
    '<div class="actions">'+(withMajor?'<button class="btn sm ghost" type="button" data-u="chmajor">'+esc(l.uniChangeMajor)+'</button>':'')+'<button class="btn sm ghost" type="button" data-u="chuni">'+esc(l.uniChangeUni)+'</button></div></div>';
}
function renderMajorPick(){
  var u=state.uni, l=L(), c=catFor(u.dom), box=$("uniBody");
  if(c){
    box.innerHTML=stepsHtml(1)+busyHtml()+'<div class="sheet tape mint">'+uniHeader(false)+'<p class="soft small" style="margin:6px 0 0">'+esc(l.uniLoading)+'</p></div>';
    return loadCat(c.id).then(function(cat){
      var facs=cat.faculties.map(function(f){return f.en});
      var progs=cat.programs.filter(function(p){return (!uniFac||p.fac===uniFac)&&matches(p.en+" "+p.ar,uniQ)});
      box.innerHTML=stepsHtml(1)+'<div class="sheet tape mint">'+uniHeader(false)+
        '<p class="srcline"><span class="vtag">✓ '+esc(l.uniVerTag)+'</span> '+esc(l.uniSourceOff)+' '+link(cat.source,cat.domain)+' · '+esc(l.uniFetched(cat.fetched))+'</p>'+
        '<div class="field" style="margin-top:12px"><label for="majSearch">'+esc(l.uniMajorQ)+'</label><input type="search" id="majSearch" autocomplete="off" placeholder="'+esc(l.uniMajorSearchP)+'" value="'+esc(uniQ)+'"></div>'+
        '<div class="chips facs" role="group" aria-label="'+esc(l.uniFaculty)+'"><button type="button" data-u="fac" data-f="" aria-pressed="'+(!uniFac)+'">'+esc(l.uniAllFacs)+'</button>'+
        cat.faculties.map(function(f){return '<button type="button" data-u="fac" data-f="'+esc(f.en)+'" aria-pressed="'+(uniFac===f.en)+'">'+esc(loc(f))+'</button>'}).join("")+'</div>'+
        '<ul class="pick" aria-label="'+esc(l.uniMajorQ)+'">'+(progs.length?progs.map(function(p){
          var f=cat.faculties[facs.indexOf(p.fac)];
          return '<li><button type="button" data-u="prog" data-p="'+esc(p.id)+'"><span><span class="rtl">'+esc(loc(p))+'</span><span class="sub rtl">'+esc(loc(f))+' · '+esc(l.uniHours(p.hours))+(p.degree==="diploma"?" · "+esc(l.uniDiploma):"")+'</span></span><span class="soft small">'+(p.groups?esc(l.uniNCourses(p.groups.reduce(function(a,g){return a+g.c.length},0))):"")+'</span></button></li>';
        }).join(""):'<li class="empty">'+esc(l.uniNoMatch)+'</li>')+'</ul>'+
        '<p class="soft small" style="margin:10px 0 0">'+esc(l.uniNotListed)+' <button class="link" type="button" data-u="manual">'+esc(l.uniManual)+'</button></p>'+
        (uniManualOpen?manualHtml():"")+mineHtml()+'</div>';
    });
  }
  var ai=state.uniAi[u.dom];
  var hasAI=!!sample;
  box.innerHTML=stepsHtml(1)+busyHtml()+'<div class="sheet tape mint">'+uniHeader(false)+
    '<p style="margin:12px 0 10px">'+esc(l.uniNoCat)+'</p>'+
    '<div class="grad" style="margin-top:0">'+
      '<div class="sheet"><h3>'+esc(l.uniAiFind)+'</h3><p class="soft small">'+esc(l.uniAiFindLede)+'</p>'+
        (hasAI?'<button class="btn primary sm" type="button" data-u="aiprogs"'+(uniBusyMsg?" disabled":"")+'>'+esc(ai?l.uniAiAgain:l.uniAiFind)+'</button><p class="soft small" style="margin:8px 0 0">'+esc(l.uniCost)+'</p>':'<a class="btn sm primary" href="#tutor">'+esc(l.lensKeyBtn)+'</a> <span class="soft small">'+esc(l.lensNeedKey)+'</span>')+'</div>'+
      '<div class="sheet"><h3>'+esc(l.uniManual)+'</h3><p class="soft small">'+esc(l.uniManualLede)+'</p><button class="btn sm" type="button" data-u="manual">'+esc(l.uniManual)+'</button></div>'+
    '</div>'+
    (uniManualOpen?manualHtml():"")+
    (ai&&ai.programs.length?'<h3 style="margin:18px 0 0">'+esc(l.uniMajorQ)+' <span class="vtag ai">'+esc(l.uniAiTag)+'</span></h3><ul class="pick">'+ai.programs.map(function(p,i){
      return '<li><button type="button" data-u="aiprog" data-i="'+i+'"><span><span class="rtl">'+esc(loc(p))+'</span><span class="sub rtl">'+esc(p.faculty||"")+'</span></span>'+(state.uniPlans[u.dom+"|ai:"+i]?'<span class="vtag ai">✓</span>':'')+'</button></li>';
    }).join("")+'</ul>'+sourcesHtml(ai.sources):"")+
    mineHtml()+'</div>';
}
function mineHtml(){
  var u=state.uni, l=L(), mine=Object.keys(state.uniPlans).filter(function(k){return k.indexOf(u.dom+"|me:")===0});
  return mine.length?'<h3 style="margin:18px 0 0">'+esc(l.uniMine)+'</h3><ul class="pick">'+mine.map(function(k){return '<li><button type="button" data-u="mine" data-k="'+esc(k)+'"><span class="rtl">'+esc(loc(state.uniPlans[k].name))+'</span><span class="vtag me">'+esc(l.uniMeTag)+'</span></button></li>'}).join("")+'</ul>':"";
}
function sourcesHtml(src){
  if(!src||!src.length) return "";
  return '<p class="srcline">'+esc(L().uniSources)+' '+src.slice(0,6).map(function(s){return link(s.url,(s.title||s.url).slice(0,70))}).join(" · ")+'</p>';
}
function manualHtml(){
  var l=L();
  return '<div class="sheet" style="margin-top:14px" id="uniManual"><h3>'+esc(l.uniManual)+'</h3>'+
    '<div class="field"><label for="upName">'+esc(l.uniPlanName)+'</label><input type="text" id="upName" maxlength="120" autocomplete="off" value="'+esc(uniDraft.name)+'"></div>'+
    '<div style="margin-top:10px"><label for="upText">'+esc(l.uniPlanText)+'</label><textarea id="upText" rows="6" maxlength="60000" placeholder="'+esc(l.uniPlanTextP)+'">'+esc(uniDraft.text)+'</textarea></div>'+
    '<div class="row c" style="margin-top:10px;gap:10px"><label class="btn sm ghost" style="margin:0;color:var(--ink)"><svg><use href="#i-up"/></svg><span>'+esc(l.uniPlanFile)+'</span><input type="file" id="upFile" accept=".pdf,.docx,.xlsx,.txt,.csv" hidden></label>'+
    '<button class="btn sm primary" type="button" data-u="manualgo">'+esc(l.uniPlanGo)+'</button></div></div>';
}

/* ---------- plans: one shape for every source ---------- */
/* plan = {name, groups:[{g,k,h,c:[ids]}], courses:{id:{en,ar,cr}}, pre:{id:[ids]}, total, source, sources, tag} */
function groupKey(name){
  var n=fold(name);
  if(/remedial|استدراك/.test(n)) return "remedial";
  if(/complementary|تكميل/.test(n)) return "complementary";
  if(/universit|جامع/.test(n)) return "university";
  if(/facult|college|school|كليه/.test(n)) return "faculty";
  if(/ancillar|support|مساند/.test(n)) return "ancillary";
  if(/major|special|department|program|تخصص|قسم/.test(n)) return "major";
  return "other";
}
function num(x,max){x=+x; return isFinite(x)&&x>0&&x<=max?Math.round(x):null}
function str(x,max){return typeof x==="string"?x.replace(/\s+/g," ").trim().slice(0,max):""}
function planFromJson(j,name){
  var courses={}, groups=[], byKey={}, n=0, pending=[];
  (Array.isArray(j&&j.groups)?j.groups:[]).slice(0,30).forEach(function(g){
    var ids=[];
    (Array.isArray(g&&g.courses)?g.courses:[]).forEach(function(c){
      if(n>=300) return;
      var nm=str(c&&c.name,160); if(!nm) return;
      var code=str(c.code,24).replace(/[^\w\- ]/g,""), id=code||("x"+(++n));
      if(courses[id]) id=id+"_"+(++n); else n++;
      courses[id]={en:nm,ar:/[\u0600-\u06FF]/.test(nm)?nm:"",cr:num(c.cr,30)||0,code:code};
      byKey[fold(nm)]=id; if(code) byKey[fold(code)]=id;
      if(Array.isArray(c.pre)) pending.push([id,c.pre]);
      ids.push(id);
    });
    if(ids.length) groups.push({g:groupKey(str(g.name,80)),label:str(g.name,80),k:/elect|اختيار/i.test(String(g.kind||"")+" "+String(g.name||""))?"elective":"compulsory",h:num(g.hours,120),c:ids});
  });
  var pre={};
  pending.forEach(function(p){var ids=p[1].map(function(x){return byKey[fold(String(x))]}).filter(function(x){return x&&x!==p[0]}); if(ids.length) pre[p[0]]=ids});
  return {name:{en:name,ar:/[\u0600-\u06FF]/.test(name)?name:""},groups:groups,courses:courses,pre:pre,total:num(j&&j.total_hours,250),source:safeUrl(j&&j.source)};
}
function parsePlanLocally(text,name){
  var groups=[{name:"",kind:"compulsory",courses:[]}];
  text.split(/\n/).forEach(function(line){
    var t=line.replace(/[|\t]+/g," ").replace(/\s+/g," ").trim(), m;
    if(!t) return;
    if((m=t.match(/^([A-Za-z]{0,6}\s?-?\d{3,9})\s+(.+?)\s+(\d{1,2})(?:\s|$)/))) groups[0].courses.push({code:m[1],name:m[2],cr:+m[3]});
    else if((m=t.match(/^(.{3,120}?)\s+(\d{1,2})$/))) groups[0].courses.push({name:m[1],cr:+m[2]});
  });
  return planFromJson({groups:groups},name);
}
function getPlan(){
  var u=state.uni;
  if(u.src==="cat") return loadCat(u.cat).then(function(cat){
    var p=cat.programs.filter(function(x){return x.id===u.pid})[0]; if(!p) return null;
    return {name:{en:p.en,ar:p.ar},groups:p.groups||[],courses:cat.courses,pre:p.pre||{},total:p.hours,source:p.plan||p.page||cat.source,fetched:cat.fetched,tag:"ver"};
  });
  var p=state.uniPlans[u.dom+"|"+u.pid];
  return Promise.resolve(p?Object.assign({tag:u.src==="ai"?"ai":"me"},p):null);
}

/* ---------- graduation maths ---------- */
function crOf(plan,id){return (plan.courses[id]||{}).cr||0}
function counted(g){return g.g!=="remedial"&&g.g!=="complementary"}
function planStats(plan){
  var st=state.uni.st, need=0, got=0, bars={}, order=[];
  plan.groups.forEach(function(g){
    if(!counted(g)) return;
    var all=g.c.reduce(function(a,id){return a+crOf(plan,id)},0), req=g.h||all;
    var done=Math.min(req,g.c.reduce(function(a,id){return a+(st[id]==="d"?crOf(plan,id):0)},0));
    var key=g.g==="other"?"o:"+loc(g.label):g.g;
    if(!bars[key]){bars[key]={g:g.g,label:g.label,req:0,done:0}; order.push(key)}
    bars[key].req+=req; bars[key].done+=done; need+=req; got+=done;
  });
  var total=plan.total||need;
  return {total:total,got:Math.min(got,total),left:Math.max(0,total-got),pct:total?Math.min(100,Math.round(got/total*100)):0,bars:order.map(function(k){return bars[k]})};
}
function level(id){var m=String(id).match(/(\d)\d\d$/); return m?+m[1]:9}
/* Remedial courses depend on a placement test (many students are exempt), so they never block a course. */
function remedialSet(plan){
  if(!plan._rem){plan._rem={}; plan.groups.forEach(function(g){if(g.g==="remedial") g.c.forEach(function(id){plan._rem[id]=1})})}
  return plan._rem;
}
function missingPre(plan,id){var rem=remedialSet(plan); return (plan.pre[id]||[]).filter(function(p){return plan.courses[p]&&!rem[p]&&state.uni.st[p]!=="d"})}
function available(plan){
  var st=state.uni.st, seen={}, out=[];
  plan.groups.forEach(function(g,gi){
    if(!counted(g)) return;
    if(g.k==="elective"&&g.h){var d=g.c.reduce(function(a,id){return a+(st[id]==="d"?crOf(plan,id):0)},0); if(d>=g.h) return}
    g.c.forEach(function(id){
      if(st[id]||seen[id]||missingPre(plan,id).length) return;
      seen[id]=1; out.push({id:id,el:g.k==="elective",lvl:level(id),gi:gi});
    });
  });
  out.sort(function(a,b){return (a.el-b.el)||(a.lvl-b.lvl)||(a.gi-b.gi)});
  var room=state.uni.perSem;
  out.forEach(function(x){var c=crOf(plan,x.id); if(!x.el&&c<=room){x.pick=true; room-=c}});
  out.forEach(function(x){var c=crOf(plan,x.id); if(x.el&&c<=room&&!out.some(function(y){return y.pick&&y.el&&y.gi===x.gi})){x.pick=true; room-=c}});
  return out;
}
function courseName(plan,id){return loc(plan.courses[id])||id}

/* ---------- step 3: my courses and the tracker ---------- */
var uniPlanNow=null;
function renderTracker(){
  var l=L(), u=uniState(), box=$("uniBody");
  return getPlan().then(function(plan){
    uniPlanNow=plan;
    if(!plan){u.pid=""; save(); return renderMajorPick()}
    if(!plan.groups.length){
      box.innerHTML=stepsHtml(2)+'<div class="sheet tape">'+uniHeader(true)+'<h3 style="margin-top:12px">'+esc(loc(plan.name))+'</h3><p class="banner">'+esc(l.uniNoPlan)+' '+link(plan.source,l.uniOpenSource)+'</p><button class="btn sm" type="button" data-u="manual">'+esc(l.uniManual)+'</button>'+(uniManualOpen?manualHtml():"")+'</div>';
      return;
    }
    var s=planStats(plan), av=available(plan), now=Object.keys(u.st).filter(function(id){return u.st[id]==="n"&&plan.courses[id]});
    var sems=Math.ceil(s.left/u.perSem), tag={ver:['',l.uniVerTag],ai:[' ai',l.uniAiTag],me:[' me',l.uniMeTag]}[plan.tag];
    var perSel='<select id="uniPerSem" style="width:auto;min-height:36px;display:inline-block" aria-label="'+esc(l.gradPerSem)+'">'+[9,12,15,18,21].map(function(h){return '<option'+(h===u.perSem?" selected":"")+'>'+h+'</option>'}).join("")+'</select>';
    var html=stepsHtml(2)+'<div class="sheet tape">'+uniHeader(true)+
      '<div class="row c" style="justify-content:space-between;margin-top:12px;gap:8px"><h2 style="margin:0;font-size:1.15rem">'+esc(loc(plan.name))+'</h2><span class="vtag'+tag[0]+'">'+(plan.tag==="ver"?"✓ ":"")+esc(tag[1])+'</span></div>'+
      '<p class="srcline">'+(plan.source?esc(plan.tag==="ver"?l.uniSourceOff:l.uniSources)+' '+link(plan.source,l.uniOpenSource):"")+(plan.fetched?' · '+esc(l.uniFetched(plan.fetched)):"")+'</p>'+
      (plan.sources?sourcesHtml(plan.sources):"")+'</div>'+
      '<div class="grad">'+
        '<div class="sheet tape mint"><h3>'+esc(l.gradH)+'</h3><div class="bigpct">'+s.pct+'%</div>'+
          '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+s.pct+'" aria-label="'+esc(l.gradH)+'"><i style="width:'+s.pct+'%"></i></div>'+
          '<p style="margin:8px 0 0">'+esc(l.gradDone(s.got,s.total))+' · <b>'+esc(l.gradLeft(s.left))+'</b></p>'+
          (s.left?'<p class="soft small" style="margin:6px 0 0">'+esc(l.gradSem(sems))+' '+perSel+' '+esc(l.gradPerSem)+'</p>':'<p style="margin:6px 0 0">'+esc(l.gradAll)+'</p>')+
          '<div class="gbars">'+s.bars.map(function(b){var p=b.req?Math.round(b.done/b.req*100):0; return '<div class="gbar"><div class="row c"><span>'+esc(b.g!=="other"&&l.grp[b.g]||loc(b.label)||l.grp.other)+'</span><span class="soft small">'+esc(l.ofH(b.done,b.req))+'</span></div><div class="progress"><i style="width:'+p+'%"></i></div></div>'}).join("")+'</div>'+
          (plan.groups.some(function(g){return g.g==="remedial"})?'<p class="soft small" style="margin:10px 0 0">'+esc(l.gradRem)+'</p>':"")+
        '</div>'+
        '<div class="sheet tape pink"><h3>'+esc(l.nextH)+'</h3><p class="soft small" style="margin:2px 0 0">'+esc(l.nextLede(u.perSem))+'</p>'+
          (Object.keys(u.st).length?(av.length?'<ul class="nextlist">'+av.slice(0,14).map(function(x){return '<li><span>'+(x.pick?'★ ':'')+esc(courseName(plan,x.id))+(x.el?' <span class="soft small">('+esc(l.kind.elective)+')</span>':'')+'</span><span class="soft small">'+crOf(plan,x.id)+' '+esc(l.crH)+'</span></li>'}).join("")+'</ul><p class="soft small" style="margin:6px 0 0">'+esc(l.nextStar)+'</p>':'<p>'+esc(l.gradAll)+'</p>'):'<p class="soft small">'+esc(l.nextNone)+'</p>')+
          '<h3 style="margin-top:16px">'+esc(l.nowH)+'</h3>'+
          (now.length?'<ul class="nextlist">'+now.map(function(id){return '<li><span>'+esc(courseName(plan,id))+'</span><span class="soft small">'+crOf(plan,id)+' '+esc(l.crH)+'</span></li>'}).join("")+'</ul><button class="btn sm primary" type="button" data-u="toplan" style="margin-top:10px">'+esc(l.nowAdd)+'</button>':'<p class="soft small">'+esc(l.nowNone)+'</p>')+
        '</div>'+
      '</div>'+
      '<div class="row c" style="margin-top:18px;gap:10px;flex-wrap:wrap"><div class="seg" role="group" style="max-width:320px">'+
        ['all','left','now','done'].map(function(f){return '<button type="button" data-u="show" data-f="'+f+'" aria-pressed="'+(uniShow===f)+'">'+esc(l.uniShow[f])+'</button>'}).join("")+'</div>'+
        '<div class="field" style="flex:1 1 220px"><input type="search" id="crsSearch" autocomplete="off" placeholder="'+esc(l.searchCourse)+'" aria-label="'+esc(l.searchCourse)+'" value="'+esc(uniQ)+'"></div></div>'+
      groupsHtml(plan)+
      '<p class="soft small" style="margin-top:16px"><button class="link" type="button" data-u="reset">'+esc(l.uniReset)+'</button></p>';
    box.innerHTML=html;
  });
}
function groupsHtml(plan){
  var l=L(), st=state.uni.st, out="";
  var gs=plan.groups.map(function(g,i){return {g:g,i:i}}).sort(function(a,b){return (GROUP_ORDER.indexOf(a.g.g)-GROUP_ORDER.indexOf(b.g.g))||(a.i-b.i)});
  gs.forEach(function(x){
    var g=x.g, ids=g.c.filter(function(id){
      var s=st[id]||"";
      if(uniShow==="left"&&s==="d") return false;
      if(uniShow==="now"&&s!=="n") return false;
      if(uniShow==="done"&&s!=="d") return false;
      var c=plan.courses[id]||{}; return matches((c.en||"")+" "+(c.ar||"")+" "+id,uniQ);
    });
    if(!ids.length) return;
    var title=(loc(g.label)||l.grp[g.g]||l.grp.other)+" · "+l.kind[g.k];
    out+='<section class="grp"><h3><span>'+esc(title)+'</span><span class="soft small">'+(g.k==="elective"&&g.h?esc(l.grpElect(g.h)):(g.h?esc(l.uniHours(g.h)):""))+'</span></h3><ul class="crs">'+ids.map(function(id){
      var c=plan.courses[id]||{}, s=st[id]||"", miss=missingPre(plan,id), pre=plan.pre[id]||[], other=state.lang!=="en"?c.en:c.ar;
      return '<li class="'+(s==="d"?"done":s==="n"?"now":"")+'"><div><span class="nm">'+esc(loc(c)||id)+'</span>'+
        '<span class="meta">'+(c.code!==""&&!/^x\d/.test(id)?'<bdi>'+esc(c.code||id)+'</bdi> · ':'')+(c.cr||"?")+' '+esc(l.crH)+(other&&other!==loc(c)?' · <bdi>'+esc(other)+'</bdi>':'')+'</span>'+
        (pre.length?'<span class="meta'+(miss.length&&s!=="d"?' lock':'')+'">'+esc(l.prereq)+' '+pre.map(function(p){return esc(courseName(plan,p))}).join("، ")+'</span>':'')+
        '</div><div class="st" role="group" aria-label="'+esc(loc(c)||id)+'">'+["","n","d"].map(function(v,k){return '<button type="button" data-u="st" data-c="'+esc(id)+'" data-v="'+v+'" aria-pressed="'+(s===v)+'">'+esc(l.st[k])+'</button>'}).join("")+'</div></li>';
    }).join("")+'</ul></section>';
  });
  return out||'<p class="empty">'+esc(l.uniNoMatch)+'</p>';
}

/* ---------- AI: find majors and study plans on the university's own website ---------- */
function parseJsonBlock(text){
  var m=String(text||"").match(/```(?:json)?\s*([\s\S]*?)```/), t=m?m[1]:String(text||""), a=t.indexOf("{"), b=t.lastIndexOf("}");
  if(a<0||b<a) return null; try{return JSON.parse(t.slice(a,b+1))}catch(e){return null}
}
function uniBusy(msg){uniBusyMsg=msg; uniCtl=msg?new AbortController():uniCtl; renderUni()}
function uniFail(e){var l=L(); uniBusyMsg=""; if(!(e&&e.code==="cancelled")) toast(errCopy(e)); renderUni()}
function aiPrograms(){
  var u=state.uni, l=L(); if(!sample) return;
  uniBusy(l.uniAiSearching);
  var prompt="Find the current list of undergraduate programs (bachelor's degrees and diplomas) offered by "+u.uname+", using web search on its official website ("+u.dom+"). Use only what the official site says, and keep the program names exactly as the site writes them.\n"+
    "Reply with one short sentence, then a JSON code block exactly like:\n```json\n{\"programs\":[{\"en\":\"program name in English\",\"ar\":\"Arabic name if the site gives one, else empty\",\"faculty\":\"faculty or college\",\"url\":\"official page URL\"}]}\n```\nIf you cannot find an official list, return {\"programs\":[]}.";
  sample.search(prompt,{domains:[u.dom],effort:"medium",maxUses:6,signal:uniCtl.signal}).then(function(r){
    var j=parseJsonBlock(r.text), progs=(j&&Array.isArray(j.programs)?j.programs:[]).map(function(p){
      var en=str(p&&p.en,150), ar=str(p&&p.ar,150); return en||ar?{en:en||ar,ar:ar,faculty:str(p.faculty,150),url:safeUrl(p.url)}:null;
    }).filter(Boolean).slice(0,160);
    state.uniAi[u.dom]={programs:progs,sources:r.sources,at:Date.now()}; save();
    uniBusyMsg=""; if(!progs.length) toast(l.uniAiNone); renderUni();
  }).catch(uniFail);
}
function aiCourses(i){
  var u=state.uni, l=L(), p=state.uniAi[u.dom].programs[i], key=u.dom+"|ai:"+i;
  if(state.uniPlans[key]){if(u.pid!=="ai:"+i) u.st={}; u.pid="ai:"+i; u.src="ai"; save(); return renderUni()}
  if(!sample) return;
  uniBusy(l.uniAiCourses);
  var prompt="Find the official study plan (curriculum) of the \""+(p.en||p.ar)+"\" program at "+u.uname+", using web search on its official website ("+u.dom+")"+(p.url?"; its program page is "+p.url:"")+". List every course in the plan with its code, name and credit hours exactly as the site gives them, grouped as the site groups them (for example university, faculty and major requirements; compulsory or elective). Do not add courses that are not in the official plan.\n"+
    "Reply with one short sentence, then a JSON code block exactly like:\n```json\n{\"total_hours\":132,\"source\":\"URL of the study plan\",\"groups\":[{\"name\":\"Major requirements\",\"kind\":\"compulsory\",\"hours\":48,\"courses\":[{\"code\":\"CS101\",\"name\":\"Introduction to Programming\",\"cr\":3,\"pre\":[\"code of each prerequisite\"]}]}]}\n```\nUse null for anything the site does not state. If the plan is not published online, return {\"groups\":[]}.";
  sample.search(prompt,{domains:[u.dom],effort:"high",maxUses:8,maxTokens:48000,signal:uniCtl.signal}).then(function(r){
    var plan=planFromJson(parseJsonBlock(r.text),p.en||p.ar);
    uniBusyMsg="";
    if(!Object.keys(plan.courses).length){toast(l.uniAiNoPlan); uniManualOpen=true; return renderUni()}
    plan.name={en:p.en,ar:p.ar}; plan.sources=r.sources; plan.at=Date.now();
    state.uniPlans[key]=plan; u.pid="ai:"+i; u.src="ai"; u.st={}; save(); renderUni();
  }).catch(uniFail);
}
async function manualGo(){
  var l=L(), u=state.uni, name=($("upName").value||"").trim(), text=($("upText").value||"").trim();
  if(!name||text.length<20){toast(l.uniPlanNone); return}
  var plan;
  if(sample){
    uniBusy(l.uniExtracting);
    try{
      var j=await sample.json("Extract the study plan below into JSON. Copy course codes, names and credit hours exactly; keep the groups it uses (university, faculty, major, elective...). Do not add courses.\nStudy plan:\n\"\"\"\n"+text.slice(0,50000)+"\n\"\"\"\nReturn JSON only: {\"total_hours\":null,\"groups\":[{\"name\":\"\",\"kind\":\"compulsory\",\"hours\":null,\"courses\":[{\"code\":\"\",\"name\":\"\",\"cr\":3,\"pre\":[]}]}]}",{effort:"medium",signal:uniCtl.signal});
      plan=planFromJson(j,name);
    }catch(e){if(e&&e.code==="cancelled"){uniBusyMsg=""; return renderUni()} plan=parsePlanLocally(text,name)}
    uniBusyMsg="";
  }else plan=parsePlanLocally(text,name);
  if(!Object.keys(plan.courses).length){toast(l.uniPlanNone); return renderUni()}
  var key=u.dom+"|me:"+Date.now().toString(36);
  plan.at=Date.now(); state.uniPlans[key]=plan; u.pid=key.split("|")[1]; u.src="me"; u.st={}; uniManualOpen=false; uniDraft={name:"",text:""}; save(); renderUni();
}

/* ---------- events (one delegated listener for the whole page) ---------- */
$("uniBody").addEventListener("click",function(e){
  var b=e.target.closest("[data-u]"); if(!b) return;
  var a=b.dataset.u, u=uniState(), l=L();
  if(a==="uni"){var r=uniCountry[u.cc][+b.dataset.i], c=catFor(r[1]); state.uni={cc:u.cc,dom:r[1],uname:r[0],cat:c?c.id:"",st:{},perSem:u.perSem}; uniQ=""; uniFac=""; save(); renderUni(); window.scrollTo(0,0)}
  else if(a==="fac"){uniFac=b.dataset.f; renderUni()}
  else if(a==="prog"){u.pid=b.dataset.p; u.src="cat"; u.st={}; uniQ=""; uniShow="all"; save(); renderUni(); window.scrollTo(0,0)}
  else if(a==="aiprogs") aiPrograms();
  else if(a==="aiprog"){uniQ=""; aiCourses(+b.dataset.i)}
  else if(a==="mine"){var pid=b.dataset.k.split("|")[1]; if(u.pid!==pid) u.st={}; u.pid=pid; u.src="me"; uniQ=""; save(); renderUni()}
  else if(a==="manual"){uniManualOpen=!uniManualOpen; renderUni()}
  else if(a==="manualgo") manualGo();
  else if(a==="stop"){if(uniCtl) uniCtl.abort()}
  else if(a==="chmajor"){u.pid=""; u.src=""; uniQ=""; uniFac=""; save(); renderUni()}
  else if(a==="chuni"){state.uni={cc:u.cc,perSem:u.perSem,st:{}}; uniQ=""; uniFac=""; save(); renderUni()}
  else if(a==="show"){uniShow=b.dataset.f; renderUni()}
  else if(a==="reset"){if(confirm(l.uniResetAsk)){u.st={}; save(); renderUni()}}
  else if(a==="st"){var id=b.dataset.c, v=b.dataset.v; if(v) u.st[id]=v; else delete u.st[id]; save(); renderUni()}
  else if(a==="toplan"){
    var plan=uniPlanNow, n=0; if(!plan) return;
    Object.keys(u.st).filter(function(id){return u.st[id]==="n"&&plan.courses[id]}).forEach(function(id){
      var nm=courseName(plan,id); if(state.subjects.some(function(s){return norm2(s.name)===norm2(nm)})) return;
      var blank=state.subjects.filter(function(s){return !s.name||!s.name.trim()})[0];
      if(blank) blank.name=nm; else addSubject({name:nm}); n++;
    });
    if(!state.tutor.major) state.tutor.major=loc(plan.name);
    save(); renderForm(); renderNav(); toast(n?l.nowAdded(n):l.nowAlready);
  }
});
$("uniBody").addEventListener("input",function(e){
  var id=e.target.id;
  if(id==="upName") uniDraft.name=e.target.value;
  else if(id==="upText") uniDraft.text=e.target.value;
  else if(id==="uniSearch"){uniQ=e.target.value; fillUniList()}
  else if(id==="majSearch"||id==="crsSearch"){
    uniQ=e.target.value; var pos=e.target.selectionStart;
    clearTimeout(uniTyping);
    uniTyping=setTimeout(function(){
      renderUni().then(function(){var el=$(id); if(el){el.focus(); try{el.setSelectionRange(pos,pos)}catch(x){}}});
    },220);
  }
});
$("uniBody").addEventListener("change",function(e){
  var id=e.target.id, u=uniState();
  if(id==="uniCountry"){u.cc=e.target.value; uniQ=""; var s=$("uniSearch"); if(s) s.value=""; save(); fillUniList()}
  else if(id==="uniPerSem"){u.perSem=+e.target.value||15; save(); renderUni()}
  else if(id==="upFile"){
    var f=e.target.files&&e.target.files[0]; e.target.value=""; if(!f) return;
    readFile(f).then(function(t){uniDraft.text=String(t).slice(0,60000); if(!uniDraft.name) uniDraft.name=f.name.replace(/\.[^.]+$/,""); $("upText").value=uniDraft.text; $("upName").value=uniDraft.name},function(){toast(L().readFail(f.name))});
  }
});
</script>
