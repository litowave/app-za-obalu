import { formatEur } from "@obala/core";
import type { CrowdLevel, PublicBusiness, PublicOffer } from "@obala/db";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CrowdScale, PopularBars, quietestHour } from "@/components/Crowd";
import { BackIcon, PinIcon } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { directionsUrl } from "@/lib/geo";
import { supabase } from "@/lib/supabase";

// Gužva se mijenja tijekom dana, pa se stranica slaže pri svakom otvaranju.
export const dynamic = "force-dynamic";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

async function loadBusiness(slug: string): Promise<PublicBusiness | null> {
  const { data } = await supabase().rpc("business_public", { p_slug: slug });
  return (data as unknown as PublicBusiness | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await loadBusiness(slug);
  if (!b) return {};
  return {
    title: [b.name, b.place].filter(Boolean).join(", "),
    description: b.description ?? undefined,
  };
}

function formatDate(d: string, locale: string) {
  return new Date(`${d}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "numeric" });
}

/** Stranica objekta (T3): cjenik, gužva sada i po satima, kontakt i upute. */
export default async function BusinessPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const b = await loadBusiness(slug);

  if (!b) {
    return (
      <main className="page">
        <Link href="/karta" className="back">
          <BackIcon /> {t("business.back")}
        </Link>
        <p className="lead">{t("business.notFound")}</p>
      </main>
    );
  }

  const { data: popular } = await supabase().rpc("business_popular_times", {
    p_business_id: b.id,
  });
  const hours = (popular ?? []) as { hour: number; level: CrowdLevel }[];
  const nowHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", timeZone: "Europe/Zagreb" }).format(
      new Date(),
    ),
  );
  const quiet = quietestHour(hours, nowHour);

  const priceText = (cents: number | null, offer: PublicOffer) => {
    if (cents == null) return t("business.noPrice");
    const per =
      offer.price_unit === "hour" && offer.duration_min && offer.duration_min !== 60
        ? t("business.minutes", { n: offer.duration_min })
        : t(`business.unit.${offer.price_unit}`);
    return `${formatEur(cents)} / ${per}`;
  };

  return (
    <main className="page business">
      <Link
        href={{ pathname: "/karta", query: { lat: b.lat.toFixed(5), lng: b.lng.toFixed(5) } }}
        className="back"
      >
        <BackIcon /> {t("business.back")}
      </Link>

      {!b.listed ? <p className="notice">{t("business.notListed")}</p> : null}

      <h1>{b.name}</h1>
      {b.place || b.address ? (
        <p className="where">
          <PinIcon /> {[b.address, b.place].filter(Boolean).join(", ")}
        </p>
      ) : null}

      <section className="lito-card block">
        <CrowdScale level={b.crowd} label={t(`crowd.${b.crowd}`)} />
        {hours.length > 0 ? (
          <>
            <h2 className="small-h">{t("business.popularToday")}</h2>
            <PopularBars hours={hours} nowHour={nowHour} nowLabel={t("map.now")} />
            {quiet != null ? <p className="quiet">{t("map.fewest", { hour: quiet })}</p> : null}
          </>
        ) : null}
      </section>

      {b.description ? <p className="description">{b.description}</p> : null}

      <div className="actions">
        <a
          className="lito-btn"
          href={directionsUrl(b.lat, b.lng)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("map.directions")}
        </a>
        {b.phone ? (
          <a className="lito-btn ghost" href={`tel:${b.phone.replace(/\s/g, "")}`}>
            {t("business.call")}
          </a>
        ) : null}
      </div>

      {b.offers.length > 0 ? (
        <section className="block">
          <h2>{t("business.prices")}</h2>
          <ul className="prices">
            {b.offers.map((o) => (
              <li key={o.id} className="lito-card">
                <div className="price-row">
                  <strong>{o.name}</strong>
                  {o.slots.length === 0 ? <span>{priceText(o.price_cents, o)}</span> : null}
                </div>
                {o.description ? <p className="muted">{o.description}</p> : null}
                {o.slots.length > 0 ? (
                  <ul className="slots">
                    {o.slots.map((s) => (
                      <li key={s.name}>
                        <span>
                          {s.name}{" "}
                          <span className="muted">
                            {s.starts_at}–{s.ends_at ?? t("business.sunset")}
                          </span>
                        </span>
                        <span>
                          {s.price_cents != null ? formatEur(s.price_cents) : t("business.noPrice")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {o.reservable ? <span className="tag">{t("business.reservable")}</span> : null}
              </li>
            ))}
          </ul>
          <p className="muted">{t("business.payOnSite")}</p>
        </section>
      ) : null}

      {b.opening_hours || b.season_start ? (
        <section className="block">
          <h2>{t("business.hours")}</h2>
          {b.season_start && b.season_end ? (
            <p className="muted">
              {t("business.season", {
                from: formatDate(b.season_start, locale),
                to: formatDate(b.season_end, locale),
              })}
            </p>
          ) : null}
          {b.opening_hours ? (
            <dl className="hours">
              {DAYS.map((d) => (
                <div key={d}>
                  <dt>{t(`business.days.${d}`)}</dt>
                  <dd>
                    {b.opening_hours?.[d]?.length
                      ? b.opening_hours[d].map(([from, to]) => `${from}–${to}`).join(", ")
                      : t("business.closed")}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ) : null}

      {b.phone || b.website ? (
        <section className="block">
          <h2>{t("business.contact")}</h2>
          <p>
            {b.phone ? <a href={`tel:${b.phone.replace(/\s/g, "")}`}>{b.phone}</a> : null}
            {b.phone && b.website ? " · " : null}
            {b.website ? (
              <a
                href={/^https?:\/\//.test(b.website) ? b.website : `https://${b.website}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("business.website")}
              </a>
            ) : null}
          </p>
        </section>
      ) : null}
    </main>
  );
}
