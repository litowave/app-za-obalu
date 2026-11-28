/**
 * Razina gužve koju turist vidi na karti.
 * Pragovi su namjerno grubi: turistu treba "ima mjesta / puno je", ne postotak.
 */

export type CrowdLevel = "unknown" | "low" | "medium" | "high" | "full";

export function crowdLevel(occupied: number, total: number): CrowdLevel {
  if (total <= 0) return "unknown";
  const ratio = occupied / total;
  if (ratio >= 1) return "full";
  if (ratio >= 0.75) return "high";
  if (ratio >= 0.4) return "medium";
  return "low";
}
