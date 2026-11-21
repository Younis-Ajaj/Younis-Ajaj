const CACHE="younis-f32f3c5dc3";
const ASSETS=["./", "./index.html", "./js/i18n.js", "./js/web.js", "./js/app.js", "./manifest.webmanifest", "./fonts/fonts.css", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==self.location.origin) return;
  e.respondWith(fetch(e.request).then(res=>{
    if(res.ok&&res.type==="basic"){const cp=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cp))}
    return res;
  }).catch(()=>caches.match(e.request).then(hit=>hit||caches.match("./index.html"))));
});
