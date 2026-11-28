import {
  formatDayRelative,
  type PaymentMethod,
  type Reservation,
  SOURCE_LABEL,
  telLink,
  zagrebClock,
  zagrebToday,
} from "@obala/core";
import type { Unit } from "@obala/db";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ClockIcon } from "@/components/icons";
import {
  Banner,
  Body,
  Button,
  Card,
  Chip,
  color,
  ErrorText,
  fonts,
  Row,
  radius,
  Screen,
  SectionHeading,
  Sheet,
  Subtitle,
  space,
  Title,
  Toast,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { RESERVATION_DAYS, useReservations } from "@/lib/reservations";

/** Rezervacije za danas i sljedeće dane, poredane po roku dolaska (specifikacija 4.1 I3). */
export default function Rezervacije() {
  const { active, isOwner } = useBusiness();
  const router = useRouter();
  const rz = useReservations();
  const today = zagrebToday();
  const [open, setOpen] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Nova" ostaje vidljiva dok je ekran otvoren, a u bazi se odmah označi kao viđena,
  // da je ne broje ni drugi mobiteli u objektu.
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setHighlight(new Set());
      };
    }, []),
  );
  const { list, markSeen } = rz;
  useEffect(() => {
    if (!focused) return;
    const fresh = list.filter((r) => r.isNew).map((r) => r.key);
    if (fresh.length === 0) return;
    setHighlight((h) => new Set([...h, ...fresh]));
    void markSeen();
  }, [focused, list, markSeen]);

  const days = useMemo(() => {
    const out: { date: string; items: Reservation[] }[] = [];
    for (const r of list) {
      const last = out[out.length - 1];
      if (last && last.date === r.date) last.items.push(r);
      else out.push({ date: r.date, items: [r] });
    }
    return out;
  }, [list]);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }

  const b = active?.business;
  if (!b) return null;
  const anyReservable = [...rz.types.values()].some((t) => t.reservable);

  return (
    <>
      <Screen>
        <Title>Rezervacije</Title>
        <Body muted>
          Danas i sljedećih {RESERVATION_DAYS} dana. Rezervacija se sama poništava ako gost ne dođe
          do roka.
        </Body>
        {rz.offline ? <Banner>Bez veze. Prikazano je stanje od zadnjeg učitavanja.</Banner> : null}

        {!b.reservations_enabled || !anyReservable ? (
          <Card>
            <Body>
              {!b.reservations_enabled
                ? "Turisti zasad ne mogu rezervirati preko aplikacije."
                : "Nijedan predmet nema uključene rezervacije."}{" "}
              {isOwner
                ? "Rezervacije telefonom i dalje upisuješ dugim pritiskom na mjesto u ekranu Danas."
                : "Uključuje ih vlasnik objekta."}
            </Body>
            {isOwner ? (
              <Button
                title={!b.reservations_enabled ? "Uključi u postavkama" : "Otvori predmete"}
                kind="glass"
                onPress={() => router.push(!b.reservations_enabled ? "/postavke" : "/predmeti")}
              />
            ) : null}
          </Card>
        ) : null}

        {!rz.loading && list.length === 0 ? (
          <Body muted>Nema rezervacija za sljedeće dane.</Body>
        ) : null}

        {days.map((d) => (
          <View key={d.date} style={s.day}>
            <SectionHeading>
              {formatDayRelative(d.date, today)} · {d.items.length}
            </SectionHeading>
            {d.items.map((r) => (
              <ReservationCard
                key={r.key}
                r={r}
                isNew={r.isNew || highlight.has(r.key)}
                typeName={rz.types.get(r.itemTypeId)?.name ?? ""}
                slotName={r.slotId ? (rz.slots.get(r.slotId)?.name ?? null) : null}
                labels={r.bookings.map((x) => rz.units.get(x.unitId)?.label ?? "?")}
                onPress={() => setOpen(r)}
              />
            ))}
          </View>
        ))}
      </Screen>

      <ReservationSheet
        r={open}
        today={today}
        isOwner={isOwner}
        onClose={() => setOpen(null)}
        onDone={(text) => {
          setOpen(null);
          showToast(text);
        }}
      />
      <Toast message={toast} />
    </>
  );
}

