/**
 * Razina gužve koju turist vidi na karti (specifikacija 3.2). Turist nikad ne vidi postotak.
 *
 * Isti pragovi su u bazi (`public.crowd_level_for()`), koja razinu računa za kartu.
 * Ovdje služe za prikaz i za ekran "Danas" u aplikaciji iznajmljivača.
 *
 * no_data: iznajmljivač danas još ništa nije označio, pa ne smijemo reći "prazno".
 */

export type CrowdLevel = "no_data" | "empty" | "few" | "moderate" | "busy" | "full";

export const CROWD_LEVELS: readonly CrowdLevel[] = [
  "no_data",
  "empty",
  "few",
  "moderate",
  "busy",
  "full",
];

export function crowdLevel(occupied: number, total: number): CrowdLevel {
  if (total <= 0) return "no_data";
  if (occupied >= total) return "full";
  const ratio = occupied / total;
  if (ratio >= 0.75) return "busy";
  if (ratio >= 0.5) return "moderate";
  if (ratio >= 0.2) return "few";
  return "empty";
}
