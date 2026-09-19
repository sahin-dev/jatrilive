const CACHE_NAME = "jatrilive-shell-v1";
const SHELL = ["/offline.html", "/icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (SHELL.some((path) => event.request.url.endsWith(path))) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "JatriLive", body: "You have a new update." };
  event.waitUntil(self.registration.showNotification(data.title || "JatriLive", {
    body: data.body || "",
    icon: "/icon.svg",
    badge: "/icon.svg",
    data: { url: data.url || "/dashboard" },
    tag: data.url || "jatrilive-update",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url === target);
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});
