import { describe, expect, it } from "vitest";
import {
  bookingRulesError,
  describeBookingRules,
  groupReservations,
  parseClock,
  type ReservationRow,
  telLink,
  type UnitRef,
} from "./reservations";

const units = new Map<string, UnitRef>([
  ["k1", { item_type_id: "komplet", position: 1 }],
  ["k2", { item_type_id: "komplet", position: 2 }],
  ["k3", { item_type_id: "komplet", position: 3 }],
  ["c1", { item_type_id: "cabana", position: 1 }],
]);

function row(p: Partial<ReservationRow> & { id: string; unit_id: string }): ReservationRow {
  return {
    service_date: "2027-07-18",
    slot_id: null,
    status: "reserved",
    hold_until: "2027-07-18T09:00:00Z",
    customer_name: "Ana",
    customer_phone: "091 123 4567",
    group_id: p.id,
    source: "phone",
    seen_at: null,
    created_at: "2027-07-17T10:00:00Z",
    ...p,
  };
}

const NOW = new Date("2027-07-18T06:00:00Z");

describe("groupReservations", () => {
  it("spaja mjesta istog gosta i poreda ih kao u mreži", () => {
    const list = groupReservations(
      [
        row({ id: "a2", unit_id: "k3", group_id: "g", source: "tourist_app" }),
        row({ id: "a1", unit_id: "k1", group_id: "g", source: "tourist_app" }),
      ],
      units,
      NOW,
    );
    expect(list).toHaveLength(1);
    expect(list[0]?.bookings.map((b) => b.unitId)).toEqual(["k1", "k3"]);
    expect(list[0]?.isNew).toBe(true);
  });

  it("izostavlja istekle, otkazane i prodane", () => {
    const list = groupReservations(
      [
        row({ id: "x", unit_id: "k1", hold_until: "2027-07-18T05:00:00Z" }),
        row({ id: "y", unit_id: "k2", status: "cancelled" }),
        row({ id: "z", unit_id: "k3", status: "sold" }),
      ],
      units,
      NOW,
    );
    expect(list).toEqual([]);
  });

  it("poreda po danu, pa po roku dolaska, bez roka na kraju", () => {
    const list = groupReservations(
      [
        row({ id: "kasno", unit_id: "k1", hold_until: "2027-07-18T10:00:00Z" }),
        row({ id: "bez", unit_id: "k2", hold_until: null }),
        row({ id: "rano", unit_id: "c1", hold_until: "2027-07-18T07:00:00Z" }),
        row({ id: "sutra", unit_id: "k3", service_date: "2027-07-19", hold_until: null }),
      ],
      units,
      NOW,
    );
    expect(list.map((r) => r.groupId)).toEqual(["rano", "kasno", "bez", "sutra"]);
  });

  it("rezervacija telefonom i viđena iz aplikacije nisu nove", () => {
    const list = groupReservations(
      [
        row({ id: "t", unit_id: "k1" }),
        row({ id: "v", unit_id: "k2", source: "tourist_app", seen_at: "2027-07-17T11:00:00Z" }),
      ],
      units,
      NOW,
    );
    expect(list.every((r) => !r.isNew)).toBe(true);
  });
});

describe("parseClock", () => {
  it.each([
    ["12", "12:00"],
    ["9:15", "09:15"],
    ["12.30", "12:30"],
    ["8,05", "08:05"],
    ["1230", "12:30"],
    ["12h", "12:00"],
  ])("%s → %s", (input, out) => expect(parseClock(input)).toBe(out));

  it.each(["", "25", "12:60", "abc", "12:3"])("odbija %s", (input) =>
    expect(parseClock(input)).toBeNull(),
  );
});

describe("bookingRulesError", () => {
  it("Primošten Cabana: otvara dan ranije u 12, zatvara u 8, rok 12", () => {
    const r = { holdUntil: "12:00", opensDaysBefore: 1, opensAt: "12:00", closesAt: "08:00" };
    expect(bookingRulesError(r)).toBeNull();
    expect(describeBookingRules(r)).toBe(
      "Rezervacije za neki dan otvaraju se dan ranije u 12:00, a zatvaraju se na taj dan u 08:00. Gost mora doći do 12:00, inače se rezervacija sama poništava.",
    );
  });

  it("zatvaranje nakon roka dolaska nije dopušteno", () => {
    expect(
      bookingRulesError({
        holdUntil: "11:00",
        opensDaysBefore: 1,
        opensAt: "12:00",
        closesAt: "13:00",
      }),
    ).toMatch(/najkasnije u roku dolaska/);
  });

  it("isti dan: otvaranje mora biti prije zatvaranja", () => {
    expect(
      bookingRulesError({
        holdUntil: "11:00",
        opensDaysBefore: 0,
        opensAt: "11:00",
        closesAt: null,
      }),
    ).toMatch(/otvoriti prije/);
  });
});

it("telLink čisti broj za poziv", () => {
  expect(telLink("00385 91 123-4567")).toBe("tel:+385911234567");
});
