self.addEventListener('push', event => {
 let payload = {}
 try { payload = event.data ? event.data.json() : {} } catch {}
 const fresh = typeof payload.expiresAt === 'string' && Date.parse(payload.expiresAt) > Date.now()
 const title = fresh && typeof payload.title === 'string' ? payload.title.slice(0,80) : '冰島極光提醒'
 const body = fresh && typeof payload.body === 'string' ? payload.body.slice(0,300) : '收到的資訊可能已過期，請開啟行程查看最新條件。'
 event.waitUntil(self.registration.showNotification(title, { body, icon:'/logo.png', badge:'/favicon.png', tag:typeof payload.tag==='string'?payload.tag.slice(0,80):'aurora', data:{url:'/iceland?section=itinerary'}, renotify:false }))
})
self.addEventListener('notificationclick', event => {
 event.notification.close()
 const destination = new URL('/iceland?section=itinerary', self.location.origin).href
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows => {
  const existing = windows.find(window => new URL(window.url).origin === self.location.origin)
  if(existing) { await existing.navigate(destination); return existing.focus() }
  return self.clients.openWindow(destination)
 }))
})

const SHELL_CACHE = 'tripbook-shell-v1'
self.addEventListener('install',event=>{event.waitUntil(self.skipWaiting())})
self.addEventListener('activate',event=>{event.waitUntil(self.clients.claim())})
function shellAsset(path) { return path==='/' || /^\/assets\/[^?#]+\.(js|css|woff2?|png|jpe?g|svg|webp)$/.test(path) }
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_TRIP_SHELL')return
 const assets=event.data.assets
 if(!Array.isArray(assets)||!assets.every(path=>typeof path==='string'&&shellAsset(path))) {event.ports[0]?.postMessage({ok:false});return}
 event.waitUntil((async()=>{try{const cache=await caches.open(SHELL_CACHE);await cache.addAll(assets);event.ports[0]?.postMessage({ok:true})}catch{event.ports[0]?.postMessage({ok:false})}})())
})
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url)
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return
 const navigation=event.request.mode==='navigate'&&(url.pathname==='/iceland'||/^\/trips\/[^/]+\/journey$/.test(url.pathname))
 if(!navigation&&!shellAsset(url.pathname))return
 event.respondWith((async()=>{const cache=await caches.open(SHELL_CACHE);try{const response=await fetch(event.request);return response}catch(error){const cached=await cache.match(navigation?'/':url.pathname);if(cached)return cached;throw error}})())
})
