// sw.js — minimal service worker: caches the app shell so it opens instantly
// and works offline for viewing. Network is always used for submitting expenses.
const CACHE = "sharewise-v9";
const SHELL = ["/", "/config.js", "/manifest.webmanifest",
               "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // never cache the Apps Script endpoint or Google sign-in
  if (url.includes("script.google.com") || url.includes("accounts.google.com") || url.includes("cdnjs.cloudflare.com") || url.includes("googleapis.com")) {
    return; // let it hit the network
  }
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=>caches.match("/")))
  );
});
