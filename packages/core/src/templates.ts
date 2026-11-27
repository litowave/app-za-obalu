/**
 * Gotovi predmeti za padajući izbornik (specifikacija 3.3 i odobreni prototip).
 * Predložak samo popuni polja; naziv, oznaku, broj i cijenu iznajmljivač uvijek može promijeniti.
 */

import type { LabelStyle } from "./unit-labels";

export type PriceUnit = "day" | "half_day" | "hour" | "session";

export interface ItemTemplate {
  key: string;
  group: string;
  name: string;
  prefix: string;
  labelStyle: LabelStyle;
  count: number;
  priceEur: number;
  priceUnit: PriceUnit;
  /** Za satni najam: koliko traje jedno izdavanje. */
  durationMin?: number;
}

export const TEMPLATES: readonly ItemTemplate[] = [
  {
    key: "lounger",
    group: "Plaža",
    name: "Ležaljke",
    prefix: "L",
    labelStyle: "number",
    count: 20,
    priceEur: 15,
    priceUnit: "day",
  },
  {
    key: "set",
    group: "Plaža",
    name: "Kompleti (2 ležaljke + suncobran)",
    prefix: "K",
    labelStyle: "number",
    count: 10,
    priceEur: 35,
    priceUnit: "day",
  },
  {
    key: "umbrella",
    group: "Plaža",
    name: "Suncobrani",
    prefix: "S",
    labelStyle: "number",
    count: 12,
    priceEur: 10,
    priceUnit: "day",
  },
  {
    key: "cabana",
    group: "Plaža",
    name: "Cabane",
    prefix: "",
    labelStyle: "letter",
    count: 6,
    priceEur: 90,
    priceUnit: "day",
  },
  {
    key: "canopy",
    group: "Plaža",
    name: "Baldahini",
    prefix: "B",
    labelStyle: "number",
    count: 4,
    priceEur: 60,
    priceUnit: "day",
  },
  {
    key: "beanbag",
    group: "Plaža",
    name: "Vreće za sjedenje",
    prefix: "V",
    labelStyle: "number",
    count: 10,
    priceEur: 10,
    priceUnit: "day",
  },
  {
    key: "trampoline",
    group: "Plaža",
    name: "Trampolini",
    prefix: "T",
    labelStyle: "number",
    count: 2,
    priceEur: 5,
    priceUnit: "session",
    durationMin: 15,
  },
  {
    key: "pedalo",
    group: "Vodeni sportovi",
    name: "Pedaline",
    prefix: "P",
    labelStyle: "number",
    count: 6,
    priceEur: 15,
    priceUnit: "hour",
    durationMin: 60,
  },
  {
    key: "jet_ski",
    group: "Vodeni sportovi",
    name: "Jet ski",
    prefix: "J",
    labelStyle: "number",
    count: 3,
    priceEur: 60,
    priceUnit: "session",
    durationMin: 30,
  },
  {
    key: "sup",
    group: "Vodeni sportovi",
    name: "SUP daske",
    prefix: "SUP",
    labelStyle: "number",
    count: 8,
    priceEur: 15,
    priceUnit: "hour",
    durationMin: 60,
  },
  {
    key: "kayak",
    group: "Vodeni sportovi",
    name: "Kajaci",
    prefix: "KJ",
    labelStyle: "number",
    count: 6,
    priceEur: 15,
    priceUnit: "hour",
    durationMin: 60,
  },
  {
    key: "canoe",
    group: "Vodeni sportovi",
    name: "Kanui",
    prefix: "KN",
    labelStyle: "number",
    count: 4,
    priceEur: 15,
    priceUnit: "hour",
    durationMin: 60,
  },
  {
    key: "banana",
    group: "Vodeni sportovi",
    name: "Gumene banane",
    prefix: "GB",
    labelStyle: "number",
    count: 1,
    priceEur: 20,
    priceUnit: "session",
    durationMin: 15,
  },
  {
    key: "wakeboard",
    group: "Vodeni sportovi",
    name: "Vodene skije i wakeboard",
    prefix: "W",
    labelStyle: "number",
    count: 2,
    priceEur: 50,
    priceUnit: "session",
    durationMin: 15,
  },
  {
    key: "diving",
    group: "Vodeni sportovi",
    name: "Ronilačka oprema",
    prefix: "R",
    labelStyle: "number",
    count: 8,
    priceEur: 30,
    priceUnit: "session",
    durationMin: 120,
  },
  {
    key: "aquapark",
    group: "Zabava",
    name: "Aquapark (ulaznice)",
    prefix: "A",
    labelStyle: "number",
    count: 50,
    priceEur: 15,
    priceUnit: "day",
  },
  {
    key: "massage",
    group: "Usluge",
    name: "Kućice za masažu",
    prefix: "M",
    labelStyle: "number",
    count: 2,
    priceEur: 40,
    priceUnit: "session",
    durationMin: 60,
  },
  {
    key: "self_service",
    group: "Usluge",
    name: "Automat za najam",
    prefix: "AU",
    labelStyle: "number",
    count: 1,
    priceEur: 5,
    priceUnit: "hour",
    durationMin: 60,
  },
];

export const CUSTOM_TEMPLATE_KEY = "custom";

/** Skupine redom kako se pojavljuju u izborniku. */
export function templateGroups(): { group: string; items: ItemTemplate[] }[] {
  const out: { group: string; items: ItemTemplate[] }[] = [];
  for (const t of TEMPLATES) {
    let g = out.find((x) => x.group === t.group);
    if (!g) {
      g = { group: t.group, items: [] };
      out.push(g);
    }
    g.items.push(t);
  }
  return out;
}

/** Satni najam i termini prikazuju se kao popis s mjeračem vremena, a ne kao mreža. */
export function isTimedUnit(priceUnit: PriceUnit): boolean {
  return priceUnit === "hour" || priceUnit === "session";
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = {
  day: "dan",
  half_day: "pola dana",
  hour: "sat",
  session: "termin",
};
