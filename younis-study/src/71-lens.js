<script>
/* ================= Lens: camera + image analysis with Claude vision ================= */
/* Flow: photo (camera, upload, paste or drop) -> resize in a <canvas> -> base64 JPEG ->
   one Claude request with the image blocks + a precise instruction -> streamed Markdown answer. */
var IMG_EDGE=2576, IMG_PIXELS=3.75e6, IMG_MAX=5, IMG_B64_MAX=5e6;
var lensImgs=[], lensMode="solve", lensCtl=null, lensMsgs=null, lensText="", camStream=null, camFacing="environment";
var LENS_MODES=["solve","explain","ocr","summary","cards","check","custom"];
var LENS_EFFORT={solve:"high",check:"high",explain:"high",custom:"high",ocr:"medium",summary:"medium",cards:"medium"};

function lensSystem(){
  return "You are Younis (يونس), a meticulous study assistant. Students send you photos of their study material: textbook pages, handwritten notes, exam questions, diagrams, charts, code and their own solutions.\n"+
  "Accuracy rules:\n"+
  "- Read the whole image carefully first. Quote the exact numbers, symbols, units and wording you rely on.\n"+
  "- If a part is blurry, cut off or ambiguous, say exactly which part and what you assumed. Never invent content that is not visible.\n"+
  "- For any calculation, work step by step, then check the result by substituting back or by a second method.\n"+
  "- Do exactly what the student asked. If there are several questions and the student did not pick one, answer all of them in order, numbered as in the image.\n"+
  "Format: Markdown with short headings, numbered steps and lists, and | tables when useful. Write maths in plain text with Unicode symbols (x², √, π, ≤, →, ∫, Σ), never LaTeX.\n"+
  langRule();
}
function lensTask(mode,n){
  var many=n>1?" The student sent "+n+" photos, in order; treat them as one piece of material.":"";
  return ({
    solve:"Solve the problem(s) in the image step by step, explaining each step briefly so a student can follow. Finish with a line that starts with **"+(state.lang==="en"?"Final answer:":"الجواب النهائي:")+"**",
    explain:"Explain what the image shows for a student: the main idea, the key concepts, how to read any diagram or chart, and what students often get wrong. Add a short example if it helps.",
    ocr:"Transcribe all the text in the image exactly as written, in its original language. Keep the structure: headings, lists, tables, line breaks and equations. Do not translate, correct or summarise. Write [?] for any word you cannot read.",
    summary:"Summarise this material for exam revision: the main idea in one sentence, the key points as a list, important definitions and formulas, then 3 likely exam questions.",
    check:"The image shows the student's own solution. Check it line by line: say what is correct, point to the first mistake and explain why it is wrong, show the correct working from there, and end with a one-line verdict (correct / partly correct / wrong).",
    custom:"Answer the student's question about the image."
  })[mode]+many;
}

/* ---------- images: load, resize, rotate ---------- */
function loadImg(src){return new Promise(function(res,rej){var im=new Image(); im.onload=function(){res(im)}; im.onerror=function(){rej(new Error("img"))}; im.src=src})}
/* Claude reads up to 2576 px on the long edge and 3.75 MP; we resize to exactly that budget,
   so text stays sharp but nothing is wasted. White background for transparent PNGs. */
