/**
 * Podaci za ekran "Danas": vrste predmeta, jedinice, dijelovi dana i zapisi za odabrani dan.
 *
 * Rad bez signala (specifikacija 4.2): svaka promjena ide u red čekanja, spremljen na uređaju,
 * i odmah se vidi na ekranu. Red se šalje redom čim ima veze. Ako baza odbije promjenu
 * (npr. mjesto je u međuvremenu rezervirao turist), promjena se makne iz reda i javlja se sukob.
 */

import {
  applyOutbox,
  dayRange,
  dropPendingBooking,
  isTempId,
  type NotebookBooking,
  type OutboxOp,
  type PaymentMethod,
  remapIds,
  type TimeRange,
} from "@obala/core";
import type { ItemType, ItemTypeSlot, Unit } from "@obala/db";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { loadJson, saveJson } from "./storage";
import { errorMessage, isNetworkError, supabase } from "./supabase";

/** Stupci koje bilježnica čita. Cijenu (price_cents) djelatnik ne smije čitati, pa je nema. */
export const BOOKING_COLUMNS =
  "id, unit_id, service_date, slot_id, status, starts_at, ends_at, released_at, hold_until, payment_method, customer_name, customer_phone, group_id, source";

interface Snapshot {
  types: ItemType[];
  slots: ItemTypeSlot[];
  units: Unit[];
  bookings: NotebookBooking[];
}

const EMPTY: Snapshot = { types: [], slots: [], units: [], bookings: [] };

