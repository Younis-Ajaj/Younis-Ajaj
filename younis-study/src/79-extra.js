<script>
/* ================= Exam timetable import + shareable progress card ================= */
function toLatinDigits(s){return String(s).replace(/[٠-٩]/g,function(c){return String(c.charCodeAt(0)-0x660)}).replace(/[۰-۹]/g,function(c){return String(c.charCodeAt(0)-0x6F0)})}
function parseTimetable(text){
  var t=today(), out=[], seen={};
  toLatinDigits(text).split(/\n+/).forEach(function(line){
    var raw=line.trim(); if(raw.length<4) return;
    var d=null, m;
    if((m=raw.match(/(20\d\d)[-\/.](\d{1,2})[-\/.](\d{1,2})/))) d=new Date(+m[1],+m[2]-1,+m[3]);
    else if((m=raw.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d\d)/))) d=new Date(+m[3],+m[2]-1,+m[1]);
    else if((m=raw.match(/(?:^|\D)(\d{1,2})[\/.](\d{1,2})(?!\d)/))){d=new Date(t.getFullYear(),+m[2]-1,+m[1]); if(diffDays(t,d)<0) d=new Date(t.getFullYear()+1,+m[2]-1,+m[1])}
    if(!d||isNaN(d)) return;
    var name=raw.replace(m[0],"").replace(/\b\d{1,2}:\d{2}\s*(am|pm|ص|م)?/ig,"").replace(/(السبت|الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|saturday|sunday|monday|tuesday|wednesday|thursday|friday|sat|sun|mon|tue|wed|thu|fri)/ig,"")
      .replace(/(امتحان|اختبار|نهائي|final|exam|midterm|موعد|التاريخ|date|الساعة|time)\s*[:：]?/ig,"").replace(/[|،,:\-–—()\[\]]+/g," ").replace(/\s+/g," ").trim();
    if(name.length<2||name.length>60) return;
    var k=normW(name); if(seen[k]) return; seen[k]=1;
    out.push({name:name,date:iso(d)});
  });
  return out;
}
var impRows=[], impCtl=null;
function renderImport(){
  var l=L(), box=$("impOut");
  if(!impRows.length){box.innerHTML=""; return}
  box.innerHTML='<ul class="cardpick">'+impRows.map(function(r,i){
    var bad=diffDays(today(),parse(r.date))<1;
    return '<li><label><input type="checkbox" data-imp="'+i+'"'+(bad?"":" checked")+'><span style="flex:1;display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:8px;align-items:center"><input type="text" data-impn="'+i+'" value="'+esc(r.name)+'" aria-label="'+esc(l.name)+'"><input type="date" data-impd="'+i+'" value="'+esc(r.date)+'" aria-label="'+esc(l.date)+'"></span></label></li>';
  }).join("")+'</ul><button class="btn primary sm" type="button" id="impAdd" style="margin-top:10px">'+esc(l.impAdd)+'</button>';
}
$("impToggle").onclick=function(){var p=$("impPanel"); p.hidden=!p.hidden; if(!p.hidden) $("impText").focus()};
$("ttFile").addEventListener("change",async function(){
  var f=this.files&&this.files[0]; this.value=""; if(!f) return;
  if(f.size>25*1024*1024){toast(L().fileBig(f.name)); return}
  try{var txt=await readFile(f); $("impText").value=($("impText").value?$("impText").value+"\n":"")+txt.slice(0,20000)}catch(e){toast(L().readFail(f.name))}
});
$("impGo").onclick=function(){
  var text=$("impText").value.trim(), l=L(), btn=this; if(text.length<6){toast(l.impEmpty); return}
  if(!sample){impRows=parseTimetable(text); renderImport(); if(!impRows.length) toast(l.impNone); return}
  impCtl=new AbortController(); btn.disabled=true; $("impOut").innerHTML='<p class="soft small">'+esc(l.thinking)+'</p>';
  var prompt="Extract every exam from this exam timetable. Today is "+iso(today())+"; if a date has no year, use the nearest future date. Keep course names exactly as written (no codes unless they are the only name).\nTimetable:\n\"\"\"\n"+text.slice(0,15000)+"\n\"\"\"\nReturn JSON only: {\"exams\":[{\"name\":\"course\",\"date\":\"YYYY-MM-DD\"}]}";
  sample.json(prompt,{signal:impCtl.signal,cache:false})
    .then(function(d){impRows=(d&&Array.isArray(d.exams)?d.exams:[]).filter(function(x){return x&&x.name&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)}).slice(0,15).map(function(x){return {name:String(x.name).slice(0,60),date:x.date}}); if(!impRows.length) impRows=parseTimetable(text); renderImport(); if(!impRows.length) toast(l.impNone)})
    .catch(function(e){if(e&&e.code==="not_granted") tutorOff(); impRows=parseTimetable(text); renderImport(); if(!impRows.length) toast(errCopy(e))})
    .then(function(){btn.disabled=false; impCtl=null});
};
$("impOut").addEventListener("input",function(e){var t=e.target; if(t.dataset.impn) impRows[+t.dataset.impn].name=t.value.slice(0,60); if(t.dataset.impd) impRows[+t.dataset.impd].date=t.value});
$("impOut").addEventListener("click",function(e){
  if(e.target.id!=="impAdd") return; var l=L(), n=0;
  state.subjects=state.subjects.filter(function(s){return s.name.trim()||s.date});
  qa("[data-imp]:checked").forEach(function(cb){
    var r=impRows[+cb.dataset.imp]; if(!r.name.trim()||!r.date) return;
    var ex=state.subjects.filter(function(s){return norm2(s.name)===norm2(r.name)})[0];
    if(ex) ex.date=r.date; else addSubject({name:r.name.trim(),date:r.date,diff:1,ready:0,ch:6});
    n++;
  });
  if(!state.subjects.length){addSubject(); addSubject()}
  save(); renderForm(); impRows=[]; renderImport(); $("impPanel").hidden=true; toast(l.impDone(n));
  $("buildBtn").scrollIntoView({behavior:"smooth",block:"center"});
});

