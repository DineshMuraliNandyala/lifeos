// LifeOS Service Worker — v2 (Liquid Glass PWA)
// Stale-while-revalidate for app shell; network-only for API calls.
// Bumping CACHE_VERSION forces all clients to re-fetch after a deploy.

const CACHE_VERSION = "lifeos-v2";

const APP_SHELL = [
  "/",
  "/today",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache: LeetCode proxy, Google Fit API, OAuth flows
  if (
    url.hostname.includes("workers.dev") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("accounts.google.com") ||
    url.pathname.startsWith("/health/callback")
  ) {
    return; // fall through to network
  }

  // Next.js static chunks: cache-first (they have content hashes in the URL)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
          return res;
        })
      )
    );
    return;
  }

  // App shell & pages: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// ── Push notifications (Phase 2 hook) ─────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "LifeOS", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url ?? "/today" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const url = event.notification.data?.url ?? "/today";
      const existing = clients.find((c) => c.url.includes(url) && "focus" in c);
      return existing ? existing.focus() : self.clients.openWindow(url);
    })
  );
});
