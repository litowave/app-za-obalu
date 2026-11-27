import { describe, expect, it } from "vitest";
import { formatEur, parseEurToCents } from "./money";
import { countStates, dayRange, type NotebookBooking, timedStatus, unitStates } from "./notebook";
import { applyOutbox, dropPendingBooking, type OutboxOp, remapIds } from "./outbox";
import { templateGroups } from "./templates";
import { addDays, formatDayLong, zagrebClock, zagrebDateTime, zagrebToday } from "./zagreb-time";

const DATE = "2027-07-18";
const at = (time: string) => zagrebDateTime(DATE, time);

function booking(p: Partial<NotebookBooking> & { unit_id: string }): NotebookBooking {
  const r = dayRange(DATE);
  return {
    id: `b-${Math.random()}`,
    service_date: DATE,
    slot_id: null,
    status: "sold",
    starts_at: r.start.toISOString(),
    ends_at: r.end.toISOString(),
    released_at: null,
    hold_until: null,
    payment_method: "cash",
    customer_name: null,
    customer_phone: null,
    group_id: "g",
    source: "walk_in",
    ...p,
  };
}

describe("hrvatsko vrijeme", () => {
  it("ponoć ljeti je 22:00 UTC prethodnog dana, zimi 23:00", () => {
    expect(zagrebDateTime("2027-07-18").toISOString()).toBe("2027-07-17T22:00:00.000Z");
    expect(zagrebDateTime("2027-01-18").toISOString()).toBe("2027-01-17T23:00:00.000Z");
  });
  it("radi na dan promjene na ljetno vrijeme", () => {
    expect(zagrebDateTime("2027-03-28", "12:00").toISOString()).toBe("2027-03-28T10:00:00.000Z");
  });
  it("današnji datum ovisi o Hrvatskoj, ne o UTC-u", () => {
    expect(zagrebToday(new Date("2027-07-17T22:30:00Z"))).toBe("2027-07-18");
    expect(zagrebClock(new Date("2027-07-17T22:30:00Z"))).toBe("00:30");
  });
  it("datum i nazivi", () => {
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(formatDayLong("2027-07-17")).toBe("Subota, 17. srpnja");
  });
});

describe("stanje mjesta", () => {
  const units = ["L1", "L2", "L3", "L4"];
  const range = dayRange(DATE);

  it("prodano, rezervirano i slobodno", () => {
    const states = unitStates(
      units,
      [
        booking({ unit_id: "L1" }),
        booking({ unit_id: "L2", status: "reserved", hold_until: at("11:00").toISOString() }),
        booking({ unit_id: "L3", status: "cancelled" }),
      ],
      range,
      at("10:00"),
    );
    expect(countStates(states)).toEqual({ free: 2, reserved: 1, sold: 1 });
    expect(states.get("L2")?.state).toBe("reserved");
  });

  it("istekla rezervacija i vraćena jedinica su slobodne", () => {
    const states = unitStates(
      units,
      [
        booking({ unit_id: "L1", status: "reserved", hold_until: at("11:00").toISOString() }),
        booking({ unit_id: "L2", released_at: at("13:00").toISOString() }),
      ],
      range,
      at("14:00"),
    );
    expect(states.get("L1")?.state).toBe("free");
    expect(states.get("L2")?.state).toBe("free");
  });

  it("polovice dana: popodne je slobodno ako je prodano samo jutro", () => {
    const am = { starts_at: "09:00", ends_at: "15:00" };
    const pm = { starts_at: "15:00", ends_at: null };
    const b = booking({
      unit_id: "L1",
      starts_at: at("09:00").toISOString(),
      ends_at: at("15:00").toISOString(),
    });
    expect(unitStates(units, [b], dayRange(DATE, am), at("08:00")).get("L1")?.state).toBe("sold");
    expect(unitStates(units, [b], dayRange(DATE, pm), at("08:00")).get("L1")?.state).toBe("free");
  });

  it("satni najam kasni kad prođe vrijeme povratka", () => {
    const b = booking({
      unit_id: "J1",
      starts_at: at("10:00").toISOString(),
      ends_at: at("10:30").toISOString(),
    });
    expect(timedStatus("J1", [b], at("10:20"))).toMatchObject({ minutesLeft: 10, overdue: false });
    expect(timedStatus("J1", [b], at("10:40"))).toMatchObject({ overdue: true });
    expect(
      timedStatus("J1", [{ ...b, released_at: at("10:25").toISOString() }], at("10:40")).booking,
    ).toBeNull();
  });
});

describe("rad bez signala", () => {
  const rangeFor = (d: string) => dayRange(d);
  const sale: OutboxOp = {
    kind: "sale",
    id: "op1",
    createdAt: at("10:00").toISOString(),
    unitIds: ["L1", "L2"],
    tempIds: ["tmp-1", "tmp-2"],
    payment: "card",
    date: DATE,
    slotId: null,
    durationMin: null,
    days: 1,
  };

  it("prodaja se odmah vidi, od sada do kraja dana", () => {
    const list = applyOutbox([], [sale], rangeFor);
    expect(list).toHaveLength(2);
    expect(list[0]?.starts_at).toBe(at("10:00").toISOString());
    expect(countStates(unitStates(["L1", "L2"], list, dayRange(DATE), at("10:05")))).toEqual({
      free: 0,
      reserved: 0,
      sold: 2,
    });
  });

  it("vraćanje i otkazivanje na neposlanu prodaju", () => {
    const ops: OutboxOp[] = [
      sale,
      { kind: "release", id: "op2", createdAt: at("12:00").toISOString(), bookingId: "tmp-1" },
    ];
    const list = applyOutbox([], ops, rangeFor);
    expect(list.find((b) => b.id === "tmp-1")?.released_at).toBe(at("12:00").toISOString());

    expect(dropPendingBooking(ops, "tmp-1")).toEqual([
      { ...sale, unitIds: ["L2"], tempIds: ["tmp-2"] },
    ]);
    expect(dropPendingBooking(ops, "pravi-id")).toBeNull();
  });

  it("nakon potvrde kasnije promjene idu na pravi id", () => {
    const ops = remapIds(
      [{ kind: "cancel", id: "op3", createdAt: "", bookingId: "tmp-2" }],
      new Map([["tmp-2", "real-2"]]),
    );
    expect(ops[0]).toMatchObject({ bookingId: "real-2" });
  });
});

describe("pomoćno", () => {
  it("cijene", () => {
    expect(parseEurToCents("12,50")).toBe(1250);
    expect(parseEurToCents("abc")).toBeNull();
    expect(formatEur(61000).replace(/\s/g, " ")).toBe("610 €");
  });
  it("predlošci po skupinama", () => {
    expect(templateGroups().map((g) => g.group)).toEqual([
      "Plaža",
      "Vodeni sportovi",
      "Zabava",
      "Usluge",
    ]);
  });
});
