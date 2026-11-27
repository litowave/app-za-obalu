import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { color, sun, unitState } from "./tokens";

describe("kontrast teksta", () => {
  const pairs: [string, string, string][] = [
    ["tekst na pozadini", color.text, color.background],
    ["sporedni tekst na pozadini", color.textMuted, color.background],
    ["poveznica na pozadini", color.link, color.background],
    ["tekst gumba (gore)", color.buttonText, color.buttonTop],
    ["tekst gumba (dolje)", color.buttonText, color.buttonBottom],
    ["prodano", color.pressedText, color.pressed],
    ["tekst na morskoj plohi", color.text, color.seaLight],
    ["sunce: slobodno", sun.freeText, sun.free],
    ["sunce: prodano", sun.soldText, sun.sold],
  ];

  it.each(pairs)("%s je čitljiv (≥ 4,5)", (_name, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("svako stanje mjesta ima čitljiv tekst", () => {
    for (const s of Object.values(unitState)) {
      expect(contrastRatio(s.text, s.background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("stanja mjesta", () => {
  it("ima samo dvije vrste gumba: podignut i utisnut", () => {
    expect(unitState.free.look).toBe("raised");
    expect(unitState.reserved.look).toBe("raised");
    expect(unitState.sold.look).toBe("pressed");
  });

  it("rezervirano se od slobodnog razlikuje samo po satu", () => {
    expect(unitState.reserved.background).toBe(unitState.free.background);
    expect(unitState.reserved.icon).toBe("clock");
    expect(unitState.free.icon).toBe("none");
  });
});
