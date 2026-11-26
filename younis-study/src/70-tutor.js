<script>
/* ================= AI: COACH + TUTOR ================= */
var sample=null, sampleChecked=false, ctl=null, tts=null, dict=null;
function langRule(){return state.lang==="en"?"Write in English.":"اكتب بالعربية مع إبقاء المصطلحات العلمية بالإنجليزية بين قوسين."}
var PLAIN="\nPlain text only: no markdown symbols such as asterisks or heading marks.";
function errCopy(e){var l=L(), c=e&&e.code; return c==="rate_limited"?l.eRate:c==="invalid_json"?l.eJson:c==="auth"?l.aiBadKey:c==="refused"?l.aiRefused:c==="network"?l.aiNet:c==="web_off"?l.uniWebOff:l.eGen}
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
</script>
