/**
 * Rezervacije za danas i sljedeće dane (specifikacija 4.1 I3).
 *
 * Podaci žive u kontekstu iznad kartica, da i kartica "Rezervacije" i njezin broj
 * novih rezervacija rade s istim podacima i istom vezom uživo.
 */

import {
  addDays,
  dayRange,
  groupReservations,
  type NotebookBooking,
  type PaymentMethod,
  type Reservation,
  type ReservationRow,
  type UnitRef,
  unitStates,
  zagrebToday,
} from "@obala/core";
import type { ItemType, ItemTypeSlot, Unit } from "@obala/db";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useBusiness } from "./business";
import { BOOKING_COLUMNS } from "./notebook";
import { loadJson, saveJson } from "./storage";
import { errorMessage, isNetworkError, supabase } from "./supabase";

/** Koliko dana unaprijed popis prikazuje. */
export const RESERVATION_DAYS = 14;

interface Snapshot {
  types: ItemType[];
  slots: ItemTypeSlot[];
  units: Unit[];
  rows: ReservationRow[];
}

const EMPTY: Snapshot = { types: [], slots: [], units: [], rows: [] };

interface ReservationsValue {
  list: Reservation[];
  types: Map<string, ItemType>;
  slots: Map<string, ItemTypeSlot>;
  units: Map<string, Unit>;
  newCount: number;
  loading: boolean;
  offline: boolean;
  reload: () => Promise<void>;
  markSeen: () => Promise<void>;
  checkIn: (r: Reservation, payment: PaymentMethod) => Promise<string | null>;
  cancel: (r: Reservation) => Promise<string | null>;
  move: (bookingId: string, unitId: string) => Promise<string | null>;
  block: (r: Reservation) => Promise<string | null>;
  freeUnits: (r: Reservation) => Promise<Unit[]>;
}

const Ctx = createContext<ReservationsValue | null>(null);

