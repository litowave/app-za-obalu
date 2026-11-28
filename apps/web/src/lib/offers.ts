import type { BusinessCategory } from "@obala/db";

/**
 * Filtri na karti su po vrsti ponude (kako turist razmišlja), a ne po kategoriji objekta.
 * Vrsta se prepoznaje po predlošku iz kojeg je iznajmljivač dodao predmet (item_types.template_key),
 * a objekt bez predložaka po svojoj kategoriji.
 */
export const OFFER_FILTERS = [
  { key: "cabana", templates: ["cabana", "canopy"], categories: [] },
  { key: "loungers", templates: ["lounger", "set", "umbrella", "beanbag"], categories: ["beach"] },
  { key: "jet_ski", templates: ["jet_ski", "banana", "wakeboard"], categories: [] },
  { key: "sup_kayak", templates: ["sup", "kayak", "canoe"], categories: ["self_service"] },
  { key: "pedalo", templates: ["pedalo"], categories: [] },
  { key: "aquapark", templates: ["aquapark"], categories: ["aquapark"] },
  { key: "massage", templates: ["massage"], categories: ["massage"] },
  { key: "diving", templates: ["diving"], categories: ["diving"] },
] as const satisfies readonly {
  key: string;
  templates: readonly string[];
  categories: readonly BusinessCategory[];
}[];

export type OfferFilter = (typeof OFFER_FILTERS)[number]["key"];

export function isOfferFilter(v: string | undefined | null): v is OfferFilter {
  return OFFER_FILTERS.some((f) => f.key === v);
}

export function matchesOffer(
  b: { offer_keys: string[] | null; category: BusinessCategory },
  filter: OfferFilter,
): boolean {
  const f = OFFER_FILTERS.find((x) => x.key === filter);
  if (!f) return true;
  const keys = b.offer_keys ?? [];
  if (keys.some((k) => (f.templates as readonly string[]).includes(k))) return true;
  return keys.length === 0 && (f.categories as readonly string[]).includes(b.category);
}