let counter = 0;
function newId(prefix = "op") {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface Revenue {
  total: number;
  cash: number;
  card: number;
}

export function useNotebook(businessId: string | null, date: string, isOwner: boolean) {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [ops, setOps] = useState<OutboxOp[]>([]);
  const [online, setOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [conflict, setConflict] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const opsRef = useRef<OutboxOp[]>([]);
  const idMap = useRef(new Map<string, string>());
  const flushing = useRef(false);
  const outboxKey = businessId ? `lito.outbox.${businessId}` : null;

  const persistOps = useCallback(
    (next: OutboxOp[]) => {
      opsRef.current = next;
      setOps(next);
      if (outboxKey) void saveJson(outboxKey, next);
    },
    [outboxKey],
  );

  const load = useCallback(async () => {
    if (!businessId) return;
    const cacheKey = `lito.nb.${businessId}.${date}`;
    const [types, slots, units, bookings] = await Promise.all([
      supabase
        .from("item_types")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at"),
      supabase
        .from("item_type_slots")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase
        .from("units")
        .select("*")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .order("position"),
      supabase
        .from("bookings")
        .select(BOOKING_COLUMNS)
        .eq("business_id", businessId)
        .eq("service_date", date),
    ]);
    const error = types.error ?? slots.error ?? units.error ?? bookings.error;
    if (error) {
      if (isNetworkError(error)) setOnline(false);
      const cached = await loadJson<Snapshot>(cacheKey);
      if (cached) setSnap(cached);
      setLoading(false);
      return;
    }
    const next: Snapshot = {
      types: types.data ?? [],
      slots: slots.data ?? [],
      units: units.data ?? [],
      bookings: (bookings.data ?? []) as NotebookBooking[],
    };
    setSnap(next);
    setLoading(false);
    void saveJson(cacheKey, next);

    if (isOwner) {
      const amounts = await supabase
        .from("booking_amounts")
        .select("payment_method, price_cents")
        .eq("business_id", businessId)
        .eq("service_date", date)
        .eq("status", "sold");
      if (!amounts.error && amounts.data) {
        const r: Revenue = { total: 0, cash: 0, card: 0 };
        for (const a of amounts.data) {
          const p = a.price_cents ?? 0;
          r.total += p;
          if (a.payment_method === "cash") r.cash += p;
          if (a.payment_method === "card") r.card += p;
        }
        setRevenue(r);
      }
    }
  }, [businessId, date, isOwner]);

  /** Šalje red čekanja redom. Zaustavlja se na prvoj mrežnoj grešci. */
  const flush = useCallback(async () => {
    if (flushing.current || opsRef.current.length === 0) return;
    flushing.current = true;
    let changed = false;
    try {
      while (opsRef.current.length > 0) {
        const op = opsRef.current[0] as OutboxOp;
        const { error, ids } = await send(op);
        if (error && isNetworkError(error)) {
          setOnline(false);
          break;
        }
        setOnline(true);
        let rest = opsRef.current.slice(1);
        if (error) {
          setConflict(conflictText(op, error));
          // Promjene vezane uz odbijeni zapis više nemaju smisla.
          if (op.kind === "sale" || op.kind === "reserve") {
            for (const t of op.tempIds) rest = dropPendingBooking(rest, t) ?? rest;
          }
        } else if (ids) {
          for (const [temp, real] of ids) idMap.current.set(temp, real);
          rest = remapIds(rest, idMap.current);
        }
        persistOps(rest);
        changed = true;
      }
    } finally {
      flushing.current = false;
    }
    if (changed) await load();
  }, [load, persistOps]);

  // Učitaj red čekanja s uređaja pa podatke.
  useEffect(() => {
    if (!outboxKey) return;
    setLoading(true);
    void loadJson<OutboxOp[]>(outboxKey).then((saved) => {
      opsRef.current = saved ?? [];
      setOps(saved ?? []);
      void load().then(() => flush());
    });
  }, [outboxKey, load, flush]);

  // Veza, povratak u aplikaciju, promjene uživo i osvježavanje svakih 30 s.
  useEffect(() => {
    if (!businessId) return;
    // Samo isConnected: provjera dostupnosti interneta ide preko vanjske adrese i zna lagati.
    // Stvarno stanje veze vidi se po tome uspije li slanje.
    const unsubNet = NetInfo.addEventListener((s) => {
      const isOn = s.isConnected !== false;
      setOnline(isOn);
      if (isOn) void flush().then(load);
    });
    // Preglednik javlja povratak veze sam; NetInfo na webu to ne uhvati uvijek.
    const onOnline = () => {
      setOnline(true);
      void flush().then(load);
    };
    if (Platform.OS === "web" && typeof window !== "undefined")
      window.addEventListener("online", onOnline);
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void flush().then(load);
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`bookings-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${businessId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void load(), 400);
        },
      )
      .subscribe();
    const interval = setInterval(() => void flush().then(load), 30000);
    return () => {
      unsubNet();
      if (Platform.OS === "web" && typeof window !== "undefined")
        window.removeEventListener("online", onOnline);
      appSub.remove();
      clearInterval(interval);
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [businessId, flush, load]);

  const slotsById = useMemo(() => new Map(snap.slots.map((s) => [s.id, s])), [snap.slots]);
  const rangeFor = useCallback(
    (d: string, slotId: string | null): TimeRange =>
      dayRange(d, slotId ? slotsById.get(slotId) : null),
    [slotsById],
  );

  const bookings = useMemo(
    () => applyOutbox(snap.bookings, ops, rangeFor).filter((b) => b.service_date === date),
    [snap.bookings, ops, rangeFor, date],
  );

  const enqueue = useCallback(
    (op: OutboxOp) => {
      persistOps([...opsRef.current, op]);
      void flush();
    },
    [flush, persistOps],
  );

  const actions = useMemo(
    () => ({
      sell(
        unitIds: string[],
        payment: PaymentMethod,
        opts: { slotId?: string | null; days?: number; durationMin?: number | null } = {},
      ): string[] {
        const tempIds = unitIds.map(() => newId("tmp"));
        enqueue({
          kind: "sale",
          id: newId(),
          createdAt: new Date().toISOString(),
          unitIds,
          tempIds,
          payment,
          date,
          slotId: opts.slotId ?? null,
          durationMin: opts.durationMin ?? null,
          days: opts.days ?? 1,
        });
        return tempIds;
      },
      reserve(unitIds: string[], name: string, phone: string | null, slotId: string | null) {
        enqueue({
          kind: "reserve",
          id: newId(),
          createdAt: new Date().toISOString(),
          unitIds,
          tempIds: unitIds.map(() => newId("tmp")),
          date,
          slotId,
          name,
          phone,
        });
      },
      checkIn(bookingId: string, payment: PaymentMethod) {
        enqueue({
          kind: "checkIn",
          id: newId(),
          createdAt: new Date().toISOString(),
          bookingId,
          payment,
        });
      },
      release(bookingId: string) {
        enqueue({ kind: "release", id: newId(), createdAt: new Date().toISOString(), bookingId });
      },
      /** Poništi ili otkaži. Neposlana prodaja samo se makne iz reda. */
      cancel(bookingId: string) {
        const resolved = idMap.current.get(bookingId) ?? bookingId;
        const dropped = dropPendingBooking(opsRef.current, resolved);
        if (dropped) {
          persistOps(dropped);
          return;
        }
        enqueue({
          kind: "cancel",
          id: newId(),
          createdAt: new Date().toISOString(),
          bookingId: resolved,
        });
      },
    }),
    [date, enqueue, persistOps],
  );

  return {
    ...snap,
    bookings,
    slotsById,
    rangeFor,
    pendingCount: ops.length,
    online,
    loading,
    conflict,
    clearConflict: () => setConflict(null),
    revenue,
    reload: load,
    actions,
  };
}

async function send(op: OutboxOp): Promise<{ error: unknown; ids?: [string, string][] }> {
  switch (op.kind) {
    case "sale": {
      const { data, error } = await supabase.rpc("record_sale", {
        p_unit_ids: op.unitIds,
        p_payment_method: op.payment,
        p_date: op.date,
        p_slot_id: op.slotId ?? undefined,
        p_days: op.days,
        p_duration_min: op.durationMin ?? undefined,
      });
      if (error) return { error };
      // Baza vraća zapise po jedinici i danu; prvi dan svake jedinice je onaj na ekranu.
      const ids: [string, string][] = [];
      op.unitIds.forEach((unitId, i) => {
        const row = data?.find((r) => r.unit_id === unitId && r.service_date === op.date);
        const temp = op.tempIds[i];
        if (row && temp) ids.push([temp, row.booking_id]);
      });
      return { error: null, ids };
    }
    case "reserve": {
      const { data, error } = await supabase.rpc("record_reservation", {
        p_unit_ids: op.unitIds,
        p_date: op.date,
        p_customer_name: op.name,
        p_customer_phone: op.phone ?? undefined,
        p_source: "phone",
        p_slot_id: op.slotId ?? undefined,
      });
      if (error) return { error };
      const ids: [string, string][] = [];
      op.unitIds.forEach((unitId, i) => {
        const row = data?.find((r) => r.unit_id === unitId);
        const temp = op.tempIds[i];
        if (row && temp) ids.push([temp, row.booking_id]);
      });
      return { error: null, ids };
    }
    case "checkIn":
      if (isTempId(op.bookingId)) return { error: null };
      return supabase.rpc("check_in", { p_booking_id: op.bookingId, p_payment_method: op.payment });
    case "release":
      if (isTempId(op.bookingId)) return { error: null };
      return supabase.rpc("release_booking", { p_booking_id: op.bookingId });
    case "cancel":
      if (isTempId(op.bookingId)) return { error: null };
      return supabase.rpc("cancel_booking", { p_booking_id: op.bookingId });
  }
}

function conflictText(op: OutboxOp, error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23P01") {
    return op.kind === "reserve"
      ? "Rezervacija nije spremljena: mjesto je u međuvremenu zauzeto. Odaberi drugo."
      : "Prodaja nije spremljena: mjesto je u međuvremenu zauzeto (možda rezervacija iz aplikacije). Odaberi drugo slobodno mjesto.";
  }
  return `Promjena nije spremljena. ${errorMessage(error)}`;
}