/* ---------- shareable progress card (1080 x 1350) ---------- */
function cardStats(){
  var t=today(), wk=0, ss=0;
  for(var i=0;i<7;i++){var g=state.log[iso(addDays(t,-i))]||{}; wk+=g.m||0; ss+=g.s||0}
  var subs=state.subjects.filter(function(s){return s.name.trim()}).map(function(s){return {n:s.name.trim(),r:readiness(s)}}).sort(function(a,b){return b.r-a.r}).slice(0,4);
  return {wk:wk,ss:ss,streak:streakN(),lvl:lvlOf(state.xp).n,subs:subs};
}
function drawCard(){
  var l=L(), ar=state.lang!=="en", W=1080, H=1350, cv=document.createElement("canvas"); cv.width=W; cv.height=H;
  var c=cv.getContext("2d"), st=cardStats(), name=(state.profile&&state.profile.name)||"";
  var DISP=ar?'"Lalezar","Readex Pro",sans-serif':'"Readex Pro",sans-serif', BODY='"Readex Pro",Tahoma,sans-serif', MONO='"IBM Plex Mono",monospace';
  c.direction=ar?"rtl":"ltr"; c.textAlign=ar?"right":"left";
  var X=ar?W-90:90, g=c.createLinearGradient(0,0,W,H); g.addColorStop(0,"#16264A"); g.addColorStop(1,"#0A1124"); c.fillStyle=g; c.fillRect(0,0,W,H);
  [["#FFE14D",.16,880,180,360],["#7FE3B2",.12,160,1180,420],["#93CCFF",.12,120,240,300]].forEach(function(b){var rg=c.createRadialGradient(b[2],b[3],0,b[2],b[3],b[4]); rg.addColorStop(0,b[0]+"55"); rg.addColorStop(1,b[0]+"00"); c.fillStyle=rg; c.fillRect(0,0,W,H)});
  c.strokeStyle="rgba(255,255,255,.04)"; c.lineWidth=2; for(var y=120;y<H;y+=48){c.beginPath(); c.moveTo(0,y); c.lineTo(W,y); c.stroke()}
  var mx=ar?90:W-90-120; c.save(); c.translate(mx,90); c.fillStyle="#1E3160"; roundRect(c,0,0,120,120,32); c.fill(); c.strokeStyle="#FFE14D"; c.lineWidth=13; c.lineCap="round"; c.beginPath(); c.moveTo(26,86); c.quadraticCurveTo(60,76,96,84); c.stroke();
  c.strokeStyle="#fff"; c.lineWidth=12; c.lineJoin="round"; c.beginPath(); c.moveTo(36,30); c.lineTo(60,58); c.lineTo(84,30); c.moveTo(60,58); c.lineTo(60,90); c.stroke(); c.restore();
  c.fillStyle="#fff"; c.font="64px "+DISP; c.fillText(l.brand,X,150); c.fillStyle="rgba(255,255,255,.6)"; c.font="30px "+BODY; c.fillText(l.tagline,X,198);
  c.fillStyle="#fff"; c.font="54px "+DISP; c.fillText(l.cardTitle(name),X,330);
  var tiles=[[st.wk,l.cardMin],[st.ss,l.cardSess],[st.streak,l.cardStreak],[st.lvl,l.cardLvl]], tw=(W-180-36)/2;
  tiles.forEach(function(tl,i){
    var col=i%2, row=Math.floor(i/2), x=ar?W-90-tw-col*(tw+36):90+col*(tw+36), y=390+row*200;
    c.fillStyle="rgba(255,255,255,.07)"; roundRect(c,x,y,tw,170,28); c.fill();
    c.fillStyle=["#FFE14D","#7FE3B2","#FF9DBB","#93CCFF"][i]; c.font="600 76px "+MONO; c.textAlign=ar?"right":"left"; c.fillText(String(tl[0]),ar?x+tw-34:x+34,y+92);
    c.fillStyle="rgba(255,255,255,.75)"; c.font="30px "+BODY; c.fillText(tl[1],ar?x+tw-34:x+34,y+140);
  });
  var y0=820; c.fillStyle="#fff"; c.font="40px "+DISP; c.fillText(l.readyH,X,y0);
  st.subs.forEach(function(s,i){
    var y=y0+60+i*74, bw=W-180, col=["#FFE14D","#FF9DBB","#7FE3B2","#93CCFF"][i];
    c.fillStyle="rgba(255,255,255,.85)"; c.font="30px "+BODY; c.fillText(s.n.slice(0,26),X,y);
    c.fillStyle="rgba(255,255,255,.12)"; roundRect(c,90,y+14,bw,18,9); c.fill();
    c.fillStyle=col; var fw=Math.max(18,bw*s.r/100); roundRect(c,ar?90+bw-fw:90,y+14,fw,18,9); c.fill();
    c.textAlign=ar?"left":"right"; c.font="600 28px "+MONO; c.fillText(s.r+"%",ar?90:W-90,y); c.textAlign=ar?"right":"left";
  });
  if(!st.subs.length){c.fillStyle="rgba(255,255,255,.6)"; c.font="30px "+BODY; c.fillText(l.noPlan.slice(0,48),X,y0+70)}
  c.fillStyle="rgba(255,255,255,.55)"; c.font="28px "+BODY; c.fillText(l.quotes[(today().getDate())%l.quotes.length].slice(0,60),X,H-125);
  c.fillStyle="#FFE14D"; c.font="600 30px "+MONO; c.textAlign="center"; c.direction="ltr"; c.fillText("younis-ajaj.github.io/Younis-Ajaj",W/2,H-58);
  return cv;
}
function roundRect(c,x,y,w,h,r){c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath()}
$("shareBtn").onclick=function(){
  var l=L(), cv=drawCard(), prev=$("sharePrev");
  prev.hidden=false; prev.innerHTML=""; var img=new Image(); img.alt=l.cardAlt; img.src=cv.toDataURL("image/png"); prev.appendChild(img);
  cv.toBlob(function(blob){
    if(!blob) return;
    var file=null; try{file=new File([blob],"younis-progress.png",{type:"image/png"})}catch(e){}
    if(file&&navigator.canShare&&navigator.canShare({files:[file]})){navigator.share({files:[file],title:l.brand,text:l.cardShareText}).catch(function(){})}
    else saveFile("younis-progress.png",blob).catch(function(){});
  },"image/png");
  markActive(); save();
};
</script>
