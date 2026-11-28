import type { NearbyBusiness } from "@obala/db";
import logo from "@obala/theme/assets/lito-logo.png";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { OFFER_FILTERS } from "@/lib/offers";
import { supabase } from "@/lib/supabase";
import { OfferIcon, PinIcon } from "./icons";

const SHORTCUTS = ["cabana", "loungers", "jet_ski", "sup_kayak", "pedalo", "aquapark"] as const;
const QUIET_ORDER = ["empty", "few", "moderate", "busy", "full"];

interface Props {
  /** Naziv smještaja ili mjesta s QR koda ("Apartmani Marija, Zaborić"). */
  placeName?: string | null;
  center?: { lat: number; lng: number } | null;
  /** Putanja ove stranice bez jezika, za prebacivanje jezika (npr. "/q/ab12"). */
  path: string;
}

/** Početni ekran (T1): pozdrav, prečaci po vrsti ponude i gumb za kartu. */
export async function Welcome({ placeName, center, path }: Props) {
  const t = await getTranslations();
  const locale = await getLocale();
  const at = center ? { lat: center.lat.toFixed(5), lng: center.lng.toFixed(5) } : {};

  let nearby: NearbyBusiness[] = [];
  if (center) {
    const { data } = await supabase().rpc("nearby_businesses", {
      p_lat: center.lat,
      p_lng: center.lng,
      p_radius_m: 15000,
    });
    nearby = data ?? [];
  }
  const quietest = nearby
    .filter((b) => b.crowd !== "no_data")
    .sort((a, b) => QUIET_ORDER.indexOf(a.crowd) - QUIET_ORDER.indexOf(b.crowd))[0];

  return (
    <main className="welcome">
      <header className="welcome-head">
        <Image src={logo} alt="Lito" height={34} priority className="logo" />
        <nav className="langs" aria-label={t("home.language")}>
          {routing.locales.map((l) => (
            <Link
              key={l}
              href={path}
              locale={l}
              className={l === locale ? "on" : undefined}
              aria-current={l === locale ? "true" : undefined}
            >
              {l.toUpperCase()}
            </Link>
          ))}
        </nav>
      </header>

      {placeName ? (
        <p className="where">
          <PinIcon /> {t("home.nearby", { name: placeName })}
        </p>
      ) : null}
      <h1>{t("home.hello")}</h1>
      <p className="lead">{t("home.lead")}</p>

      {center && nearby.length > 0 ? (
        <div className="stats">
          <div className="lito-card">
            <b>{nearby.length}</b>
            <span>{t("home.around", { count: nearby.length })}</span>
          </div>
          {quietest ? (
            <Link className="lito-card" href={`/o/${quietest.slug}`}>
              <span>{t("home.quietest")}</span>
              <b className="small">{quietest.name}</b>
            </Link>
          ) : null}
        </div>
      ) : null}

      <h2>{t("home.lookingFor")}</h2>
      <div className="tiles">
        {SHORTCUTS.map((key) => {
          const f = OFFER_FILTERS.find((x) => x.key === key);
          if (!f) return null;
          return (
            <Link
              key={key}
              className="tile lito-btn"
              href={{ pathname: "/karta", query: { ...at, vrsta: key } }}
            >
              <OfferIcon offer={key} />
              <span>{t(`offers.${key}`)}</span>
            </Link>
          );
        })}
      </div>

      <Link className="lito-btn open-map" href={{ pathname: "/karta", query: at }}>
        {t("home.openMap")}
      </Link>
      <p className="footnote">{t("home.footnote")}</p>
    </main>
  );
}
