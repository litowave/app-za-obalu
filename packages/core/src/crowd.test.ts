import { describe, expect, it } from "vitest";
import { crowdLevel } from "./crowd";

// Iste granice kao pgTAP test supabase/tests/database/06_crowd_qr_privacy.test.sql
describe("crowdLevel", () => {
  it.each([
    [0, 0, "no_data"],
    [0, 100, "empty"],
    [19, 100, "empty"],
    [20, 100, "few"],
    [49, 100, "few"],
    [50, 100, "moderate"],
    [75, 100, "busy"],
    [99, 100, "busy"],
    [100, 100, "full"],
  ] as const)("%i/%i → %s", (occupied, total, expected) => {
    expect(crowdLevel(occupied, total)).toBe(expected);
  });
});