function fitImage(source,w,h,rot){
  var s=Math.min(1,IMG_EDGE/Math.max(w,h),Math.sqrt(IMG_PIXELS/(w*h)));
  var cw=Math.max(1,Math.round(w*s)), ch=Math.max(1,Math.round(h*s)), turn=rot%180!==0;
  var c=document.createElement("canvas"); c.width=turn?ch:cw; c.height=turn?cw:ch;
  var x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height);
  x.translate(c.width/2,c.height/2); x.rotate(rot*Math.PI/180); x.drawImage(source,-cw/2,-ch/2,cw,ch);
  var q=0.92, url=c.toDataURL("image/jpeg",q);
  while(url.length>IMG_B64_MAX&&q>0.5){q-=0.1; url=c.toDataURL("image/jpeg",q)}
  return {url:url,data:url.slice(url.indexOf(",")+1),w:c.width,h:c.height};
}
function addImage(source,w,h,name,revoke){
  if(lensImgs.length>=IMG_MAX){toast(L().imgMax); if(revoke) URL.revokeObjectURL(revoke); return}
  lensImgs.push({src:source,w:w,h:h,rot:0,name:name||"",revoke:revoke||null,fit:fitImage(source,w,h,0)});
  lensMsgs=null; renderThumbs();
}
function addImageFile(file){
  if(!file||!/^image\//.test(file.type)) return Promise.resolve();
  if(file.size>40*1024*1024){toast(L().imgBad); return Promise.resolve()}
  var url=URL.createObjectURL(file);
  return loadImg(url).then(function(im){addImage(im,im.naturalWidth,im.naturalHeight,file.name,url)},function(){URL.revokeObjectURL(url); toast(L().imgBad)});
}
function renderThumbs(){
  var l=L();
  $("imgThumbs").innerHTML=lensImgs.map(function(m,i){
    return '<div class="thumb"><img src="'+m.fit.url+'" alt="'+esc(l.imgAlt(i+1))+'">'+
      '<button class="tb r" type="button" data-rot="'+i+'" aria-label="'+esc(l.imgRotate)+'"><svg><use href="#i-rotate"/></svg></button>'+
      '<button class="tb x" type="button" data-rm="'+i+'" aria-label="'+esc(l.imgRemove)+'"><svg><use href="#i-x"/></svg></button>'+
      '<small>'+m.fit.w+'×'+m.fit.h+'</small></div>';
  }).join("");
}
$("imgThumbs").addEventListener("click",function(e){
  var b=e.target.closest("button"); if(!b) return;
  if(b.dataset.rm){var m=lensImgs.splice(+b.dataset.rm,1)[0]; if(m&&m.revoke) URL.revokeObjectURL(m.revoke)}
  else if(b.dataset.rot){var r=lensImgs[+b.dataset.rot]; r.rot=(r.rot+90)%360; r.fit=fitImage(r.src,r.w,r.h,r.rot)}
  lensMsgs=null; renderThumbs();
});
$("imgFile").addEventListener("change",function(){
  var files=[].slice.call(this.files||[]); this.value="";
  files.reduce(function(p,f){return p.then(function(){return addImageFile(f)})},Promise.resolve());
});
document.addEventListener("paste",function(e){
  if(route!=="lens"||$("lensA").hidden) return;
  var items=[].slice.call((e.clipboardData||{}).items||[]).filter(function(it){return it.kind==="file"&&/^image\//.test(it.type)});
  if(!items.length) return; e.preventDefault();
  items.forEach(function(it){addImageFile(it.getAsFile())});
});
["dragover","drop"].forEach(function(ev){
  $("lensA").addEventListener(ev,function(e){
    if(!e.dataTransfer||[].indexOf.call(e.dataTransfer.types||[],"Files")<0) return;
    e.preventDefault();
    if(ev==="drop") [].slice.call(e.dataTransfer.files||[]).forEach(addImageFile);
  });
});

/* ---------- camera (getUserMedia) ---------- */
function camError(msg){var el=$("camErr"); el.textContent=msg; el.hidden=false}
function camStop(){
  if(camStream){camStream.getTracks().forEach(function(t){t.stop()}); camStream=null}
  var v=$("camVideo"); v.srcObject=null; $("camBox").hidden=true;
}
function camStart(){
  var l=L(); $("camErr").hidden=true;
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){camError(l.camNone); return}
  camStop();
  navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:camFacing},width:{ideal:3840},height:{ideal:2160}}})
    .then(function(stream){
      if(route!=="lens"){stream.getTracks().forEach(function(t){t.stop()}); return}
      camStream=stream; var v=$("camVideo"); v.srcObject=stream; $("camBox").hidden=false; v.play().catch(function(){});
      $("camShot").focus();
    })
    .catch(function(e){var n=e&&e.name; camError(n==="NotAllowedError"||n==="SecurityError"?l.camDenied:n==="NotFoundError"||n==="OverconstrainedError"?l.camNone:l.camFail)});
}
$("camOpen").onclick=camStart;
$("camClose").onclick=camStop;
$("camFlip").onclick=function(){camFacing=camFacing==="environment"?"user":"environment"; camStart()};
$("camShot").onclick=function(){
  var v=$("camVideo"), w=v.videoWidth, h=v.videoHeight; if(!w||!h) return;
  var c=document.createElement("canvas"); c.width=w; c.height=h; c.getContext("2d").drawImage(v,0,0,w,h);
  addImage(c,w,h,"camera");
  if(lensImgs.length>=IMG_MAX) camStop();
};
document.addEventListener("visibilitychange",function(){if(document.hidden) camStop()});
addEventListener("hashchange",function(){if(route!=="lens") camStop()});

/* ---------- tabs and modes ---------- */
function lensTab(t){
  var a=t!=="tr";
  $("lensTabA").setAttribute("aria-selected",a); $("lensTabT").setAttribute("aria-selected",!a);
  $("lensA").hidden=!a; $("lensT").hidden=a;
  if(!a) camStop();
}
$("lensTabA").onclick=function(){lensTab("a")};
$("lensTabT").onclick=function(){lensTab("tr")};
function renderLensModes(){
  var l=L();
  $("lensModes").innerHTML=LENS_MODES.map(function(m){return '<button type="button" data-lm="'+m+'" aria-pressed="'+(m===lensMode)+'">'+esc(l.lensModes[m])+'</button>'}).join("");
}
$("lensModes").addEventListener("click",function(e){
  var b=e.target.closest("[data-lm]"); if(!b) return;
  lensMode=b.dataset.lm; renderLensModes(); if(lensMode==="custom") $("lensAsk").focus();
});
function renderLens(){
  var ok=IS_WEB&&!!sample;
  $("lensKey").hidden=ok; renderLensModes(); renderTrLangs();
}
onRoute.lens=renderLens;

