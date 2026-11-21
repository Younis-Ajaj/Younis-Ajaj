(function(){
"use strict";
var IS_WEB=!!window.IS_WEB_SITE;
if(IS_WEB&&window.top!==window.self){try{window.top.location.href=window.location.href}catch(e){document.documentElement.innerHTML=""; return}}
var KEY="studyplan.v1";
var HL=["--hl1","--hl2","--hl3","--hl4","--hl5","--hl6"];
var GAP=[1,0.6,0.3], HPC=[1.5,2.5,3.5], OFFSET=[0,0.25,0.5];
var VIEWS=["today","plan","focus","tutor","review","stats","grades"];
var ICON={today:"i-today",plan:"i-plan",focus:"i-focus",tutor:"i-tutor",review:"i-review",stats:"i-stats",grades:"i-grades"};
var $=function(id){return document.getElementById(id)};
var qa=function(sel,root){return [].slice.call((root||document).querySelectorAll(sel))};

/* ---------- state ---------- */
var state={lang:"ar",subjects:[],hours:4,off:-1,done:{},start:null,built:false,updated:0,scores:[],tutor:{major:"",course:"",topic:""}};
function L(){return T[state.lang==="en"?"en":"ar"]}
function dw(n){
  if(state.lang==="en") return n+" "+(n===1?"day":"days");
  return n+" "+(n===1?"يوم":n===2?"يومان":n<=10?"أيام":"يوماً");
}
window.dw=dw;
function dur(u){
  var h=u/2, f=Math.floor(h), half=h!==f;
  if(state.lang==="en") return h<1?"30 min":h+" h";
  if(h===0.5) return "نصف ساعة";
  var base=f===1?"ساعة":f===2?"ساعتان":f<=10?f+" ساعات":f+" ساعة";
  return half?base+" ونصف":base;
}
function dayFmt(d,short){
  return new Intl.DateTimeFormat(state.lang==="en"?"en-GB":"ar-JO-u-nu-latn",short?{weekday:"short",day:"numeric",month:"short"}:{weekday:"long",day:"numeric",month:"long"}).format(d);
}
function today(){var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function parse(s){var p=String(s).split("-"); return new Date(+p[0],+p[1]-1,+p[2])}
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function diffDays(a,b){return Math.round((b-a)/864e5)}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function r1(x){return Math.round(x*2)/2}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}

var nextId=1, booting=true, dbDoc=null, dbTimer=0, dbBusy=false, dbDirty=false, syncKey="syncLocal";
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
function save(){
  if(!booting) state.updated=Date.now();
  saveLocal();
  if(dbDoc&&!booting){dbDirty=true; clearTimeout(dbTimer); dbTimer=setTimeout(push,1500)}
}
function setSync(k){syncKey=k; $("sync").textContent=L()[k]}
function push(){
  if(!dbDoc||dbBusy||!dbDirty) return;
  dbBusy=true; dbDirty=false;
  dbDoc.set({json:JSON.stringify(state),updated:state.updated||0})
    .then(function(){setSync("syncCloud")}).catch(function(){setSync("syncLocal")})
    .then(function(){dbBusy=false; if(dbDirty) push()});
}
function normalize(){
  var d={subjects:[],scores:[],cards:[],mistakes:[],done:{},active:{},log:{},bank:{},focusBy:{},badges:{},
    tutor:{major:"",course:"",topic:""},grade:{now:"",fin:"40"},gpa:{rows:[],prev:"",prevH:"",target:""},
    cnt:{sessions:0,cardsMade:0,perfect:0,maps:0,mistRev:0,fey:0},profile:{},eve:{}};
  Object.keys(d).forEach(function(k){
    var v=state[k];
    if(Array.isArray(d[k])){if(!Array.isArray(v)) state[k]=d[k]}
    else if(!v||typeof v!=="object") state[k]=d[k];
  });
  Object.keys(d.cnt).forEach(function(k){if(!(state.cnt[k]>=0)) state.cnt[k]=0});
  if(!Array.isArray(state.gpa.rows)) state.gpa.rows=[];
  ["xp","focusMin","bestStreak","fPreset","sound"].forEach(function(k){if(!(state[k]>=0)) state[k]=0});
  if(!(state.vol>=0)) state.vol=0.5;
  if(!Array.isArray(state.focusHours)||state.focusHours.length!==24) state.focusHours=new Array(24).fill(0);
  state.subjects.forEach(function(x){if(x.id>=nextId) nextId=x.id+1; if(!(x.ch>0)) x.ch=6});
  state.cards.forEach(function(c){if(!(c.box>=0)) c.box=0});
  if(typeof state.onboarded!=="boolean") state.onboarded=!state.demo&&(!!state.built||state.subjects.some(function(s){return s.name&&s.name.trim()}));
}
function load(){
  var had=false;
  try{var raw=localStorage.getItem(KEY); if(raw){var s=JSON.parse(raw); if(s&&Array.isArray(s.subjects)){state=Object.assign(state,s); had=true}}}catch(e){}
  normalize(); return had;
}

/* ---------- activity log, XP, levels, badges ---------- */
function dayLog(){var k=iso(today()); return state.log[k]||(state.log[k]={m:0,s:0,c:0,q:0})}
function markActive(){state.active[iso(today())]=true; var n=streakN(); if(n>state.bestStreak) state.bestStreak=n}
function streakN(){var n=0, d=today(); if(!state.active[iso(d)]) d=addDays(d,-1); while(state.active[iso(d)]){n++; d=addDays(d,-1)} return n}
function lvlOf(xp){var n=Math.floor(Math.sqrt(xp/40))+1; return {n:n,base:40*(n-1)*(n-1),next:40*n*n}}
function lvlName(n){return L().levels[Math.min(5,Math.floor((n-1)/3))]}
function addXP(n){
  if(!n) return;
  var before=lvlOf(state.xp).n; state.xp=Math.max(0,state.xp+n);
  var after=lvlOf(state.xp).n;
  renderLevel();
  if(after>before&&!booting){celebrate(); showModal(String(after),L().levelUp,lvlName(after))}
  checkBadges();
}
function badgeTests(){
  var c=state.cnt, mastered=state.cards.filter(function(x){return x.box>=4}).length;
  return [c.sessions>=1,state.focusMin>=60,state.focusMin>=600,state.bestStreak>=3,state.bestStreak>=7,c.cardsMade>=25,mastered>=20,c.perfect>=1,c.fey>=80,c.maps>=1,c.sessions>=50,c.mistRev>=10];
}
function checkBadges(){
  var tests=badgeTests(), l=L();
  tests.forEach(function(ok,i){
    if(ok&&!state.badges[i]){
      state.badges[i]=Date.now();
      if(!booting){celebrate(); showModal("★",l.badgeNew,l.badges[i][0]+": "+l.badges[i][1])}
    }
  });
}
function renderLevel(){
  var lv=lvlOf(state.xp), l=L();
  $("lvlName").textContent=(state.lang==="en"?"Level ":"المستوى ")+lv.n+" · "+lvlName(lv.n);
  $("lvlXp").textContent=state.xp+" XP";
  $("lvlBar").style.width=((state.xp-lv.base)/(lv.next-lv.base)*100)+"%";
}

/* ---------- toast, modal, confetti ---------- */
var toastTimer;
function toast(msg){var el=$("toast"); el.textContent=msg; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(function(){el.classList.remove("show")},2600)}
var modalQ=[];
function showModal(icon,title,text){modalQ.push([icon,title,text]); if($("modal").hidden) nextModal()}
function nextModal(){var m=modalQ.shift(); if(!m){$("modal").hidden=true; return} var ic=$("mdIcon"); if(m[0]==="owl"){ic.innerHTML=owlSvg("happy"); ic.style.cssText="width:auto;height:auto;background:none"}else{ic.textContent=m[0]; ic.style.cssText=""} $("mdTitle").textContent=m[1]; $("mdText").textContent=m[2]; $("modal").hidden=false; $("mdOk").focus()}
$("mdOk").onclick=nextModal;
var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||"#FFE14D"}
function celebrate(){
  if(reduce) return;
  var cv=$("confetti"), ctx=cv.getContext("2d"), W=cv.width=innerWidth, H=cv.height=innerHeight, cols=HL.map(cssVar), ps=[];
  for(var i=0;i<140;i++) ps.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*13-4,w:6+Math.random()*10,h:4+Math.random()*5,r:Math.random()*6,vr:(Math.random()-.5)*.3,c:pick(cols)});
  var t0=performance.now();
  (function f(t){
    ctx.clearRect(0,0,W,H);
    ps.forEach(function(p){p.vy+=.35; p.vx*=.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore()});
    if(t-t0<2600) requestAnimationFrame(f); else ctx.clearRect(0,0,W,H);
  })(t0);
}

