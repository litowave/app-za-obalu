"use client";

import { formatEur } from "@obala/core";
import type { CrowdLevel, MapBusiness } from "@obala/db";
import type { Map as MlMap, Marker as MlMarker } from "maplibre-gl";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import logo from "@obala/theme/assets/lito-logo.png";
import { Link } from "@/i18n/navigation";
import {
  COAST_BOUNDS,
  COASTAL_PLACES,
  directionsUrl,
  distanceM,
  fold,
  formatDistance,
} from "@/lib/geo";
import { matchesOffer, OFFER_FILTERS, type OfferFilter } from "@/lib/offers";
import { supabase } from "@/lib/supabase";
import { CrowdScale, PopularBars, quietestHour } from "./Crowd";
import { CloseIcon, ListIcon, LocateIcon, MapIcon, SearchIcon } from "./icons";

/**
 * Podloga karte: OpenFreeMap (OpenStreetMap), bez ključa i bez praćenja posjetitelja.
 * Može se zamijeniti bilo kojim MapLibre stilom preko NEXT_PUBLIC_MAP_STYLE.
 */
const MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE ?? "https://tiles.openfreemap.org/styles/positron";

const SEA = "#d3eeea";
const NOT_BUSY: CrowdLevel[] = ["empty", "few", "moderate"];

type Point = { lat: number; lng: number };

interface Props {
  /** Smještaj s QR koda ili mjesto iz poveznice. */
  center: Point | null;
  initialOffer: OfferFilter | null;
}

