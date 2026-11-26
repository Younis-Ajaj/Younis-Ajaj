<script>
/* ================= Translation of files and images ================= */
/* Text files are read in the browser (pdf.js, JSZip) and translated part by part.
   Scanned PDFs and photos have no text layer, so their pages go to Claude as images. */
var TR_LANGS=["ar","en","fr","tr","de","es","it","pt","ru","zh","ja","ko","hi","ur","fa","id","ms","nl"];
var TR_RTL={ar:1,ur:1,fa:1};
var TR_CHUNK=5000, TR_MAX_CHARS=200000, TR_MAX_PAGES=40;
var trSrc=null, trCtl=null, trOut="", trName="translation";

function langName(code){
  try{return new Intl.DisplayNames([state.lang==="en"?"en":"ar"],{type:"language"}).of(code)}catch(e){return code}
}
function renderTrLangs(){
  var sel=$("trTo"), cur=sel.value||state.trTo||(state.lang==="en"?"en":"ar");
  sel.innerHTML=TR_LANGS.map(function(c){return '<option value="'+c+'"'+(c===cur?" selected":"")+'>'+esc(langName(c))+'</option>'}).join("");
}
$("trTo").addEventListener("change",function(){state.trTo=this.value; save()});

/* Split text into parts of about TR_CHUNK characters at paragraph (then sentence) boundaries. */
function chunkText(text){
  var paras=text.split(/\n\s*\n/), parts=[], cur="";
  function flush(){if(cur.trim()) parts.push(cur.trim()); cur=""}
  paras.forEach(function(p){
    if(p.length>TR_CHUNK){
      flush();
      var bits=p.match(/[^.!?؟。\n]+[.!?؟。\n]*\s*/g)||[p], piece="";
      bits.forEach(function(b){if((piece+" "+b).length>TR_CHUNK&&piece){parts.push(piece.trim()); piece=""} piece+=(piece?" ":"")+b});
      if(piece.trim()) parts.push(piece.trim());
      return;
    }
    if((cur+"\n\n"+p).length>TR_CHUNK) flush();
    cur+=(cur?"\n\n":"")+p;
  });
  flush();
  return parts;
}

/* PDF: read the text layer page by page; if almost empty, render the pages as images. */
async function pdfDoc(buf){
  if(!window.pdfjsLib){await loadScript(lib("pdf.js/3.11.174/pdf.worker.min.js")); await loadScript(lib("pdf.js/3.11.174/pdf.min.js"))}
  window.pdfjsLib.GlobalWorkerOptions.workerSrc=lib("pdf.js/3.11.174/pdf.worker.min.js");
  return window.pdfjsLib.getDocument({data:buf,isEvalSupported:false}).promise;
}
async function pdfPagesAsImages(doc,max){
  var out=[];
  for(var i=1;i<=Math.min(doc.numPages,max);i++){
    var page=await doc.getPage(i), v1=page.getViewport({scale:1}), s=Math.min(3,2000/Math.max(v1.width,v1.height));
    var vp=page.getViewport({scale:s}), c=document.createElement("canvas"); c.width=Math.round(vp.width); c.height=Math.round(vp.height);
    var x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,c.width,c.height);
    await page.render({canvasContext:x,viewport:vp}).promise;
    out.push(fitImage(c,c.width,c.height,0).data);
    $("trInfo").textContent=L().trRendering(i,Math.min(doc.numPages,max));
  }
  return out;
}
async function loadTrFile(file){
  var l=L(), ext=(file.name.split(".").pop()||"").toLowerCase();
  trName=file.name.replace(/\.[^.]+$/,"")||"translation";
  if(file.size>25*1024*1024){toast(l.fileBig(file.name)); return}
  $("trInfo").textContent=l.trReading(file.name);
  try{
    if(/^image\//.test(file.type)){
      var url=URL.createObjectURL(file), im=await loadImg(url);
      trSrc={kind:"image",images:[fitImage(im,im.naturalWidth,im.naturalHeight,0).data]}; URL.revokeObjectURL(url);
      $("trInfo").textContent=l.trInfoImg; return;
    }
    if(ext==="pdf"){
      var doc=await pdfDoc(await file.arrayBuffer()), pages=[];
      for(var i=1;i<=doc.numPages;i++){var tc=await (await doc.getPage(i)).getTextContent(); pages.push(tc.items.map(function(it){return it.str+(it.hasEOL?"\n":" ")}).join(""))}
      var chars=pages.join("").replace(/\s/g,"").length;
      if(chars<30*doc.numPages){
        if(doc.numPages>TR_MAX_PAGES) toast(l.trTooMany);
        trSrc={kind:"pages",images:await pdfPagesAsImages(doc,TR_MAX_PAGES)};
        $("trInfo").textContent=l.trScanned+" "+l.trInfoPages(trSrc.images.length); return;
      }
      setTrText(pages.join("\n\n")); return;
    }
    setTrText(await readFile(file));
  }catch(e){trSrc=null; $("trInfo").textContent=""; toast(l.readFail(file.name))}
}
function setTrText(text){
  var l=L(); text=String(text||"").replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  if(text.length>TR_MAX_CHARS){toast(l.trTooBig); text=text.slice(0,TR_MAX_CHARS)}
  trSrc={kind:"text",text:text};
  $("trText").value=text.length<=20000?text:text.slice(0,20000)+"\n…";
  $("trInfo").textContent=l.trInfoText(text.length,chunkText(text).length);
}
$("trFile").addEventListener("change",function(){var f=this.files&&this.files[0]; if(f) loadTrFile(f)});
$("trText").addEventListener("input",function(){
  var t=this.value; trName="translation";
  trSrc=t.trim()?{kind:"text",text:t.slice(0,TR_MAX_CHARS)}:null;
  $("trInfo").textContent=trSrc?L().trInfoText(trSrc.text.length,chunkText(trSrc.text).length):"";
});

