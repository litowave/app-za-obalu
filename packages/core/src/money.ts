/** Iznosi se u bazi spremaju u centima (specifikacija 6.5). */

const eurFormat = new Intl.NumberFormat("hr-HR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 61000 → "610 €", 1250 → "12,5 €" */
export function formatEur(cents: number | null | undefined): string {
  if (cents == null) return "–";
  return `${eurFormat.format(cents / 100)} €`;
}

/** "12,50", "12.5" ili "12" → 1250. Prazno ili neispravno → null. */
export function parseEurToCents(input: string): number | null {
  const clean = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (clean === "" || !/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** 1250 → "12,5" za polje za unos. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return String(cents / 100).replace(".", ",");
}
