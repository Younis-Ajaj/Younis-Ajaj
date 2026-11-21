<script>
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
</script>
