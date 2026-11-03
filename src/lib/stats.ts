import { addDays, localDateKey } from "./date";
import type { Target } from "./types";

/** One day's totals (shape of the `daily_totals` view / the record screen). */
export interface DayTotals {
  record_date: string; // YYYY-MM-DD
  rounds: number;
  reading_minutes: number;
  hearing_minutes: number;
}

export const DEFAULT_TARGET: Omit<Target, "id" | "user_id" | "effective_from"> = {
  japa_rounds: 16,
  reading_minutes: 0,
  hearing_minutes: 0,
};

/**
 * Effective target on `date`: the latest personal target with
 * effective_from <= date, else the latest recommended (user_id null) one, else
 * the built-in default. Historical dates resolve against what was active THEN —
 * never silently recalculated with a newer target.
 */
export function resolveTarget(date: string, targets: Target[]) {
  const applicable = (scope: (t: Target) => boolean) =>
    targets
      .filter((t) => scope(t) && t.effective_from <= date)
      .sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1))[0];

  const personal = applicable((t) => t.user_id !== null);
  const recommended = applicable((t) => t.user_id === null);
  const chosen = personal ?? recommended;

  return {
    japa_rounds: chosen?.japa_rounds ?? DEFAULT_TARGET.japa_rounds,
    reading_minutes: chosen?.reading_minutes ?? DEFAULT_TARGET.reading_minutes,
    hearing_minutes: chosen?.hearing_minutes ?? DEFAULT_TARGET.hearing_minutes,
  };
}

/** A day "counts" toward a streak when japa rounds meet the day's japa target. */
export function metJapaTarget(rounds: number, japaTarget: number): boolean {
  return rounds >= Math.max(1, japaTarget);
}

/**
 * Current and longest streak of consecutive qualifying days.
 * Current streak is anchored to today (or yesterday, so an unlogged-but-early
 * "today" doesn't break a run).
 */
export function computeStreaks(
  totalsByDate: Map<string, DayTotals>,
  targets: Target[],
  today: string = localDateKey()
): { current: number; longest: number } {
  const qualifies = (date: string): boolean => {
    const t = totalsByDate.get(date);
    if (!t) return false;
    return metJapaTarget(t.rounds, resolveTarget(date, targets).japa_rounds);
  };

  // current streak
  let current = 0;
  let cursor = qualifies(today) ? today : addDays(today, -1);
  while (qualifies(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  // longest streak across all recorded days
  const dates = [...totalsByDate.keys()].filter(qualifies).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of dates) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest };
}

/** Monday-start week key for a date (startsOn: 0=Sun … 1=Mon). */
export function weekStart(dateKey: string, startsOn = 1): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const delta = (dt.getDay() - startsOn + 7) % 7;
  return addDays(dateKey, -delta);
}

/** The 7 date keys of the week containing `dateKey`. */
export function weekDays(dateKey: string, startsOn = 1): string[] {
  const start = weekStart(dateKey, startsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export interface RangeSummary {
  rounds: number;
  readingMinutes: number;
  hearingMinutes: number;
  daysRecorded: number;
  daysMet: number;
}

/** Aggregate totals over an inclusive list of date keys. */
export function summarizeDays(
  dateKeys: string[],
  totalsByDate: Map<string, DayTotals>,
  targets: Target[]
): RangeSummary {
  let rounds = 0,
    readingMinutes = 0,
    hearingMinutes = 0,
    daysRecorded = 0,
    daysMet = 0;

  for (const date of dateKeys) {
    const t = totalsByDate.get(date);
    if (!t) continue;
    daysRecorded++;
    rounds += t.rounds;
    readingMinutes += t.reading_minutes;
    hearingMinutes += t.hearing_minutes;
    if (metJapaTarget(t.rounds, resolveTarget(date, targets).japa_rounds)) daysMet++;
  }

  return { rounds, readingMinutes, hearingMinutes, daysRecorded, daysMet };
}
