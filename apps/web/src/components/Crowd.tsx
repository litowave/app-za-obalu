import type { CrowdLevel } from "@obala/db";

const STEPS: Record<CrowdLevel, number> = {
  no_data: 0,
  empty: 1,
  few: 2,
  moderate: 3,
  busy: 4,
  full: 5,
};

export function crowdSteps(level: CrowdLevel): number {
  return STEPS[level];
}

/** Pet crtica kao na dizajnu: broj ispunjenih pokazuje razinu, uz riječ (nikad postotak). */
export function CrowdScale({ level, label }: { level: CrowdLevel; label: string }) {
  const n = STEPS[level];
  return (
    <div className={`crowd-scale crowd-${level}`}>
      <span className="steps" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={i <= n ? "on" : undefined} />
        ))}
      </span>
      <b>{label}</b>
    </div>
  );
}

/** Stupci po satima ("Kada je gužva"), od 8 do 20 h. Visina je razina, ne broj ljudi. */
export function PopularBars({
  hours,
  nowHour,
  nowLabel,
}: {
  hours: { hour: number; level: CrowdLevel }[];
  nowHour: number | null;
  nowLabel: string;
}) {
  const shown = hours.filter((h) => h.hour >= 8 && h.hour <= 20);
  if (shown.length === 0) return null;
  const first = shown[0]?.hour ?? 8;
  const last = shown[shown.length - 1]?.hour ?? 20;
  return (
    <div className="popular">
      <div className="bars" aria-hidden="true">
        {shown.map((h) => (
          <i
            key={h.hour}
            className={h.hour === nowHour ? "now" : undefined}
            style={{ height: `${Math.max(STEPS[h.level], 0.4) * 20}%` }}
          />
        ))}
      </div>
      <div className="bar-labels">
        <span>{first} h</span>
        {nowHour != null && nowHour > first && nowHour < last ? <span>{nowLabel}</span> : null}
        <span>{last} h</span>
      </div>
    </div>
  );
}

/** Sat s najmanje ljudi od sada do kraja dana (za rečenicu "Najmanje ljudi danas oko 17 h"). */
export function quietestHour(
  hours: { hour: number; level: CrowdLevel }[],
  fromHour: number,
): number | null {
  let best: { hour: number; level: CrowdLevel } | null = null;
  for (const h of hours) {
    if (h.hour < Math.max(fromHour, 8) || h.hour > 19) continue;
    if (!best || STEPS[h.level] < STEPS[best.level]) best = h;
  }
  return best?.hour ?? null;
}
