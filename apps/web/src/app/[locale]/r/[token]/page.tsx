import type { ReservationByToken } from "@obala/db";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CancelReservation } from "@/components/CancelReservation";
import { PinIcon } from "@/components/icons";
import { directionsUrl } from "@/lib/geo";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Poveznica s tajnim kodom ne smije u tražilice ni u Referer drugih stranica.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function icsDate(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Datoteka za kalendar: od 9 h do roka dolaska (ili cijeli dan), s adresom objekta. */
function calendarHref(r: ReservationByToken, title: string) {
  const start = r.hold_until
    ? new Date(new Date(r.hold_until).getTime() - 60 * 60 * 1000).toISOString()
    : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lito//plaza//HR",
    "BEGIN:VEVENT",
    `UID:${r.service_date}-${r.unit_labels.join("")}@litowave.hr`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    start && r.hold_until
      ? `DTSTART:${icsDate(start)}\nDTEND:${icsDate(r.hold_until)}`
      : `DTSTART;VALUE=DATE:${r.service_date.replace(/-/g, "")}`,
    `SUMMARY:${title}`,
    `LOCATION:${[r.business_address, r.business_place].filter(Boolean).join(", ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}

/** Moja rezervacija (T5): status, mjesta, rok, otkazivanje. */
export default async function MyReservation({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const { data } = await supabase().rpc("reservation_by_token", { p_token: token });
  const r = data?.[0];

  if (!r) {
    return (
      <main className="page">
        <h1>{t("my.title")}</h1>
        <p className="lead">{t("my.notFound")}</p>
      </main>
    );
  }

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Zagreb",
    });
  const day = new Date(`${r.service_date}T12:00:00`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const active = r.status === "reserved";
  const what = [r.item_type_name, r.slot_name].filter(Boolean).join(", ");

  return (
    <main className="page reservation">
      <h1>{t("my.title")}</h1>
      <p className={`status status-${r.status}`}>{t(`my.status.${r.status}`)}</p>

      <section className="lito-card block summary">
        <h2>{r.business_name}</h2>
        {r.business_place || r.business_address ? (
          <p className="where">
            <PinIcon /> {[r.business_address, r.business_place].filter(Boolean).join(", ")}
          </p>
        ) : null}
        <dl>
          <div>
            <dt>{t("my.date")}</dt>
            <dd>{day}</dd>
          </div>
          <div>
            <dt>{what}</dt>
            <dd className="labels">{r.unit_labels.join(", ")}</dd>
          </div>
        </dl>
        {active && r.hold_until ? (
          <p className="arrive">{t("my.arriveBy", { time: time(r.hold_until) })}</p>
        ) : null}
        {active ? <p className="muted">{t("business.payOnSite")}</p> : null}
      </section>

      <div className="actions">
        <a
          className="lito-btn"
          href={directionsUrl(r.lat, r.lng)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("map.directions")}
        </a>
        {r.business_phone ? (
          <a className="lito-btn ghost" href={`tel:${r.business_phone.replace(/\s/g, "")}`}>
            {t("business.call")}
          </a>
        ) : null}
        {active ? (
          <a
            className="lito-btn ghost"
            href={calendarHref(r, `${r.business_name}: ${what} ${r.unit_labels.join(", ")}`)}
            download="lito-rezervacija.ics"
          >
            {t("my.calendar")}
          </a>
        ) : null}
      </div>

      {active && r.can_cancel ? <CancelReservation token={token} /> : null}
      {active ? <p className="muted save">{t("my.save")}</p> : null}
    </main>
  );
}
