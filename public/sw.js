const CACHE = "bible-trivia-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Scripture is fetched on display. Do not keep chapter HTML or API responses in this cache.
  if (url.pathname === "/bible" || url.pathname.startsWith("/bible/") || url.pathname.startsWith("/api/bible")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const cacheControl = response.headers.get("Cache-Control") ?? "";
        if (response.ok && !cacheControl.includes("no-store") && response.headers.get("X-Scripture-Cache") !== "no-store") {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const home = await caches.match("/");
        if (home) return home;
        return new Response("This page is not saved on this device yet.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        });
      }),
  );
});