export function MapView({ center, initialOffer }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MlMap | null>(null);
  const markers = useRef(new Map<string, MlMarker>());
  const meMarker = useRef<MlMarker | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const request = useRef(0);

  const [all, setAll] = useState<MapBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [offer, setOffer] = useState<OfferFilter | null>(initialOffer);
  const [notBusy, setNotBusy] = useState(false);
  const [reservable, setReservable] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<Point | null>(center);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hours, setHours] = useState<{ hour: number; level: CrowdLevel }[]>([]);

  const visible = useMemo(
    () =>
      all.filter(
        (b) =>
          (!offer || matchesOffer(b, offer)) &&
          (!notBusy || NOT_BUSY.includes(b.crowd)) &&
          (!reservable || b.reservations_enabled),
      ),
    [all, offer, notBusy, reservable],
  );

  const sorted = useMemo(() => {
    const from = origin ?? (map.current ? map.current.getCenter() : null);
    return visible
      .map((b) => ({ b, d: from ? distanceM(from, b) : null }))
      .sort((x, y) => (x.d ?? 0) - (y.d ?? 0) || x.b.name.localeCompare(y.b.name, locale));
  }, [visible, origin, locale]);

  const selected = visible.find((b) => b.id === selectedId) ?? null;

  // Objekti u vidljivom dijelu karte. Stariji odgovor ne smije pregaziti noviji.
  const load = useCallback(async () => {
    const m = map.current;
    if (!m) return;
    const bounds = m.getBounds();
    const id = ++request.current;
    setLoading(true);
    const { data, error } = await supabase().rpc("map_businesses", {
      p_south: bounds.getSouth(),
      p_west: bounds.getWest(),
      p_north: bounds.getNorth(),
      p_east: bounds.getEast(),
    });
    if (id !== request.current) return;
    setLoading(false);
    setFailed(Boolean(error));
    if (data) setAll(data);
  }, []);

  // Karta se stvara jednom.
  // biome-ignore lint/correctness/useExhaustiveDependencies: početno središte vrijedi samo pri otvaranju
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let resize: ResizeObserver | undefined;
    void import("maplibre-gl").then((ml) => {
      if (cancelled || !box.current) return;
      lib.current = ml;
      const m = new ml.Map({
        container: box.current,
        style: MAP_STYLE,
        ...(center
          ? { center: [center.lng, center.lat] as [number, number], zoom: 11.5 }
          : { bounds: COAST_BOUNDS, fitBoundsOptions: { padding: 24 } }),
        minZoom: 5,
        maxZoom: 18,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      map.current = m;
      m.on("load", () => {
        // More u boji Lita umjesto sive podloge.
        for (const layer of m.getStyle().layers ?? []) {
          if (layer.type === "fill" && /water|ocean|sea/i.test(layer.id)) {
            m.setPaintProperty(layer.id, "fill-color", SEA);
          }
        }
        void load();
      });
      m.on("resize", () => {
        clearTimeout(timer);
        timer = setTimeout(() => void load(), 250);
      });
      m.on("moveend", () => {
        clearTimeout(timer);
        timer = setTimeout(() => void load(), 250);
      });
      m.on("click", () => setSelectedId(null));
      if (center) placeMe(center, "home");
      // Karta mora pratiti veličinu okvira (okretanje mobitela, kasno učitan CSS).
      resize = new ResizeObserver(() => m.resize());
      resize.observe(box.current);
    });
    return () => {
      cancelled = true;
      resize?.disconnect();
      clearTimeout(timer);
      map.current?.remove();
      map.current = null;
    };
  }, []);

  function placeMe(p: Point, kind: "home" | "gps") {
    const ml = lib.current;
    const m = map.current;
    if (!ml || !m) return;
    meMarker.current?.remove();
    const el = document.createElement("div");
    el.className = `me me-${kind}`;
    meMarker.current = new ml.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(m);
  }

  // Oznake na karti prate filtre i odabir.
  useEffect(() => {
    const ml = lib.current;
    const m = map.current;
    if (!ml || !m) return;
    const keep = new Set(visible.map((b) => b.id));
    for (const [id, mk] of markers.current) {
      if (!keep.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    }
    for (const b of visible) {
      let mk = markers.current.get(b.id);
      if (!mk) {
        const el = document.createElement("button");
        el.type = "button";
        el.innerHTML =
          '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 41S2 26.5 2 16a14 14 0 0 1 28 0C30 26.5 16 41 16 41z"/><circle cx="16" cy="16" r="5.5"/></svg>';
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedId(b.id);
        });
        mk = new ml.Marker({ element: el, anchor: "bottom" }).setLngLat([b.lng, b.lat]).addTo(m);
        markers.current.set(b.id, mk);
      }
      const el = mk.getElement();
      el.className = `pin crowd-${b.crowd}${b.id === selectedId ? " selected" : ""}`;
      el.setAttribute("aria-label", `${b.name}, ${t(`crowd.${b.crowd}`)}`);
    }
  }, [visible, selectedId, t]);

  // "Kada je gužva" za odabrani objekt.
  useEffect(() => {
    setHours([]);
    if (!selectedId) return;
    let stale = false;
    void supabase()
      .rpc("business_popular_times", { p_business_id: selectedId })
      .then(({ data }) => {
        if (!stale && data) setHours(data);
      });
    return () => {
      stale = true;
    };
  }, [selectedId]);

  function flyTo(p: Point, zoom = 12.5) {
    map.current?.flyTo({ center: [p.lng, p.lat], zoom, essential: true });
  }

  function locate() {
    setNotice(null);
    if (!navigator.geolocation) {
      setNotice(t("map.locateFailed"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(p);
        placeMe(p, "gps");
        flyTo(p, 13);
      },
      () => setNotice(t("map.locateFailed")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  const suggestions = useMemo(() => {
    const q = fold(query.trim());
    if (q.length < 2) return [];
    return COASTAL_PLACES.filter((p) => fold(p.name).includes(q))
      .sort((a, b) => Number(!fold(a.name).startsWith(q)) - Number(!fold(b.name).startsWith(q)))
      .slice(0, 6);
  }, [query]);

  const nowHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Europe/Zagreb" }).format(
      new Date(),
    ),
  );
  const quiet = quietestHour(hours, nowHour);
  const selectedDistance = selected && origin ? distanceM(origin, selected) : null;

  return (
    <main className={`map-page view-${view}`}>
      <div ref={box} className="map" role="application" aria-label={t("meta.title")} />

      <div className="map-top">
        <div className="search lito-card">
          <Link href="/" aria-label={t("map.home")} className="search-logo">
            <Image src={logo} alt="Lito" height={20} />
          </Link>
          <input
            type="search"
            value={query}
            placeholder={t("map.search")}
            aria-label={t("map.search")}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              const first = suggestions[0];
              if (e.key === "Enter" && first) {
                flyTo(first);
                setQuery(first.name);
                setSearchOpen(false);
                setView("map");
              }
            }}
          />
          <SearchIcon />
          {searchOpen && query.trim().length >= 2 ? (
            <ul className="suggest lito-card">
              {suggestions.length === 0 ? <li className="none">{t("map.noPlace")}</li> : null}
              {suggestions.map((p) => (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => {
                      flyTo(p);
                      setQuery(p.name);
                      setSearchOpen(false);
                      setView("map");
                    }}
                  >
                    {p.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="chips" role="toolbar">
          <button
            type="button"
            className="chip"
            aria-pressed={!offer}
            onClick={() => setOffer(null)}
          >
            {t("offers.all")}
          </button>
          {OFFER_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={offer === f.key}
              onClick={() => setOffer(offer === f.key ? null : f.key)}
            >
              {t(`offers.${f.key}`)}
            </button>
          ))}
          <span className="chip-gap" />
          <button
            type="button"
            className="chip"
            aria-pressed={notBusy}
            onClick={() => setNotBusy(!notBusy)}
          >
            {t("map.notBusy")}
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={reservable}
            onClick={() => setReservable(!reservable)}
          >
            {t("map.reservable")}
          </button>
        </div>
      </div>

      <div className="map-tools">
        <button
          type="button"
          className="round lito-card"
          onClick={locate}
          aria-label={t("map.locate")}
        >
          <LocateIcon />
        </button>
        <button
          type="button"
          className="round lito-card"
          onClick={() => setView(view === "map" ? "list" : "map")}
          aria-label={view === "map" ? t("map.list") : t("map.map")}
        >
          {view === "map" ? <ListIcon /> : <MapIcon />}
        </button>
      </div>

      <p className="map-status" aria-live="polite">
        {failed
          ? t("map.error")
          : notice
            ? notice
            : loading && all.length === 0
              ? t("map.loading")
              : t("map.count", { count: visible.length })}
      </p>

      {view === "list" ? (
        <section className="list-view">
          {sorted.length === 0 && !loading ? <p className="empty">{t("map.empty")}</p> : null}
          <ul>
            {sorted.map(({ b, d }) => (
              <li key={b.id}>
                <Link href={`/o/${b.slug}`} className="row lito-card">
                  <div>
                    <strong>{b.name}</strong>
                    <span className="meta">
                      {[
                        b.offers.slice(0, 3).join(", "),
                        b.place,
                        d != null ? formatDistance(d, locale) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {b.reservations_enabled ? (
                      <span className="tag">{t("map.reservable")}</span>
                    ) : null}
                  </div>
                  <span className={`crowd crowd-${b.crowd}`}>{t(`crowd.${b.crowd}`)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view === "map" && selected ? (
        <section className="sheet lito-card" aria-label={selected.name}>
          <div className="sheet-head">
            <div>
              <h2>{selected.name}</h2>
              <p className="meta">
                {[
                  selected.offers.slice(0, 3).join(", ") || selected.place,
                  selectedDistance != null
                    ? formatDistance(selectedDistance, locale)
                    : selected.place,
                  selected.price_from_cents != null
                    ? t("map.from", { price: formatEur(selected.price_from_cents) })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <button
              type="button"
              className="close"
              onClick={() => setSelectedId(null)}
              aria-label={t("map.close")}
            >
              <CloseIcon />
            </button>
          </div>
          <CrowdScale level={selected.crowd} label={t(`crowd.${selected.crowd}`)} />
          <PopularBars hours={hours} nowHour={nowHour} nowLabel={t("map.now")} />
          {quiet != null ? <p className="quiet">{t("map.fewest", { hour: quiet })}</p> : null}
          {selected.reservations_enabled ? (
            <span className="tag">{t("map.reservable")}</span>
          ) : null}
          <div className="sheet-actions">
            <Link className="lito-btn" href={`/o/${selected.slug}`}>
              {t("map.more")}
            </Link>
            <a
              className="lito-btn ghost"
              href={directionsUrl(selected.lat, selected.lng)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("map.directions")}
            </a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
