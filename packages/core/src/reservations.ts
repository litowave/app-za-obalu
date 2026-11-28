/**
 * Rezervacije u aplikaciji za iznajmljivače (specifikacija 4.1 I3, 6.2).
 *
 * Zapisi iz baze dolaze po jedinici. Gost koji rezervira dva kompleta ima dva zapisa
 * s istim group_id, a na popisu je to jedna rezervacija s dva mjesta.
 */

import type { NotebookBooking } from "./notebook";

export type BookingSource = NotebookBooking["source"];

export interface ReservationRow
  extends Pick<
    NotebookBooking,
    | "id"
    | "unit_id"
    | "service_date"
    | "slot_id"
    | "status"
    | "hold_until"
    | "customer_name"
    | "customer_phone"
    | "group_id"
    | "source"
  > {
  seen_at: string | null;
  created_at: string;
}

export interface UnitRef {
  item_type_id: string;
  position: number;
}

export interface Reservation {
  /** group_id + vrsta + dan; jedna kartica na popisu. */
  key: string;
  groupId: string;
  date: string;
  itemTypeId: string;
  slotId: string | null;
  holdUntil: string | null;
  name: string | null;
  phone: string | null;
  source: BookingSource;
  isNew: boolean;
  createdAt: string;
  /** Zapisi po jedinici, poredani kao mjesta u mreži. */
  bookings: { id: string; unitId: string }[];
}

export const SOURCE_LABEL: Record<BookingSource, string> = {
  tourist_app: "aplikacija",
  phone: "telefon",
  walk_in: "uživo",
};

/** Aktivne rezervacije (rok još nije prošao), spojene po gostu i poredane po roku dolaska. */
export function groupReservations(
  rows: ReservationRow[],
  units: Map<string, UnitRef>,
  now: Date = new Date(),
): Reservation[] {
  const groups = new Map<string, Reservation & { positions: number[] }>();
  for (const r of rows) {
    if (r.status !== "reserved") continue;
    if (r.hold_until && new Date(r.hold_until) <= now) continue;
    const unit = units.get(r.unit_id);
    if (!unit) continue;
    const key = `${r.group_id}|${unit.item_type_id}|${r.service_date}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        groupId: r.group_id,
        date: r.service_date,
        itemTypeId: unit.item_type_id,
        slotId: r.slot_id,
        holdUntil: r.hold_until,
        name: r.customer_name,
        phone: r.customer_phone,
        source: r.source,
        isNew: false,
        createdAt: r.created_at,
        bookings: [],
        positions: [],
      };
      groups.set(key, g);
    }
    if (r.source === "tourist_app" && !r.seen_at) g.isNew = true;
    if (r.hold_until && (!g.holdUntil || r.hold_until < g.holdUntil)) g.holdUntil = r.hold_until;
    if (r.created_at < g.createdAt) g.createdAt = r.created_at;
    g.bookings.push({ id: r.id, unitId: r.unit_id });
    g.positions.push(unit.position);
  }

  const list: Reservation[] = [];
  for (const g of groups.values()) {
    const order = g.bookings
      .map((b, i) => ({ b, p: g.positions[i] ?? 0 }))
      .sort((a, z) => a.p - z.p)
      .map((x) => x.b);
    const { positions: _, ...rest } = g;
    list.push({ ...rest, bookings: order });
  }
  return list.sort(compareReservations);
}

/** Po danu, pa po roku dolaska (bez roka na kraju dana), pa po vremenu rezervacije. */
export function compareReservations(a: Reservation, b: Reservation): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.holdUntil !== b.holdUntil) {
    if (!a.holdUntil) return 1;
    if (!b.holdUntil) return -1;
    return a.holdUntil < b.holdUntil ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Broj za poziv: razmaci i crtice van, "00" na početku postaje "+". */
export function telLink(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
  return `tel:${cleaned}`;
}

/**
 * Vrijeme iz polja za unos: "12", "12:30", "12.30", "9,15" ili "1230" postaje "12:30".
 * Vraća null ako to nije ispravno vrijeme.
 */
export function parseClock(input: string): string | null {
  const s = input.trim().replace(/[.,h ]/g, ":");
  let m = /^(\d{1,2})(?::(\d{2}))?:?$/.exec(s);
  if (!m) m = /^(\d{1,2})(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** "12:00:00" iz baze u "12:00". */
export function shortClock(time: string | null | undefined): string {
  return time ? time.slice(0, 5) : "";
}

export interface BookingRules {
  /** Rok dolaska, "HH:MM", ili null = rezervacija vrijedi cijeli dan. */
  holdUntil: string | null;
  opensDaysBefore: number;
  opensAt: string;
  /** null = zatvara se u trenutku roka dolaska. */
  closesAt: string | null;
}

/**
 * Ista provjera kao validate_booking_rules u bazi (6.2.6), da se greška vidi
 * prije spremanja. Vraća poruku ili null.
 */
export function bookingRulesError(r: BookingRules): string | null {
  const closes = r.closesAt ?? r.holdUntil;
  if (r.holdUntil && closes && closes > r.holdUntil) {
    return `Rezervacije se moraju zatvoriti najkasnije u roku dolaska (${r.holdUntil}), inače bi odmah istekle.`;
  }
  if (r.opensDaysBefore === 0 && closes && r.opensAt >= closes) {
    return "Rezervacije se moraju otvoriti prije nego što se zatvore.";
  }
  if (r.opensDaysBefore < 0 || r.opensDaysBefore > 60) {
    return "Rezervacije se mogu otvoriti od 0 do 60 dana unaprijed.";
  }
  return null;
}

/** Rečenica koju vlasnik vidi ispod postavki, da provjeri je li to što je mislio. */
export function describeBookingRules(r: BookingRules): string {
  const opens =
    r.opensDaysBefore === 0
      ? `istog dana u ${r.opensAt}`
      : r.opensDaysBefore === 1
        ? `dan ranije u ${r.opensAt}`
        : `${r.opensDaysBefore} dana ranije u ${r.opensAt}`;
  const closes = r.closesAt
    ? `zatvaraju se na taj dan u ${r.closesAt}`
    : r.holdUntil
      ? `zatvaraju se u roku dolaska (${r.holdUntil})`
      : "zatvaraju se na kraju tog dana";
  const hold = r.holdUntil
    ? `Gost mora doći do ${r.holdUntil}, inače se rezervacija sama poništava.`
    : "Rezervacija vrijedi cijeli dan.";
  return `Rezervacije za neki dan otvaraju se ${opens}, a ${closes}. ${hold}`;
}
