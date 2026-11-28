import { centsToInput, parseClock, parseEurToCents, shortClock } from "@obala/core";
import type { ItemTypeSlot } from "@obala/db";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { errorMessage, supabase } from "@/lib/supabase";
import { Body, Button, Card, Chip, ErrorText, Field, Row, space } from "./ui";

interface SlotDraft {
  id: string | null;
  name: string;
  from: string;
  toSunset: boolean;
  to: string;
  price: string;
  reservable: boolean;
}

function toDraft(s: ItemTypeSlot): SlotDraft {
  return {
    id: s.id,
    name: s.name,
    from: shortClock(s.starts_at),
    toSunset: s.ends_at == null,
    to: shortClock(s.ends_at) || "15:00",
    price: centsToInput(s.price_cents),
    reservable: s.reservable,
  };
}

/**
 * Dijelovi dana za vrstu predmeta (specifikacija 6.1.3): npr. cijeli dan, 1. polovica
 * i 2. polovica, svaki sa svojom cijenom i oznakom može li se rezervirati.
 */
export function SlotsEditor({
  itemTypeId,
  businessId,
  editable,
  onChanged,
}: {
  itemTypeId: string;
  businessId: string;
  editable: boolean;
  onChanged?: () => void;
}) {
  const [drafts, setDrafts] = useState<SlotDraft[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("item_type_slots")
      .select("*")
      .eq("item_type_id", itemTypeId)
      .is("archived_at", null)
      .order("sort_order");
    setDrafts((data ?? []).map(toDraft));
  }, [itemTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (i: number, p: Partial<SlotDraft>) =>
    setDrafts((list) => list.map((d, j) => (j === i ? { ...d, ...p } : d)));

  async function save(i: number) {
    const d = drafts[i];
    if (!d) return;
    const from = parseClock(d.from);
    const to = d.toSunset ? null : parseClock(d.to);
    if (d.name.trim().length < 1) return setError("Upiši naziv, npr. „1. polovica”.");
    if (!from) return setError("Početak upiši kao sat, npr. 9.");
    if (!d.toSunset && !to) return setError("Kraj upiši kao sat, npr. 15.");
    if (to && from && to <= from) return setError("Kraj mora biti nakon početka.");
    const cents = d.price.trim() === "" ? null : parseEurToCents(d.price);
    if (d.price.trim() !== "" && cents == null) return setError("Cijenu upiši kao broj, npr. 50.");
    setBusy(i);
    setError(null);
    const row = {
      name: d.name.trim(),
      starts_at: from,
      ends_at: to,
      price_cents: cents,
      reservable: d.reservable,
    };
    const { error: e } = d.id
      ? await supabase.from("item_type_slots").update(row).eq("id", d.id)
      : await supabase.from("item_type_slots").insert({
          ...row,
          item_type_id: itemTypeId,
          business_id: businessId,
          sort_order: i + 1,
        });
    setBusy(null);
    if (e) return setError(errorMessage(e));
    await load();
    onChanged?.();
  }

  async function remove(i: number) {
    const d = drafts[i];
    if (!d) return;
    if (!d.id) {
      setDrafts((list) => list.filter((_, j) => j !== i));
      return;
    }
    const { error: e } = await supabase
      .from("item_type_slots")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", d.id);
    if (e) return setError(errorMessage(e));
    await load();
    onChanged?.();
  }

  return (
    <View style={{ gap: space.m }}>
      {drafts.length === 0 ? (
        <Body muted>Prodaje se samo cijeli dan. Dodaj dijelove dana ako ih prodaješ odvojeno.</Body>
      ) : null}
      {drafts.map((d, i) => (
        <Card key={d.id ?? `novi-${i}`} style={{ gap: space.m }}>
          <Field
            label="Naziv"
            value={d.name}
            onChangeText={(name) => patch(i, { name })}
            placeholder="npr. 1. polovica"
            editable={editable}
          />
          <Row gap={space.m}>
            <View style={{ flex: 1, minWidth: 90 }}>
              <Field
                label="Od (sat)"
                value={d.from}
                onChangeText={(from) => patch(i, { from })}
                keyboardType="numbers-and-punctuation"
                editable={editable}
              />
            </View>
            {!d.toSunset ? (
              <View style={{ flex: 1, minWidth: 90 }}>
                <Field
                  label="Do (sat)"
                  value={d.to}
                  onChangeText={(to) => patch(i, { to })}
                  keyboardType="numbers-and-punctuation"
                  editable={editable}
                />
              </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 90 }}>
              <Field
                label="Cijena (€)"
                value={d.price}
                onChangeText={(price) => patch(i, { price })}
                keyboardType="decimal-pad"
                placeholder="kao predmet"
                editable={editable}
              />
            </View>
          </Row>
          <Row>
            <Chip
              label="Do sata"
              selected={!d.toSunset}
              onPress={() => editable && patch(i, { toSunset: false })}
            />
            <Chip
              label="Do zalaska sunca"
              selected={d.toSunset}
              onPress={() => editable && patch(i, { toSunset: true })}
            />
          </Row>
          <Row>
            <Chip
              label="Može se rezervirati"
              selected={d.reservable}
              onPress={() => editable && patch(i, { reservable: true })}
            />
            <Chip
              label="Samo na licu mjesta"
              selected={!d.reservable}
              onPress={() => editable && patch(i, { reservable: false })}
            />
          </Row>
          {editable ? (
            <Row>
              <Button title="Spremi" onPress={() => void save(i)} loading={busy === i} />
              <Button title="Ukloni" kind="text" onPress={() => void remove(i)} />
            </Row>
          ) : null}
        </Card>
      ))}
      <ErrorText>{error}</ErrorText>
      {editable ? (
        <Button
          title="Dodaj dio dana"
          kind="glass"
          onPress={() =>
            setDrafts((list) => [
              ...list,
              {
                id: null,
                name: list.length === 0 ? "Cijeli dan" : "",
                from: "09:00",
                toSunset: list.length === 0,
                to: "15:00",
                price: "",
                reservable: true,
              },
            ])
          }
        />
      ) : null}
      <Body muted>
        Kraj „do zalaska sunca” sustav sam računa za lokaciju objekta i datum. Cijeli dan zauzima
        sve dijelove dana.
      </Body>
    </View>
  );
}
