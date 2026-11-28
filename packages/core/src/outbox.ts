/**
 * Promjene koje čekaju slanje (rad bez signala, specifikacija 4.2).
 *
 * Svaka promjena u bilježnici najprije ide u red čekanja i odmah se vidi na ekranu.
 * Red se šalje redom čim ima veze. Prodaja napravljena bez veze dobiva privremeni id;
 * kad je baza potvrdi, kasnije promjene (npr. "Vraćeno") prebace se na pravi id.
 */

import type { NotebookBooking, PaymentMethod, TimeRange } from "./notebook";

export type OutboxOp =
  | {
      kind: "sale";
      id: string;
      createdAt: string;
      unitIds: string[];
      /** Privremeni id za svaku jedinicu, istim redom kao unitIds. */
      tempIds: string[];
      payment: PaymentMethod;
      date: string;
      slotId: string | null;
      durationMin: number | null;
      days: number;
    }
  | {
      kind: "reserve";
      id: string;
      createdAt: string;
      unitIds: string[];
      tempIds: string[];
      date: string;
      slotId: string | null;
      name: string;
      phone: string | null;
    }
  | { kind: "checkIn"; id: string; createdAt: string; bookingId: string; payment: PaymentMethod }
  | { kind: "release"; id: string; createdAt: string; bookingId: string }
  | { kind: "cancel"; id: string; createdAt: string; bookingId: string };

export const TEMP_PREFIX = "tmp-";

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX);
}

/**
 * Primijeni promjene koje čekaju na zapise iz baze, da ekran odmah pokaže novo stanje.
 * `rangeFor` daje raspon dana ili dijela dana za novu prodaju ili rezervaciju.
 */
export function applyOutbox(
  bookings: readonly NotebookBooking[],
  ops: readonly OutboxOp[],
  rangeFor: (date: string, slotId: string | null) => TimeRange,
): NotebookBooking[] {
  const list = bookings.map((b) => ({ ...b }));
  const byId = new Map(list.map((b) => [b.id, b]));

  for (const op of ops) {
    switch (op.kind) {
      case "sale": {
        op.unitIds.forEach((unitId, i) => {
          const tempId = op.tempIds[i] ?? `${op.id}-${i}`;
          const now = new Date(op.createdAt);
          let start: Date;
          let end: Date;
          if (op.durationMin) {
            start = now;
            end = new Date(now.getTime() + op.durationMin * 60000);
          } else {
            const r = rangeFor(op.date, op.slotId);
            start = r.start > now ? r.start : now;
            end = r.end;
          }
          const b: NotebookBooking = {
            id: tempId,
            unit_id: unitId,
            service_date: op.date,
            slot_id: op.slotId,
            status: "sold",
            starts_at: start.toISOString(),
            ends_at: end.toISOString(),
            released_at: null,
            hold_until: null,
            payment_method: op.payment,
            customer_name: null,
            customer_phone: null,
            group_id: op.id,
            source: "walk_in",
            pending: true,
          };
          list.push(b);
          byId.set(b.id, b);
        });
        break;
      }
      case "reserve": {
        op.unitIds.forEach((unitId, i) => {
          const tempId = op.tempIds[i] ?? `${op.id}-${i}`;
          const r = rangeFor(op.date, op.slotId);
          const b: NotebookBooking = {
            id: tempId,
            unit_id: unitId,
            service_date: op.date,
            slot_id: op.slotId,
            status: "reserved",
            starts_at: r.start.toISOString(),
            ends_at: r.end.toISOString(),
            released_at: null,
            hold_until: null,
            payment_method: null,
            customer_name: op.name,
            customer_phone: op.phone,
            group_id: op.id,
            source: "phone",
            pending: true,
          };
          list.push(b);
          byId.set(b.id, b);
        });
        break;
      }
      case "checkIn": {
        const b = byId.get(op.bookingId);
        if (b && b.status === "reserved") {
          b.status = "sold";
          b.payment_method = op.payment;
          b.hold_until = null;
          b.pending = true;
        }
        break;
      }
      case "release": {
        const b = byId.get(op.bookingId);
        if (b && b.status === "sold" && !b.released_at) {
          b.released_at = op.createdAt;
          b.pending = true;
        }
        break;
      }
      case "cancel": {
        const b = byId.get(op.bookingId);
        if (b && (b.status === "reserved" || b.status === "sold")) {
          b.status = "cancelled";
          b.pending = true;
        }
        break;
      }
    }
  }
  return list;
}

/** Nakon što baza potvrdi prodaju ili rezervaciju, kasnije promjene prebaci na prave id-eve. */
export function remapIds(ops: readonly OutboxOp[], idMap: ReadonlyMap<string, string>): OutboxOp[] {
  return ops.map((op) => {
    if (op.kind === "checkIn" || op.kind === "release" || op.kind === "cancel") {
      const real = idMap.get(op.bookingId);
      return real ? { ...op, bookingId: real } : op;
    }
    return op;
  });
}

/**
 * Poništi nešto što još nije poslano: makni prodaju iz reda umjesto slanja otkazivanja.
 * Vraća novi red, ili null ako zapis nije u redu (onda treba poslati otkazivanje).
 */
export function dropPendingBooking(ops: readonly OutboxOp[], bookingId: string): OutboxOp[] | null {
  if (!isTempId(bookingId)) return null;
  const out: OutboxOp[] = [];
  let found = false;
  for (const op of ops) {
    if ((op.kind === "sale" || op.kind === "reserve") && op.tempIds.includes(bookingId)) {
      found = true;
      const keep = op.tempIds
        .map((t, i) => ({ t, u: op.unitIds[i] as string }))
        .filter((x) => x.t !== bookingId);
      if (keep.length > 0) {
        out.push({ ...op, tempIds: keep.map((x) => x.t), unitIds: keep.map((x) => x.u) });
      }
      continue;
    }
    if (
      (op.kind === "checkIn" || op.kind === "release" || op.kind === "cancel") &&
      op.bookingId === bookingId
    ) {
      continue;
    }
    out.push(op);
  }
  return found ? out : null;
}
