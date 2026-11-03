import { supabase } from "./supabase";
import type { DayTotals } from "./stats";
import type { Target } from "./types";

/** Daily totals for a user over an inclusive date range, keyed by date. */
export async function fetchTotals(
  userId: string,
  fromDate: string,
  toDate: string
): Promise<Map<string, DayTotals>> {
  const { data, error } = await supabase
    .from("daily_totals")
    .select("record_date, rounds, reading_minutes, hearing_minutes")
    .eq("user_id", userId)
    .gte("record_date", fromDate)
    .lte("record_date", toDate);

  if (error) throw error;
  const map = new Map<string, DayTotals>();
  for (const row of data ?? []) map.set(row.record_date, row as DayTotals);
  return map;
}

/** A user's targets plus the congregation-recommended ones (user_id null). */
export async function fetchTargets(userId: string): Promise<Target[]> {
  const { data, error } = await supabase
    .from("targets")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`);
  if (error) throw error;
  return (data ?? []) as Target[];
}