/* ---------- streaming answer ---------- */
var lensFrame=0;
function showLens(text,busy){
  lensText=text;
  if(lensFrame) return;
  lensFrame=requestAnimationFrame(function(){lensFrame=0; var o=$("lensOut"); o.innerHTML=renderMd(lensText); o.setAttribute("aria-busy",busy?"true":"false")});
}
function lensBusy(on){$("lensGo").disabled=on; $("lensStop").hidden=!on; $("lensOut").setAttribute("aria-busy",on?"true":"false")}
function lensAsk(messages,mode){
  var l=L(); lensCtl=new AbortController(); lensBusy(true); $("lensPanel").hidden=false; $("lensExtra").innerHTML=""; $("lensFollow").hidden=true;
  showLens(l.thinking,true);
  var opts={system:lensSystem(),effort:LENS_EFFORT[mode]||"high",signal:lensCtl.signal,onText:function(r){showLens(r.text,true)}};
  if(mode==="cards"){
    return sample.json(messages,{system:lensSystem(),effort:"medium",signal:lensCtl.signal}).then(function(j){
      var cards=(j&&Array.isArray(j.cards)?j.cards:[]).filter(function(c){return c&&c.q&&c.a}).slice(0,15);
      showLens(cards.length?"":l.lensCardsNone,false); lensCardsUi(cards);
    }).catch(function(e){showLens(errCopy(e),false)}).then(function(){lensBusy(false)});
  }
  return sample(messages,opts).then(function(r){
    lensText=r.text; showLens(r.text,false);
    lensMsgs=messages.concat([{role:"assistant",content:r.text}]);
    $("lensFollow").hidden=false;
  }).catch(function(e){
    var kept=e&&e.text?e.text:""; showLens(e&&e.code==="cancelled"?kept:(kept?kept+"\n\n":"")+errCopy(e),false);
  }).then(function(){lensBusy(false); $("lensPanel").scrollIntoView({behavior:"smooth",block:"start"})});
}
$("lensGo").onclick=function(){
  var l=L(), ask=$("lensAsk").value.trim();
  if(!sample){$("lensKey").hidden=false; toast(l.lensNeedKey); return}
  if(!lensImgs.length){toast(l.lensNoImg); return}
  if(lensMode==="custom"&&!ask){toast(l.lensNeedAsk); $("lensAsk").focus(); return}
  var task=lensMode==="cards"?
    "Create up to 12 flashcards from the most important facts, definitions and formulas in the image, for exam revision. Questions short and specific; answers short. "+langRule()+" Return JSON only: {\"cards\":[{\"q\":\"question\",\"a\":\"answer\"}]}":
    lensTask(lensMode,lensImgs.length);
  var content=lensImgs.map(function(m){return {type:"image",source:{type:"base64",media_type:"image/jpeg",data:m.fit.data}}});
  content.push({type:"text",text:task+(ask?"\n\nThe student's exact request: "+ask:"")});
  lensAsk([{role:"user",content:content}],lensMode);
};
$("lensStop").onclick=function(){if(lensCtl) lensCtl.abort()};
$("lensFollow").addEventListener("submit",function(e){
  e.preventDefault(); var q=$("lensQ").value.trim(); if(!q||!lensMsgs||!sample) return;
  $("lensQ").value="";
  lensAsk(lensMsgs.concat([{role:"user",content:q}]),"custom");
});
$("lensCopy").onclick=function(){copyText(lensText)};
function copyText(t){
  if(!t) return;
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast(L().copied)},function(){toast(L().eGen)});
}

/* ---------- photo -> flashcards in the Review deck ---------- */
var lensCards=[];
function lensCardsUi(cards){
  var l=L(); lensCards=cards; if(!cards.length) return;
  var opts='<option value="">'+esc(l.lensNoSub)+'</option>'+state.subjects.filter(function(s){return s.name}).map(function(s){return '<option value="'+s.id+'">'+esc(s.name)+'</option>'}).join("");
  $("lensExtra").innerHTML='<ul class="crs" style="margin-top:6px">'+cards.map(function(c,i){
    return '<li><label class="row c chk" style="align-items:flex-start"><input type="checkbox" data-lc="'+i+'" checked><span><span class="nm">'+esc(String(c.q).slice(0,300))+'</span><span class="meta">'+esc(String(c.a).slice(0,600))+'</span></span></label></li>';
  }).join("")+'</ul><div class="row c" style="margin-top:10px;gap:10px"><select id="lensCardSub" style="width:auto" aria-label="'+esc(l.course)+'">'+opts+'</select><button class="btn primary sm" type="button" id="lensCardAdd">'+esc(l.lensCardsAdd)+'</button></div>';
}
$("lensExtra").addEventListener("click",function(e){
  if(e.target.id!=="lensCardAdd") return;
  var sub=$("lensCardSub").value, n=0;
  qa("[data-lc]:checked").forEach(function(cb){var c=lensCards[+cb.dataset.lc]; state.cards.push({id:Date.now()+n,q:String(c.q).slice(0,300),a:String(c.a).slice(0,600),box:0,due:"",sub:sub?+sub:""}); n++});
  if(!n) return;
  state.cnt.cardsMade+=n; save(); renderNav(); $("lensExtra").innerHTML=""; toast(L().lensCardsDone(n));
});
</script>
