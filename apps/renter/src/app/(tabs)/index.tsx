import {
  addDays,
  countStates,
  formatDayRelative,
  formatEur,
  isTimedUnit,
  type NotebookBooking,
  type PaymentMethod,
  PRICE_UNIT_LABEL,
  timedStatus,
  type UnitState,
  unitStates,
  zagrebClock,
  zagrebToday,
} from "@obala/core";
import type { ItemType, ItemTypeSlot, Unit } from "@obala/db";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronIcon, ClockIcon, SunIcon } from "@/components/icons";
import { UnitButton } from "@/components/UnitButton";
import {
  Banner,
  Body,
  Button,
  Card,
  Chip,
  color,
  Field,
  fonts,
  Row,
  radius,
  Sheet,
  Stepper,
  Subtitle,
  space,
  Toast,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { useNotebook } from "@/lib/notebook";
import { useSun } from "@/lib/sun";

const PAY_LABEL: Record<PaymentMethod, string> = { cash: "gotovina", card: "kartica" };

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export default function Danas() {
  const { active, isOwner } = useBusiness();
  const { sunMode, toggle: toggleSun } = useSun();
  const today = zagrebToday();
  const [date, setDate] = useState(today);
  const nb = useNotebook(active?.business.id ?? null, date, isOwner);
  const now = useNow();

  const [typeId, setTypeId] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string | null>(null);
  const [multi, setMulti] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sheetUnit, setSheetUnit] = useState<Unit | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const type: ItemType | undefined = nb.types.find((t) => t.id === typeId) ?? nb.types[0];
  const typeSlots = useMemo(
    () => nb.slots.filter((s) => s.item_type_id === type?.id),
    [nb.slots, type?.id],
  );
  const slot: ItemTypeSlot | null = typeSlots.find((s) => s.id === slotId) ?? typeSlots[0] ?? null;
  const units = useMemo(
    () => nb.units.filter((u) => u.item_type_id === type?.id),
    [nb.units, type?.id],
  );
  const timed = type ? isTimedUnit(type.price_unit) : false;
  const isPast = date < today;

  const states = useMemo(
    () =>
      unitStates(
        units.map((u) => u.id),
        nb.bookings,
        nb.rangeFor(date, slot?.id ?? null),
        now,
      ),
    [units, nb.bookings, nb.rangeFor, date, slot?.id, now],
  );
  const counts = countStates(states);

  // Promjena vrste ili dana poništava višestruki odabir.
  // biome-ignore lint/correctness/useExhaustiveDependencies: namjerno se pokreće na promjenu vrste ili dana
  useEffect(() => {
    setSelected([]);
    setMulti(false);
  }, [type?.id, date]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: samo kad stigne novi sukob
  useEffect(() => {
    if (nb.conflict) showToast(nb.conflict, undefined, 7000);
  }, [nb.conflict]);

  function showToast(text: string, undo?: () => void, ms = 5000) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, undo });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      nb.clearConflict();
    }, ms);
  }

  function sell(
    unitIds: string[],
    payment: PaymentMethod,
    days = 1,
    durationMin: number | null = null,
  ) {
    const ids = nb.actions.sell(unitIds, payment, { slotId: slot?.id ?? null, days, durationMin });
    const labels = unitIds.map((id) => nb.units.find((u) => u.id === id)?.label).join(", ");
    showToast(`${labels} prodano, ${PAY_LABEL[payment]}`, () => {
      for (const id of ids) nb.actions.cancel(id);
      setToast(null);
    });
  }

  function onUnitPress(u: Unit) {
    if (multi) {
      const st = states.get(u.id)?.state;
      if (st !== "free") return;
      setSelected((prev) =>
        prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
      );
      return;
    }
    setSheetUnit(u);
  }

  const sheetStatus = sheetUnit ? states.get(sheetUnit.id) : undefined;
  const price = slot?.price_cents ?? type?.price_cents ?? null;

  if (!active) return null;

  return (
    <SafeAreaView style={s.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.date}>{formatDayRelative(date, today)}</Text>
            <Text style={s.business} numberOfLines={1}>
              {active.business.name}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              toggleSun();
              showToast(
                sunMode ? "Način za sunce isključen" : "Način za sunce uključen",
                undefined,
                1800,
              );
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: sunMode }}
            accessibilityLabel="Način za jako sunce"
            style={[s.sunButton, sunMode && s.sunButtonOn]}
          >
            <SunIcon size={sunMode ? 30 : 22} color={color.buttonText} />
          </Pressable>
        </View>

        <Row gap={space.s}>
          <Pressable
            accessibilityLabel="Prethodni dan"
            onPress={() => setDate(addDays(date, -1))}
            style={s.dayNav}
          >
            <ChevronIcon direction="left" color={color.buttonText} />
          </Pressable>
          <Chip label="Danas" selected={date === today} onPress={() => setDate(today)} />
          <Chip
            label="Sutra"
            selected={date === addDays(today, 1)}
            onPress={() => setDate(addDays(today, 1))}
          />
          <Pressable
            accessibilityLabel="Sljedeći dan"
            onPress={() => setDate(addDays(date, 1))}
            style={s.dayNav}
          >
            <ChevronIcon direction="right" color={color.buttonText} />
          </Pressable>
        </Row>

        {!nb.online ? (
          <Banner>
            Bez veze, promjene će se poslati{nb.pendingCount ? ` (${nb.pendingCount} čeka)` : ""}.
          </Banner>
        ) : nb.pendingCount > 0 ? (
          <Banner>Šaljem promjene… ({nb.pendingCount})</Banner>
        ) : null}
        {active.business.is_demo ? (
          <Banner>Demo objekt s izmišljenim podacima. Slobodno klikaj.</Banner>
        ) : null}

        {isOwner && nb.revenue && date === today ? (
          <Card style={s.revenue}>
            <View>
              <Text style={s.small}>Prihod danas</Text>
              <Text style={s.big}>{formatEur(nb.revenue.total)}</Text>
            </View>
            <Text style={s.split}>
              Gotovina {formatEur(nb.revenue.cash)}
              {"\n"}Kartica {formatEur(nb.revenue.card)}
            </Text>
          </Card>
        ) : null}

        <Row gap={space.s}>
          <Counter n={counts.free} label="Slobodno" />
          <Counter n={counts.reserved} label="Rezerv." />
          <Counter n={counts.sold} label="Prodano" />
        </Row>

        {nb.types.length === 0 && !nb.loading ? (
          <Body muted>Još nema predmeta. Dodaj ih pod „Predmeti”.</Body>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          {nb.types.map((t) => (
            <Chip
              key={t.id}
              label={t.name}
              count={nb.units.filter((u) => u.item_type_id === t.id).length}
              selected={t.id === type?.id}
              onPress={() => {
                setTypeId(t.id);
                setSlotId(null);
              }}
            />
          ))}
        </ScrollView>

        {typeSlots.length > 0 ? (
          <Row gap={space.s}>
            {typeSlots.map((sl) => (
              <Chip
                key={sl.id}
                label={sl.name}
                selected={sl.id === slot?.id}
                onPress={() => setSlotId(sl.id)}
              />
            ))}
          </Row>
        ) : null}

        {type && timed && date === today ? (
          <View style={{ gap: space.s }}>
            {units.map((u) => (
              <TimedRow
                key={u.id}
                unit={u}
                type={type}
                bookings={nb.bookings}
                now={new Date(Math.max(now.getTime(), Date.now()))}
                onRent={(payment) => sell([u.id], payment, 1, type.default_duration_min ?? 60)}
                onReturn={(b) => {
                  nb.actions.release(b.id);
                  showToast(`${u.label} vraćeno`);
                }}
              />
            ))}
          </View>
        ) : (
          <View style={s.grid}>
            {units.map((u) => {
              const st = states.get(u.id);
              return (
                <UnitButton
                  key={u.id}
                  label={u.label}
                  state={st?.state ?? "free"}
                  pending={st?.booking?.pending}
                  selected={selected.includes(u.id)}
                  onPress={() => onUnitPress(u)}
                  onLongPress={() => {
                    if (isPast || st?.state !== "free") return;
                    setMulti(true);
                    setSelected([u.id]);
                  }}
                />
              );
            })}
          </View>
        )}

        {!timed && units.length > 0 && !isPast ? (
          multi ? (
            <Body muted>Dodirni slobodna mjesta koja uzima ista obitelj.</Body>
          ) : (
            <Button
              title="Odaberi više mjesta"
              kind="text"
              onPress={() => {
                setMulti(true);
                setSelected([]);
              }}
            />
          )
        ) : null}
      </ScrollView>

      {multi ? (
        <View style={s.multiBar}>
          <Text style={s.multiText}>Odabrano {selected.length}</Text>
          {date === today ? (
            <>
              <Button
                title="Gotovina"
                disabled={selected.length === 0}
                onPress={() => {
                  sell(selected, "cash");
                  setMulti(false);
                  setSelected([]);
                }}
              />
              <Button
                title="Kartica"
                disabled={selected.length === 0}
                onPress={() => {
                  sell(selected, "card");
                  setMulti(false);
                  setSelected([]);
                }}
              />
            </>
          ) : null}
          <Button
            title="Odustani"
            kind="text"
            onPress={() => {
              setMulti(false);
              setSelected([]);
            }}
          />
        </View>
      ) : null}

      <UnitSheet
        unit={sheetUnit}
        typeName={type?.name ?? ""}
        state={sheetStatus?.state ?? "free"}
        booking={sheetStatus?.booking ?? null}
        priceText={
          price != null && type
            ? `${slot ? `${slot.name} · ` : ""}${formatEur(price)} / ${PRICE_UNIT_LABEL[type.price_unit]}`
            : (slot?.name ?? "")
        }
        isToday={date === today}
        isPast={isPast}
        onClose={() => setSheetUnit(null)}
        onSell={(payment, days) => {
          if (sheetUnit) sell([sheetUnit.id], payment, days);
          setSheetUnit(null);
        }}
        onReserve={(name, phone) => {
          if (sheetUnit) {
            nb.actions.reserve([sheetUnit.id], name, phone, slot?.id ?? null);
            showToast(`${sheetUnit.label} rezervirano`);
          }
          setSheetUnit(null);
        }}
        onCheckIn={(payment) => {
          const b = sheetStatus?.booking;
          if (b && sheetUnit) {
            nb.actions.checkIn(b.id, payment);
            showToast(`${sheetUnit.label}: gost je stigao, ${PAY_LABEL[payment]}`);
          }
          setSheetUnit(null);
        }}
        onRelease={() => {
          const b = sheetStatus?.booking;
          if (b && sheetUnit) {
            nb.actions.release(b.id);
            showToast(`${sheetUnit.label} je opet slobodno`);
          }
          setSheetUnit(null);
        }}
        onCancel={() => {
          const b = sheetStatus?.booking;
          if (b && sheetUnit) {
            nb.actions.cancel(b.id);
            showToast(
              b.status === "reserved"
                ? `Rezervacija za ${sheetUnit.label} otkazana`
                : `Prodaja ${sheetUnit.label} poništena`,
            );
          }
          setSheetUnit(null);
        }}
      />

      <Toast
        message={toast?.text ?? null}
        actionLabel={toast?.undo ? "Poništi" : undefined}
        onAction={toast?.undo}
      />
    </SafeAreaView>
  );
}