function ReservationCard(props: {
  r: Reservation;
  isNew: boolean;
  typeName: string;
  slotName: string | null;
  labels: string[];
  onPress: () => void;
}) {
  const { r } = props;
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={`${r.name ?? "Gost"}, ${props.typeName} ${props.labels.join(", ")}`}
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
    >
      <View style={s.cardTop}>
        <Text style={s.name} numberOfLines={1}>
          {r.name || "Gost bez imena"}
        </Text>
        {props.isNew ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>Nova</Text>
          </View>
        ) : null}
        <Text style={s.source}>{SOURCE_LABEL[r.source]}</Text>
      </View>
      <Text style={s.places}>
        {props.typeName} {props.labels.join(", ")}
        {props.slotName ? ` · ${props.slotName}` : ""}
      </Text>
      <View style={s.cardBottom}>
        <View style={s.hold}>
          <ClockIcon size={14} color={color.buttonText} />
          <Text style={s.holdText}>
            {r.holdUntil ? `Rok dolaska ${zagrebClock(r.holdUntil)}` : "Vrijedi cijeli dan"}
          </Text>
        </View>
        {r.phone ? (
          <Pressable
            onPress={() => void Linking.openURL(telLink(r.phone ?? ""))}
            accessibilityRole="link"
            accessibilityLabel={`Nazovi ${r.phone}`}
            hitSlop={8}
          >
            <Text style={s.phone}>{r.phone}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

function ReservationSheet(props: {
  r: Reservation | null;
  today: string;
  isOwner: boolean;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const rz = useReservations();
  const { r } = props;
  const [mode, setMode] = useState<"main" | "move" | "cancel" | "block">("main");
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [free, setFree] = useState<Unit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: novi list za svaku rezervaciju
  useEffect(() => {
    setMode("main");
    setMoveFrom(null);
    setFree(null);
    setError(null);
  }, [r?.key]);

  useEffect(() => {
    if (mode !== "move" || !r) return;
    setMoveFrom(r.bookings.length === 1 ? (r.bookings[0]?.id ?? null) : null);
    setFree(null);
    void rz.freeUnits(r).then(setFree);
  }, [mode, r, rz.freeUnits]);

  if (!r)
    return (
      <Sheet visible={false} onClose={props.onClose}>
        {null}
      </Sheet>
    );

  const labelOf = (unitId: string) => rz.units.get(unitId)?.label ?? "?";
  const labels = r.bookings.map((b) => labelOf(b.unitId)).join(", ");
  const typeName = rz.types.get(r.itemTypeId)?.name ?? "";
  const isToday = r.date === props.today;

  async function run(action: () => Promise<string | null>, done: string) {
    setBusy(true);
    setError(null);
    const e = await action();
    setBusy(false);
    if (e) setError(e);
    else props.onDone(done);
  }

  const pay = (m: PaymentMethod) =>
    run(
      () => rz.checkIn(r, m),
      `${typeName} ${labels}: gost je stigao, ${m === "cash" ? "gotovina" : "kartica"}`,
    );

  return (
    <Sheet visible onClose={props.onClose}>
      <View style={s.sheet}>
        <Subtitle>{r.name || "Gost bez imena"}</Subtitle>
        <Body muted>
          {typeName} {labels}
          {r.slotId && rz.slots.get(r.slotId) ? ` · ${rz.slots.get(r.slotId)?.name}` : ""} ·{" "}
          {formatDayRelative(r.date, props.today).toLowerCase()}
          {r.holdUntil ? ` · rok ${zagrebClock(r.holdUntil)}` : ""}
        </Body>
        {r.phone ? (
          <Button
            title={`Nazovi ${r.phone}`}
            kind="glass"
            onPress={() => void Linking.openURL(telLink(r.phone ?? ""))}
            block
          />
        ) : null}

        {mode === "main" ? (
          <>
            {isToday ? (
              <>
                <SectionHeading>Gost je stigao</SectionHeading>
                <View style={s.payRow}>
                  <View style={s.payCell}>
                    <Button
                      title="Gotovina"
                      onPress={() => void pay("cash")}
                      loading={busy}
                      block
                    />
                  </View>
                  <View style={s.payCell}>
                    <Button title="Kartica" onPress={() => void pay("card")} loading={busy} block />
                  </View>
                </View>
              </>
            ) : null}
            <Button
              title="Premjesti na drugo mjesto"
              kind="glass"
              onPress={() => setMode("move")}
              block
            />
            <Button
              title="Otkaži rezervaciju"
              kind="glass"
              onPress={() => setMode("cancel")}
              block
            />
            {props.isOwner && r.phone ? (
              <Button
                title="Blokiraj broj koji ne dolazi"
                kind="text"
                onPress={() => setMode("block")}
              />
            ) : null}
          </>
        ) : null}

        {mode === "move" ? (
          <>
            {r.bookings.length > 1 ? (
              <View>
                <SectionHeading>Koje mjesto premještaš</SectionHeading>
                <Row>
                  {r.bookings.map((b) => (
                    <Chip
                      key={b.id}
                      label={labelOf(b.unitId)}
                      selected={moveFrom === b.id}
                      onPress={() => setMoveFrom(b.id)}
                    />
                  ))}
                </Row>
              </View>
            ) : null}
            <SectionHeading>Slobodna mjesta</SectionHeading>
            {free == null ? (
              <Body muted>Tražim slobodna mjesta…</Body>
            ) : free.length === 0 ? (
              <Body muted>Za taj dan nema slobodnog mjesta iste vrste.</Body>
            ) : (
              <Row>
                {free.map((u) => (
                  <Chip
                    key={u.id}
                    label={u.label}
                    selected={false}
                    onPress={() => {
                      if (!moveFrom) {
                        setError("Prvo odaberi koje mjesto premještaš.");
                        return;
                      }
                      const from = labelOf(r.bookings.find((b) => b.id === moveFrom)?.unitId ?? "");
                      void run(
                        () => rz.move(moveFrom, u.id),
                        `Gost premješten s ${from} na ${u.label}`,
                      );
                    }}
                  />
                ))}
              </Row>
            )}
            <Button title="Natrag" kind="text" onPress={() => setMode("main")} />
          </>
        ) : null}

        {mode === "cancel" ? (
          <>
            <Body>
              Mjesto {labels} postaje slobodno. Rezervacija ostaje u povijesti kao otkazana.
            </Body>
            <Button
              title="Da, otkaži"
              onPress={() => void run(() => rz.cancel(r), `Rezervacija ${labels} otkazana`)}
              loading={busy}
              block
            />
            <Button title="Natrag" kind="text" onPress={() => setMode("main")} />
          </>
        ) : null}

        {mode === "block" ? (
          <>
            <Body>
              S broja {r.phone} više se ne može rezervirati preko aplikacije. Ova rezervacija ostaje
              dok je ne otkažeš.
            </Body>
            <Button
              title="Blokiraj broj"
              onPress={() => void run(() => rz.block(r), `Broj ${r.phone} je blokiran`)}
              loading={busy}
              block
            />
            <Button title="Natrag" kind="text" onPress={() => setMode("main")} />
          </>
        ) : null}

        <ErrorText>{error}</ErrorText>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  day: { gap: space.s },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.l,
    gap: 6,
  },
  cardPressed: { backgroundColor: color.surfaceSea },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space.s },
  name: { flexShrink: 1, fontFamily: fonts.bodyStrong, fontSize: 17, color: color.text },
  badge: {
    backgroundColor: color.seaLight,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: color.buttonText },
  source: {
    marginLeft: "auto",
    fontFamily: fonts.body,
    fontSize: 13,
    color: color.textMuted,
  },
  places: { fontFamily: fonts.body, fontSize: 15, color: color.text },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hold: { flexDirection: "row", alignItems: "center", gap: 6 },
  holdText: { fontFamily: fonts.bodyStrong, fontSize: 14, color: color.buttonText },
  phone: { fontFamily: fonts.bodyStrong, fontSize: 15, color: color.link },
  sheet: { padding: space.l, gap: space.m },
  payRow: { flexDirection: "row", gap: space.m },
  payCell: { flex: 1 },
});
