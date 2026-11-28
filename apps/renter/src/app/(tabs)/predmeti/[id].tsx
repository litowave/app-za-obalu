import {
  centsToInput,
  describeBookingRules,
  PRICE_UNIT_LABEL,
  type PriceUnit,
  parseEurToCents,
  shortClock,
} from "@obala/core";
import type { AssignmentMode, ItemType, Unit } from "@obala/db";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  BookingRulesEditor,
  draftFromRules,
  type RulesDraft,
  rulesFromDraft,
} from "@/components/BookingRulesEditor";
import { LabelChip } from "@/components/LabelChip";
import { SlotsEditor } from "@/components/SlotsEditor";
import {
  Body,
  Button,
  Chip,
  ErrorText,
  Field,
  Label,
  Row,
  Screen,
  SectionHeading,
  Stepper,
  Title,
} from "@/components/ui";
import { useBusiness } from "@/lib/business";
import { errorMessage, supabase } from "@/lib/supabase";

/** Uređivanje vrste predmeta: naziv, cijena, broj komada i vlastite oznake (samo vlasnik). */
export default function UrediPredmet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isOwner, active } = useBusiness();
  const biz = active?.business;
  const [type, setType] = useState<ItemType | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [priceUnit, setPriceUnit] = useState<PriceUnit>("day");
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reservable, setReservable] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentMode>("auto");
  const [customRules, setCustomRules] = useState(false);
  const [rules, setRules] = useState<RulesDraft | null>(null);
  const [resBusy, setResBusy] = useState(false);
  const [resError, setResError] = useState<string | null>(null);
  const [resSaved, setResSaved] = useState(false);

  const load = useCallback(async () => {
    const [t, u] = await Promise.all([
      supabase.from("item_types").select("*").eq("id", id).single(),
      supabase
        .from("units")
        .select("*")
        .eq("item_type_id", id)
        .eq("is_active", true)
        .order("position"),
    ]);
    if (t.data) {
      setType(t.data);
      setName(t.data.name);
      setPrice(centsToInput(t.data.price_cents));
      setPriceUnit(t.data.price_unit);
      setReservable(t.data.reservable);
      setAssignment(t.data.assignment_mode);
      const own =
        t.data.reservation_hold_until != null ||
        t.data.booking_opens_days_before != null ||
        t.data.booking_opens_at != null ||
        t.data.booking_closes_at != null;
      setCustomRules(own);
      setRules(
        draftFromRules({
          hold_until: t.data.reservation_hold_until ?? null,
          opens_days_before: t.data.booking_opens_days_before ?? null,
          opens_at: t.data.booking_opens_at ?? null,
          closes_at: t.data.booking_closes_at ?? null,
        }),
      );
    }
    if (u.data) {
      setUnits(u.data);
      setCount(u.data.length);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!type) return;
    const cents = price.trim() === "" ? null : parseEurToCents(price);
    if (price.trim() !== "" && cents == null) {
      setError("Cijenu upiši kao broj, npr. 15 ili 12,50.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e1 } = await supabase
      .from("item_types")
      .update({ name: name.trim(), price_cents: cents, price_unit: priceUnit })
      .eq("id", type.id);
    let e2 = null;
    if (!e1 && count !== units.length) {
      ({ error: e2 } = await supabase.rpc("set_unit_count", {
        p_item_type_id: type.id,
        p_count: count,
      }));
    }
    setBusy(false);
    if (e1 || e2) {
      setError(errorMessage(e1 ?? e2));
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    await load();
  }

  async function saveReservations() {
    if (!type) return;
    let patch: Partial<ItemType> = {
      reservable,
      assignment_mode: assignment,
      reservation_hold_until: null,
      booking_opens_days_before: null,
      booking_opens_at: null,
      booking_closes_at: null,
    };
    if (customRules && rules) {
      const parsed = rulesFromDraft({ ...rules, holdMode: "time" });
      if ("error" in parsed) {
        setResError(parsed.error);
        return;
      }
      const r = parsed.rules;
      patch = {
        ...patch,
        reservation_hold_until: r.holdUntil,
        booking_opens_days_before: r.opensDaysBefore,
        booking_opens_at: r.opensAt,
        booking_closes_at: r.closesAt,
      };
    }
    setResBusy(true);
    setResError(null);
    const { error: e } = await supabase.from("item_types").update(patch).eq("id", type.id);
    setResBusy(false);
    if (e) {
      setResError(errorMessage(e));
      return;
    }
    setResSaved(true);
    setTimeout(() => setResSaved(false), 2000);
    await load();
  }

  async function rename(unit: Unit, label: string) {
    const v = label.trim();
    if (!v || v === unit.label) return;
    const { error: e } = await supabase.from("units").update({ label: v }).eq("id", unit.id);
    if (e) {
      setError(e.code === "23505" ? `Oznaka "${v}" već postoji.` : errorMessage(e));
      return;
    }
    setUnits((list) => list.map((u) => (u.id === unit.id ? { ...u, label: v } : u)));
  }

  async function archive() {
    if (!type) return;
    const { error: e } = await supabase
      .from("item_types")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", type.id);
    if (e) setError(errorMessage(e));
    else router.back();
  }

  if (!type) return <Screen>{null}</Screen>;

  return (
    <Screen>
      <Button title="‹ Predmeti" kind="text" onPress={() => router.back()} />
      <Title>{type.name}</Title>
      {!isOwner ? <Body muted>Predmete i cijene mijenja vlasnik objekta.</Body> : null}
      <Field label="Naziv" value={name} onChangeText={setName} editable={isOwner} />
      <Field
        label={`Cijena za ${PRICE_UNIT_LABEL[priceUnit]} (€)`}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        editable={isOwner}
      />
      <View>
        <Label>Cijena se računa po</Label>
        <Row>
          {(["day", "hour", "session"] as PriceUnit[]).map((u) => (
            <Chip
              key={u}
              label={PRICE_UNIT_LABEL[u]}
              selected={priceUnit === u}
              onPress={() => isOwner && setPriceUnit(u)}
            />
          ))}
        </Row>
      </View>
      <Stepper
        label="Ukupno komada"
        value={count}
        min={0}
        max={1000}
        onChange={(n) => isOwner && setCount(n)}
      />
      {count < units.length ? (
        <Body muted>
          Zadnjih {units.length - count} kom bit će maknuto iz mreže. Povijest prodaje i izvještaji
          ostaju.
        </Body>
      ) : count > units.length ? (
        <Body muted>Nova mjesta nastavljaju numeraciju.</Body>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {isOwner ? (
        <Button
          title={saved ? "Spremljeno" : "Spremi promjene"}
          onPress={save}
          loading={busy}
          block
        />
      ) : null}

      {priceUnit === "day" ? (
        <>
          <SectionHeading>Dijelovi dana</SectionHeading>
          <SlotsEditor itemTypeId={type.id} businessId={type.business_id} editable={isOwner} />
        </>
      ) : null}

      <SectionHeading>Rezervacije</SectionHeading>
      {biz && !biz.reservations_enabled ? (
        <Body muted>
          Rezervacije su za cijeli objekt isključene. Uključuju se u Postavkama, a ovdje se bira
          koji se predmeti mogu rezervirati.
        </Body>
      ) : null}
      <Row>
        <Chip
          label="Može se rezervirati"
          selected={reservable}
          onPress={() => isOwner && setReservable(true)}
        />
        <Chip
          label="Bez rezervacija"
          selected={!reservable}
          onPress={() => isOwner && setReservable(false)}
        />
      </Row>
      {reservable ? (
        <>
          <View>
            <Label>Tko bira mjesto</Label>
            <Row>
              <Chip
                label="Gost bira sam"
                selected={assignment === "guest_choice"}
                onPress={() => isOwner && setAssignment("guest_choice")}
              />
              <Chip
                label="Automatski, prvo slobodno"
                selected={assignment === "auto"}
                onPress={() => isOwner && setAssignment("auto")}
              />
            </Row>
          </View>
          <View>
            <Label>Rok dolaska i razdoblje</Label>
            <Row>
              <Chip
                label="Kao za cijeli objekt"
                selected={!customRules}
                onPress={() => isOwner && setCustomRules(false)}
              />
              <Chip
                label="Posebno za ovaj predmet"
                selected={customRules}
                onPress={() => isOwner && setCustomRules(true)}
              />
            </Row>
          </View>
          {!customRules && biz ? (
            <Body muted>
              {describeBookingRules({
                holdUntil: shortClock(biz.reservation_hold_until) || null,
                opensDaysBefore: biz.booking_opens_days_before,
                opensAt: shortClock(biz.booking_opens_at),
                closesAt: shortClock(biz.booking_closes_at) || null,
              })}
            </Body>
          ) : null}
          {customRules && rules ? (
            <BookingRulesEditor
              value={rules}
              onChange={setRules}
              allowNoHold={false}
              disabled={!isOwner}
            />
          ) : null}
        </>
      ) : null}
      <ErrorText>{resError}</ErrorText>
      {isOwner ? (
        <Button
          title={resSaved ? "Spremljeno" : "Spremi rezervacije"}
          onPress={saveReservations}
          loading={resBusy}
          block
        />
      ) : null}

      <SectionHeading>Oznake</SectionHeading>
      <Body muted>Dodirni oznaku za vlastiti naziv, npr. „VIP 1” ili „Uz more 3”.</Body>
      <View style={s.labels}>
        {units.map((u) => (
          <LabelChip
            key={u.id}
            label={u.label}
            disabled={!isOwner}
            onCommit={(v) => void rename(u, v)}
          />
        ))}
      </View>

      {isOwner ? (
        <>
          <SectionHeading>Ukloni predmet</SectionHeading>
          <Body muted>
            Predmet nestaje iz bilježnice i ponude. Prošla prodaja ostaje u izvještajima.
          </Body>
          <Button title="Ukloni iz ponude" kind="glass" onPress={archive} />
        </>
      ) : null}
    </Screen>
  );
}

const s = StyleSheet.create({
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
