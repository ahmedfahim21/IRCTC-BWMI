/*
 * Offline support. This is a product used in tunnels and on 2G, so the ticket
 * and the schedules you already looked at have to survive losing the network.
 *
 * Static assets: cache first — they're content-hashed, so they never go stale.
 * Journey data: network first, falling back to the last good response, with the
 *   ticket endpoints cached deliberately so a PNR renders with the radio off.
 * Navigations: network first, falling back to cache, then to a plain offline note.
 */
const VERSION = "irctc-v1";
const STATIC_CACHE = `${VERSION}-static`;
const DATA_CACHE = `${VERSION}-data`;
const PAGE_CACHE = `${VERSION}-pages`;

/** Endpoints worth keeping so a journey works without a network. */
const OFFLINE_DATA = [/^\/api\/pnr\//, /^\/api\/bookings$/, /^\/api\/trains\/[^/]+$/, /^\/api\/stations/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(["/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Content-hashed build output never changes under a given URL.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    const worthKeeping = OFFLINE_DATA.some((pattern) => pattern.test(url.pathname));
    event.respondWith(networkFirst(request, DATA_CACHE, worthKeeping));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationWithFallback(request));
  }
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, store) {
  try {
    const response = await fetch(request);
    if (response.ok && store) (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      // Tell the app this is stale rather than passing it off as live.
      const headers = new Headers(cached.headers);
      headers.set("x-irctc-offline", "1");
      return new Response(await cached.arrayBuffer(), { status: cached.status, statusText: cached.statusText, headers });
    }
    throw error;
  }
}

async function navigationWithFallback(request) {
  try {
    const response = await fetch(request);
    // Keep the exact page so reloading it offline returns that page — falling
    // back to the home page would silently show the wrong thing.
    if (response.ok) (await caches.open(PAGE_CACHE)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached = (await caches.match(request)) ?? (await caches.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset=utf-8><title>Offline</title><body style=\"font-family:system-ui;padding:3rem;text-align:center\"><h1 style=\"font-weight:450\">You're offline</h1><p>Pages you've already opened, and any ticket you've viewed, still work.</p>",
      { headers: { "content-type": "text/html" } }
    );
  }
}
