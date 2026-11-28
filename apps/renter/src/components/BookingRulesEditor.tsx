import {
  type BookingRules,
  bookingRulesError,
  describeBookingRules,
  parseClock,
  shortClock,
} from "@obala/core";
import { View } from "react-native";
import { Body, Chip, Field, Label, Row, Stepper, space } from "./ui";

/** Postavke kako ih vlasnik upisuje: vremena su tekst dok se ne spreme. */
export interface RulesDraft {
  holdMode: "time" | "none";
  hold: string;
  days: number;
  opensAt: string;
  closeMode: "hold" | "time";
  closesAt: string;
}

export function draftFromRules(r: {
  hold_until: string | null;
  opens_days_before: number | null;
  opens_at: string | null;
  closes_at: string | null;
}): RulesDraft {
  return {
    holdMode: r.hold_until ? "time" : "none",
    hold: shortClock(r.hold_until) || "11:00",
    days: r.opens_days_before ?? 7,
    opensAt: shortClock(r.opens_at) || "00:00",
    closeMode: r.closes_at ? "time" : "hold",
    closesAt: shortClock(r.closes_at) || "08:00",
  };
}

/** Pretvara upisano u pravila, ili vraća poruku o grešci. */
export function rulesFromDraft(d: RulesDraft): { rules: BookingRules } | { error: string } {
  const hold = d.holdMode === "time" ? parseClock(d.hold) : null;
  if (d.holdMode === "time" && !hold)
    return { error: "Rok dolaska upiši kao sat, npr. 11 ili 11:30." };
  const opensAt = parseClock(d.opensAt);
  if (!opensAt) return { error: "Vrijeme otvaranja upiši kao sat, npr. 12 ili 0." };
  const closesAt = d.closeMode === "time" ? parseClock(d.closesAt) : null;
  if (d.closeMode === "time" && !closesAt) {
    return { error: "Vrijeme zatvaranja upiši kao sat, npr. 8 ili 8:30." };
  }
  const rules: BookingRules = { holdUntil: hold, opensDaysBefore: d.days, opensAt, closesAt };
  const error = bookingRulesError(rules);
  return error ? { error } : { rules };
}

/**
 * Rok dolaska i razdoblje za rezervacije (specifikacija 6.2.2, 6.2.5, 6.2.6).
 * Ispod polja stoji rečenica s tim što je postavljeno, da vlasnik odmah vidi ako je pogriješio.
 */
export function BookingRulesEditor({
  value,
  onChange,
  allowNoHold = true,
  disabled,
}: {
  value: RulesDraft;
  onChange: (next: RulesDraft) => void;
  allowNoHold?: boolean;
  disabled?: boolean;
}) {
  const set = (patch: Partial<RulesDraft>) => !disabled && onChange({ ...value, ...patch });
  const parsed = rulesFromDraft(value);
  const holdMode = allowNoHold ? value.holdMode : "time";

  return (
    <View style={{ gap: space.m }}>
      <View>
        <Label>Rok dolaska</Label>
        <Body muted>
          Ako gost ne dođe do tada, rezervacija se sama poništava i mjesto je slobodno.
        </Body>
        {allowNoHold ? (
          <Row>
            <Chip
              label="Do određenog sata"
              selected={holdMode === "time"}
              onPress={() => set({ holdMode: "time" })}
            />
            <Chip
              label="Vrijedi cijeli dan"
              selected={holdMode === "none"}
              onPress={() => set({ holdMode: "none" })}
            />
          </Row>
        ) : null}
      </View>
      {holdMode === "time" ? (
        <Field
          label="Gost mora doći do (sat)"
          value={value.hold}
          onChangeText={(hold) => set({ hold })}
          keyboardType="numbers-and-punctuation"
          placeholder="11:00"
          editable={!disabled}
        />
      ) : null}

      <View>
        <Label>Kada se rezervacije otvaraju</Label>
        <Row gap={space.l}>
          <Stepper
            label="Dana unaprijed"
            value={value.days}
            min={0}
            max={60}
            onChange={(days) => set({ days })}
          />
          <View style={{ flex: 1, minWidth: 110 }}>
            <Field
              label="U (sat)"
              value={value.opensAt}
              onChangeText={(opensAt) => set({ opensAt })}
              keyboardType="numbers-and-punctuation"
              placeholder="12:00"
              editable={!disabled}
            />
          </View>
        </Row>
      </View>

      <View>
        <Label>Kada se zatvaraju (na dan dolaska)</Label>
        <Row>
          <Chip
            label={holdMode === "time" ? "U roku dolaska" : "Na kraju dana"}
            selected={value.closeMode === "hold"}
            onPress={() => set({ closeMode: "hold" })}
          />
          <Chip
            label="U određeni sat"
            selected={value.closeMode === "time"}
            onPress={() => set({ closeMode: "time" })}
          />
        </Row>
      </View>
      {value.closeMode === "time" ? (
        <Field
          label="Zatvaraju se u (sat)"
          value={value.closesAt}
          onChangeText={(closesAt) => set({ closesAt })}
          keyboardType="numbers-and-punctuation"
          placeholder="08:00"
          editable={!disabled}
        />
      ) : null}

      <Body muted>{"rules" in parsed ? describeBookingRules(parsed.rules) : parsed.error}</Body>
    </View>
  );
}
