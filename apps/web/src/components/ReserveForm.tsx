"use client";

import { addDays, formatEur, zagrebToday } from "@obala/core";
import type { PublicBusiness, PublicOffer } from "@obala/db";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase";

interface Availability {
  state: "open" | "not_yet_open" | "closed" | "unavailable";
  opens_at: string | null;
  hold_until: string | null;
}

interface UnitState {
  unit_id: string;
  label: string;
  is_free: boolean;
}

const DAYS_AHEAD = 7;

/** Greške iz baze su na hrvatskom; turist ih dobiva na svom jeziku. */
function errorKey(message: string | undefined): string {
  const m = message ?? "";
  if (/zauzeto/i.test(m)) return "taken";
  if (/već imate rezervaciju/i.test(m)) return "samePhone";
  if (/nije moguća/i.test(m)) return "blocked";
  if (/zatvorene|otvaraju se/i.test(m)) return "closed";
  if (/dovoljno slobodnih/i.test(m)) return "full";
  if (/ime i broj/i.test(m)) return "input";
  return "generic";
}

function zagrebTime(iso: string, locale: string) {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zagreb",
  });
}

/** Rezervacija (T4): vrsta, datum, dio dana, mjesto ili količina, ime, broj i potvrda roka. */
export function ReserveForm({ business }: { business: PublicBusiness }) {
  const t = useTranslations("reserve");
  const locale = useLocale();
  const router = useRouter();
  const offers = useMemo(() => business.offers.filter((o) => o.reservable), [business]);

  const today = zagrebToday();
  const dates = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today],
  );

  const [offerId, setOfferId] = useState(offers[0]?.id ?? "");
  const offer: PublicOffer | undefined = offers.find((o) => o.id === offerId);
  const slots = offer?.slots.filter((s) => s.reservable) ?? [];
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [units, setUnits] = useState<UnitState[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vrsta s dijelovima dana mora imati odabran dio dana.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ponovno samo kad se promijeni vrsta
  useEffect(() => {
    setSlotId(slots[0]?.id ?? null);
    setPicked([]);
    setQuantity(1);
  }, [offerId]);

  useEffect(() => {
    if (!offer) return;
    let stale = false;
    setLoading(true);
    setPicked([]);
    setError(null);
    const db = supabase();
    void Promise.all([
      db.rpc("reservation_availability", { p_item_type_id: offer.id, p_date: date }),
      db.rpc("available_units", {
        p_item_type_id: offer.id,
        p_date: date,
        ...(slotId ? { p_slot_id: slotId } : {}),
      }),
    ]).then(([a, u]) => {
      if (stale) return;
      setLoading(false);
      setAvail(
        (a.data?.[0] as Availability | undefined) ?? {
          state: "unavailable",
          opens_at: null,
          hold_until: null,
        },
      );
      setUnits((u.data as UnitState[] | null) ?? []);
    });
    return () => {
      stale = true;
    };
  }, [offer, date, slotId]);

  if (!offer) return <p className="lead">{t("unavailable")}</p>;

  const freeCount = units.filter((u) => u.is_free).length;
  const guestChoice = offer.assignment_mode === "guest_choice";
  const count = guestChoice ? picked.length : quantity;
  const slot = slots.find((s) => s.id === slotId);
  const unitPrice = slot ? slot.price_cents : offer.price_cents;
  // Rok dolaska prošao je ako je danas i vrijeme je iza roka: baza takvu rezervaciju odbija.
  const holdPassed = avail?.hold_until ? new Date(avail.hold_until) <= new Date() : false;
  const open = avail?.state === "open" && !holdPassed;
  const canSend =
    open &&
    count > 0 &&
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 8 &&
    accepted;

  async function submit() {
    if (!offer || !canSend) return;
    setSending(true);
    setError(null);
    const { data, error: e } = await supabase().rpc("request_reservation", {
      p_item_type_id: offer.id,
      p_date: date,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_accepted_terms: accepted,
      ...(guestChoice ? { p_unit_ids: picked } : { p_quantity: quantity }),
      ...(slotId ? { p_slot_id: slotId } : {}),
    });
    const token = data?.[0]?.public_token;
    if (e || !token) {
      setSending(false);
      setError(t(`err.${errorKey(e?.message)}`));
      return;
    }
    router.push(`/r/${token}`);
  }

  const dayLabel = (d: string, i: number) =>
    i === 0
      ? t("today")
      : i === 1
        ? t("tomorrow")
        : new Date(`${d}T12:00:00`).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "numeric",
          });

  return (
    <form
      className="reserve"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {offers.length > 1 ? (
        <fieldset>
          <legend>{t("what")}</legend>
          <div className="choice">
            {offers.map((o) => (
              <button
                key={o.id}
                type="button"
                className="chip"
                aria-pressed={o.id === offerId}
                onClick={() => setOfferId(o.id)}
              >
                {o.name}
              </button>
            ))}
          </div>
        </fieldset>
      ) : (
        <h2>{offer.name}</h2>
      )}

      <fieldset>
        <legend>{t("date")}</legend>
        <div className="choice scroll">
          {dates.map((d, i) => (
            <button
              key={d}
              type="button"
              className="chip"
              aria-pressed={d === date}
              onClick={() => setDate(d)}
            >
              {dayLabel(d, i)}
            </button>
          ))}
        </div>
      </fieldset>

      {slots.length > 0 ? (
        <fieldset>
          <legend>{t("slot")}</legend>
          <div className="choice">
            {slots.map((s) => (
              <button
                key={s.id}
                type="button"
                className="chip"
                aria-pressed={s.id === slotId}
                onClick={() => setSlotId(s.id)}
              >
                {s.name}
                {s.price_cents != null ? ` · ${formatEur(s.price_cents)}` : ""}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {loading ? <p className="muted">{t("loading")}</p> : null}

      {!loading && avail && !open ? (
        <p className="notice">
          {avail.state === "not_yet_open" && avail.opens_at
            ? t("notYetOpen", {
                when: new Date(avail.opens_at).toLocaleString(locale, {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Europe/Zagreb",
                }),
              })
            : avail.state === "unavailable"
              ? t("unavailable")
              : t("closed")}
        </p>
      ) : null}

      {!loading && open && freeCount === 0 ? <p className="notice">{t("none")}</p> : null}

      {!loading && open && freeCount > 0 ? (
        guestChoice ? (
          <fieldset>
            <legend>{t("place")}</legend>
            <p className="muted">{t("placeHint")}</p>
            <div className="units">
              {units.map((u) => {
                const on = picked.includes(u.unit_id);
                return (
                  <button
                    key={u.unit_id}
                    type="button"
                    disabled={!u.is_free}
                    aria-pressed={on}
                    className={`unit${on ? " on" : ""}`}
                    onClick={() =>
                      setPicked(
                        on
                          ? picked.filter((x) => x !== u.unit_id)
                          : picked.length < 10
                            ? [...picked, u.unit_id]
                            : picked,
                      )
                    }
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <fieldset>
            <legend>{t("quantity")}</legend>
            <div className="stepper">
              <button
                type="button"
                className="round lito-card"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="−"
              >
                −
              </button>
              <b>{quantity}</b>
              <button
                type="button"
                className="round lito-card"
                onClick={() => setQuantity(Math.min(freeCount, 10, quantity + 1))}
                aria-label="+"
              >
                +
              </button>
              <span className="muted">{t("free", { count: freeCount })}</span>
            </div>
          </fieldset>
        )
      ) : null}

      {open && freeCount > 0 ? (
        <>
          <label className="field">
            <span>{t("name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
          <label className="field">
            <span>{t("phone")}</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              autoComplete="tel"
              placeholder="+385 91 234 5678"
              required
            />
            <small className="muted">{t("phoneHint")}</small>
          </label>

          {unitPrice != null && count > 0 ? (
            <p className="muted">{t("price", { price: formatEur(unitPrice * count) })}</p>
          ) : null}

          <label className="terms lito-card">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              {avail?.hold_until
                ? t("terms", { time: zagrebTime(avail.hold_until, locale) })
                : t("termsNoHold")}
              {business.reservation_note ? (
                <>
                  <br />
                  <span className="muted">{business.reservation_note}</span>
                </>
              ) : null}
            </span>
          </label>

          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="lito-btn submit" disabled={!canSend || sending}>
            {sending ? t("sending") : t("submit")}
          </button>
        </>
      ) : null}
    </form>
  );
}