export function ReservationsProvider({ children }: { children: ReactNode }) {
  const { active } = useBusiness();
  const businessId = active?.business.id ?? null;
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    if (!businessId) return;
    const seq = ++loadSeq.current;
    const today = zagrebToday();
    const cacheKey = `lito.rez.${businessId}`;
    const [types, slots, units, rows] = await Promise.all([
      supabase
        .from("item_types")
        .select("*")
        .eq("business_id", businessId)
        .is("archived_at", null)
        .order("sort_order"),
      supabase.from("item_type_slots").select("*").eq("business_id", businessId),
      supabase.from("units").select("*").eq("business_id", businessId).order("position"),
      supabase
        .from("bookings")
        .select(`${BOOKING_COLUMNS}, seen_at, created_at`)
        .eq("business_id", businessId)
        .eq("status", "reserved")
        .gte("service_date", today)
        .lt("service_date", addDays(today, RESERVATION_DAYS))
        .order("service_date")
        .limit(2000),
    ]);
    if (seq !== loadSeq.current) return;
    const error = types.error ?? slots.error ?? units.error ?? rows.error;
    if (error) {
      if (isNetworkError(error)) setOffline(true);
      const cached = await loadJson<Snapshot>(cacheKey);
      if (cached) setSnap(cached);
      setLoading(false);
      return;
    }
    const next: Snapshot = {
      types: types.data ?? [],
      slots: slots.data ?? [],
      units: units.data ?? [],
      rows: (rows.data ?? []) as ReservationRow[],
    };
    setOffline(false);
    setSnap(next);
    setNow(new Date());
    setLoading(false);
    void saveJson(cacheKey, next);
  }, [businessId]);

  useEffect(() => {
    setSnap(EMPTY);
    setLoading(true);
    void load();
  }, [load]);

  // Promjene uživo (nova rezervacija iz turističke aplikacije), povratak u aplikaciju
  // i osvježavanje svake minute, da istekle rezervacije nestanu same.
  useEffect(() => {
    if (!businessId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(`reservations-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `business_id=eq.${businessId}` },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void load(), 500);
        },
      )
      .subscribe();
    const appSub = AppState.addEventListener("change", (s) => {
      if (s === "active") void load();
    });
    const interval = setInterval(() => {
      setNow(new Date());
      void load();
    }, 60000);
    return () => {
      if (timer) clearTimeout(timer);
      appSub.remove();
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [businessId, load]);

  const unitRefs = useMemo(
    () =>
      new Map<string, UnitRef>(
        snap.units.map((u) => [u.id, { item_type_id: u.item_type_id, position: u.position }]),
      ),
    [snap.units],
  );
  const list = useMemo(
    () => groupReservations(snap.rows, unitRefs, now),
    [snap.rows, unitRefs, now],
  );
  const types = useMemo(() => new Map(snap.types.map((t) => [t.id, t])), [snap.types]);
  const slots = useMemo(() => new Map(snap.slots.map((s) => [s.id, s])), [snap.slots]);
  const units = useMemo(() => new Map(snap.units.map((u) => [u.id, u])), [snap.units]);
  const newCount = list.filter((r) => r.isNew).length;

  const markSeen = useCallback(async () => {
    if (!businessId || newCount === 0) return;
    const { error } = await supabase.rpc("mark_reservations_seen", { p_business_id: businessId });
    if (!error) {
      const at = new Date().toISOString();
      setSnap((s) => ({
        ...s,
        rows: s.rows.map((r) =>
          r.source === "tourist_app" && !r.seen_at ? { ...r, seen_at: at } : r,
        ),
      }));
    }
  }, [businessId, newCount]);

  /** Isti poziv za svaku jedinicu iz rezervacije; prva greška prekida i javlja se. */
  const forEach = useCallback(
    async (r: Reservation, call: (bookingId: string) => PromiseLike<{ error: unknown }>) => {
      for (const b of r.bookings) {
        const { error } = await call(b.id);
        if (error) {
          await load();
          return isNetworkError(error)
            ? "Nema veze. Pokušaj ponovno kad se veza vrati."
            : errorMessage(error);
        }
      }
      await load();
      return null;
    },
    [load],
  );

  const value = useMemo<ReservationsValue>(
    () => ({
      list,
      types,
      slots,
      units,
      newCount,
      loading,
      offline,
      reload: load,
      markSeen,
      checkIn: (r, payment) =>
        forEach(r, (id) =>
          supabase.rpc("check_in", { p_booking_id: id, p_payment_method: payment }),
        ),
      cancel: (r) => forEach(r, (id) => supabase.rpc("cancel_booking", { p_booking_id: id })),
      async move(bookingId, unitId) {
        const { error } = await supabase.rpc("move_booking", {
          p_booking_id: bookingId,
          p_unit_id: unitId,
        });
        await load();
        return error ? errorMessage(error) : null;
      },
      async block(r) {
        const first = r.bookings[0];
        if (!first) return null;
        const { error } = await supabase.rpc("block_booking_phone", { p_booking_id: first.id });
        return error ? errorMessage(error) : null;
      },
      async freeUnits(r) {
        const typeUnits = snap.units.filter((u) => u.item_type_id === r.itemTypeId && u.is_active);
        const { data, error } = await supabase
          .from("bookings")
          .select(BOOKING_COLUMNS)
          .eq("business_id", businessId ?? "")
          .eq("service_date", r.date)
          .in("status", ["reserved", "sold"]);
        if (error) return [];
        const range = dayRange(r.date, r.slotId ? slots.get(r.slotId) : null);
        const states = unitStates(
          typeUnits.map((u) => u.id),
          (data ?? []) as NotebookBooking[],
          range,
          new Date(),
        );
        return typeUnits.filter((u) => states.get(u.id)?.state === "free");
      },
    }),
    [
      list,
      types,
      slots,
      units,
      newCount,
      loading,
      offline,
      load,
      markSeen,
      forEach,
      snap.units,
      businessId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReservations(): ReservationsValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useReservations izvan ReservationsProvider");
  return v;
}