function trSystem(to){
  var name=new Intl.DisplayNames(["en"],{type:"language"}).of(to);
  return "You are a professional academic translator helping university and school students. Translate the content the student sends into "+name+".\n"+
  "Rules:\n- Translate everything faithfully and completely: no summarising, no omissions, no notes or comments of your own.\n"+
  "- Keep the structure in Markdown: headings, numbered and bulleted lists, tables, paragraphs.\n"+
  "- Keep numbers, formulas, code, URLs, references and people's names unchanged.\n"+
  "- Use the correct, standard terminology of the subject.\n"+
  ($("trTerms").checked&&to!=="en"?"- The first time a technical term appears in this part, add the original English term in parentheses after its translation.\n":"")+
  ($("trSimple").checked?"- Use clear, simple wording that a first-year student understands, without changing the meaning.\n":"")+
  "- If the content is already in "+name+", return it unchanged.\nOutput only the translation.";
}
var trFrame=0;
function showTr(text,busy){
  if(trFrame) cancelAnimationFrame(trFrame);
  trFrame=requestAnimationFrame(function(){trFrame=0; var o=$("trOut"); o.innerHTML=renderMd(text); o.setAttribute("aria-busy",busy?"true":"false")});
}
function trProgress(i,n,label){var p=$("trProg"); p.hidden=false; p.firstElementChild.style.width=Math.round(i/n*100)+"%"; $("trStatus").textContent=label}
$("trGo").onclick=async function(){
  var l=L(), to=$("trTo").value;
  if(!sample){$("lensKey").hidden=false; toast(l.lensNeedKey); return}
  if(!trSrc){toast(l.trEmpty); return}
  var jobs=trSrc.kind==="text"?chunkText(trSrc.text).map(function(t){return {text:t}}):trSrc.images.map(function(d){return {img:d}});
  if(!jobs.length){toast(l.trEmpty); return}
  trCtl=new AbortController(); trOut=""; var btn=this, sys=trSystem(to), stopped=false;
  btn.disabled=true; $("trStop").hidden=false; $("trPanel").hidden=false;
  $("trOut").setAttribute("dir",TR_RTL[to]?"rtl":"ltr");
  for(var i=0;i<jobs.length;i++){
    var n=jobs.length, label=trSrc.kind==="text"?l.trPart(i+1,n):l.trPage(i+1,n), head=trSrc.kind==="pages"&&n>1?"### "+l.trPageH(i+1)+"\n\n":"";
    trProgress(i,n,label);
    var content;
    if(jobs[i].img){
      content=[{type:"image",source:{type:"base64",media_type:"image/jpeg",data:jobs[i].img}},
        {type:"text",text:"Translate all the text visible in this "+(trSrc.kind==="pages"?"page ("+(i+1)+" of "+n+")":"image")+". Keep its layout as Markdown (headings, lists, tables). If there is no text, reply with —."}];
    }else{
      var prev=trOut.slice(-600);
      content=(n>1?"This is part "+(i+1)+" of "+n+" of one document."+(prev?"\nThe end of the previous part, already translated (for consistent terms only, do not repeat it):\n<previous>\n"+prev+"\n</previous>\n":"\n"):"")+
        "Translate:\n<document_part>\n"+jobs[i].text+"\n</document_part>";
    }
    var before=trOut+(trOut?"\n\n":"")+head;
    try{
      var r=await sample([{role:"user",content:content}],{system:sys,effort:"medium",signal:trCtl.signal,onText:function(x){showTr(before+x.text,true)}});
      trOut=before+r.text.trim();
      if(r.truncated) trOut+="\n\n[…]";
    }catch(e){
      if(e&&e.text) trOut=before+e.text;
      stopped=true;
      $("trStatus").textContent=e&&e.code==="cancelled"?l.trStopped:errCopy(e)+" — "+l.trStopped;
      break;
    }
  }
  showTr(trOut,false);
  if(!stopped){trProgress(1,1,l.trDone)}
  btn.disabled=false; $("trStop").hidden=true;
};
$("trStop").onclick=function(){if(trCtl) trCtl.abort()};
$("trCopy").onclick=function(){copyText(trOut)};
$("trTxt").onclick=function(){if(trOut) saveFile(trName+"-"+$("trTo").value+".txt",trOut).catch(function(){})};
$("trDocx").onclick=function(){
  if(!trOut) return;
  docxFromMarkdown(trOut,!!TR_RTL[$("trTo").value]).then(function(blob){return saveFile(trName+"-"+$("trTo").value+".docx",blob)}).catch(function(){toast(L().dlFail)});
};

