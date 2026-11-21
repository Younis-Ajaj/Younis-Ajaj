<script>
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
  renderTodayExtras();
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
  var name=fSubName(); state.focusMin+=min; dayLog().m+=min; state.focusBy[name]=(state.focusBy[name]||0)+min;
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
</script>
