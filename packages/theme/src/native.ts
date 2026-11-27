/**
 * Stilovi za React Native (aplikacija za iznajmljivače). Obični objekti, bez uvoza
 * react-native, pa se mogu ubaciti u StyleSheet.create ili koristiti izravno.
 *
 * React Native ne zna prijelaz boja bez dodatne biblioteke, pa je 3D gumb ovdje
 * puna boja + donji rub (borderBottom) + sjena. Pritisnuto stanje spušta gumb.
 */

import { color, depth, radius, sun, touch, type UnitState, unitState } from "./tokens";

const raisedBase = {
  backgroundColor: color.buttonTop,
  borderBottomWidth: depth.raised,
  borderBottomColor: color.buttonEdge,
  shadowColor: "#46827D",
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

const pressedBase = {
  backgroundColor: color.pressed,
  borderBottomWidth: 0,
  marginTop: depth.pressedOffset,
  shadowOpacity: 0,
  elevation: 0,
} as const;

export const button = {
  primary: {
    ...raisedBase,
    minHeight: touch.button + 4,
    borderRadius: radius.pill,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryPressed: { borderBottomWidth: 1, marginTop: depth.pressedOffset, elevation: 1 },
  primaryText: { color: color.buttonText, fontSize: 16, fontWeight: "600" },
} as const;

export function unitStyle(state: UnitState, opts: { sunMode?: boolean } = {}) {
  const s = unitState[state];
  const base = {
    minWidth: touch.unit,
    minHeight: touch.unit,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const look = s.look === "raised" ? raisedBase : pressedBase;
  const style = { ...base, ...look };
  if (!opts.sunMode) return style;
  return s.look === "raised"
    ? {
        ...style,
        backgroundColor: sun.free,
        borderWidth: 2,
        borderColor: sun.border,
        borderBottomWidth: depth.raised,
      }
    : { ...style, backgroundColor: sun.sold, borderWidth: 2, borderColor: sun.soldBorder };
}

export function unitTextStyle(state: UnitState, opts: { sunMode?: boolean } = {}) {
  const s = unitState[state];
  const text = opts.sunMode ? (s.look === "raised" ? sun.freeText : sun.soldText) : s.text;
  return { color: text, fontSize: opts.sunMode ? 17 : 15, fontWeight: "600" } as const;
}

export const card = {
  backgroundColor: color.surface,
  borderRadius: radius.m,
  borderWidth: 1,
  borderColor: color.border,
  padding: 14,
} as const;
