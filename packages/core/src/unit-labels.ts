/**
 * Automatsko numeriranje jedinica (ležaljki, suncobrana, pedalina...).
 *
 * Ista pravila postoje i u bazi (`public.unit_label()`), jer baza stvara jedinice.
 * Ovdje služe za pregled u sučelju prije spremanja. Test u `unit-labels.test.ts`
 * i pgTAP test `supabase/tests/database/units.test.sql` provjeravaju iste primjere.
 */

export type LabelStyle = "number" | "letter";

/** 1 → A, 26 → Z, 27 → AA, 28 → AB ... (kao stupci u Excelu). */
export function toLetters(position: number): string {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(`Pozicija mora biti cijeli broj veći od 0, dobiveno: ${position}`);
  }
  let n = position;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function unitLabel(style: LabelStyle, position: number, prefix = ""): string {
  const core = style === "letter" ? toLetters(position) : String(position);
  return `${prefix}${core}`;
}

/** Oznake za `count` novih jedinica, počevši od pozicije `start` (1 = prva). */
export function unitLabels(style: LabelStyle, count: number, prefix = "", start = 1): string[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Broj jedinica mora biti cijeli broj ≥ 0, dobiveno: ${count}`);
  }
  return Array.from({ length: count }, (_, i) => unitLabel(style, start + i, prefix));
}
