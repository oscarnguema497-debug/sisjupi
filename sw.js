/* SIS JUPI · service worker: la app funciona sin Internet y recibe archivos compartidos */
const VERSION = 'sisjupi-v1.0.0';
const ARCHIVOS = ['./','./index.html','./css/estilos.css','./js/util.js','./js/db.js','./js/auth.js','./js/sync.js','./js/ui.js','./js/main.js','./manifest.json','./iconos/icono-192.png','./iconos/icono-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION && k !== 'sisjupi-compartidos').map(k => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Archivos compartidos a la app (WhatsApp → "Compartir con SIS JUPI")
  if(e.request.method === 'POST' && url.pathname.endsWith('/compartir')){
    e.respondWith((async () => {
      const fd = await e.request.formData(); const c = await caches.open('sisjupi-compartidos');
      for(const f of fd.getAll('archivos')){ if(f && f.name) await c.put(new Request('./compartido/' + encodeURIComponent(f.name)), new Response(await f.text())); }
      return Response.redirect('./?compartido=1', 303);
    })());
    return;
  }
  if(e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Primero la red (para actualizar), si falla la copia guardada
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); return r; }).catch(() => caches.match(e.request, {ignoreSearch:true}).then(r => r || caches.match('./index.html'))));
});
