<script>
/* ================= "Ask Younis" chat ================= */
var chatCtl=null;
function mdInline(s){
  return s.replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
}
function renderMd(text){
  var lines=esc(text).split("\n"), out=[], list=null, code=null;
  function closeList(){if(list){out.push("</"+list+">"); list=null}}
  lines.forEach(function(raw){
    var ln=raw.replace(/\s+$/,"");
    if(/^```/.test(ln)){if(code!==null){out.push("<pre><code>"+code.join("\n")+"</code></pre>"); code=null} else {closeList(); code=[]} return}
    if(code!==null){code.push(raw); return}
    var m;
    if((m=ln.match(/^#{1,4}\s+(.*)$/))){closeList(); out.push("<h4>"+mdInline(m[1])+"</h4>"); return}
    if((m=ln.match(/^\s*[-*•]\s+(.*)$/))){if(list!=="ul"){closeList(); out.push("<ul>"); list="ul"} out.push("<li>"+mdInline(m[1])+"</li>"); return}
    if((m=ln.match(/^\s*\d+[.)]\s+(.*)$/))){if(list!=="ol"){closeList(); out.push("<ol>"); list="ol"} out.push("<li>"+mdInline(m[1])+"</li>"); return}
    closeList();
    if(ln.trim()) out.push("<p>"+mdInline(ln)+"</p>");
  });
  if(code!==null) out.push("<pre><code>"+code.join("\n")+"</code></pre>");
  closeList();
  return out.join("");
}
function chatSystem(useFiles){
  var p=state.profile||{}, t=today(), uni=p.stage===2||(p.stage==null&&(state.tutor||{}).level!=="school");
  var courses=(current?current.subs:[]).map(function(s){return s.name+" (exam in "+diffDays(t,s.d)+" days, readiness "+readiness(find(s.id)||s)+"%)"}).join("; ");
  var notes=useFiles?$("tNotes").value.trim().slice(0,30000):"";
  return ["You are Younis (يونس), an expert and warm study tutor inside an exam-preparation platform for Arab students.",
    "Student: "+(p.name||"(no name given)")+"; level: "+(uni?"university":"school")+(p.major?"; major: "+p.major:"")+(courses?"; courses: "+courses:"")+"; today: "+iso(t)+".",
    "How you answer:",
    "1. Accuracy first. Rely on standard textbook knowledge and be exact with definitions, formulas, numbers and units. If you are not sure, say so plainly and say how to check. Never invent sources, quotes or statistics.",
    "2. Structure every substantive answer: open with a direct answer in one or two sentences, then short headed sections, numbered steps for procedures, a worked example where it helps, the common exam mistakes when relevant, and close with one short question that checks understanding.",
    "3. Match the student's level, define new terms, and keep it concise: clarity over length. Short questions get short answers.",
    "4. For exercises, teach the method step by step with the reasoning, then state the final answer clearly.",
    "5. Reply in the language the student writes in (Arabic by default), keeping scientific terms in English in parentheses the first time they appear.",
    "6. Formatting: simple Markdown only: ## headings, - bullets, 1. numbered lists, **bold**, `inline code`, and fenced code blocks for code. No tables, images or HTML.",
    "7. Academic integrity: help the student learn. If asked to do a live graded exam or assignment for them, decline in one sentence and offer to teach the concept instead.",
    "8. Wellbeing: for exam stress give brief, practical support. If the student mentions self-harm or a crisis, respond with care and urge them to contact a trusted person or local emergency services now.",
    "9. Stay on studying, learning, careers and this platform; redirect other requests politely.",
    "10. When planning helps, use their real courses and exam dates above, and point to the platform's tools (plan, focus room, flashcards, mistake notebook, tutor)."
  ].join("\n")+(notes?"\n\nThe student's own course material. Use it first when it is relevant, and say when an answer comes from it:\n\"\"\"\n"+notes+"\n\"\"\"":"");
}
function chatRender(){
  var l=L(), log=$("chatLog"), msgs=state.chat;
  $("chatMode").textContent=sample?l.chatModeAI:l.chatModeLocal;
  $("chatMode").className="chip"+(sample?" st0":"");
  log.innerHTML=msgs.length?msgs.map(function(m,i){
    return '<div class="msg '+(m.role==="user"?"user":"bot")+'">'+(m.role==="user"?'<p>'+esc(m.content).replace(/\n/g,"<br>")+'</p>':renderMd(m.content))+
      (m.role==="assistant"?'<div class="msgact"><button class="link" type="button" data-copy="'+i+'">'+esc(l.chatCopy)+'</button>'+(tts?'<button class="link" type="button" data-say="'+i+'">'+esc(l.listen)+'</button>':'')+'</div>':'')+'</div>';
  }).join(""):'<div class="chatempty">'+owlSvg()+'<p>'+esc(l.chatHello(state.profile&&state.profile.name))+'</p></div>';
  $("chatSug").innerHTML=l.chatSug.map(function(s){return '<button type="button" data-sug="'+esc(s)+'">'+esc(s)+'</button>'}).join("");
  log.scrollTop=log.scrollHeight;
}
function chatPush(role,content){state.chat.push({role:role,content:content,at:Date.now()}); if(state.chat.length>60) state.chat=state.chat.slice(-60); save()}
function chatSend(text){
  text=String(text||"").trim().slice(0,4000); if(!text||chatCtl) return;
  $("chatIn").value=""; chatPush("user",text); chatRender(); markActive();
  if(!sample){chatPush("assistant",localReply(text)); chatRender(); return}
  var hist=state.chat.slice(-20), sys=chatSystem($("chatFiles").checked);
  while(hist.length&&hist[0].role!=="user") hist.shift();
  var turns=hist.map(function(m,i){return {role:m.role,content:i===0?sys+"\n\n---\nStudent message:\n"+m.content:m.content}});
  var log=$("chatLog"), bubble=document.createElement("div"); bubble.className="msg bot"; bubble.innerHTML='<p class="soft">'+esc(L().tThinking)+'</p>'; log.appendChild(bubble); log.scrollTop=log.scrollHeight;
  chatCtl=new AbortController(); $("chatSend").disabled=true; $("chatStop").hidden=false;
  sample(turns,{signal:chatCtl.signal,cache:false,onText:function(r){bubble.innerHTML=renderMd(r.text); log.scrollTop=log.scrollHeight}})
    .then(function(r){chatPush("assistant",r.text)})
    .catch(function(e){
      var kept=e&&e.text?e.text:"";
      if(e&&e.code==="not_granted"){tutorOff(); chatPush("assistant",localReply(text)); return}
      if(kept) chatPush("assistant",kept);
      if(!e||e.code!=="cancelled") chatPush("assistant","> "+errCopy(e));
    })
    .then(function(){chatCtl=null; $("chatSend").disabled=false; $("chatStop").hidden=true; chatRender()});
}
function localReply(q){
  var l=L(), n=normW(q).replace(/[؟?!.،,]/g," "), t=today(), tk=iso(t), has=function(re){return re.test(q.toLowerCase())};
  var subs=current?current.subs:[];
  if(has(/^\s*(مرحب|السلام|اهلا|أهلا|هلا|hi\b|hello|hey)/)) return l.lrHello+"\n\n"+l.lrCan.map(function(x){return "- "+x}).join("\n");
  if(has(/متوتر|قلق|خايف|خائف|ضغط|توتر|stress|anxious|nervous|scared/)) return l.lrStress;
  if(has(/اليوم|أذاكر|اذاكر|ادرس|أدرس|ابدأ|today|study now|what should i/)){
    var d=current&&current.days.filter(function(x){return x.key===tk})[0];
    if(!d) return l.lrNoPlan;
    var left=d.blocks.filter(function(b){return !state.done[tk+"|"+b.s.id]});
    return left.length?l.lrToday+"\n"+left.map(function(b){return "- **"+b.s.name+"**: "+l.ph[b.ph]+" ("+dur(b.u)+")"}).join("\n")+"\n\n"+l.lrTodayTip:l.allDone;
  }
  if(has(/امتحان|امتحاني|متى|exam|when/)){
    var up=subs.filter(function(s){return diffDays(t,s.d)>=0}).sort(function(a,b){return a.d-b.d});
    return up.length?l.lrExams+"\n"+up.map(function(s){return "- **"+s.name+"**: "+dayFmt(s.d)+" ("+dw(diffDays(t,s.d))+")"}).join("\n"):l.lrNoPlan;
  }
  if(has(/جاهز|جاهزية|مستواي|ready|readiness|progress/)){
    if(!subs.length) return l.lrNoPlan;
    var rs=subs.map(function(s){return {n:s.name,r:readiness(find(s.id)||s)}}).sort(function(a,b){return a.r-b.r});
    return l.lrReady+"\n"+rs.map(function(x){return "- **"+x.n+"**: "+x.r+"%"}).join("\n")+"\n\n"+l.lrWeakest(rs[0].n);
  }
  var hit=l.help.filter(function(h){return new RegExp(h.k,"i").test(q)})[0];
  if(hit) return hit.a;
  var notes=$("tNotes").value.trim();
  if(notes.length>200){
    var a=analyse(notes), qt={}; (q.match(/[\p{L}\p{N}]+/gu)||[]).forEach(function(w){var k=normW(w); if(k.length>=3&&!STOP[k]) qt[k]=1});
    var keys=Object.keys(qt);
    if(keys.length){
      var best=a.sents.map(function(s){var sc=0; keys.forEach(function(k){if(s.toks.indexOf(k)>=0) sc+=a.w[k]||1}); return {s:s,sc:sc}}).filter(function(x){return x.sc>0}).sort(function(x,y){return y.sc-x.sc}).slice(0,3);
      if(best.length) return l.lrFromNotes+"\n"+best.map(function(x){return "- "+x.s.text}).join("\n")+"\n\n"+l.lrNotesNote;
    }
  }
  return l.lrFallback+"\n\n"+l.lrCan.map(function(x){return "- "+x}).join("\n");
}
$("chatForm").addEventListener("submit",function(e){e.preventDefault(); chatSend($("chatIn").value)});
$("chatIn").addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault(); chatSend($("chatIn").value)}});
$("chatStop").onclick=function(){if(chatCtl) chatCtl.abort()};
$("chatClear").onclick=function(){state.chat=[]; save(); chatRender()};
document.addEventListener("click",function(e){
  var s=e.target.closest("[data-sug]"); if(s){chatSend(s.dataset.sug); return}
  var c=e.target.closest("[data-copy]");
  if(c){var m=state.chat[+c.dataset.copy]; if(m&&navigator.clipboard) navigator.clipboard.writeText(m.content).then(function(){toast(L().copied2)},function(){}); return}
  var y=e.target.closest("[data-say]");
  if(y&&tts){var mm=state.chat[+y.dataset.say]; if(mm) tts.speak([{text:mm.content.replace(/[#*`>]/g,"").slice(0,1800)}],{language:state.lang==="en"?"en":"ar"}).catch(function(){})}
});
onRoute.chat=chatRender;
</script>
