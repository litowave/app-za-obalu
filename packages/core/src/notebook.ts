/**
 * Stanje mjesta u bilježnici iz zapisa o rezervacijama i prodajama.
 *
 * Aplikacija za iznajmljivače mora raditi i bez signala (specifikacija 4.2), pa se
 * stanje računa na mobitelu iz zapisa iz baze i iz promjena koje još čekaju slanje.
 * Pravila su ista kao u bazi: jedinica je zauzeta dok traje prodaja ili rezervacija,
 * vraćena jedinica (released_at) je slobodna, istekla rezervacija ne vrijedi.
 */

import { addDays, zagrebDateTime } from "./zagreb-time";

export type UnitState = "free" | "reserved" | "sold";
export type PaymentMethod = "cash" | "card";
export type BookingStatus = "reserved" | "sold" | "cancelled" | "expired";

/** Dio zapisa iz tablice bookings koji treba bilježnici (bez cijene, koju djelatnik ne vidi). */
export interface NotebookBooking {
  id: string;
  unit_id: string;
  service_date: string;
  slot_id: string | null;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  released_at: string | null;
  hold_until: string | null;
  payment_method: PaymentMethod | null;
  customer_name: string | null;
  customer_phone: string | null;
  group_id: string;
  source: "walk_in" | "tourist_app" | "phone";
  /** Zapis je napravljen na ovom mobitelu i još nije poslan. */
  pending?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface SlotLike {
  starts_at: string;
  ends_at: string | null;
}

/** Cijeli dan (ponoć do ponoći) ili dio dana. Kraj "do zalaska" za usporedbu je kraj dana. */
export function dayRange(date: string, slot?: SlotLike | null): TimeRange {
  if (!slot) {
    return { start: zagrebDateTime(date), end: zagrebDateTime(addDays(date, 1)) };
  }
  return {
    start: zagrebDateTime(date, slot.starts_at),
    end: slot.ends_at ? zagrebDateTime(date, slot.ends_at) : zagrebDateTime(addDays(date, 1)),
  };
}

/** Do kada je jedinica stvarno zauzeta: do povratka ako je vraćena ranije. */
export function effectiveEnd(b: NotebookBooking): Date {
  const end = new Date(b.ends_at);
  if (!b.released_at) return end;
  const released = new Date(b.released_at);
  return released < end ? released : end;
}

/** Vrijedi li zapis još: prodaja ili rezervacija kojoj rok nije prošao. */
export function isActive(b: NotebookBooking, now: Date): boolean {
  if (b.status === "sold") return true;
  if (b.status === "reserved") return !b.hold_until || new Date(b.hold_until) > now;
  return false;
}

function overlaps(b: NotebookBooking, range: TimeRange): boolean {
  const start = new Date(b.starts_at);
  const end = effectiveEnd(b);
  return start < range.end && end > range.start && end > start;
}

export interface UnitStatus {
  state: UnitState;
  booking: NotebookBooking | null;
}

/**
 * Stanje svake jedinice u zadanom rasponu. Prodano ima prednost pred rezerviranim.
 * Za današnji dan raspon počinje sada, pa vraćena ležaljka opet izgleda slobodno.
 */
export function unitStates(
  unitIds: readonly string[],
  bookings: readonly NotebookBooking[],
  range: TimeRange,
  now: Date,
): Map<string, UnitStatus> {
  const from = range.start > now ? range.start : now;
  const effective: TimeRange = from < range.end ? { start: from, end: range.end } : range;
  const out = new Map<string, UnitStatus>();
  for (const id of unitIds) out.set(id, { state: "free", booking: null });
  for (const b of bookings) {
    const current = out.get(b.unit_id);
    if (!current || !isActive(b, now) || !overlaps(b, effective)) continue;
    if (b.status === "sold" && current.state !== "sold") {
      out.set(b.unit_id, { state: "sold", booking: b });
    } else if (b.status === "reserved" && current.state === "free") {
      out.set(b.unit_id, { state: "reserved", booking: b });
    }
  }
  return out;
}

export interface TimedStatus {
  booking: NotebookBooking | null;
  /** Minute do planiranog povratka; negativno kad kasni. */
  minutesLeft: number | null;
  overdue: boolean;
}

/**
 * Satni najam (jet ski, pedaline): jedinica je vani od izdavanja do povratka.
 * Ako vrijeme istekne, a nije označeno "Vraćeno", jedinica kasni.
 */
export function timedStatus(
  unitId: string,
  bookings: readonly NotebookBooking[],
  now: Date,
): TimedStatus {
  let current: NotebookBooking | null = null;
  for (const b of bookings) {
    if (b.unit_id !== unitId || b.status !== "sold" || b.released_at) continue;
    if (new Date(b.starts_at) > now) continue;
    if (!current || new Date(b.starts_at) > new Date(current.starts_at)) current = b;
  }
  if (!current) return { booking: null, minutesLeft: null, overdue: false };
  const left = Math.round((new Date(current.ends_at).getTime() - now.getTime()) / 60000);
  // Cjelodnevni zapis za vrstu sa satnim najmom ne smatramo kašnjenjem prije kraja dana.
  return { booking: current, minutesLeft: left, overdue: left < 0 };
}

export interface Counts {
  free: number;
  reserved: number;
  sold: number;
}

export function countStates(states: Map<string, UnitStatus>): Counts {
  const c: Counts = { free: 0, reserved: 0, sold: 0 };
  for (const s of states.values()) c[s.state] += 1;
  return c;
}
