<script>
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
    var type=/\.json$/.test(name)?"application/json":/\.png$/.test(name)?"image/png":/\.txt$/.test(name)?"text/plain;charset=utf-8":/\.docx$/.test(name)?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"text/csv;charset=utf-8";
    var a=document.createElement("a"), url=URL.createObjectURL(data instanceof Blob?data:new Blob([data],{type:type}));
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
</script>
