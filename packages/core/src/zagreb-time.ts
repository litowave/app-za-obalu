/**
 * Sva vremena u aplikaciji računaju se po hrvatskom vremenu (specifikacija 6.5),
 * bez obzira na postavke mobitela. Datum je uvijek tekst "YYYY-MM-DD".
 */

const TZ = "Europe/Zagreb";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function zagrebParts(at: Date) {
  const p: Record<string, string> = {};
  for (const part of partsFormatter.formatToParts(at)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Današnji datum u Hrvatskoj. */
export function zagrebToday(now: Date = new Date()): string {
  const p = zagrebParts(now);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Razlika hrvatskog vremena od UTC-a u minutama (60 zimi, 120 ljeti) u zadanom trenutku. */
function offsetMinutes(at: Date): number {
  const p = zagrebParts(at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** Trenutak kad je u Hrvatskoj zadani datum i sat ("HH:MM" ili "HH:MM:SS"). */
export function zagrebDateTime(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  // Dva koraka pokriju i dane promjene ljetnog vremena.
  let t = guess - offsetMinutes(new Date(guess)) * 60000;
  t = guess - offsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/** "HH:MM" po hrvatskom vremenu. */
export function zagrebClock(at: Date | string): string {
  const p = zagrebParts(typeof at === "string" ? new Date(at) : at);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

const DAYS = ["nedjelja", "ponedjeljak", "utorak", "srijeda", "četvrtak", "petak", "subota"];
const MONTHS = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenoga",
  "prosinca",
];

/** "Subota, 18. srpnja" */
export function formatDayLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const name = DAYS[dow] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${d}. ${MONTHS[m - 1]}`;
}

/** "Danas", "Sutra", "Jučer" ili "Subota, 18. srpnja". */
export function formatDayRelative(date: string, today: string): string {
  if (date === today) return "Danas";
  if (date === addDays(today, 1)) return "Sutra";
  if (date === addDays(today, -1)) return "Jučer";
  return formatDayLong(date);
}