/* ---------- ambient highlighter aurora ---------- */
(function(){
  var cv=$("aurora"), ctx=cv.getContext("2d"), blobs=[], W=0, H=0, running=true;
  function size(){W=cv.width=Math.round(innerWidth/4); H=cv.height=Math.round(innerHeight/4)}
  size(); addEventListener("resize",size);
  var cols=[cssVar("--hl1"),cssVar("--hl4"),cssVar("--hl2"),cssVar("--hl3")];
  for(var i=0;i<4;i++) blobs.push({x:Math.random(),y:Math.random(),r:.25+Math.random()*.2,a:Math.random()*6.28,s:.0006+Math.random()*.0008,c:cols[i]});
  function draw(){
    if(!running) return;
    ctx.clearRect(0,0,W,H);
    blobs.forEach(function(b){
      b.a+=b.s*(reduce?0:1); var x=(b.x+Math.cos(b.a)*.18)*W, y=(b.y+Math.sin(b.a*1.3)*.18)*H, r=b.r*Math.max(W,H);
      var g=ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,b.c+"55"); g.addColorStop(1,b.c+"00");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
    if(!reduce) requestAnimationFrame(draw);
  }
  document.addEventListener("visibilitychange",function(){running=!document.hidden; if(running) draw()});
  draw();
})();

/* ---------- theme ---------- */
function applyTheme(){
  var r=document.documentElement;
  if(state.theme==="dark"||state.theme==="light") r.setAttribute("data-theme",state.theme); else r.removeAttribute("data-theme");
  var dark=state.theme==="dark"||(!state.theme&&matchMedia("(prefers-color-scheme: dark)").matches);
  $("themeBtn").innerHTML='<svg><use href="#'+(dark?"i-sun":"i-moon")+'"/></svg>';
  $("themeBtn").setAttribute("aria-label",L().aTheme||"Theme"); $("lTheme").innerHTML=$("themeBtn").innerHTML;
}
$("themeBtn").onclick=function(){
  var dark=state.theme==="dark"||(!state.theme&&matchMedia("(prefers-color-scheme: dark)").matches);
  state.theme=dark?"light":"dark"; applyTheme(); save();
};

/* ---------- navigation ---------- */
var route="today", onRoute={};
function renderNav(){
  var l=L(), due=dueCards().length;
  var html=VIEWS.map(function(v){
    return '<a href="#'+v+'" data-v="'+v+'"'+(v===route?' aria-current="page"':'')+'><svg><use href="#'+ICON[v]+'"/></svg><span>'+l.nav[v]+'</span>'+(v==="review"&&due?'<span class="badge">'+due+'</span>':'')+'</a>';
  }).join("");
  $("sideNav").innerHTML=html; $("tabNav").innerHTML=html;
}
function go(){
  var h=(location.hash||"").replace("#","");
  if(h==="start"){openOnb(); h=""}
  route=(VIEWS.indexOf(h)>=0||h==="welcome")?h:(state.onboarded?"today":"welcome");
  var land=route==="welcome";
  $("landing").hidden=!land; document.querySelector(".shell").hidden=land; $("tabNav").hidden=land;
  qa(".view").forEach(function(v){v.classList.toggle("on",v.id==="v-"+route)});
  renderNav();
  if(onRoute[route]) onRoute[route]();
  updateMini();
}
addEventListener("hashchange",function(){go(); window.scrollTo(0,0)});

function applyLang(){
  var l=L(), en=state.lang==="en";
  document.documentElement.lang=en?"en":"ar"; document.documentElement.dir=en?"ltr":"rtl";
  document.title=l.title; $("langBtn").textContent=l.lang;
  qa("[data-t]").forEach(function(el){var v=l[el.dataset.t]; if(typeof v==="string") el.textContent=v});
  qa("[data-tp]").forEach(function(el){el.placeholder=l[el.dataset.tp]});
  qa("[data-ta]").forEach(function(el){var v=l[el.dataset.ta]; if(typeof v==="string") el.setAttribute("aria-label",v)});
  $("sync").textContent=l[syncKey];
}
/* ================= PLANNER ================= */
function addSubject(o){state.subjects.push(Object.assign({id:nextId++,name:"",date:"",diff:1,ready:0,ch:6},o||{}))}
function seg(field,labels,val,id){
  return '<div class="seg" role="group">'+labels.map(function(l,i){
    return '<button type="button" data-id="'+id+'" data-field="'+field+'" data-val="'+i+'" aria-pressed="'+(i===val)+'">'+l+'</button>';
  }).join("")+'</div>';
}
function subColor(id){var i=state.subjects.findIndex(function(s){return s.id===+id}); return HL[(i<0?0:i)%6]}
function renderForm(){
  var l=L();
  $("subjects").innerHTML=state.subjects.map(function(s,i){
    return '<div class="subject"><div class="row">'+
      '<div class="field"><label for="n'+s.id+'"><i class="swatch" style="background:var('+HL[i%6]+')"></i>'+l.name+'</label>'+
      '<input type="text" id="n'+s.id+'" data-id="'+s.id+'" data-field="name" value="'+esc(s.name)+'" placeholder="'+esc(l.nameP)+'" autocomplete="off"></div>'+
      '<div class="field"><label for="d'+s.id+'">'+l.date+'</label><input type="date" id="d'+s.id+'" data-id="'+s.id+'" data-field="date" value="'+esc(s.date)+'"></div>'+
      '<div class="field" style="flex:0 1 120px"><label for="c'+s.id+'">'+l.chapters+'</label><input type="number" inputmode="numeric" min="1" max="40" id="c'+s.id+'" data-id="'+s.id+'" data-field="ch" value="'+(+s.ch||6)+'"></div>'+
      '</div><div class="row" style="margin-top:10px">'+
      '<div class="field"><span class="lab">'+l.diffQ+'</span>'+seg("diff",l.diff,s.diff,s.id)+'</div>'+
      '<div class="field"><span class="lab">'+l.readyQ+'</span>'+seg("ready",l.ready,s.ready,s.id)+'</div></div>'+
      (state.subjects.length>1?'<button type="button" class="link" data-remove="'+s.id+'">'+l.remove+'</button>':'')+'</div>';
  }).join("");
  $("hours").value=state.hours; $("hoursOut").textContent=dur(state.hours*2);
  $("off").value=String(state.off);
  var names=state.subjects.filter(function(x){return x.name.trim()});
  $("courseList").innerHTML=names.map(function(x){return '<option value="'+esc(x.name.trim())+'">'}).join("");
}
function find(id){return state.subjects.filter(function(s){return s.id===+id})[0]}
$("subjects").addEventListener("input",function(e){
  var t=e.target; if(!t.dataset.field) return;
  var s=find(t.dataset.id); if(!s) return;
  s[t.dataset.field]=t.dataset.field==="ch"?clamp(Math.round(+t.value)||1,1,40):t.value; save();
});
$("subjects").addEventListener("click",function(e){
  var t=e.target.closest("button"); if(!t) return;
  if(t.dataset.remove){state.subjects=state.subjects.filter(function(s){return s.id!==+t.dataset.remove}); save(); renderForm(); return}
  if(t.dataset.field){
    var s=find(t.dataset.id); if(!s) return;
    s[t.dataset.field]=+t.dataset.val; save();
    qa("button",t.parentNode).forEach(function(b){b.setAttribute("aria-pressed",String(b===t))});
  }
});
$("addBtn").onclick=function(){addSubject(); save(); renderForm(); $("n"+state.subjects[state.subjects.length-1].id).focus()};
function loadDemo(){
  var t=today(), n=L().demoNames; state.subjects=[]; state.done={}; state.bank={};
  addSubject({name:n[0],date:iso(addDays(t,9)),diff:2,ready:0,ch:7});
  addSubject({name:n[1],date:iso(addDays(t,12)),diff:1,ready:1,ch:6});
  addSubject({name:n[2],date:iso(addDays(t,16)),diff:2,ready:1,ch:8});
  addSubject({name:n[3],date:iso(addDays(t,19)),diff:0,ready:2,ch:5});
  var st=state.subjects[2].id, en=state.lang==="en";
  if(!state.cards.length) state.cards=(en?[["What does a p-value measure?","The probability of data at least as extreme as observed, assuming H0 is true."],["Type I error","Rejecting H0 when it is actually true (false positive)."],["Standard error of the mean","σ / √n"]]:
    [["ماذا تقيس القيمة الاحتمالية (p-value)؟","احتمال الحصول على بيانات متطرفة مثل المشاهدة أو أكثر، بافتراض صحة فرضية العدم."],["الخطأ من النوع الأول","رفض فرضية العدم وهي صحيحة (إيجابي كاذب)."],["الخطأ المعياري للمتوسط","σ / √n"]]).map(function(c,i){return {id:Date.now()+i,q:c[0],a:c[1],box:0,due:"",sub:st,demo:true}});
  state.demo=true;
}
$("demoBtn").onclick=function(){loadDemo(); save(); renderForm(); build(true); renderAll()};
$("hours").addEventListener("input",function(){state.hours=+this.value; $("hoursOut").textContent=dur(state.hours*2); save()});
$("off").addEventListener("change",function(){state.off=+this.value; save()});

function need(s){return Math.max(1,(+s.ch||6)*HPC[s.diff]*GAP[s.ready])}
function allocate(items,cap){
  var total=items.reduce(function(a,x){return a+x.v},0), used=0;
  items.forEach(function(x){x.raw=x.v/total*cap; x.u=Math.floor(x.raw); x.rem=x.raw-x.u; used+=x.u});
  items.slice().sort(function(a,b){return b.rem-a.rem}).forEach(function(x){if(used<cap){x.u++; used++}});
  return items.filter(function(x){return x.u>0});
}
function plan(subs,start,hours,off){
  var last=subs.reduce(function(m,s){return s.d>m?s.d:m},subs[0].d);
  var n=diffDays(start,last), days=[], lastSeen={}, got={};
  for(var k=0;k<=n;k++){
    var d=addDays(start,k);
    var exams=subs.filter(function(s){return diffDays(d,s.d)===0});
    var active=subs.filter(function(s){return diffDays(d,s.d)>0});
    var isOff=d.getDay()===off, cap=isOff?0:Math.round(hours*2);
    if(exams.length) cap=Math.floor(cap/2);
    var blocks=[];
    if(cap>0&&active.length){
      var items=active.map(function(s){
        var left=diffDays(d,s.d), remaining=Math.max(s.left*2-(got[s.id]||0),s.left*0.3);
        var urgency=left===1?4:1+2/left;
        var wait=lastSeen[s.id]===undefined?k:k-lastSeen[s.id]-1;
        return {s:s,left:left,v:remaining/left*urgency*(1+Math.min(wait,5)*0.15)};
      }).sort(function(a,b){return b.v-a.v});
      blocks=allocate(items.slice(0,Math.min(4,Math.max(1,Math.floor(cap/2)))),cap);
      blocks.forEach(function(b){lastSeen[b.s.id]=k; got[b.s.id]=(got[b.s.id]||0)+b.u});
    }
    days.push({date:d,key:iso(d),blocks:blocks,exams:exams,off:isOff});
  }
  var run={};
  days.forEach(function(day){day.blocks.forEach(function(b){
    var id=b.s.id, mid=((run[id]||0)+b.u/2)/got[id]; run[id]=(run[id]||0)+b.u;
    var base=OFFSET[b.s.ready]+(1-OFFSET[b.s.ready])*Math.min(0.6,b.s.banked/b.s.need);
    var f=base+mid*(1-base);
    b.ph=b.left===1?3:f<0.45?0:f<0.8?1:2;
  })});
  return {days:days,totals:got};
}
var current=null;
function validSubjects(start){
  var l=L(), err="", subs=[];
  state.subjects.forEach(function(s,i){
    var name=s.name.trim();
    if(!name&&!s.date) return;
    if(!name||!s.date){err=err||l.eFill; return}
    var d=parse(s.date);
    if(isNaN(d)||diffDays(start,d)<1){err=err||l.eDate(name); return}
    if(diffDays(start,d)>120){err=err||l.eFar; return}
    var nd=need(s), banked=(state.bank[s.id]||0)/2;
    subs.push({id:s.id,name:name,d:d,diff:s.diff,ready:s.ready,need:nd,banked:banked,left:Math.max(nd-banked,nd*0.15),color:HL[i%6]});
  });
  if(!err&&!subs.length) err=l.eNone;
  return {err:err,subs:subs};
}
function doneUnits(k,b){var v=state.done[k]; return v===true?b.u:(+v||0)}
function bankDone(){
  if(!current) return;
  current.days.forEach(function(d){d.blocks.forEach(function(b){
    var u=doneUnits(d.key+"|"+b.s.id,b); if(u) state.bank[b.s.id]=(state.bank[b.s.id]||0)+u;
  })});
  state.done={};
}
function build(fresh){
  var t=today();
  if(fresh||!state.start) state.start=iso(t);
  var start=parse(state.start), v=validSubjects(fresh?t:start);
  if(v.err&&!fresh&&state.start!==iso(t)){state.start=iso(t); start=t; v=validSubjects(t)}
  var e=$("error");
  if(v.err){e.textContent=v.err; e.hidden=false; $("result").hidden=true; state.built=false; current=null; save(); return false}
  e.hidden=true;
  current=plan(v.subs,start,state.hours,state.off); current.subs=v.subs;
  state.built=true; save(); renderResult(fresh); return true;
}
function rebuildKeep(){bankDone(); build(true); renderAll(); toast(L().redone)}
$("buildBtn").onclick=function(){bankDone(); if(build(true)){renderAll(); $("result").scrollIntoView({behavior:"smooth",block:"start"})}};
$("restartBtn").onclick=rebuildKeep;
$("missBtn").onclick=rebuildKeep;

/* ---------- plan output ---------- */
function sessionsOf(day){return day.blocks.map(function(b){var k=day.key+"|"+b.s.id; return {b:b,k:k,done:!!state.done[k]}})}
function blockHtml(day,b,di,bi){
  var l=L(), k=day.key+"|"+b.s.id, done=!!state.done[k];
  return '<label class="block'+(done?" done":"")+'"><input type="checkbox" data-k="'+esc(k)+'" data-u="'+b.u+'"'+(done?" checked":"")+'>'+
    '<span class="strip" style="background:var('+b.s.color+');animation-delay:'+Math.min(di*40+bi*60,900)+'ms"><span><strong>'+esc(b.s.name)+'</strong><span>'+l.ph[b.ph]+'</span></span><em>'+dur(b.u)+'</em></span></label>';
}
function renderResult(animate){
  var l=L(), t=today(), p=current, subs=p.subs, totalU=0, needT=0;
  subs.forEach(function(s){totalU+=p.totals[s.id]||0; needT+=s.left});
  var up=subs.map(function(s){return diffDays(t,s.d)}).filter(function(x){return x>=0}).sort(function(a,b){return a-b});
  $("stats").innerHTML=
    '<div class="kpi"><b>'+(up.length?up[0]:0)+'</b><small>'+l.sFirst+'</small></div>'+
    '<div class="kpi"><b>'+(totalU/2)+'</b><small>'+l.sHours+'</small></div>'+
    '<div class="kpi"><b>'+Math.round(needT)+'</b><small>'+l.sNeed+'</small></div>';
  var weakest=null, minCov=Infinity;
  subs.forEach(function(s){s.got=(p.totals[s.id]||0)/2; s.cov=s.got/s.left; if(s.cov<minCov){minCov=s.cov; weakest=s}});
  var ratio=(totalU/2)/needT, want=Math.min(12,Math.ceil(state.hours/Math.max(ratio,0.1)*2)/2);
  var hint=want>state.hours&&want<12.5?dur(want*2):"";
  var v, cls="";
  if(ratio<0.6||minCov<0.45){v=l.vTight(esc(weakest.name),hint); cls=" tight"}
  else if(ratio<0.95||minCov<0.75) v=l.vNear(esc(weakest.name),hint);
  else if(ratio>1.6) v=l.vEasy; else v=l.vOk;
  $("verdict").innerHTML='<p class="verdict'+cls+'">'+v+'</p>';
  var maxN=Math.max.apply(null,subs.map(function(s){return Math.max(s.left,s.got)}));
  $("shares").innerHTML=subs.map(function(s){
    var st=s.cov>=0.95?0:s.cov>=0.6?1:2;
    return '<li><span class="nm">'+esc(s.name)+'</span><span class="bar"><i style="width:'+(s.got/maxN*100)+'%;background:var('+s.color+')"></i><b style="inset-inline-start:'+(s.left/maxN*100)+'%"></b></span>'+
      '<span class="small">'+l.of(s.got,r1(s.left))+' <span class="chip st'+st+'">'+l.st[st]+'</span></span></li>';
  }).join("");
  var tk=iso(t), maxDay=Math.max.apply(null,p.days.map(function(d){return d.blocks.reduce(function(a,b){return a+b.u},0)}).concat([1]));
  $("chart").innerHTML=p.days.map(function(d){
    return '<div class="col'+(d.exams.length?" exam":"")+(d.off?" off":"")+(d.key===tk?" today":"")+'" title="'+esc(dayFmt(d.date))+'">'+
      d.blocks.map(function(b){return '<i style="height:'+(b.u/maxDay*120)+'px;background:var('+b.s.color+')"></i>'}).join("")+'</div>';
  }).join("");
  $("legendSubs").innerHTML=subs.map(function(s){return '<span><i style="background:var('+s.color+');transform:none;border-radius:3px"></i>'+esc(s.name)+'</span>'}).join(" ");
  var box=$("days");
  box.className=animate?"drawn":"";
  box.innerHTML=p.days.map(function(d,di){
    var html='<div class="day'+(d.key<tk?" past":"")+'"><h3>'+esc(dayFmt(d.date))+(d.key===tk?'<span class="tag">'+l.today+'</span>':'')+'</h3>';
    d.exams.forEach(function(s){html+='<div class="exam-row">'+l.exam+esc(s.name)+'</div>'});
    d.blocks.forEach(function(b,bi){html+=blockHtml(d,b,di,bi)});
    if(d.key===tk&&d.blocks.length) html+='<a class="btn sm" href="#focus" style="margin-top:4px"><svg><use href="#i-focus"/></svg>'+l.focusBtn+'</a>';
    if(!d.blocks.length&&!d.exams.length) html+='<p class="soft small" style="margin:0">'+(d.off?l.restDay:l.noStudy)+'</p>';
    return html+'</div>';
  }).join("");
  $("copyBox").hidden=true; $("calNote").hidden=true; $("result").hidden=false; updateProgress();
}
function missedCount(){
  if(!current) return 0; var tk=iso(today()), n=0;
  current.days.forEach(function(d){if(d.key<tk) d.blocks.forEach(function(b){if(!state.done[d.key+"|"+b.s.id]) n++})});
  return n;
}
function updateProgress(){
  if(!current) return;
  var total=0, done=0;
  current.days.forEach(function(d){d.blocks.forEach(function(b){total++; if(state.done[d.key+"|"+b.s.id]) done++})});
  $("progBar").style.width=(total?done/total*100:0)+"%";
  $("progText").textContent=total?L().prog(done,total):"";
  var m=missedCount(); $("missBanner").hidden=!m; if(m) $("missText").textContent=L().missText(m);
}
function toggleSession(k,u,on){
  if(on){
    if(state.done[k]) return;
    state.done[k]=u; markActive(); dayLog().s++; state.cnt.sessions++; addXP(20); owlCheer();
  }else{
    if(!state.done[k]) return;
    delete state.done[k]; var lg=dayLog(); lg.s=Math.max(0,lg.s-1); state.cnt.sessions=Math.max(0,state.cnt.sessions-1); addXP(-20);
  }
  save();
}
document.addEventListener("change",function(e){
  var t=e.target; if(!t.dataset||!t.dataset.k) return;
  toggleSession(t.dataset.k,+t.dataset.u||2,t.checked);
  qa('input[data-k="'+CSS.escape(t.dataset.k)+'"]').forEach(function(x){x.checked=t.checked; x.closest(".block").classList.toggle("done",t.checked)});
  updateProgress(); if(route==="today") renderToday();
  if(t.checked&&current){
    var tk=iso(today()), all=current.days.filter(function(d){return d.key===tk})[0];
    if(all&&all.blocks.length&&all.blocks.every(function(b){return state.done[tk+"|"+b.s.id]})) celebrate();
  }
});

/* ---------- copy, calendar export ---------- */
function weekText(){
  var l=L(), tk=iso(today()), lines=[l.planTitle], count=0;
  current.days.forEach(function(d){
    if(d.key<tk||count>=7) return; count++;
    lines.push("",dayFmt(d.date));
    d.exams.forEach(function(s){lines.push("  "+l.exam+s.name)});
    d.blocks.forEach(function(b){lines.push("  "+b.s.name+" ("+dur(b.u)+"): "+l.ph[b.ph])});
    if(!d.blocks.length&&!d.exams.length) lines.push("  "+l.rest);
  });
  return lines.join("\n");
}
$("copyBtn").onclick=function(){
  var text=weekText(), box=$("copyBox"), l=L();
  function fallback(){box.value=text; box.hidden=false; box.focus(); box.select(); toast(l.selectCopy)}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function(){toast(l.copied)},fallback);
    else fallback();
  }catch(e){fallback()}
};
var downloads=null;
function saveFile(name,data){
  if(!downloads&&IS_WEB){
    var a=document.createElement("a"), url=URL.createObjectURL(new Blob([data],{type:/\.json$/.test(name)?"application/json":"text/csv;charset=utf-8"}));
    a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url)},4000);
    return Promise.resolve({status:"saved"});
  }
  if(!downloads){toast(L().dlFail); return Promise.reject()}
  return downloads.save({filename:name,data:data}).then(function(r){return r},function(e){if(!e||e.code!=="declined") toast(L().dlFail); throw e});
}
function csvCell(s){s=String(s); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function usDate(d){return String(d.getMonth()+1).padStart(2,"0")+"/"+String(d.getDate()).padStart(2,"0")+"/"+d.getFullYear()}
function ampm(m){var h=Math.floor(m/60)%24, mm=m%60; return (h%12||12)+":"+String(mm).padStart(2,"0")+" "+(h<12?"AM":"PM")}
$("calBtn").onclick=function(){
  if(!current) return; var l=L(), tk=iso(today());
  var rows=[["Subject","Start Date","Start Time","End Date","End Time","All Day Event","Description"]];
  current.days.forEach(function(d){
    if(d.key<tk) return;
    d.exams.forEach(function(s){rows.push([l.exam+s.name,usDate(d.date),"",usDate(d.date),"","True",l.planTitle])});
    var m=[540,960,1200][(state.profile&&state.profile.time!=null)?state.profile.time:1];
    d.blocks.forEach(function(b){var len=b.u*30; rows.push([b.s.name+" — "+l.ph[b.ph],usDate(d.date),ampm(m),usDate(d.date),ampm(m+len),"False",l.planTitle]); m+=len+15});
  });
  saveFile("exam-plan.csv","﻿"+rows.map(function(r){return r.map(csvCell).join(",")}).join("\r\n")).then(function(){$("calNote").hidden=false},function(){});
};
/* ================= TODAY DASHBOARD ================= */
function norm2(s){return String(s||"").trim().toLowerCase()}
function readiness(s){
  var nd=need(s), doneU=state.bank[s.id]||0;
  if(current) current.days.forEach(function(d){d.blocks.forEach(function(b){if(b.s.id===s.id) doneU+=doneUnits(d.key+"|"+b.s.id,b)})});
  var base=[0,0.25,0.5][s.ready]||0;
  var cov=clamp(base+(1-base)*(doneU/2)/nd,0,1), parts=[[cov,0.55]];
  var qs=state.scores.filter(function(x){return norm2(x.course)===norm2(s.name)}).slice(0,5);
  if(qs.length) parts.push([qs.reduce(function(a,x){return a+x.right/x.total},0)/qs.length,0.3]);
  var cs=state.cards.filter(function(c){return +c.sub===s.id});
  if(cs.length) parts.push([cs.reduce(function(a,c){return a+c.box/4},0)/cs.length,0.15]);
  var w=parts.reduce(function(a,p){return a+p[1]},0);
  return Math.round(parts.reduce(function(a,p){return a+p[0]*p[1]},0)/w*100);
}
function ringSvg(pct,color,size){
  var r=40, c=2*Math.PI*r;
  return '<div class="in"><svg viewBox="0 0 96 96" style="width:'+(size||96)+'px;height:'+(size||96)+'px"><circle class="bg" cx="48" cy="48" r="'+r+'"/><circle class="fg" cx="48" cy="48" r="'+r+'" stroke="var('+color+')" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+c.toFixed(1)+'" data-off="'+(c*(1-pct/100)).toFixed(1)+'"/></svg><b>'+pct+'%</b></div>';
}
function animateRings(root){requestAnimationFrame(function(){requestAnimationFrame(function(){qa(".fg[data-off]",root).forEach(function(c){c.style.strokeDashoffset=c.dataset.off})})})}
function renderToday(){
  var l=L(), t=today(), tk=iso(t), h=new Date().getHours();
  $("demoBanner").hidden=!state.demo;
  $("greet").textContent=l.greet[h<12?0:h<21?1:2]+(state.lang==="en"?".":"،")+" "+dayFmt(t);
  var subs=current?current.subs:[], up=subs.filter(function(s){return diffDays(t,s.d)>=0}).sort(function(a,b){return a.d-b.d});
  if(up.length){
    var n=diffDays(t,up[0].d);
    $("countBig").textContent=n; $("countLbl").textContent=l.countFirst; $("countSub").textContent=l.countSub(up[0].name,dayFmt(up[0].d));
  }else{
    $("countBig").textContent="—"; $("countLbl").textContent=l.countNone; $("countSub").textContent="";
  }
  var day=current&&current.days.filter(function(d){return d.key===tk})[0], nu=$("nextUp");
  if(!current){
    nu.innerHTML='<div><p style="margin:0">'+esc(l.noPlan)+'</p></div><a class="btn primary" href="#plan">'+esc(l.build)+'</a>';
  }else{
    var next=day?day.blocks.filter(function(b){return !state.done[tk+"|"+b.s.id]})[0]:null;
    if(next) nu.innerHTML='<span class="sw" style="background:var('+next.s.color+')"></span><div><span class="soft small">'+esc(l.nextH)+'</span><h3>'+esc(next.s.name)+'</h3><span class="small">'+esc(l.ph[next.ph])+' · '+dur(next.u)+'</span></div><a class="btn primary" href="#focus" data-fsub="'+next.s.id+'"><svg><use href="#i-play"/></svg>'+esc(l.nextGo)+'</a>';
    else nu.innerHTML='<div><p style="margin:0">'+esc(day&&day.blocks.length?l.allDone:l.noStudy)+'</p></div><a class="btn" href="#review">'+esc(l.dueGo)+'</a>';
  }
  $("rings").innerHTML=state.subjects.filter(function(s){return s.name.trim()}).map(function(s,i){
    var pct=readiness(s), stc=pct>=75?0:pct>=45?1:2;
    return '<div class="ring">'+ringSvg(pct,HL[state.subjects.indexOf(s)%6],86)+'<span class="nm">'+esc(s.name)+'</span>'+(pct===0?'<span class="chip">'+esc(l.ready[0])+'</span>':'<span class="chip st'+stc+'">'+l.st[stc]+'</span>')+'</div>';
  }).join("")||'<p class="soft small">'+esc(l.noPlan)+'</p>';
  animateRings($("rings"));
  var lg=state.log[tk]||{m:0,s:0}, due=dueCards().length;
  $("kpis").innerHTML=[[streakN(),l.kStreak],[lg.m||0,l.kFocus],[state.cnt.sessions,l.kDone],[due,l.kCards]].map(function(k){return '<div class="kpi"><b>'+k[0]+'</b><small>'+esc(k[1])+'</small></div>'}).join("");
  $("todayList").innerHTML=day?(day.exams.map(function(s){return '<div class="exam-row">'+l.exam+esc(s.name)+'</div>'}).join("")+day.blocks.map(function(b,bi){return blockHtml(day,b,0,bi)}).join("")||'<p class="soft small" style="margin:0">'+esc(day.off?l.restDay:l.noStudy)+'</p>'):'<p class="soft small" style="margin:0">'+esc(l.noPlan)+'</p>';
  $("dueBox").innerHTML=due?'<p style="margin:0 0 10px">'+esc(l.cInfo(state.cards.length,due))+'</p><a class="btn sm primary" href="#review">'+esc(l.dueGo)+'</a>':'<p class="soft small" style="margin:0">'+esc(l.dueNone)+'</p>';
  $("quote").textContent=l.quotes[(t.getDate()+t.getMonth())%l.quotes.length];
  renderTodayExtras(); renderInsights();
}
onRoute.today=renderToday;
document.addEventListener("click",function(e){var a=e.target.closest("[data-fsub]"); if(a){fSubPending=+a.dataset.fsub}});
$("realBtn").onclick=function(){openOnb()};

/* ================= FOCUS ROOM ================= */
var PRESETS=[[25,5,15],[50,10,20],[90,15,25]], fSubPending=null;
var F={phase:"focus",left:25*60,total:25*60,running:false,end:0,tick:0,round:0,started:0};
var CIRC=2*Math.PI*86;
(function(){var g="";for(var i=0;i<60;i++){var a=i/60*Math.PI*2, r1=i%5?96:93, x1=100+Math.cos(a)*r1, y1=100+Math.sin(a)*r1, x2=100+Math.cos(a)*99, y2=100+Math.sin(a)*99; g+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'"/>'} $("ticks").innerHTML=g; $("arc").setAttribute("stroke-dasharray",CIRC.toFixed(1))})();
function fPresetLen(ph){var p=PRESETS[state.fPreset]||PRESETS[0]; return (ph==="focus"?p[0]:ph==="break"?p[1]:p[2])*60}
function fmt(s){s=Math.max(0,Math.ceil(s)); return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")}
function fLeftNow(){return F.running?(F.end-Date.now())/1000:F.left}
function fSubName(){var v=$("fSub").value, s=find(v); return s&&s.name.trim()?s.name.trim():L().fFree}
function renderFocusForm(){
  var l=L(), cur=fSubPending!=null?String(fSubPending):$("fSub").value;
  $("fSub").innerHTML='<option value="">'+esc(l.fFree)+'</option>'+state.subjects.filter(function(s){return s.name.trim()}).map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join("");
  if(cur&&find(cur)) $("fSub").value=cur; fSubPending=null;
  $("fPreset").innerHTML=l.presets.map(function(p,i){return '<button type="button" data-p="'+i+'" aria-pressed="'+(i===state.fPreset)+'" class="num">'+p+'</button>'}).join("");
  $("sounds").innerHTML=l.sounds.map(function(s,i){return '<button type="button" class="snd" data-s="'+i+'" aria-pressed="'+(i===soundOn)+'"><svg><use href="#'+["i-mute","i-rain","i-wave","i-fire"][i]+'"/></svg>'+esc(s)+'</button>'}).join("");
  $("vol").value=state.vol;
  var lg=state.log[iso(today())]||{m:0};
  $("fStats").innerHTML='<div class="kpi"><b>'+(lg.m||0)+'</b><small>'+esc(l.fToday)+'</small></div><div class="kpi"><b>'+state.focusMin+'</b><small>'+esc(l.fTotal)+'</small></div>';
  fPaint();
}
function fPaint(){
  var l=L(), left=fLeftNow();
  $("fTime").textContent=fmt(left);
  $("arc").style.strokeDashoffset=(CIRC*(1-clamp(left/F.total,0,1))).toFixed(1);
  $("fPhase").textContent=F.phase==="focus"?l.phFocus:F.phase==="break"?l.phBreak:l.phLong;
  $("fSubName").textContent=F.phase==="focus"?fSubName():"";
  $("fStart").textContent=F.running?l.fPauseB:(F.left<F.total?l.fResumeB:l.fStartB);
  $("fDots").innerHTML=[0,1,2,3].map(function(i){return '<i class="'+(i<F.round%4||(F.round%4===0&&F.round>0&&F.phase==="long")?"on":"")+'"></i>'}).join("");
  var s=find($("fSub").value); $("room").style.setProperty("--room-accent",F.phase==="focus"?"var("+(s?subColor(s.id):"--hl4")+")":"var(--hl3)");
  updateMini();
}
function updateMini(){
  var show=F.running&&route!=="focus"; $("miniFocus").hidden=!show;
  if(show) $("miniTime").textContent=fmt(fLeftNow());
}
$("miniFocus").onclick=function(){location.hash="focus"};
var wake=null;
function fRun(){
  F.end=Date.now()+F.left*1000; F.running=true; if(!F.started) F.started=Date.now();
  clearInterval(F.tick); F.tick=setInterval(function(){fPaint(); prayCheck(); if(fLeftNow()<=0) fPhaseDone()},250);
  try{navigator.wakeLock&&navigator.wakeLock.request("screen").then(function(w){wake=w}).catch(function(){})}catch(e){}
  $("fTip").textContent=pick(F.phase==="focus"?L().tipsF:L().tipsB);
  fPaint();
}
function fPause(){F.left=fLeftNow(); F.running=false; clearInterval(F.tick); try{wake&&wake.release()}catch(e){} wake=null; fPaint()}
function logFocus(min){
  if(min<1) return;
  var name=fSubName(); state.focusMin+=min;
  if(!Array.isArray(state.focusHours)||state.focusHours.length!==24) state.focusHours=new Array(24).fill(0); state.focusHours[new Date().getHours()]+=min; dayLog().m+=min; state.focusBy[name]=(state.focusBy[name]||0)+min;
  markActive(); addXP(Math.round(min*1.2)); save();
}
function fSet(ph){F.phase=ph; F.total=F.left=fPresetLen(ph); F.started=0}
function fPhaseDone(){
  fPause(); chime(F.phase==="focus"?880:660);
  if(F.phase==="focus"){
    logFocus(Math.round(F.total/60)); F.round++;
    toast(L().focusDone(Math.round(F.total/60))); fSet(F.round%4===0?"long":"break");
  }else{toast(L().breakDone); fSet("focus")}
  renderFocusForm(); if(route==="today") renderToday();
}
function chime(f){
  try{var a=audio(), o=a.createOscillator(), g=a.createGain(); o.frequency.value=f; o.type="sine"; g.gain.setValueAtTime(0.25,a.currentTime); g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+1.2); o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime+1.25)}catch(e){}
}
$("fStart").onclick=function(){audio(); if(F.running) fPause(); else fRun()};
$("fReset").onclick=function(){
  if(F.phase==="focus"&&F.started){var el=Math.floor((F.total-fLeftNow())/60); if(el>=5) logFocus(el)}
  fPause(); fSet(F.phase); renderFocusForm();
};
$("fSkip").onclick=function(){
  if(F.phase==="focus"){var el=Math.floor((F.total-fLeftNow())/60); if(el>=5) logFocus(el); fPause(); F.round++; fSet(F.round%4===0?"long":"break")}
  else{fPause(); fSet("focus")}
  renderFocusForm();
};
$("fFull").onclick=function(){var r=$("room"); try{if(document.fullscreenElement) document.exitFullscreen(); else r.requestFullscreen().catch(function(){})}catch(e){}};
$("fPreset").addEventListener("click",function(e){var b=e.target.closest("[data-p]"); if(!b) return; state.fPreset=+b.dataset.p; save(); if(!F.running) fSet(F.phase); renderFocusForm()});
$("fSub").addEventListener("change",fPaint);

