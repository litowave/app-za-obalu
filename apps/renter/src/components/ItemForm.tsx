import {
  CUSTOM_TEMPLATE_KEY,
  centsToInput,
  type LabelStyle,
  PRICE_UNIT_LABEL,
  type PriceUnit,
  parseEurToCents,
  unitLabel,
} from "@obala/core";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { inputFromTemplate, type NewItemInput } from "@/lib/items";
import { LabelChip } from "./LabelChip";
import { TemplatePicker } from "./TemplatePicker";
import { Body, Button, Chip, ErrorText, Field, Label, Row, Stepper, space } from "./ui";

const MAX_PREVIEW = 120;

/**
 * Dodavanje predmeta: izbor iz padajućeg izbornika ili vlastiti naziv, ukupan broj,
 * oznaka i cijena. Sustav sam numerira; dodirom na oznaku upisuje se vlastiti naziv.
 */
export function ItemForm({
  businessId,
  onSave,
  saveLabel,
}: {
  businessId: string;
  onSave: (input: NewItemInput) => Promise<void>;
  saveLabel?: (count: number) => string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [form, setForm] = useState<NewItemInput | null>(null);
  const [price, setPrice] = useState("");
  const [labels, setLabels] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<NewItemInput>) => setForm((f) => (f ? { ...f, ...patch } : f));

  async function save() {
    if (!form) return;
    if (form.name.trim().length < 1) {
      setError("Upiši naziv predmeta.");
      return;
    }
    const cents = price.trim() === "" ? null : parseEurToCents(price);
    if (price.trim() !== "" && cents == null) {
      setError("Cijenu upiši kao broj, npr. 15 ili 12,50.");
      return;
    }
    const used = new Set<string>();
    for (let i = 1; i <= form.count; i++) {
      const l = (labels[i] ?? unitLabel(form.labelStyle, i, form.prefix)).trim();
      if (used.has(l)) {
        setError(`Oznaka "${l}" se ponavlja. Oznake moraju biti različite.`);
        return;
      }
      used.add(l);
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...form, priceCents: cents, customLabels: labels });
      setPicked(null);
      setForm(null);
      setLabels({});
    } catch (e) {
      setError((e as { message?: string }).message ?? "Spremanje nije uspjelo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.wrap}>
      <TemplatePicker
        value={picked}
        onSelect={(t) => {
          setPicked(t.name);
          setForm(inputFromTemplate(businessId, t));
          setPrice(centsToInput(Math.round(t.priceEur * 100)));
          setLabels({});
        }}
        onCustom={() => {
          setPicked(CUSTOM_TEMPLATE_KEY);
          setForm({
            businessId,
            name: "",
            templateKey: CUSTOM_TEMPLATE_KEY,
            prefix: "N",
            labelStyle: "number",
            count: form?.count ?? 4,
            priceCents: null,
            priceUnit: "day",
            durationMin: null,
          });
          setPrice("");
          setLabels({});
        }}
      />

      {form ? (
        <>
          <Field
            label="Naziv (možeš ga promijeniti)"
            value={form.name}
            onChangeText={(name) => set({ name })}
            placeholder="npr. Ležaljke prvi red"
            autoFocus={picked === CUSTOM_TEMPLATE_KEY}
          />
          <Row gap={space.l}>
            <Stepper
              label="Ukupno komada"
              value={form.count}
              min={1}
              max={500}
              onChange={(count) => set({ count })}
            />
            <View style={{ flex: 1, minWidth: 110 }}>
              <Field
                label="Oznaka ispred broja"
                value={form.prefix}
                onChangeText={(prefix) => {
                  set({ prefix: prefix.slice(0, 10) });
                  setLabels({});
                }}
                autoCapitalize="characters"
                placeholder="bez oznake"
              />
            </View>
          </Row>
          <View>
            <Label>Numeriranje</Label>
            <Row>
              {(["number", "letter"] as LabelStyle[]).map((st) => (
                <Chip
                  key={st}
                  label={st === "number" ? "Brojevi 1, 2, 3" : "Slova A, B, C"}
                  selected={form.labelStyle === st}
                  onPress={() => {
                    set({ labelStyle: st });
                    setLabels({});
                  }}
                />
              ))}
            </Row>
          </View>
          <Row gap={space.l}>
            <View style={{ flex: 1, minWidth: 120 }}>
              <Field
                label={`Cijena za ${PRICE_UNIT_LABEL[form.priceUnit]} (€)`}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="npr. 15"
              />
            </View>
          </Row>
          <View>
            <Label>Cijena se računa po</Label>
            <Row>
              {(["day", "hour", "session"] as PriceUnit[]).map((u) => (
                <Chip
                  key={u}
                  label={PRICE_UNIT_LABEL[u]}
                  selected={form.priceUnit === u}
                  onPress={() =>
                    set({
                      priceUnit: u,
                      durationMin: u === "day" ? null : (form.durationMin ?? 60),
                    })
                  }
                />
              ))}
            </Row>
          </View>
          {form.priceUnit !== "day" ? (
            <Stepper
              label="Trajanje jednog izdavanja (min)"
              value={form.durationMin ?? 60}
              min={5}
              max={600}
              onChange={(durationMin) => set({ durationMin })}
            />
          ) : null}

          <View>
            <Label>Oznake</Label>
            <View style={s.labels}>
              {Array.from({ length: Math.min(form.count, MAX_PREVIEW) }, (_, i) => i + 1).map(
                (pos) => {
                  const auto = unitLabel(form.labelStyle, pos, form.prefix);
                  const custom = labels[pos];
                  return (
                    <LabelChip
                      key={pos}
                      label={custom ?? auto}
                      custom={Boolean(custom)}
                      onCommit={(v) =>
                        setLabels((prev) => {
                          const next = { ...prev };
                          if (v && v !== auto) next[pos] = v;
                          else delete next[pos];
                          return next;
                        })
                      }
                    />
                  );
                },
              )}
            </View>
            <Body muted>
              {form.count > MAX_PREVIEW
                ? `Prikazano prvih ${MAX_PREVIEW}. Ostale oznake možeš promijeniti nakon spremanja.`
                : "Dodirni oznaku za vlastiti naziv, npr. „Prvi red 1”."}
            </Body>
          </View>
          <ErrorText>{error}</ErrorText>
          <Button
            title={saveLabel ? saveLabel(form.count) : `Spremi ${form.count} kom`}
            onPress={save}
            loading={saving}
            block
          />
        </>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: space.l },
  labels: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
});
