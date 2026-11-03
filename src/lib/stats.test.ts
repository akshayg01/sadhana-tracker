import { describe, expect, it } from "vitest";
import {
  computeStreaks,
  type DayTotals,
  metJapaTarget,
  resolveTarget,
  summarizeDays,
  weekDays,
  weekStart,
} from "./stats";
import type { Target } from "./types";

const recommended: Target = {
  id: "r1",
  user_id: null,
  japa_rounds: 16,
  reading_minutes: 0,
  hearing_minutes: 0,
  effective_from: "2026-01-01",
};

const totals = (date: string, rounds: number, reading = 0, hearing = 0): DayTotals => ({
  record_date: date,
  rounds,
  reading_minutes: reading,
  hearing_minutes: hearing,
});

describe("resolveTarget", () => {
  it("falls back to recommended, then default", () => {
    expect(resolveTarget("2026-02-01", [recommended]).japa_rounds).toBe(16);
    expect(resolveTarget("2026-02-01", []).japa_rounds).toBe(16); // built-in default
  });

  it("personal target overrides recommended", () => {
    const personal: Target = { ...recommended, id: "p1", user_id: "u1", japa_rounds: 8, effective_from: "2026-02-01" };
    expect(resolveTarget("2026-02-02", [recommended, personal]).japa_rounds).toBe(8);
  });

  it("does not apply a target before its effective date", () => {
    const personal: Target = { ...recommended, id: "p1", user_id: "u1", japa_rounds: 8, effective_from: "2026-03-01" };
    expect(resolveTarget("2026-02-15", [recommended, personal]).japa_rounds).toBe(16);
    expect(resolveTarget("2026-03-15", [recommended, personal]).japa_rounds).toBe(8);
  });
});

describe("metJapaTarget", () => {
  it("meets at or above target", () => {
    expect(metJapaTarget(16, 16)).toBe(true);
    expect(metJapaTarget(15, 16)).toBe(false);
    expect(metJapaTarget(1, 0)).toBe(true); // zero target → any real round counts
  });
});

describe("computeStreaks", () => {
  const map = (days: DayTotals[]) => new Map(days.map((d) => [d.record_date, d]));

  it("counts consecutive qualifying days ending today", () => {
    const days = map([
      totals("2026-11-01", 16),
      totals("2026-11-02", 16),
      totals("2026-11-03", 16),
    ]);
    expect(computeStreaks(days, [recommended], "2026-11-03").current).toBe(3);
  });

  it("allows today to be unlogged without breaking the streak", () => {
    const days = map([totals("2026-11-01", 16), totals("2026-11-02", 16)]);
    expect(computeStreaks(days, [recommended], "2026-11-03").current).toBe(2);
  });

  it("breaks on a missed day and tracks the longest run", () => {
    const days = map([
      totals("2026-11-01", 16),
      totals("2026-11-02", 16),
      // 11-03 missed
      totals("2026-11-04", 16),
    ]);
    const s = computeStreaks(days, [recommended], "2026-11-04");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it("does not count days below target", () => {
    const days = map([totals("2026-11-03", 8)]);
    expect(computeStreaks(days, [recommended], "2026-11-03").current).toBe(0);
  });
});

describe("week helpers", () => {
  it("weekStart snaps to Monday", () => {
    expect(weekStart("2026-11-04")).toBe("2026-11-02"); // Wed → Mon
    expect(weekStart("2026-11-02")).toBe("2026-11-02"); // Mon → Mon
    expect(weekStart("2026-11-08")).toBe("2026-11-02"); // Sun → prev Mon
  });

  it("weekDays returns 7 consecutive days from Monday", () => {
    const d = weekDays("2026-11-04");
    expect(d).toHaveLength(7);
    expect(d[0]).toBe("2026-11-02");
    expect(d[6]).toBe("2026-11-08");
  });
});

describe("summarizeDays", () => {
  it("sums totals and counts recorded / met days", () => {
    const map = new Map([
      ["2026-11-02", totals("2026-11-02", 16, 30, 20)],
      ["2026-11-03", totals("2026-11-03", 8, 10, 0)],
    ]);
    const s = summarizeDays(["2026-11-02", "2026-11-03", "2026-11-04"], map, [recommended]);
    expect(s.rounds).toBe(24);
    expect(s.readingMinutes).toBe(40);
    expect(s.hearingMinutes).toBe(20);
    expect(s.daysRecorded).toBe(2);
    expect(s.daysMet).toBe(1);
  });
});