function Counter({ n, label }: { n: number; label: string }) {
  return (
    <View style={s.counter}>
      <Text style={s.counterN}>{n}</Text>
      <Text style={s.small}>{label}</Text>
    </View>
  );
}

function TimedRow({
  unit,
  type,
  bookings,
  now,
  onRent,
  onReturn,
}: {
  unit: Unit;
  type: ItemType;
  bookings: NotebookBooking[];
  now: Date;
  onRent: (payment: PaymentMethod) => void;
  onReturn: (b: NotebookBooking) => void;
}) {
  const st = timedStatus(unit.id, bookings, now);
  const minutes = type.default_duration_min ?? 60;
  return (
    <Card style={[s.timed, st.overdue && s.timedLate]}>
      <View style={{ flex: 1 }}>
        <Subtitle>{unit.label}</Subtitle>
        {st.booking ? (
          <Text style={[s.small, st.overdue && s.late]}>
            {st.overdue
              ? `Kasni ${Math.abs(st.minutesLeft ?? 0)} min · trebao je doći u ${zagrebClock(st.booking.ends_at)}`
              : `Vani do ${zagrebClock(st.booking.ends_at)} · još ${st.minutesLeft} min`}
          </Text>
        ) : (
          <Text style={s.small}>Slobodno · izdaj na {minutes} min</Text>
        )}
      </View>
      {st.booking ? (
        <Button title="Vraćeno" onPress={() => st.booking && onReturn(st.booking)} />
      ) : (
        <Row gap={space.s}>
          <Button title="Gotovina" onPress={() => onRent("cash")} />
          <Button title="Kartica" onPress={() => onRent("card")} />
        </Row>
      )}
    </Card>
  );
}

