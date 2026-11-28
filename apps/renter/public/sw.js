/*
 * Service worker za Lito bilježnicu.
 *
 * 1. Aplikacija se otvara i bez signala: stranica i JavaScript spremaju se na uređaj.
 *    Podaci (zapisi, red čekanja) ionako se spremaju u pregledniku (lib/storage.ts),
 *    pa bilježnica radi bez veze, a promjene se šalju kad se veza vrati.
 * 2. Push obavijest za svaku novu rezervaciju; dodir otvara Rezervacije.
 *
 * Zahtjevi prema Supabaseu (druga domena) ne prolaze kroz ovu predmemoriju.
 */

// Pri izradi (scripts/precache.mjs) CACHE dobije oznaku verzije, a BUILD popis JavaScript
// datoteka aplikacije, da se svaka kartica otvara bez signala i nakon prvog otvaranja.
const CACHE = "lito-dev";
const BUILD = [];
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/favicon.ico", ...BUILD];
// Fontovi i slike imaju otisak u imenu i ne mijenjaju se, pa ostaju i kad dođe nova verzija.
const ASSETS = "lito-assets";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(SHELL.map((u) => cache.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== ASSETS).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Datoteke s otiskom u imenu nikad se ne mijenjaju: JavaScript ide u predmemoriju verzije, ostalo u ASSETS. */
function staticCache(url) {
  if (url.pathname.startsWith("/_expo/static/")) return CACHE;
  if (url.pathname.startsWith("/assets/")) return ASSETS;
  return null;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Stranica: prvo mreža, bez veze spremljena (sve rute su ista stranica).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((r) => r || Response.error())),
    );
    return;
  }

  // JavaScript, fontovi, slike: iz predmemorije, a ako ih nema, s mreže pa spremi.
  const target = staticCache(url);
  if (target) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(target).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Manifest i ikone: odmah iz predmemorije, a u pozadini osvježi. Ostalo ide ravno na mrežu.
  if (!SHELL.includes(url.pathname) && !url.pathname.startsWith("/icons/")) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    }),
  );
});

self.addEventListener("push", (event) => {
  let msg = { title: "Lito", body: "", data: {} };
  try {
    msg = Object.assign(msg, event.data ? event.data.json() : {});
  } catch {
    msg.body = event.data ? event.data.text() : "";
  }
  const data = msg.data || {};
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.group_id || undefined,
      data,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || "/rezervacije", self.location.origin);
  if (data.business_id) target.searchParams.set("objekt", data.business_id);
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          client.postMessage({ type: "open", url: target.pathname + target.search });
          return client.focus();
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