/* ambient sound, generated in the browser */
var AC=null, soundOn=0, sNodes=[], master=null;
function audio(){
  if(!AC){var C=window.AudioContext||window.webkitAudioContext; AC=new C(); master=AC.createGain(); master.gain.value=state.vol; master.connect(AC.destination)}
  if(AC.state==="suspended") AC.resume(); return AC;
}
function noiseBuf(kind){
  var a=audio(), n=a.sampleRate*4, b=a.createBuffer(1,n,a.sampleRate), d=b.getChannelData(0), last=0, p=[0,0,0,0,0,0,0];
  for(var i=0;i<n;i++){
    var w=Math.random()*2-1;
    if(kind==="brown"){last=(last+0.02*w)/1.02; d[i]=last*3.5}
    else{p[0]=0.99886*p[0]+w*0.0555179; p[1]=0.99332*p[1]+w*0.0750759; p[2]=0.969*p[2]+w*0.153852; p[3]=0.8665*p[3]+w*0.3104856; p[4]=0.55*p[4]+w*0.5329522; p[5]=-0.7616*p[5]-w*0.016898; d[i]=(p[0]+p[1]+p[2]+p[3]+p[4]+p[5]+p[6]+w*0.5362)*0.11; p[6]=w*0.115926}
  }
  return b;
}
function stopSound(){sNodes.forEach(function(n){try{n.stop?n.stop():n.disconnect()}catch(e){}}); sNodes=[]}
function playSound(i){
  stopSound(); soundOn=i; if(!i) return;
  var a=audio(), src=a.createBufferSource(); src.loop=true;
  if(i===1){src.buffer=noiseBuf("pink"); var hp=a.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=500; var lp=a.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=7000; src.connect(hp); hp.connect(lp); lp.connect(master); sNodes.push(src,hp,lp)}
  else if(i===2){src.buffer=noiseBuf("brown"); var lp2=a.createBiquadFilter(); lp2.type="lowpass"; lp2.frequency.value=700; var g=a.createGain(); g.gain.value=0.5; var lfo=a.createOscillator(); lfo.frequency.value=0.09; var lg=a.createGain(); lg.gain.value=0.45; lfo.connect(lg); lg.connect(g.gain); src.connect(lp2); lp2.connect(g); g.connect(master); lfo.start(); sNodes.push(src,lp2,g,lfo,lg)}
  else{src.buffer=noiseBuf("brown"); var lp3=a.createBiquadFilter(); lp3.type="lowpass"; lp3.frequency.value=420; src.connect(lp3); lp3.connect(master); sNodes.push(src,lp3)}
  src.start();
}
$("sounds").addEventListener("click",function(e){var b=e.target.closest("[data-s]"); if(!b) return; playSound(+b.dataset.s); qa(".snd").forEach(function(x){x.setAttribute("aria-pressed",String(x===b))})});
$("vol").addEventListener("input",function(){state.vol=+this.value; if(master) master.gain.value=state.vol; save()});
onRoute.focus=renderFocusForm;
/* ================= AI: COACH + TUTOR ================= */
var sample=null, sampleChecked=false, ctl=null, tts=null, dict=null;
function langRule(){return state.lang==="en"?"Write in English.":"اكتب بالعربية مع إبقاء المصطلحات العلمية بالإنجليزية بين قوسين."}
var PLAIN="\nPlain text only: no markdown symbols such as asterisks or heading marks.";
function errCopy(e){var l=L(), c=e&&e.code; return c==="rate_limited"?l.eRate:c==="invalid_json"?l.eJson:c==="auth"?l.aiBadKey:c==="refused"?l.aiRefused:c==="network"?l.aiNet:l.eGen}
$("coachStop").onclick=function(){if(ctl) ctl.abort()};
$("coachBtn").onclick=function(){
  if(!sample||!current) return;
  var t=today(), out=$("coachOut"), btn=this, l=L();
  var list=current.subs.map(function(s){
    return "- "+s.name+": exam in "+diffDays(t,s.d)+" days; difficulty "+(s.diff+1)+"/3; preparation "+T.en.ready[s.ready]+"; estimated need "+r1(s.need)+" h; already studied "+r1(s.banked)+" h; scheduled "+s.got+" h; readiness "+readiness(find(s.id)||s)+"%";
  }).join("\n");
  var prompt="You are a study coach for a student. They study "+state.hours+" hours a day. Their courses and the plan an algorithm produced:\n"+list+
    "\n\nGive a precise analysis: 1) the biggest risk in this plan and why, 2) for each course, whether its scheduled hours are enough and exactly what to prioritise or cut, 3) three concrete changes that would improve the result most. Be specific and brief. "+langRule()+PLAIN;
  ctl=new AbortController(); btn.disabled=true; $("coachStop").hidden=false; out.textContent=l.thinking;
  sample(prompt,{signal:ctl.signal,onText:function(r){out.textContent=r.text}})
    .then(function(r){out.textContent=r.text})
    .catch(function(e){
      var kept=e&&e.text?e.text:"";
      if(e&&e.code==="cancelled"){out.textContent=kept; return}
      if(e&&e.code==="not_granted"){tutorOff(); return}
      out.textContent=(kept?kept+"\n\n":"")+errCopy(e);
    })
    .then(function(){btn.disabled=false; $("coachStop").hidden=true});
};

