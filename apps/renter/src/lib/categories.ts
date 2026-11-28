import type { BusinessCategory } from "@obala/db";

/** Kategorije objekta (specifikacija 3.3), redom kako ih iznajmljivač bira. */
export const CATEGORIES: { key: BusinessCategory; label: string }[] = [
  { key: "beach", label: "Plaža" },
  { key: "watersports", label: "Vodeni sportovi" },
  { key: "aquapark", label: "Aquapark" },
  { key: "massage", label: "Masaža na plaži" },
  { key: "diving", label: "Škola ronjenja" },
  { key: "self_service", label: "Automat za najam" },
  { key: "other", label: "Ostalo" },
];
