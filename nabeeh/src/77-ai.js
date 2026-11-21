<script>
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
</script>
