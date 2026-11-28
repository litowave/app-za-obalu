import { describe, expect, it } from "vitest";
import { crowdLevel } from "./crowd";

describe("crowdLevel", () => {
  it.each([
    [0, 0, "unknown"],
    [0, 40, "low"],
    [15, 40, "low"],
    [16, 40, "medium"],
    [30, 40, "high"],
    [40, 40, "full"],
  ] as const)("%i/%i → %s", (occupied, total, expected) => {
    expect(crowdLevel(occupied, total)).toBe(expected);
  });
});
