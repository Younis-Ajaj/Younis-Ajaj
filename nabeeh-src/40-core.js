<script>
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
  $("themeBtn").setAttribute("aria-label",dark?"Light":"Dark"); $("lTheme").innerHTML=$("themeBtn").innerHTML;
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
  $("sync").textContent=l[syncKey];
}
</script>
