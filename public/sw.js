// Install-only worker so Android can offer Add to Home Screen.
// There is no fetch handler. Auth, API routes, Supabase, and pages always
// use the network. Nothing here is cached, and stale progress is never served.
// Activate deletes caches left by older workers.

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // A blocked cache must not keep this worker from taking control.
      }
      await self.clients.claim();
    })(),
  );
});