/* A minimal Word document (Office Open XML) built with JSZip: headings, bold, lists, RTL. */
function xmlEsc(s){return String(s).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function docxPara(line,rtl){
  var m, size=0, prefix="";
  if((m=line.match(/^(#{1,4})\s+(.*)$/))){size=[0,36,30,26,24][m[1].length]; line=m[2]}
  else if((m=line.match(/^\s*[-*•]\s+(.*)$/))){prefix="• "; line=m[1]}
  else if(/^\s*\|?\s*:?-{2,}/.test(line)&&/-\s*\|/.test(line)) return "";
  else if(/^\s*\|.*\|\s*$/.test(line)){line=line.trim().replace(/^\||\|$/g,"").split("|").map(function(c){return c.trim()}).join("   |   ")}
  var runs=(prefix+line).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(function(part){
    var bold=/^\*\*[^*]+\*\*$/.test(part)||size>0, t=part.replace(/^\*\*|\*\*$/g,"").replace(/`/g,"");
    return '<w:r><w:rPr>'+(bold?'<w:b/><w:bCs/>':'')+(size?'<w:sz w:val="'+size+'"/><w:szCs w:val="'+size+'"/>':'')+(rtl?'<w:rtl/>':'')+'</w:rPr><w:t xml:space="preserve">'+xmlEsc(t)+'</w:t></w:r>';
  }).join("");
  return '<w:p><w:pPr>'+(rtl?'<w:bidi/><w:jc w:val="right"/>':'')+'<w:spacing w:after="120"/></w:pPr>'+runs+'</w:p>';
}
async function docxFromMarkdown(md,rtl){
  if(!window.JSZip) await loadScript(lib("jszip/3.10.1/jszip.min.js"));
  var zip=new window.JSZip();
  zip.file("[Content_Types].xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file("_rels/.rels",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  var body=md.split("\n").filter(function(l){return !/^```/.test(l)}).map(function(l){return l.trim()?docxPara(l,rtl):'<w:p/>'}).join("");
  zip.file("word/document.xml",'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>');
  return zip.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
</script>
