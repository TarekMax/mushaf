// عامل الخدمة: يجعل التطبيق يعمل بدون إنترنت بعد أول فتح
const VERSION = 'v32';
const SHELL = `shell-${VERSION}`;
const DATA = 'data-v1'; // نص المصحف والتفسير والترجمات والخطوط (لا تتغير)
const SHELL_FILES = ['./', './index.html', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon.png'];
const DATA_HOSTS = ['cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com', 'api.alquran.cloud', 'static-cdn.tarteel.ai', 'quranpedia.net', 'api.quranpedia.net', 'api.quran.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // البيانات الثابتة: من الذاكرة أولًا، ثم الشبكة وحفظها
  if (DATA_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open(DATA).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // ملفات التطبيق: الشبكة أولًا (لوصول التحديثات)، ثم الذاكرة بدون إنترنت
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
  }
});

// الضغط على إشعار الأذان يفتح التطبيق على صفحة الصلاة
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./#prayer');
    })
  );
});