/* ---------- reading PDF, Word, PowerPoint and Excel files in the browser ---------- */
var CDN=IS_WEB?"vendor/":"https://cdnjs.cloudflare.com/ajax/libs/";
function lib(p){return IS_WEB?CDN+p.split("/").pop():CDN+p}
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=function(){rej(new Error("load"))}; document.head.appendChild(s)})}
function xmlText(x){return x.replace(/<[^>]+>/g,"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#(\d+);/g,function(m,n){return String.fromCharCode(+n)}).replace(/&amp;/g,"&")}
async function readPdf(buf){
  if(!window.pdfjsLib){await loadScript(lib("pdf.js/3.11.174/pdf.worker.min.js")); await loadScript(lib("pdf.js/3.11.174/pdf.min.js"))}
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=lib("pdf.js/3.11.174/pdf.worker.min.js");
  var doc=await window.pdfjsLib.getDocument({data:buf,isEvalSupported:false}).promise, out=[];
  for(var i=1;i<=Math.min(doc.numPages,80);i++){var page=await doc.getPage(i), tc=await page.getTextContent(); out.push(tc.items.map(function(it){return it.str+(it.hasEOL?"\n":" ")}).join(""))}
  return out.join("\n\n");
}
async function readZip(buf,ext){
  if(!window.JSZip) await loadScript(lib("jszip/3.10.1/jszip.min.js"));
  var zip=await window.JSZip.loadAsync(buf);
  function num(n){return +(n.match(/(\d+)\.xml$/)||[0,0])[1]}
  if(ext==="docx"){var f=zip.file("word/document.xml"); if(!f) return ""; return xmlText((await f.async("string")).replace(/<\/w:p>/g,"\n").replace(/<w:tab\/>/g,"\t"))}
  if(ext==="pptx"){
    var names=Object.keys(zip.files).filter(function(n){return /^ppt\/slides\/slide\d+\.xml$/.test(n)}).sort(function(a,b){return num(a)-num(b)}), parts=[];
    for(var i=0;i<names.length;i++){var x=await zip.file(names[i]).async("string"); parts.push("["+(i+1)+"]\n"+xmlText(x.replace(/<\/a:p>/g,"\n")).trim())}
    return parts.join("\n\n");
  }
  var shared=[], sf=zip.file("xl/sharedStrings.xml");
  if(sf) shared=((await sf.async("string")).match(/<si>[\s\S]*?<\/si>/g)||[]).map(xmlText);
  var sheets=Object.keys(zip.files).filter(function(n){return /^xl\/worksheets\/sheet\d+\.xml$/.test(n)}).sort(function(a,b){return num(a)-num(b)}), rowsOut=[];
  for(var k=0;k<sheets.length;k++){
    var sx=await zip.file(sheets[k]).async("string"), rows=sx.match(/<row[\s\S]*?<\/row>/g)||[];
    rows.slice(0,400).forEach(function(r){
      var cells=(r.match(/<c[\s>][\s\S]*?<\/c>|<c[^>]*\/>/g)||[]).map(function(c){
        var v=(c.match(/<v>([\s\S]*?)<\/v>/)||[])[1], inl=(c.match(/<t[^>]*>([\s\S]*?)<\/t>/)||[])[1];
        if(/t="s"/.test(c)&&v!==undefined) return shared[+v]||"";
        return xmlText(v!==undefined?v:(inl||""));
      }).filter(function(v){return v!==""});
      if(cells.length) rowsOut.push(cells.join(" | "));
    });
  }
  return rowsOut.join("\n");
}
async function readFile(file){
  var ext=(file.name.split(".").pop()||"").toLowerCase();
  if(ext==="txt"||ext==="md"||ext==="csv") return await file.text();
  if(ext==="pdf") return await readPdf(await file.arrayBuffer());
  if(ext==="docx"||ext==="pptx"||ext==="xlsx") return await readZip(await file.arrayBuffer(),ext);
  throw {old:true};
}
$("tFile").addEventListener("change",async function(){
  var files=[].slice.call(this.files||[]), msg=$("fileMsg"), l=L(), lines=[];
  for(var i=0;i<files.length;i++){
    var f=files[i]; if(f.size>25*1024*1024){lines.push(l.fileBig(f.name)); continue}
    msg.textContent=lines.concat(l.reading(f.name)).join(" ");
    try{
      var text=(await readFile(f)).replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
      if(text.length<20) lines.push(l.readEmpty(f.name));
      else{var box=$("tNotes"); box.value=(box.value?box.value+"\n\n":"")+"=== "+f.name+" ===\n"+text; lines.push(l.readOk(f.name,text.length))}
    }catch(e){lines.push(e&&e.old?l.readOld(f.name):l.readFail(f.name))}
  }
  msg.textContent=lines.join(" "); this.value="";
});

/* ---------- tutor ---------- */
var turns=[], tctl=null, quizData=null, lastMode="";
function tErr(msg){var e=$("tError"); e.textContent=msg||""; e.hidden=!msg}
function renderTools(){
  var l=L(), keys=["explain","summary","quiz","map","cards","feynman"], ai={explain:1,map:1,cards:1,feynman:1};
  $("tools").innerHTML=keys.map(function(k,i){
    return '<button type="button" class="tool'+(ai[k]?" ai-only":"")+'" data-mode="'+k+'"><i style="background:var('+HL[i]+')"></i><b>'+esc(l.tools[k][0])+'</b><small>'+esc(l.tools[k][1])+'</small></button>';
  }).join("");
}
function tutorBase(){
  var m=$("tMajor").value.trim(), c=$("tCourse").value.trim(), t=$("tTopic").value.trim(), n=$("tNotes").value.trim();
  if(!c||!t){tErr(L().eTopic); return null}
  var sc=$("tSchool").value.trim(), lv=(state.tutor||{}).level==="school";
  state.tutor=Object.assign(state.tutor||{},{major:m,course:c,topic:t,school:sc}); save();
  return (lv?"You are an expert school teacher teaching a school student":"You are an expert university lecturer teaching a university student")+(sc?" at "+sc:"")+(m?(lv?", grade or track: ":", majoring in ")+m:"")+". Match the level, curriculum and exam style of that institution and country when you know them, and say so briefly when you are unsure of them. Rely on the standard, widely used textbooks and references for this subject, be exact with definitions, formulas and numbers, and if you are not sure of a fact, say so instead of guessing.\nCourse: "+c+"\nTopic: "+t+
    (n?"\n\nThis is the student's own course material. Base everything on it first and stay within it:\n"+n.slice(0,40000):"")+"\n\n";
}
function busy(on){
  qa("#tutor [data-mode]").forEach(function(b){b.disabled=on});
  $("tAskBtn").disabled=on; $("feyGo").disabled=on; $("tStop").hidden=!on;
}
function panel(title){
  $("tutorPanel").hidden=false; $("panelTitle").textContent=title; $("tutorOut").textContent=""; $("tutorExtra").innerHTML=""; $("askRow").hidden=true; $("ttsBtn").hidden=true;
  stopTts();
}
function stream(){
  var out=$("tutorOut"); tctl=new AbortController(); busy(true); tErr(""); out.textContent=L().tThinking;
  sample(turns,{signal:tctl.signal,cache:false,onText:function(r){out.textContent=r.text}})
    .then(function(r){out.textContent=r.text; turns.push({role:"assistant",content:r.text}); $("askRow").hidden=false; $("ttsBtn").hidden=!tts})
    .catch(function(e){
      var kept=e&&e.text?e.text:""; out.textContent=kept;
      if(kept){turns.push({role:"assistant",content:kept}); $("askRow").hidden=false} else turns.pop();
      if(e&&e.code==="not_granted"){tutorOff(); return}
      if(!e||e.code!=="cancelled") tErr(errCopy(e));
    })
    .then(function(){busy(false)});
}
function teach(kind,extraTopic){
  var base=tutorBase(); if(!base) return;
  var l=L(); panel(kind==="explain"?l.tools.explain[0]:l.tools.summary[0]); $("quiz").innerHTML=""; quizData=null; $("feyBox").hidden=true;
  var ask=kind==="explain"
    ?"Teach "+(extraTopic?"this part of the topic: \""+extraTopic+"\"":"this topic")+" step by step from the ground up: start with the big idea in two lines, then ordered numbered steps, a worked example for every important idea, then the common mistakes students make in exams, and finish with one question that checks my understanding."
    :"Write a focused revision summary for the exam: core definitions, laws or rules, key comparisons, then the points most often examined on this topic at this level.";
  turns=[{role:"user",content:base+ask+" End with two or three well-known textbooks or references on this topic, naming only ones you are certain exist. "+langRule()+PLAIN}];
  $("tutorPanel").scrollIntoView({behavior:"smooth",block:"start"});
  stream();
}

/* ---------- quiz and timed exam ---------- */
var examTimer=0;
function runQuiz(base){
  var box=$("quiz"); tctl=new AbortController(); busy(true); tErr(""); $("tutorPanel").hidden=true; $("feyBox").hidden=true;
  box.innerHTML='<div class="sheet" style="margin-top:16px"><p class="soft" style="margin:0">'+L().qWriting+'</p></div>';
  var prompt=base+"Write a demanding quiz of 8 multiple-choice questions in the style of "+(state.tutor.level==="school"?"school":"university")+" exams: ordered from easy to hard, at least half applied or analytical, with convincing wrong options. "+
    (state.lang==="en"?"Write the questions in English.":"اكتب الأسئلة والخيارات والشرح بالعربية مع إبقاء المصطلحات العلمية بالإنجليزية بين قوسين.")+
    "\nReturn JSON only, with no other text, in this shape: {\"questions\":[{\"q\":\"question\",\"options\":[\"a\",\"b\",\"c\",\"d\"],\"answer\":0,\"why\":\"short reason\"}]}"+
    "\nanswer is the index of the correct option from 0 to 3; spread correct answers across positions. Before fixing each answer, solve the question yourself and confirm that exactly one option is correct and the others are definitely wrong.";
  sample.json(prompt,{signal:tctl.signal,cache:false,modelTier:"complex"})
    .then(function(d){
      var qs=(d&&Array.isArray(d.questions)?d.questions:[]).filter(function(q){return q&&typeof q.q==="string"&&Array.isArray(q.options)&&q.options.length>=2&&q.answer>=0&&q.answer<q.options.length});
      if(!qs.length) throw {code:"invalid_json"};
      startQuiz(qs);
    })
    .catch(function(e){box.innerHTML=""; if(e&&e.code==="not_granted"){tutorOff(); return} if(!e||e.code!=="cancelled") tErr(errCopy(e))})
    .then(function(){busy(false)});
}
function startQuiz(qs){
  quizData=qs; quizData.graded=false; quizData.course=state.tutor.course; quizData.topic=state.tutor.topic;
  quizData.timed=$("examMode").checked&&!!sample; quizData.secs=(+$("examMin").value||15)*60; quizData.end=Date.now()+quizData.secs*1000;
  renderQuiz(); $("quiz").scrollIntoView({behavior:"smooth",block:"start"});
  clearInterval(examTimer);
  if(quizData.timed) examTimer=setInterval(function(){
    var left=(quizData.end-Date.now())/1000, el=$("examLeft");
    if(!el||quizData.graded){clearInterval(examTimer); return}
    el.textContent=fmt(left); $("examBar").style.width=clamp(left/quizData.secs*100,0,100)+"%";
    if(left<=0){clearInterval(examTimer); gradeQuiz(true)}
  },250);
}
function renderQuiz(){
  if(!quizData||quizData.graded) return;
  var l=L();
  $("quiz").innerHTML='<div class="sheet" style="margin-top:16px"><h3>'+l.quizH+(quizData.course?' · '+esc(quizData.course):'')+'</h3>'+
    (quizData.timed?'<div class="timerbar"><span class="num" id="examLeft">'+fmt(quizData.secs)+'</span><div class="progress"><i id="examBar" style="width:100%;background:var(--hl1)"></i></div></div>':'')+
    quizData.map(function(q,i){
      return '<fieldset class="q"><legend>'+(i+1)+". "+esc(q.q)+'</legend>'+q.options.map(function(o,k){
        return '<label class="opt"><input type="radio" name="q'+i+'" value="'+k+'"><span>'+esc(o)+'</span></label>';
      }).join("")+'<p class="why" hidden></p></fieldset>';
    }).join("")+'<button class="btn primary" type="button" id="gradeBtn" style="margin-top:10px">'+l.grade+'</button><p class="score" id="scoreOut"></p><p class="soft small" id="scoreNote"></p></div>';
}
function gradeQuiz(auto){
  if(!quizData||quizData.graded) return;
  var right=0, added=0, l=L();
  qa("#quiz .q").forEach(function(fs,i){
    var q=quizData[i], picked=fs.querySelector("input:checked");
    qa(".opt",fs).forEach(function(o,k){
      if(k===q.answer) o.classList.add("right"); else if(picked&&+picked.value===k) o.classList.add("wrong");
      o.querySelector("input").disabled=true;
    });
    if(picked&&+picked.value===q.answer) right++;
    else{state.mistakes.unshift({id:Date.now()+i,q:q.q,you:picked?q.options[+picked.value]:"—",right:q.options[q.answer],why:q.why||"",course:quizData.course||"",at:Date.now()}); added++}
    var w=fs.querySelector(".why"); w.textContent=q.why||""; w.hidden=!q.why;
  });
  state.mistakes=state.mistakes.slice(0,200);
  $("gradeBtn").hidden=true; quizData.graded=true; clearInterval(examTimer);
  $("scoreOut").textContent=l.score(right,quizData.length);
  $("scoreNote").textContent=(auto?l.timeUp+" ":"")+l.toMist(added);
  state.scores.unshift({course:quizData.course||"",topic:quizData.topic||"",right:right,total:quizData.length,at:Date.now()});
  state.scores=state.scores.slice(0,50);
  if(right===quizData.length) state.cnt.perfect++;
  dayLog().q++; markActive(); addXP(right*5+5); save(); renderHistory(); renderNav();
  if(right/quizData.length>=0.75) celebrate();
}
$("quiz").addEventListener("click",function(e){if(e.target.id==="gradeBtn") gradeQuiz(false)});
function renderHistory(){
  var h=state.scores||[];
  $("history").innerHTML=h.length?'<li style="font-weight:600;color:var(--ink)">'+L().past+'</li>'+h.slice(0,6).map(function(x){
    return '<li>'+esc(x.course)+" / "+esc(x.topic)+': <span class="num">'+x.right+" / "+x.total+'</span></li>';
  }).join(""):"";
}

/* ---------- mind map ---------- */
function runMap(base){
  var l=L(); panel(l.mapH); $("quiz").innerHTML=""; $("feyBox").hidden=true; $("tutorOut").textContent=l.mapWriting;
  tctl=new AbortController(); busy(true); tErr("");
  var prompt=base+"Build a mind map of this topic for exam revision. "+(state.lang==="en"?"Labels in English.":"اكتب العناوين بالعربية، ويمكن إبقاء المصطلح العلمي بالإنجليزية.")+
    " Use 4 to 6 main branches, each with 2 to 4 short sub-points. Every label at most 5 words."+
    "\nReturn JSON only: {\"center\":\"topic\",\"branches\":[{\"title\":\"branch\",\"children\":[\"point\",\"point\"]}]}";
  sample.json(prompt,{signal:tctl.signal,cache:false})
    .then(function(d){
      if(!d||!Array.isArray(d.branches)||!d.branches.length) throw {code:"invalid_json"};
      $("tutorOut").textContent=l.mapTip; drawMap(d); state.cnt.maps++; addXP(15); save();
    })
    .catch(function(e){$("tutorOut").textContent=""; if(e&&e.code==="not_granted"){tutorOff(); return} if(!e||e.code!=="cancelled") tErr(errCopy(e))})
    .then(function(){busy(false)});
}
function trunc(s,n){s=String(s||""); return s.length>n?s.slice(0,n-1)+"…":s}
function drawMap(d){
  var W=1000, H=640, cx=W/2, cy=H/2, br=d.branches.slice(0,6), n=br.length, svg=[], nodes=[];
  function box(x,y,label,fill,fs,bold,data){
    var w=Math.min(210,label.length*fs*0.62+26), h=fs*2.3;
    nodes.push('<g class="mapnode" data-node="'+esc(data)+'"><rect x="'+(x-w/2)+'" y="'+(y-h/2)+'" width="'+w+'" height="'+h+'" rx="'+(h/2)+'" fill="'+fill+'" stroke="var(--rule)" stroke-width="1.5"/><text x="'+x+'" y="'+(y+fs*0.36)+'" text-anchor="middle" font-size="'+fs+'" font-weight="'+(bold?700:500)+'"'+(fill.indexOf("--hl")>=0?' style="fill:var(--on-hl)"':'')+'>'+esc(label)+'</text></g>');
  }
  br.forEach(function(b,i){
    var a=-Math.PI/2+i/n*Math.PI*2, bx=cx+Math.cos(a)*250, by=cy+Math.sin(a)*170, col="var("+HL[i%6]+")";
    svg.push('<path d="M'+cx+' '+cy+' C'+(cx+Math.cos(a)*120)+' '+(cy+Math.sin(a)*40)+' '+(bx-Math.cos(a)*90)+' '+(by-Math.sin(a)*20)+' '+bx+' '+by+'" stroke="'+col+'" stroke-width="9" fill="none" stroke-linecap="round" opacity=".9"/>');
    var kids=(Array.isArray(b.children)?b.children:[]).slice(0,4), m=kids.length;
    kids.forEach(function(k,j){
      var spread=m>1?(j/(m-1)-0.5)*0.9:0, ka=a+spread, kx=bx+Math.cos(ka)*170, ky=by+Math.sin(ka)*95;
      kx=clamp(kx,95,W-95); ky=clamp(ky,24,H-24);
      svg.push('<path d="M'+bx+' '+by+' Q'+((bx+kx)/2+Math.cos(a)*20)+' '+((by+ky)/2)+' '+kx+' '+ky+'" stroke="'+col+'" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".75"/>');
      box(kx,ky,trunc(k,28),"var(--sheet)",13,false,k+" — "+b.title);
    });
    box(bx,by,trunc(b.title,26),col,15,true,b.title);
  });
  box(cx,cy,trunc(d.center||state.tutor.topic,24),"var(--inverse)",19,true,d.center||state.tutor.topic);
  var html='<div class="mapwrap"><svg viewBox="0 0 '+W+' '+H+'" role="img">'+svg.join("")+nodes.join("")+'</svg></div>';
  $("tutorExtra").innerHTML=html;
  var last=$("tutorExtra").querySelector(".mapnode:last-child text"); if(last) last.style.fill="var(--on-inverse)";
}
$("tutorExtra").addEventListener("click",function(e){var g=e.target.closest(".mapnode"); if(g&&sample) teach("explain",g.dataset.node)});

/* ---------- auto flashcards ---------- */
var aiCards=[];
function runCards(base){
  var l=L(); panel(l.tools.cards[0]); $("quiz").innerHTML=""; $("feyBox").hidden=true; $("tutorOut").textContent=l.cardsWriting;
  tctl=new AbortController(); busy(true); tErr("");
  var prompt=base+"Extract the 10 most exam-relevant flashcards from this topic and material: definitions, formulas, distinctions and facts a student must recall. Questions short and precise; answers at most 2 sentences. "+
    (state.lang==="en"?"Write in English.":"اكتب بالعربية مع إبقاء المصطلحات العلمية بالإنجليزية بين قوسين.")+"\nReturn JSON only: {\"cards\":[{\"q\":\"question\",\"a\":\"answer\"}]}";
  sample.json(prompt,{signal:tctl.signal,cache:false})
    .then(function(d){
      aiCards=(d&&Array.isArray(d.cards)?d.cards:[]).filter(function(c){return c&&c.q&&c.a}).slice(0,15);
      if(!aiCards.length) throw {code:"invalid_json"};
      $("tutorOut").textContent=l.cardsPickH;
      $("tutorExtra").innerHTML='<ul class="cardpick">'+aiCards.map(function(c,i){return '<li><label><input type="checkbox" data-ac="'+i+'" checked><span><b>'+esc(c.q)+'</b><br><span class="soft">'+esc(c.a)+'</span></span></label></li>'}).join("")+'</ul><button class="btn primary sm" type="button" id="acAdd" style="margin-top:12px">'+esc(l.cardsAddSel)+'</button>';
    })
    .catch(function(e){$("tutorOut").textContent=""; if(e&&e.code==="not_granted"){tutorOff(); return} if(!e||e.code!=="cancelled") tErr(errCopy(e))})
    .then(function(){busy(false)});
}
$("tutorExtra").addEventListener("click",function(e){
  if(e.target.id!=="acAdd") return;
  var s=state.subjects.filter(function(x){return norm2(x.name)===norm2(state.tutor.course)})[0], n=0;
  qa("[data-ac]:checked").forEach(function(cb){var c=aiCards[+cb.dataset.ac]; state.cards.push({id:Date.now()+n,q:String(c.q).slice(0,300),a:String(c.a).slice(0,600),box:0,due:"",sub:s?s.id:""}); n++});
  state.cnt.cardsMade+=n; addXP(n*2); save(); renderCards(); renderNav(); toast(L().cardsAdded(n)); e.target.disabled=true;
});

/* ---------- Feynman check ---------- */
function openFeynman(){
  var base=tutorBase(); if(!base) return;
  $("tutorPanel").hidden=true; $("quiz").innerHTML=""; $("feyBox").hidden=false; $("feyOut").innerHTML=""; $("feyIn").focus();
  $("feyBox").scrollIntoView({behavior:"smooth",block:"start"});
}
$("feyGo").onclick=function(){
  var base=tutorBase(); if(!base) return; var txt=$("feyIn").value.trim(), l=L();
  if(txt.split(/\s+/).length<8){tErr(l.feyShort); return}
  tctl=new AbortController(); busy(true); tErr(""); $("feyOut").innerHTML='<p class="soft">'+l.tThinking+'</p>';
  var prompt=base+"The student explained the topic in their own words (Feynman technique):\n\"\"\""+txt.slice(0,6000)+"\"\"\"\n\nAssess their understanding strictly but kindly against the correct content. "+
    (state.lang==="en"?"Write in English.":"اكتب بالعربية مع إبقاء المصطلحات العلمية بالإنجليزية بين قوسين.")+
    "\nReturn JSON only: {\"score\":0-100,\"good\":[\"what is correct\"],\"gaps\":[\"important missing idea\"],\"wrong\":[\"misconception and its correction\"],\"better\":\"a clear 4-6 sentence model explanation\",\"next\":\"one question that targets their biggest gap\"}";
  sample.json(prompt,{signal:tctl.signal,cache:false,modelTier:"complex"})
    .then(function(d){
      if(!d||typeof d.score!=="number") throw {code:"invalid_json"};
      var sc=clamp(Math.round(d.score),0,100), col=sc>=80?"--hl3":sc>=50?"--hl1":"--hl2";
      function list(t,a,c){a=Array.isArray(a)?a:[]; return a.length?'<div class="sheet" style="border-inline-start:6px solid var('+c+')"><h3>'+esc(t)+'</h3><ul>'+a.map(function(x){return '<li>'+esc(x)+'</li>'}).join("")+'</ul></div>':""}
      $("feyOut").innerHTML='<div class="gauge"><div class="ring">'+ringSvg(sc,col,110)+'</div><div><span class="soft small">'+esc(l.feyScore)+'</span><div class="score" style="margin:0">'+sc+'%</div></div></div><div class="fey">'+
        list(l.feyGood,d.good,"--hl3")+list(l.feyGaps,d.gaps,"--hl1")+list(l.feyWrong,d.wrong,"--hl2")+
        (d.better?'<div class="sheet"><h3>'+esc(l.feyBetter)+'</h3><p style="margin:6px 0 0">'+esc(d.better)+'</p></div>':'')+
        (d.next?'<div class="sheet"><h3>'+esc(l.feyNext)+'</h3><p style="margin:6px 0 0">'+esc(d.next)+'</p></div>':'')+'</div>';
      animateRings($("feyOut"));
      if(sc>state.cnt.fey) state.cnt.fey=sc; markActive(); addXP(Math.round(sc/5)); save(); if(sc>=80) celebrate();
    })
    .catch(function(e){$("feyOut").innerHTML=""; if(e&&e.code==="not_granted"){tutorOff(); return} if(!e||e.code!=="cancelled") tErr(errCopy(e))})
    .then(function(){busy(false)});
};

/* ---------- basic mode: summary and quiz from the file with TF-IDF, no AI ---------- */
var STOP={};
("في من علي الي عن مع هذا هذه ذلك تلك التي الذي الذين ان كان كانت يكون تكون هو هي هم هن ما لا لم لن قد كل او ثم بين عند حتي اذا لكن بعد قبل غير حيث كما به بها له لها فيه فيها منه منها عليه عليها هناك هنا نحن انت انا اي ايضا مثل عبر خلال ضمن دون لدي لان لذلك وذلك بان فان حين اما ولا وما وهو وهي وفي ومن وعلي والي عندما يستخدم تستخدم يمكن يجب يتم تم اكثر اقل اصغر اكبر فانه فاننا وهذا وهذه نفس بعض جدا فقط يسمي تسمي يعني الا انه انها لكي حول نحو منذ ليس ليست يحدث تحدث "+
 "the and for with that this from are was were which can not have has had but they their its also more than such these those into may will one two been when what how why use used using each other some most very then there here where while about between over under your you our all any both only same so if is it of to in on as by an be or at we").split(" ").forEach(function(w){STOP[w]=1});
function normW(w){
  w=w.toLowerCase().replace(/[ً-ْـ]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه");
  if(/^[وبكف]ال/.test(w)&&w.length>5) w=w.slice(3);
  else if(/^(ال|لل)/.test(w)&&w.length>4) w=w.slice(2);
  return w;
}
function analyse(text){
  var sents=text.replace(/^===.*===$/gm,"").replace(/([.!?؟])\s+/g,"$1\n").split(/\n+/).map(function(x){return x.replace(/\s+/g," ").trim()}).filter(function(x){return x.length>=40&&x.length<=420});
  var seen={}; sents=sents.filter(function(x){if(seen[x]) return false; seen[x]=1; return true}).slice(0,600);
  var df={}, tf={}, surf={}, toks=sents.map(function(sn){
    var uniq={}, list=[];
    (sn.match(/[\p{L}\p{N}]+/gu)||[]).forEach(function(w){
      var n=normW(w); if(n.length<3||STOP[n]||/^\d+$/.test(n)) return;
      tf[n]=(tf[n]||0)+1; list.push(n); if(!uniq[n]){uniq[n]=1; df[n]=(df[n]||0)+1}
      (surf[n]=surf[n]||{})[w]=(surf[n][w]||0)+1;
    });
    return list;
  });
  var N=sents.length, w8={};
  Object.keys(tf).forEach(function(k){w8[k]=df[k]>=2?tf[k]*Math.log(1+N/df[k]):tf[k]*0.4});
  var scored=sents.map(function(sn,i){var u={}, sum=0; toks[i].forEach(function(k){if(!u[k]){u[k]=1; sum+=w8[k]}}); return {i:i,text:sn,toks:toks[i],score:toks[i].length>=4?sum/Math.sqrt(toks[i].length):0}});
  var terms=Object.keys(w8).filter(function(k){return k.length>=4}).sort(function(a,b){return w8[b]-w8[a]});
  function surface(k){var m=surf[k], best=k, c=0; Object.keys(m).forEach(function(x){if(m[x]>c){c=m[x]; best=x}}); return best}
  return {sents:scored,terms:terms,w:w8,surface:surface};
}
function basicText(){var a=analyse($("tNotes").value.trim()); if(a.sents.length<6||a.terms.length<8){tErr(L().bShort); return null} tErr(""); return a}
function basicSummary(){
  var a=basicText(); if(!a) return;
  var l=L(), k=Math.min(10,Math.max(5,Math.round(a.sents.length*0.12)));
  var top=a.sents.slice().sort(function(x,y){return y.score-x.score}).slice(0,k).sort(function(x,y){return x.i-y.i});
  $("quiz").innerHTML=""; quizData=null; panel(l.bSumH);
  $("tutorOut").textContent=top.map(function(x,i){return (i+1)+". "+x.text}).join("\n\n")+"\n\n"+l.bTerms+": "+a.terms.slice(0,12).map(a.surface).join(state.lang==="en"?", ":"، ");
  $("ttsBtn").hidden=!tts;
}
function basicQuiz(){
  var a=basicText(); if(!a) return;
  var l=L(), pool=a.terms.slice(0,60), inPool={}; pool.forEach(function(k){inPool[k]=1});
  var used={}, qs=[], ranked=a.sents.slice().sort(function(x,y){return y.score-x.score}).slice(0,60);
  for(var i=0;i<ranked.length&&qs.length<8;i++){
    var sn=ranked[i], best=null;
    sn.toks.forEach(function(k){if(inPool[k]&&!used[k]&&(!best||a.w[k]>a.w[best])) best=k});
    if(!best) continue;
    var ans=null, text=sn.text.replace(/[\p{L}\p{N}]+/gu,function(w){if(ans===null&&normW(w)===best){ans=w; return "_____"} return w});
    if(ans===null) continue; used[best]=1;
    var others=pool.slice(0,24).filter(function(k){return k!==best&&sn.toks.indexOf(k)<0}).sort(function(){return Math.random()-0.5}).slice(0,3).map(a.surface);
    if(others.length<3) continue;
    var opts=others.concat([ans]).sort(function(){return Math.random()-0.5});
    qs.push({q:l.bFill+text,options:opts,answer:opts.indexOf(ans),why:sn.text});
  }
  if(qs.length<3){tErr(l.bShort); return}
  $("tutorPanel").hidden=true; state.tutor=Object.assign(state.tutor||{},{course:l.bFile,topic:l.bAuto});
  startQuiz(qs);
}

$("tutor").addEventListener("click",function(e){
  var lvb=e.target.closest("[data-level]");
  if(lvb){state.tutor=Object.assign(state.tutor||{},{level:lvb.dataset.level}); setLevel(lvb.dataset.level); save(); return}
  var b=e.target.closest("[data-mode]"); if(!b) return;
  var m=b.dataset.mode;
  if(!sample){if(m==="quiz") basicQuiz(); else basicSummary(); return}
  if(m==="explain"||m==="summary"){teach(m); return}
  if(m==="feynman"){openFeynman(); return}
  var base=tutorBase(); if(!base) return;
  if(m==="quiz") runQuiz(base); else if(m==="map") runMap(base); else if(m==="cards") runCards(base);
});
function askMore(){
  var q=$("tAsk").value.trim(); if(!q||!sample||!turns.length) return;
  $("tAsk").value=""; turns.push({role:"user",content:q+"\n(Answer briefly and clearly. "+langRule()+PLAIN+")"}); stream();
}
$("tAskBtn").onclick=askMore;
$("tAsk").addEventListener("keydown",function(e){if(e.key==="Enter") askMore()});
$("tStop").onclick=function(){if(tctl) tctl.abort(); stopTts()};
function setLevel(v){qa("[data-level]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.level===v))})}
function fillTutor(){
  var t=state.tutor||{};
  $("tMajor").value=t.major||""; $("tCourse").value=t.course||""; $("tTopic").value=t.topic||""; $("tSchool").value=t.school||""; setLevel(t.level==="school"?"school":"uni"); renderHistory();
}
function tutorOff(){
  sample=null; sampleChecked=true; document.body.classList.add("noai");
  $("coach").hidden=true; $("tutor").classList.add("basic");
  $("tutorNote").hidden=false; $("tutorNote").textContent=L().tutorOff;
  if(IS_WEB&&L().webAI) $("tutorNote").insertAdjacentHTML("beforeend",' <a href="https://claude.ai/artifact/TXJqkw8BpsTdVT36RQevMt" target="_blank" rel="noopener noreferrer">'+esc(L().webAI)+'</a>');
}

/* ---------- voice: read aloud and dictation ---------- */
var speaking=false;
function stopTts(){if(tts&&speaking){try{tts.stop()}catch(e){}} }
$("ttsBtn").onclick=function(){
  if(!tts) return; if(speaking){stopTts(); return}
  var text=$("tutorOut").textContent.trim(); if(!text) return;
  var chunks=[], buf="";
  text.split(/\n+/).forEach(function(p){if((buf+"\n"+p).length>1800){if(buf) chunks.push(buf); buf=p.slice(0,1800)} else buf=buf?buf+"\n"+p:p});
  if(buf) chunks.push(buf);
  tts.speak(chunks.slice(0,12).map(function(c){return {text:c}}),{language:state.lang==="en"?"en":"ar"}).catch(function(e){if(e&&e.code==="not_granted"){tts=null; $("ttsBtn").hidden=true}});
};
var micTarget=null, micBtn=null;
document.addEventListener("click",function(e){
  var b=e.target.closest("[data-mic]"); if(!b||!dict) return;
  if(micBtn===b&&dict.active()){dict.stop().catch(function(){}); return}
  micTarget=$(b.dataset.mic); micBtn=b;
  dict.start({language:state.lang==="en"?"en-US":"ar"}).catch(function(err){
    if(err&&err.code==="invalid_argument") dict.start().catch(function(){});
    else if(err&&err.code==="not_granted"){dict=null; qa("[data-mic]").forEach(function(x){x.hidden=true})}
  });
});
function wireDictation(){
  dict.onFinal(function(e){if(!micTarget) return; var v=micTarget.value; micTarget.value=(v&&!/\s$/.test(v)?v+" ":v)+e.text; micTarget.dispatchEvent(new Event("input"))});
  dict.onState(function(e){qa("[data-mic]").forEach(function(x){x.setAttribute("aria-pressed",String(x===micBtn&&(e.state==="listening"||e.state==="starting")))})});
  qa("[data-mic]").forEach(function(x){x.hidden=false});
}

/* ---------- browser-native voice for the standalone website ---------- */
function setupTts(t){tts=t; t.onState(function(e){speaking=e.state!=="idle"; $("ttsBtn").querySelector("span").textContent=speaking?L().stop:L().listen})}
function webTts(){
  if(!("speechSynthesis" in window)) return null;
  var cb=function(){};
  return {
    speak:function(lines,o){return new Promise(function(res){
      speechSynthesis.cancel();
      var arr=Array.isArray(lines)?lines:[{text:String(lines)}], lang=o&&o.language==="en"?"en-US":"ar-SA";
      arr.forEach(function(ln,i){var u=new SpeechSynthesisUtterance(ln.text); u.lang=lang;
        if(i===0) u.onstart=function(){cb({state:"speaking"})};
        if(i===arr.length-1){u.onend=u.onerror=function(){cb({state:"idle"}); res({playedMs:0})}}
        speechSynthesis.speak(u)});
    })},
    stop:function(){speechSynthesis.cancel(); cb({state:"idle"}); return Promise.resolve()},
    onState:function(f){cb=f; return function(){}}
  };
}
function webDict(){
  var R=window.SpeechRecognition||window.webkitSpeechRecognition; if(!R) return null;
  var r=null, on=false, fin=function(){}, st=function(){};
  return {
    start:function(o){return new Promise(function(res,rej){
      r=new R(); r.lang=o&&o.language==="en-US"?"en-US":"ar-SA"; r.interimResults=false; r.continuous=true;
      r.onresult=function(e){for(var i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) fin({text:e.results[i][0].transcript})};
      r.onstart=function(){on=true; st({state:"listening"}); res()};
      r.onend=function(){on=false; st({state:"idle"})};
      r.onerror=function(e){on=false; st({state:"idle"}); rej({code:e.error==="not-allowed"?"not_granted":"unavailable"})};
      try{r.start()}catch(err){rej({code:"unavailable"})}
    })},
    stop:function(){if(r) r.stop(); return Promise.resolve()},
    active:function(){return on}, onFinal:function(f){fin=f}, onPartial:function(){}, onState:function(f){st=f}
  };
}
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
/* ================= AI: own-key Claude client (website), insights, weekly report, mistake analysis ================= */
var AK="nabeeh.ak";
function getKey(){try{return sessionStorage.getItem(AK)||localStorage.getItem(AK)||""}catch(e){return ""}}
function setKey(k,remember){try{sessionStorage.setItem(AK,k); if(remember) localStorage.setItem(AK,k); else localStorage.removeItem(AK)}catch(e){}}
function clearKey(){try{sessionStorage.removeItem(AK); localStorage.removeItem(AK)}catch(e){}}

function makeSample(key){
  var A=window.AnthropicSDK, client=new A({apiKey:key,dangerouslyAllowBrowser:true,maxRetries:2});
  function toMsgs(input){return typeof input==="string"?[{role:"user",content:input}]:input.map(function(m){return {role:m.role,content:m.content}})}
  function mapErr(e,text){
    var c="error";
    if(e instanceof A.APIUserAbortError||(e&&e.name==="AbortError")) c="cancelled";
    else if(e instanceof A.AuthenticationError||e instanceof A.PermissionDeniedError) c="auth";
    else if(e instanceof A.RateLimitError) c="rate_limited";
    else if(e instanceof A.APIConnectionError) c="network";
    return {code:c,message:(e&&e.message)||"",text:text||""};
  }
  function run(input,opts){
    opts=opts||{}; var text="";
    var effort=opts.effort||(opts.modelTier==="complex"?"high":"medium");
    var stream=client.beta.messages.stream({
      model:"claude-opus-5-5", max_tokens:opts.maxTokens||64000,
      output_config:{effort:effort},
      betas:["server-side-fallback-2026-07-01"], fallbacks:"default",
      messages:toMsgs(input)
    },{signal:opts.signal});
    stream.on("error",function(){});
    stream.on("text",function(delta){text+=delta; if(opts.onText) opts.onText({text:text,delta:delta})});
    return stream.finalMessage().then(function(msg){
      if(msg.stop_reason==="refusal") throw {code:"refused",text:text};
      var t=msg.content.filter(function(b){return b.type==="text"}).map(function(b){return b.text}).join("");
      return {text:t||text,truncated:msg.stop_reason==="max_tokens"};
    },function(e){throw (e&&e.code&&!(e instanceof Error))?e:mapErr(e,text)});
  }
  var fn=function(input,opts){return run(input,opts)};
  fn.json=function(input,opts){
    return run(input,opts).then(function(r){
      var t=r.text, a=t.indexOf("{"), b=t.lastIndexOf("}");
      if(a<0||b<a) throw {code:"invalid_json"};
      try{return JSON.parse(t.slice(a,b+1))}catch(e){throw {code:"invalid_json"}}
    });
  };
  return fn;
}
function enableAI(fn){
  sample=fn; sampleChecked=true;
  $("coach").hidden=false; $("tutorNote").hidden=true; $("tutor").classList.remove("basic");
  document.body.classList.remove("noai");
}
function activateKey(k,remember,silent){
  var l=L();
  var ready=window.AnthropicSDK?Promise.resolve():loadScript("vendor/anthropic.min.js");
  return ready.then(function(){
    if(!window.AnthropicSDK){toast(l.eGen); return}
    try{if(!silent) setKey(k,remember); enableAI(makeSample(k)); renderAiKey(); if(!silent) toast(l.aiOnToast)}catch(err){toast(l.eGen)}
  },function(){if(!silent) toast(l.aiNet)});
}
function renderAiKey(){
  var box=$("aiKeyBox"); if(!IS_WEB){box.hidden=true; return}
  var l=L(), on=!!getKey()&&!!sample; box.hidden=false;
  box.innerHTML=on?
    '<div class="row c" style="justify-content:space-between"><div><h3>'+esc(l.aiOn)+'</h3><p class="soft small" style="margin:2px 0 0">'+esc(l.aiPrivacy)+'</p></div><div class="actions"><button class="btn sm" type="button" id="aiTest">'+esc(l.aiTest)+'</button><button class="btn sm ghost" type="button" id="aiRemove">'+esc(l.aiRemove)+'</button></div></div><p class="soft small" id="aiTestOut" style="margin:8px 0 0"></p>':
    '<h3>'+esc(l.aiKeyH)+'</h3><p class="soft small" style="margin:4px 0 12px">'+esc(l.aiKeyLede)+'</p>'+
    '<div class="row"><div class="field"><label for="aiKey">'+esc(l.aiKeyL)+'</label><input type="password" id="aiKey" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" dir="ltr"></div><button class="btn primary" type="button" id="aiSave">'+esc(l.aiActivate)+'</button></div>'+
    '<label class="row c" style="gap:8px;margin:10px 0 0;color:var(--ink);font-size:.9rem"><input type="checkbox" id="aiRemember" style="width:18px;height:18px;accent-color:var(--ink)">'+esc(l.aiRemember)+'</label>'+
    '<p class="soft small" style="margin:10px 0 0">'+esc(l.aiPrivacy)+' <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">'+esc(l.aiGetKey)+'</a></p>';
}
document.addEventListener("click",function(e){
  var id=e.target.id, l=L();
  if(id==="aiSave"){
    var k=($("aiKey").value||"").trim();
    if(!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(k)){toast(l.aiBadFormat); return}
    activateKey(k,$("aiRemember").checked,false); return;
  }
  if(id==="aiRemove"){clearKey(); sample=null; tutorOff(); renderAiKey(); toast(l.aiRemoved); return}
  if(id==="aiTest"&&sample){
    var out=$("aiTestOut"); out.textContent=l.tThinking; e.target.disabled=true;
    sample("Reply with the single word: OK",{effort:"low",maxTokens:2000}).then(function(){out.textContent=l.aiTestOk},function(err){out.textContent=errCopy(err)}).then(function(){e.target.disabled=false});
  }
});

/* ---------- local smart insights (no AI needed) ---------- */
function insights(){
  var l=L(), out=[], t=today(), tk=iso(t);
  if(!current) return out;
  var up=current.subs.filter(function(s){return diffDays(t,s.d)>=1}).map(function(s){var r=readiness(find(s.id)||s), d=diffDays(t,s.d); return {s:s,r:r,d:d,score:(100-r)/Math.max(1,d)}}).sort(function(a,b){return b.score-a.score});
  if(up.length){var u=up[0]; out.push({tone:u.r<50&&u.d<=7?"warn":"info",text:l.inRisk(u.s.name,u.r,u.d)})}
  var since=iso(addDays(t,-7)), sch=0, dn=0;
  current.days.forEach(function(d){if(d.key<tk&&d.key>=since) d.blocks.forEach(function(b){sch++; if(state.done[d.key+"|"+b.s.id]) dn++})});
  if(sch>=2){var p=Math.round(dn/sch*100); out.push({tone:p<60?"warn":"ok",text:p<60?l.inPaceLow(p):l.inPaceGood(p)})}
  var fh=state.focusHours||[], tot=fh.reduce(function(a,b){return a+(b||0)},0);
  if(tot>=50){var bins=[[5,12],[12,17],[17,21],[21,29]].map(function(r){var s=0; for(var h=r[0];h<r[1];h++) s+=fh[h%24]||0; return s}), bi=bins.indexOf(Math.max.apply(null,bins)); out.push({tone:"info",text:l.inBest(l.times4[bi])})}
  var mc={}; state.mistakes.forEach(function(m){if(m.course) mc[m.course]=(mc[m.course]||0)+1});
  var mk=Object.keys(mc).sort(function(a,b){return mc[b]-mc[a]})[0];
  if(mk&&mc[mk]>=3) out.push({tone:"warn",text:l.inMist(mk,mc[mk])});
  var due=dueCards().length; if(due>20) out.push({tone:"warn",text:l.inCards(due)});
  var st=streakN(); if(st>=3) out.push({tone:"ok",text:l.inStreak(st)});
  if(!state.focusMin&&!state.cnt.sessions&&!state.cards.some(function(c){return c.box>0})) out.push({tone:"info",text:l.inStart});
  return out.slice(0,4);
}
function insightsHtml(list){return '<ul class="ins">'+list.map(function(x){return '<li class="'+x.tone+'"><i></i><span>'+esc(x.text)+'</span></li>'}).join("")+'</ul>'}
function renderInsights(){
  var box=$("insBox"), list=insights(), l=L();
  if(!list.length){box.hidden=true; return}
  box.hidden=false;
  box.innerHTML='<div class="row c" style="justify-content:space-between"><h3>'+esc(l.inH)+'</h3><a class="btn sm ghost" href="#stats">'+esc(l.inReport)+'</a></div>'+insightsHtml(list);
}

/* ---------- AI weekly report ---------- */
var repCtl=null;
function statsPayload(){
  var t=today(), days=[];
  for(var i=6;i>=0;i--){var d=addDays(t,-i), g=state.log[iso(d)]||{}; days.push({date:iso(d),focusMin:g.m||0,sessions:g.s||0,cardsReviewed:g.c||0,quizzes:g.q||0})}
  var subs=(current?current.subs:[]).map(function(s){return {name:s.name,examInDays:diffDays(t,s.d),readinessPct:readiness(find(s.id)||s),neededHours:r1(s.need),studiedHours:r1(s.banked),scheduledHours:s.got||0}});
  var mc={}; state.mistakes.forEach(function(m){var k=m.course||"?"; mc[k]=(mc[k]||0)+1});
  return {dailyHoursTarget:state.hours,streakDays:streakN(),courses:subs,last7Days:days,focusMinutesByCourse:state.focusBy,
    recentQuizzes:state.scores.slice(0,10).map(function(q){return {course:q.course,topic:q.topic,scorePct:Math.round(q.right/q.total*100)}}),
    mistakesByCourse:mc,flashcards:{total:state.cards.length,due:dueCards().length,mastered:state.cards.filter(function(c){return c.box>=4}).length}};
}
$("repBtn").onclick=function(){
  if(!sample) return; var l=L(), out=$("repOut"), btn=this;
  var p=state.profile||{}, uni=p.stage===2||(p.stage==null&&(state.tutor||{}).level!=="school");
  var prompt="You are an experienced academic coach for a "+(uni?"university":"school")+" student. Here is their real study data as JSON:\n"+JSON.stringify(statsPayload())+
    "\n\nWrite their weekly review: 1) what went well, citing their numbers, 2) the biggest risks before their exams and why, 3) a concrete priority plan for each of the next 7 days, 4) three habits to change. Be specific and brief; if data is thin, say what to track. "+langRule()+PLAIN;
  repCtl=new AbortController(); btn.disabled=true; $("repStop").hidden=false; out.textContent=l.thinking;
  sample(prompt,{signal:repCtl.signal,cache:false,onText:function(r){out.textContent=r.text}})
    .then(function(r){out.textContent=r.text; var wk=iso(addDays(today(),-today().getDay())); if(state.repXpWeek!==wk){state.repXpWeek=wk; addXP(10)} save()})
    .catch(function(e){if(e&&e.code==="not_granted"){out.textContent=""; tutorOff(); return} var kept=e&&e.text?e.text:""; out.textContent=e&&e.code==="cancelled"?kept:(kept?kept+"\n\n":"")+errCopy(e)})
    .then(function(){btn.disabled=false; $("repStop").hidden=true});
};
$("repStop").onclick=function(){if(repCtl) repCtl.abort()};

/* ---------- AI mistake analysis ---------- */
var mistCtl=null;
$("mistAIBtn").onclick=function(){
  if(!sample||!state.mistakes.length) return; var l=L(), out=$("mistAIOut"), btn=this;
  var list=state.mistakes.slice(0,30).map(function(m,i){return (i+1)+". ["+(m.course||"?")+"] Q: "+m.q+" | student answered: "+m.you+" | correct: "+m.right+(m.why?" | reason: "+m.why:"")}).join("\n");
  var prompt="These are a student's wrong answers from practice quizzes:\n"+list+"\n\nAnalyse them: 1) the patterns behind the mistakes (misunderstood concepts, careless errors, confusions between similar ideas), 2) which concepts to revisit first and how, 3) three new practice questions that target the weakest concept, each followed by its answer. Be specific and brief. "+langRule()+PLAIN;
  mistCtl=new AbortController(); btn.disabled=true; out.textContent=l.thinking;
  sample(prompt,{signal:mistCtl.signal,cache:false,modelTier:"complex",onText:function(r){out.textContent=r.text}})
    .then(function(r){out.textContent=r.text})
    .catch(function(e){if(e&&e.code==="not_granted"){out.textContent=""; tutorOff(); return} out.textContent=(e&&e.text?e.text+"\n\n":"")+errCopy(e)})
    .then(function(){btn.disabled=false});
};
$("mlist").addEventListener("click",function(e){
  var b=e.target.closest("[data-mx]"); if(!b||!sample) return;
  var id=+b.dataset.mx, m=state.mistakes.filter(function(x){return x.id===id})[0]; if(!m) return;
  var out=$("mlist").querySelector('[data-mxo="'+id+'"]'); out.hidden=false; out.textContent=L().thinking; b.disabled=true;
  var prompt="Question: "+m.q+"\nThe student answered: "+m.you+"\nThe correct answer: "+m.right+"\n\nExplain briefly why the student's answer is wrong, why the correct answer is right, and give one tip to avoid this mistake. "+langRule()+PLAIN;
  sample(prompt,{effort:"low",onText:function(r){out.textContent=r.text}}).then(function(r){out.textContent=r.text},function(err){if(err&&err.code==="not_granted"){out.hidden=true; tutorOff(); return} out.textContent=errCopy(err)}).then(function(){b.disabled=false});
});
/* ================= REVIEW: SPACED REPETITION + MISTAKES ================= */
var BOX=[0,1,3,7,14], cQueue=[], cCur=null, cTotal=0;
function dueCards(){var t=iso(today()); return state.cards.filter(function(c){return !c.due||c.due<=t})}
function subOptions(withAll){
  var l=L(), opts=state.subjects.filter(function(s){return s.name.trim()}).map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join("");
  return (withAll?'<option value="all">'+esc(l.cAll)+'</option>':'<option value="">'+esc(l.cNone)+'</option>')+opts;
}
function renderCards(){
  var l=L(), due=dueCards(), f=$("cFilter").value||"all";
  $("cFilter").innerHTML=subOptions(true); $("cFilter").value=f; if($("cFilter").value!==f) $("cFilter").value="all";
  var cs=$("cSub").value; $("cSub").innerHTML=subOptions(false); $("cSub").value=cs||"";
  var fd=due.filter(function(c){return $("cFilter").value==="all"||String(c.sub)===$("cFilter").value});
  $("cInfo").textContent=l.cInfo(state.cards.length,due.length); $("cStart").disabled=!fd.length;
  var counts=[0,0,0,0,0]; state.cards.forEach(function(c){counts[clamp(c.box||0,0,4)]++});
  $("cBoxes").innerHTML=counts.map(function(n,i){return '<span><b>'+n+'</b>'+esc(l.boxes[i])+'</span>'}).join("");
  renderMistakes();
}
$("cFilter").addEventListener("change",renderCards);
function subName(id){var s=find(id); return s?s.name:""}
function nextCard(){
  if(!cQueue.length){cCur=null; $("cReview").hidden=true; $("cIdle").hidden=false; renderCards(); renderNav(); toast(L().cDone); if(cTotal>=5) celebrate(); return}
  cCur=cQueue.shift(); $("cFlash").classList.remove("flip");
  $("cFront").textContent=cCur.q; $("cBack").textContent=cCur.a; $("cTagF").textContent=$("cTagB").textContent=subName(cCur.sub);
  $("cBtns").hidden=true; $("cReview").hidden=false; $("cIdle").hidden=true; $("cLeft").textContent=L().cLeft(cQueue.length+1);
}
function rateCard(q){
  if(!cCur) return;
  cCur.box=q===2?Math.min(4,(cCur.box||0)+1):q===1?Math.max(1,cCur.box||0):0;
  cCur.due=iso(addDays(today(),BOX[cCur.box]));
  if(q===0) cQueue.push(cCur);
  markActive(); dayLog().c++; addXP(2); save(); nextCard();
}
$("cAdd").onclick=function(){
  var q=$("cQ").value.trim(), a=$("cA").value.trim(); if(!q||!a) return;
  state.cards.push({id:Date.now(),q:q.slice(0,300),a:a.slice(0,600),box:0,due:"",sub:$("cSub").value?+$("cSub").value:""});
  if(state.cards.length>500) state.cards.shift();
  state.cnt.cardsMade++; addXP(2);
  $("cQ").value=""; $("cA").value=""; save(); renderCards(); renderNav(); toast(L().cAdded); $("cQ").focus();
};
$("cA").addEventListener("keydown",function(e){if(e.key==="Enter") $("cAdd").click()});
$("cStart").onclick=function(){var f=$("cFilter").value; cQueue=dueCards().filter(function(c){return f==="all"||String(c.sub)===f}).slice(0,40); cTotal=cQueue.length; nextCard()};
$("cEnd").onclick=function(){cQueue=[]; cTotal=0; nextCard()};
$("cFlash").onclick=function(){if(!cCur) return; this.classList.toggle("flip"); $("cBtns").hidden=false};
$("cFlash").setAttribute("tabindex","0");
$("cFlash").addEventListener("keydown",function(e){if(e.key===" "||e.key==="Enter"){e.preventDefault(); this.click()}});
$("cYes").onclick=function(){rateCard(2)};
$("cHard").onclick=function(){rateCard(1)};
$("cNo").onclick=function(){rateCard(0)};
$("cDel").onclick=function(){
  if(!cCur) return; var id=cCur.id;
  state.cards=state.cards.filter(function(c){return c.id!==id}); cQueue=cQueue.filter(function(c){return c.id!==id});
  save(); nextCard();
};
function renderMistakes(){
  var l=L(), m=state.mistakes;
  $("mistCount").textContent=m.length;
  $("mlist").innerHTML=m.length?m.slice(0,30).map(function(x){
    return '<li><div class="q1">'+esc(x.q)+'</div>'+(x.course?'<span class="chip" style="margin-top:4px">'+esc(x.course)+'</span>':'')+
      '<p class="a1">'+esc(l.mistYou)+': <s>'+esc(x.you)+'</s></p><p class="a1">'+esc(l.mistRight)+': <mark>'+esc(x.right)+'</mark></p>'+(x.why?'<p class="a1 soft">'+esc(x.why)+'</p>':'')+
      '<div class="actions" style="margin-top:8px"><button class="btn sm ghost ai-only" type="button" data-mx="'+x.id+'">'+esc(l.mistExplain)+'</button><button class="btn sm" type="button" data-mc="'+x.id+'">'+esc(l.mistCard)+'</button><button class="link" type="button" data-md="'+x.id+'">'+esc(l.mistDel)+'</button></div><p class="out" data-mxo="'+x.id+'" hidden></p></li>';
  }).join(""):'<li class="empty" style="border:0;background:none">'+esc(l.mistNone)+'</li>';
}
$("mlist").addEventListener("click",function(e){
  var c=e.target.closest("[data-mc]"), d=e.target.closest("[data-md]"), id=+(c||d||{dataset:{}}).dataset[c?"mc":"md"];
  if(!c&&!d) return;
  var x=state.mistakes.filter(function(m){return m.id===id})[0]; if(!x) return;
  if(c){var s=state.subjects.filter(function(z){return norm2(z.name)===norm2(x.course)})[0]; state.cards.push({id:Date.now(),q:x.q.slice(0,300),a:(x.right+(x.why?" — "+x.why:"")).slice(0,600),box:0,due:"",sub:s?s.id:""}); state.cnt.cardsMade++; toast(L().cAdded)}
  state.mistakes=state.mistakes.filter(function(m){return m.id!==id}); state.cnt.mistRev++; addXP(3); save(); renderCards(); renderNav();
});
onRoute.review=renderCards;

/* ================= INSIGHTS ================= */
function renderStats(){
  var l=L(), lv=lvlOf(state.xp), t=today(), tk=iso(t);
  var qavg=state.scores.length?Math.round(state.scores.slice(0,20).reduce(function(a,x){return a+x.right/x.total},0)/Math.min(20,state.scores.length)*100)+"%":"—";
  $("sKpis").innerHTML=[[lv.n+" · "+lvlName(lv.n),l.sLevel],[state.xp,l.sXp],[dw(Math.max(state.bestStreak,streakN())),l.sBest],[qavg,l.sQuiz]].map(function(k){return '<div class="kpi"><b style="font-size:1.25rem">'+esc(k[0])+'</b><small>'+esc(k[1])+'</small></div>'}).join("");
  var start=addDays(t,-(7*15+t.getDay())), cells=[];
  for(var d=start;d<=t;d=addDays(d,1)){
    var g=state.log[iso(d)]||{}, sc=(g.m||0)+(g.s||0)*15+(g.c||0)+(g.q||0)*10;
    var lvl=sc<=0?0:sc<20?1:sc<45?2:sc<90?3:4;
    cells.push('<i data-l="'+lvl+'"'+(iso(d)===tk?' class="t"':'')+' title="'+esc(dayFmt(d,true))+' · '+(g.m||0)+' min"></i>');
  }
  $("heat").innerHTML=cells.join("");
  var bars=[], mx=1;
  for(var i=13;i>=0;i--){var dd=addDays(t,-i), m=(state.log[iso(dd)]||{}).m||0; bars.push([dd,m]); if(m>mx) mx=m}
  $("bars14").innerHTML=bars.map(function(b){return '<div title="'+esc(dayFmt(b[0],true))+'"><small>'+(b[1]||"")+'</small><i'+(iso(b[0])===tk?' class="t"':'')+' style="height:'+(b[1]/mx*110)+'px"></i><small>'+b[0].getDate()+'</small></div>'}).join("");
  var by=Object.keys(state.focusBy).map(function(k){return [k,state.focusBy[k]]}).sort(function(a,b){return b[1]-a[1]}), tot=by.reduce(function(a,x){return a+x[1]},0);
  if(!tot){$("donut").innerHTML='<p class="soft small">'+esc(l.noData)+'</p>'}
  else{
    var r=52, c=2*Math.PI*r, off=0, segs=by.slice(0,6).map(function(x,i){var len=x[1]/tot*c, s='<circle cx="75" cy="75" r="'+r+'" fill="none" stroke="var('+HL[i%6]+')" stroke-width="22" stroke-dasharray="'+len.toFixed(1)+' '+(c-len).toFixed(1)+'" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 75 75)"/>'; off+=len; return s});
    $("donut").innerHTML='<svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="'+r+'" fill="none" stroke="var(--rule)" stroke-width="22"/>'+segs.join("")+'<text x="75" y="72" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="20" fill="var(--ink)">'+tot+'</text><text x="75" y="92" text-anchor="middle" font-size="11" fill="var(--ink-soft)">min</text></svg><ul>'+
      by.slice(0,6).map(function(x,i){return '<li><i style="background:var('+HL[i%6]+')"></i>'+esc(x[0])+'<span>'+Math.round(x[1]/tot*100)+'%</span></li>'}).join("")+'</ul>';
  }
  var tests=badgeTests();
  $("badges").innerHTML=l.badges.map(function(b,i){var on=!!state.badges[i]||tests[i]; return '<div class="bdg'+(on?" on":"")+'"><span class="md">'+(on?"★":"☆")+'</span><div><b>'+esc(b[0])+'</b><small>'+esc(b[1])+'</small></div></div>'}).join("");
}
onRoute.stats=function(){renderStats(); renderProfile()};
onRoute.welcome=function(){renderLanding()};
$("expBtn").onclick=function(){saveFile("exam-plan-backup-"+iso(today())+".json",JSON.stringify(state,null,1)).catch(function(){})};
$("impFile").addEventListener("change",function(){
  var f=this.files&&this.files[0]; this.value=""; if(!f) return;
  if(f.size>5*1024*1024){toast(L().impBad); return}
  f.text().then(function(txt){
    var s=JSON.parse(txt); if(!s||!Array.isArray(s.subjects)) throw 0;
    booting=true; state=Object.assign({lang:state.lang},s); normalize(); booting=false; state.updated=Date.now(); save();
    current=null; if(state.built) build(false); renderAll(); toast(L().impOk);
  }).catch(function(){toast(L().impBad)});
});
$("wipeBtn").onclick=function(){$("wipeAsk").hidden=false};
$("wipeNo").onclick=function(){$("wipeAsk").hidden=true};
$("wipeYes").onclick=function(){
  var lang=state.lang, theme=state.theme;
  state={lang:lang,theme:theme,subjects:[],hours:4,off:-1,done:{},start:null,built:false,updated:Date.now(),scores:[],tutor:{major:"",course:"",topic:""}};
  normalize(); addSubject(); addSubject(); current=null; save(); $("wipeAsk").hidden=true;
  if(IS_WEB){clearKey(); sample=null; tutorOff(); renderAiKey()} $("result").hidden=true; renderAll(); toast(L().wiped);
};

/* ================= GRADES ================= */
var LETTERS=[["A",4],["A-",3.7],["B+",3.3],["B",3],["B-",2.7],["C+",2.3],["C",2],["C-",1.7],["D+",1.3],["D",1],["F",0]];
function renderGrade(){
  var l=L(), g=state.grade, out=$("gOut");
  if($("gNow").value!==String(g.now)) $("gNow").value=g.now;
  if($("gFinal").value!==String(g.fin)) $("gFinal").value=g.fin;
  var now=parseFloat(g.now), fin=parseFloat(g.fin);
  if(isNaN(now)||isNaN(fin)||fin<=0||now<0){out.innerHTML=""; return}
  out.innerHTML=[50,60,70,80,90].map(function(t){
    var nd=Math.round((t-now)*10)/10, st=nd<=0?0:nd>fin?2:1;
    var txt=nd<=0?l.gHave:nd>fin?l.gNo:l.gNeed(nd,fin,Math.round(nd/fin*100));
    return '<li><strong>'+l.gFor(t)+'</strong><span class="chip st'+st+'">'+txt+'</span></li>';
  }).join("");
}
["gNow","gFinal"].forEach(function(id){$(id).addEventListener("input",function(){state.grade={now:$("gNow").value,fin:$("gFinal").value}; save(); renderGrade()})});
function renderGpa(full){
  var l=L(), G=state.gpa;
  if(!G.rows.length){state.subjects.filter(function(s){return s.name.trim()}).forEach(function(s){G.rows.push({name:s.name,cr:3,g:"B"})}); if(!G.rows.length) G.rows.push({name:"",cr:3,g:"B"})}
  if(full!==false) $("gpaRows").innerHTML=G.rows.map(function(r,i){
    return '<div class="gpa-row"><input type="text" data-gi="'+i+'" data-gf="name" value="'+esc(r.name)+'" placeholder="'+esc(l.gpaName)+'" aria-label="'+esc(l.gpaName)+'"><input type="number" min="0" max="12" data-gi="'+i+'" data-gf="cr" value="'+esc(r.cr)+'" aria-label="'+esc(l.gpaCr)+'"><select data-gi="'+i+'" data-gf="g" aria-label="'+esc(l.aGrade)+'">'+LETTERS.map(function(x){return '<option value="'+x[0]+'"'+(x[0]===r.g?" selected":"")+'>'+x[0]+' · '+x[1].toFixed(1)+'</option>'}).join("")+'</select><button class="x" type="button" data-gx="'+i+'" aria-label="×">×</button></div>';
  }).join("");
  if(full!==false){$("gpaPrev").value=G.prev; $("gpaPrevH").value=G.prevH; $("gpaTarget").value=G.target}
  var pts=0, hrs=0; G.rows.forEach(function(r){var c=+r.cr||0, p=(LETTERS.filter(function(x){return x[0]===r.g})[0]||[0,0])[1]; pts+=c*p; hrs+=c});
  var sem=hrs?pts/hrs:0; $("gpaOut").textContent=sem.toFixed(2);
  var pv=parseFloat(G.prev), ph=parseFloat(G.prevH), tg=parseFloat(G.target), hint=l.gpaScale;
  if(!isNaN(pv)&&ph>0&&hrs){
    $("gpaCumOut").textContent=((pv*ph+pts)/(ph+hrs)).toFixed(2);
    if(!isNaN(tg)){var needSem=(tg*(ph+hrs)-pv*ph)/hrs; hint=(needSem>4?l.gpaNo:needSem<=sem?l.gpaHave:l.gpaNeed(needSem.toFixed(2)))+" "+l.gpaScale}
  }else $("gpaCumOut").textContent="—";
  $("gpaHint").textContent=hint;
}
$("gpaRows").addEventListener("input",function(e){var t=e.target; if(!t.dataset.gf) return; state.gpa.rows[+t.dataset.gi][t.dataset.gf]=t.value; save(); renderGpa(false)});
$("gpaRows").addEventListener("click",function(e){var b=e.target.closest("[data-gx]"); if(!b) return; state.gpa.rows.splice(+b.dataset.gx,1); if(!state.gpa.rows.length) state.gpa.rows.push({name:"",cr:3,g:"B"}); save(); renderGpa()});
$("gpaAdd").onclick=function(){state.gpa.rows.push({name:"",cr:3,g:"B"}); save(); renderGpa()};
[["gpaPrev","prev"],["gpaPrevH","prevH"],["gpaTarget","target"]].forEach(function(p){$(p[0]).addEventListener("input",function(){state.gpa[p[1]]=this.value; save(); renderGpa(false)})});
onRoute.grades=function(){renderGrade(); renderGpa()};

/* ================= BOOT ================= */
function renderAll(){
  applyLang(); applyTheme(); renderForm(); renderTools(); fillTutor(); renderCards(); renderLevel(); renderNav();
  if(state.built&&current) renderResult(false);
  if(quizData&&!quizData.graded) renderQuiz();
  if(!sample&&sampleChecked) tutorOff();
  renderAiKey(); $("repNoAI").hidden=!IS_WEB;
  if(onRoute[route]) onRoute[route]();
}
$("langBtn").onclick=function(){state.lang=state.lang==="en"?"ar":"en"; save(); renderAll(); if(!$("onb").hidden&&O) renderOnb()};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",applyTheme);

document.body.classList.add("noai");
var had=load();
if(!state.subjects.length){addSubject(); addSubject()}
fSet("focus");
if(state.built||state.demo) build(false);
renderAll(); go();
booting=false;
checkBadges();

if(window.claude&&typeof window.claude.use==="function"){
  window.claude.use("sample").then(function(fn){
    if(fn){enableAI(fn)}
    else tutorOff();
  }).catch(tutorOff);
  window.claude.use("tts").then(function(t){if(t) setupTts(t)}).catch(function(){});
  window.claude.use("dictation").then(function(d){if(d){dict=d; wireDictation()}}).catch(function(){});
  window.claude.use("downloads").then(function(d){downloads=d; if(!d){$("calBtn").hidden=true; $("expBtn").hidden=true}}).catch(function(){$("calBtn").hidden=true; $("expBtn").hidden=true});
  Promise.all([window.claude.use("db"),window.claude.use("user")]).then(function(r){
    var db=r[0], user=r[1]; if(!db||!user) return;
    return user.id().then(function(id){
      if(!id) return;
      var doc=db.collection("data/users/"+id).doc("state");
      return doc.get().then(function(snap){
        var d=snap.exists?snap.data():null; dbDoc=doc;
        if(d&&typeof d.json==="string"&&(d.updated||0)>(state.updated||0)){
          booting=true;
          try{state=Object.assign(state,JSON.parse(d.json))}catch(e){}
          normalize(); saveLocal(); current=null;
          if(state.built) build(false); else $("result").hidden=true;
          renderAll(); booting=false; setSync("syncCloud");
        }else{dbDirty=true; push()}
      });
    });
  }).catch(function(){});
}else if(IS_WEB){
  tutorOff(); var wt=webTts(); if(wt) setupTts(wt); var wd=webDict(); if(wd){dict=wd; wireDictation()}
  renderAiKey(); var savedKey=getKey(); if(savedKey) activateKey(savedKey,false,true);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function(){});
}else{tutorOff(); $("calBtn").hidden=true; $("expBtn").hidden=true}
})();
