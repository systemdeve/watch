// Minimal service worker — required by browsers for "Add to Home Screen" /
// install prompts to qualify. It doesn't cache or intercept anything.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // pass-through, no offline caching
