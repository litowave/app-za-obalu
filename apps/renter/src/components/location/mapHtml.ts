import { color } from "@obala/theme";

export interface PickedLocation {
  lat: number;
  lng: number;
  /** Razina približavanja karte; pribadača je dovoljno točna tek od oko 15. */
  zoom: number;
}

export interface LocationPickerProps {
  /** Spremljena lokacija objekta ili null (karta tada pokazuje cijelu obalu). */
  initial: { lat: number; lng: number } | null;
  onChange: (p: PickedLocation) => void;
  height?: number;
}

/** Ista verzija kao u turističkoj aplikaciji (apps/web). */
const MAPLIBRE = "https://unpkg.com/maplibre-gl@5.24.1/dist";
const STYLE = "https://tiles.openfreemap.org/styles/liberty";

/**
 * Karta za odabir lokacije, kao samostalna HTML stranica. Na mobitelu se prikazuje u WebViewu,
 * na webu u iframeu, pa isti kod radi u Expo Go i u pregledniku bez ključeva za karte.
 * Pribadača stoji u sredini, a korisnik pomiče kartu ispod nje.
 */
export function mapHtml(initial: { lat: number; lng: number } | null): string {
  const start = initial
    ? `{ center: [${initial.lng}, ${initial.lat}], zoom: 16 }`
    : "{ bounds: [[13.3, 42.3], [19.5, 45.7]], fitBoundsOptions: { padding: 10 } }";
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<script src="${MAPLIBRE}/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: ${color.seaLight}; }
  .pin { position: absolute; left: 50%; top: 50%; width: 34px; height: 44px;
    transform: translate(-50%, -100%); pointer-events: none;
    filter: drop-shadow(0 3px 4px rgba(31, 79, 75, 0.35)); }
  .dot { position: absolute; left: 50%; top: 50%; width: 8px; height: 8px; border-radius: 50%;
    transform: translate(-50%, -50%); background: rgba(31, 79, 75, 0.35); pointer-events: none; }
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style>
</head><body>
<div id="map"></div>
<div class="dot"></div>
<svg class="pin" viewBox="0 0 32 42"><path d="M16 41S2 26.5 2 16a14 14 0 0 1 28 0C30 26.5 16 41 16 41z" fill="${color.buttonText}" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="16" r="5.5" fill="#fff"/></svg>
<script>
  function send(o) {
    var s = JSON.stringify(o);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent !== window) window.parent.postMessage({ lito: o }, "*");
  }
  try {
    var map = new maplibregl.Map(Object.assign({
      container: "map", style: "${STYLE}", attributionControl: { compact: true },
      dragRotate: false, pitchWithRotate: false
    }, ${start}));
    map.touchZoomRotate.disableRotation();
    function moved() {
      var c = map.getCenter();
      send({ type: "move", lat: c.lat, lng: c.lng, zoom: map.getZoom() });
    }
    map.on("moveend", moved);
    var ready = false;
    map.on("load", function () { ready = true; send({ type: "ready" }); moved(); });
    // Pojedina pločica koja se ne učita nije greška; javljamo samo ako se karta uopće ne otvori.
    map.on("error", function (e) {
      if (!ready) send({ type: "error", message: String(e && e.error && e.error.message) });
    });
    window.lito = {
      setCenter: function (lat, lng, zoom) { map.jumpTo({ center: [lng, lat], zoom: zoom || 17 }); }
    };
    window.addEventListener("message", function (e) {
      var d = e.data && e.data.lito;
      if (d && d.type === "center") window.lito.setCenter(d.lat, d.lng, d.zoom);
    });
  } catch (e) {
    send({ type: "error", message: String(e) });
  }
</script>
</body></html>`;
}
