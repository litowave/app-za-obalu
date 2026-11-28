import { describe, expect, it } from "vitest";
import { toLetters, unitLabel, unitLabels } from "./unit-labels";

describe("toLetters", () => {
  it.each([
    [1, "A"],
    [26, "Z"],
    [27, "AA"],
    [28, "AB"],
    [52, "AZ"],
    [53, "BA"],
    [702, "ZZ"],
    [703, "AAA"],
  ])("%i → %s", (position, expected) => {
    expect(toLetters(position)).toBe(expected);
  });

  it("odbija nulu i negativne brojeve", () => {
    expect(() => toLetters(0)).toThrow(RangeError);
    expect(() => toLetters(-3)).toThrow(RangeError);
  });
});

describe("unitLabels", () => {
  it("numerira od 1", () => {
    expect(unitLabels("number", 3)).toEqual(["1", "2", "3"]);
  });

  it("dodaje prefiks", () => {
    expect(unitLabels("number", 2, "L")).toEqual(["L1", "L2"]);
    expect(unitLabel("letter", 2, "Red ")).toBe("Red B");
  });

  it("nastavlja od zadane pozicije kad se dodaju nove jedinice", () => {
    expect(unitLabels("letter", 3, "", 26)).toEqual(["Z", "AA", "AB"]);
  });

  it("vraća prazan niz za 0 jedinica", () => {
    expect(unitLabels("number", 0)).toEqual([]);
  });
});