const STATE_TITLE: Record<UnitState, string> = {
  free: "Slobodno",
  reserved: "Rezervirano",
  sold: "Prodano",
};

function UnitSheet(props: {
  unit: Unit | null;
  typeName: string;
  state: UnitState;
  booking: NotebookBooking | null;
  priceText: string;
  isToday: boolean;
  isPast: boolean;
  onClose: () => void;
  onSell: (payment: PaymentMethod, days: number) => void;
  onReserve: (name: string, phone: string | null) => void;
  onCheckIn: (payment: PaymentMethod) => void;
  onRelease: () => void;
  onCancel: () => void;
}) {
  const { unit, state, booking } = props;
  const [days, setDays] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: novi list za svako mjesto
  useEffect(() => {
    setDays(1);
    setReserving(false);
    setName("");
    setPhone("");
  }, [unit?.id]);

  const title = `${props.typeName} ${unit?.label ?? ""}`;
  const pill =
    state === "sold" && booking?.payment_method
      ? `Prodano · ${PAY_LABEL[booking.payment_method]}`
      : STATE_TITLE[state];

  return (
    <Sheet visible={Boolean(unit)} onClose={props.onClose}>
      <View style={s.sheetHead}>
        <Subtitle>{title}</Subtitle>
        <View style={[s.pill, state === "sold" && s.pillSold]}>
          {state === "reserved" ? <ClockIcon size={14} color={color.buttonText} /> : null}
          <Text style={s.pillText}>{pill}</Text>
        </View>
      </View>
      {props.priceText ? <Body muted>{props.priceText}</Body> : null}

      <View style={s.actions}>
        {props.isPast ? <Body muted>Prošli dan se samo pregledava.</Body> : null}

        {!props.isPast && state === "free" && !reserving ? (
          <>
            {props.isToday ? (
              <>
                <Button
                  title="Prodano · gotovina"
                  onPress={() => props.onSell("cash", days)}
                  block
                />
                <Button
                  title="Prodano · kartica"
                  onPress={() => props.onSell("card", days)}
                  block
                />
                <Stepper
                  label="Broj dana (tjedni najam)"
                  value={days}
                  min={1}
                  max={60}
                  onChange={setDays}
                />
              </>
            ) : null}
            <Button title="Rezerviraj" kind="glass" onPress={() => setReserving(true)} block />
          </>
        ) : null}

        {!props.isPast && state === "free" && reserving ? (
          <>
            <Field label="Ime gosta" value={name} onChangeText={setName} autoFocus />
            <Field
              label="Telefon (neobavezno)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <Body muted>
              Rok dolaska je onaj iz postavki objekta. Nakon roka se rezervacija sama poništava.
            </Body>
            <Button
              title="Spremi rezervaciju"
              disabled={name.trim().length < 1}
              onPress={() => props.onReserve(name.trim(), phone.trim() || null)}
              block
            />
          </>
        ) : null}

        {!props.isPast && state === "reserved" && booking ? (
          <>
            <Body>
              {booking.customer_name ?? "Gost"}
              {booking.customer_phone ? ` · ${booking.customer_phone}` : ""}
            </Body>
            {booking.hold_until ? (
              <Body muted>Mora doći do {zagrebClock(booking.hold_until)}, inače se poništava.</Body>
            ) : null}
            {props.isToday ? (
              <>
                <Button
                  title="Gost je stigao · gotovina"
                  onPress={() => props.onCheckIn("cash")}
                  block
                />
                <Button
                  title="Gost je stigao · kartica"
                  onPress={() => props.onCheckIn("card")}
                  block
                />
              </>
            ) : null}
            <Button title="Otkaži rezervaciju" kind="glass" onPress={props.onCancel} block />
          </>
        ) : null}

        {!props.isPast && state === "sold" && booking ? (
          <>
            {props.isToday ? (
              <Button
                title="Oslobodi (gost je otišao)"
                kind="glass"
                onPress={props.onRelease}
                block
              />
            ) : null}
            <Button title="Poništi prodaju (greška)" kind="text" onPress={props.onCancel} block />
          </>
        ) : null}

        <Button title="Zatvori" kind="text" onPress={props.onClose} block />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.background },
  content: { padding: space.l, gap: space.m, paddingBottom: 120 },
  header: { flexDirection: "row", alignItems: "center", gap: space.m },
  date: { fontFamily: fonts.bodyStrong, fontSize: 13, color: color.textMuted },
  business: { fontFamily: fonts.heading, fontSize: 22, color: color.text },
  sunButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.buttonTop,
    borderBottomWidth: 4,
    borderBottomColor: color.buttonEdge,
  },
  sunButtonOn: { borderWidth: 2, borderColor: "#1F5A55", backgroundColor: color.seaLight },
  dayNav: { width: 44, height: 40, alignItems: "center", justifyContent: "center" },
  revenue: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { fontFamily: fonts.bodyStrong, fontSize: 12.5, color: color.textMuted },
  big: { fontFamily: fonts.heading, fontSize: 30, color: color.text },
  split: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: color.textMuted,
    textAlign: "right",
    lineHeight: 21,
  },
  counter: {
    flex: 1,
    backgroundColor: color.surfaceSea,
    borderRadius: radius.m,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  counterN: { fontFamily: fonts.heading, fontSize: 24, color: color.text },
  chips: { gap: space.s, paddingRight: space.l },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  multiBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: space.s,
    padding: space.m,
    backgroundColor: color.surface,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  multiText: { fontFamily: fonts.bodyStrong, fontSize: 15, color: color.text, marginRight: "auto" },
  timed: { flexDirection: "row", alignItems: "center", gap: space.m, flexWrap: "wrap" },
  timedLate: { borderColor: color.buttonText, borderWidth: 2 },
  late: { color: color.text },
  sheetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: space.m,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: color.buttonTop,
  },
  pillSold: { backgroundColor: color.pressed },
  pillText: { fontFamily: fonts.bodyStrong, fontSize: 13, color: color.buttonText },
  actions: { gap: space.s, marginTop: space.m },
});
