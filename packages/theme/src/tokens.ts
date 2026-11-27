/**
 * Lito tema: jedna nježna plavkasto-zelena boja u nekoliko svjetlina, bijela pozadina.
 * Roza i narančasta postoje samo u logotipu (assets/lito-logo.png) i ne koriste se u sučelju.
 * Odobreno 27.11.2026. (prototip: https://claude.ai/artifact/TFu9EwXHUvNySni5dkRzN4).
 */

import type { CrowdLevel } from "./crowd-level";

export const color = {
  /** Pozadina ekrana. */
  background: "#FFFFFF",
  /** Kartice i liste. */
  surface: "#FFFFFF",
  /** Tanki rub kartica, da se ne stope s bijelom pozadinom. */
  border: "#E6F1EF",
  /** Blaga morska ploha (pločice, odabrano, sekcije). */
  surfaceSea: "#EEF7F5",
  seaLight: "#D3EEEA",

  /** Glavni tekst. */
  text: "#2F4644",
  /** Opisi, oznake, sporedni tekst. */
  textMuted: "#5C7270",
  /** Poveznice i naglašen tekst. */
  link: "#2F6E6A",

  /** 3D gumb: gornji i donji dio prijelaza, donji rub i tekst. */
  buttonTop: "#E3F5F2",
  buttonBottom: "#B5DDD7",
  buttonEdge: "#86BFB7",
  buttonText: "#1F5A55",

  /** Utisnuto i zasivljeno (prodano mjesto). */
  pressed: "#DDE6E4",
  pressedText: "#4F6563",

  focus: "#6FB3AE",
} as const;

/** Logotip ima svoje boje i one se ne koriste drugdje u sučelju. */
export const brand = {
  logoPink: "#FB3869",
  logoOrange: "#FC9D48",
} as const;

/**
 * Stanje mjesta u aplikaciji za iznajmljivače. Samo dvije vrste gumba:
 * slobodno i rezervirano su podignut svijetli gumb (rezervirano ima mali sat),
 * prodano je utisnuto i zasivljeno, s kvačicom.
 */
export type UnitState = "free" | "reserved" | "sold";

export const unitState: Record<
  UnitState,
  { look: "raised" | "pressed"; background: string; text: string; icon: "none" | "clock" | "check" }
> = {
  free: { look: "raised", background: color.buttonTop, text: color.buttonText, icon: "none" },
  reserved: { look: "raised", background: color.buttonTop, text: color.buttonText, icon: "clock" },
  sold: { look: "pressed", background: color.pressed, text: color.pressedText, icon: "check" },
};

/** Gužva za turiste: ista boja, sve tamnija. Uz boju uvijek ide i tekst razine. */
export const crowd: Record<CrowdLevel, string> = {
  no_data: "#C9D6D4",
  empty: "#B5DDD7",
  few: "#8CC5BF",
  moderate: "#5FA8A3",
  busy: "#2F6E6A",
  full: "#1F4F4B",
};

/** Grafovi u izvještaju: ljestvica iste boje. Uz grafove uvijek legenda i prikaz kao tablica. */
export const chart = ["#2F7A74", "#5FA8A3", "#93CAC4", "#C4E3DF"] as const;

/** Toplinska karta po satima (manje → više). */
export const heat = ["#E6F3F1", "#C3E2DE", "#97CBC6", "#6FB3AE", "#4E9893"] as const;

/** Način za jako sunce: obrubi i malo jače iste boje. */
export const sun = {
  border: "#1F5A55",
  free: "#C9E8E3",
  freeText: "#0F2F2C",
  sold: "#CBD6D4",
  soldBorder: "#3E5452",
  soldText: "#2A3A39",
} as const;

export const font = {
  /** Naslovi i velike brojke. Zaobljen kao slova u logotipu. */
  heading: "Poppins",
  /** Sav ostali tekst. */
  body: "Inter",
  headingStack: '"Poppins", ui-rounded, "Segoe UI", system-ui, sans-serif',
  bodyStack: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Veličine u pikselima. */
export const fontSize = {
  label: 12.5,
  body: 15,
  subtitle: 16,
  title: 24,
  number: 30,
} as const;

export const radius = { s: 12, m: 18, l: 28, pill: 999 } as const;

export const space = { xs: 4, s: 8, m: 12, l: 16, xl: 24 } as const;

/** Najmanja visina gumba i mjesta u mreži, da se lako pogode prstom. */
export const touch = { button: 48, unit: 56 } as const;

/** Visina donjeg ruba 3D gumba i koliko se gumb spusti kad se pritisne. */
export const depth = { raised: 4, pressedOffset: 3 } as const;
