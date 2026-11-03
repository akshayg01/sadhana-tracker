import { supabase } from "./supabase";
import type { DailyRecord, HearingSession, ReadingSession } from "./types";

export interface DayData {
  record: DailyRecord | null;
  reading: ReadingSession[];
  hearing: HearingSession[];
}

export interface DayDraft {
  rounds: number;
  reflection: string;
  reading: { book_title: string; section?: string; minutes: number }[];
  hearing: { lecture_title: string; speaker?: string; source?: string; minutes: number }[];
}

export function emptyDraft(): DayDraft {
  return { rounds: 0, reflection: "", reading: [], hearing: [] };
}

/** Load a single day. A null record means "no entry saved yet" — distinct from
 *  a saved zero-value entry (record present with rounds 0 and no sessions). */
export async function loadDay(userId: string, date: string): Promise<DayData> {
  const { data: record } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .eq("record_date", date)
    .maybeSingle();

  if (!record) return { record: null, reading: [], hearing: [] };

  const [{ data: reading }, { data: hearing }] = await Promise.all([
    supabase.from("reading_sessions").select("*").eq("record_id", record.id),
    supabase.from("hearing_sessions").select("*").eq("record_id", record.id),
  ]);

  return {
    record: record as DailyRecord,
    reading: (reading ?? []) as ReadingSession[],
    hearing: (hearing ?? []) as HearingSession[],
  };
}

export function draftFromDay(day: DayData): DayDraft {
  if (!day.record) return emptyDraft();
  return {
    rounds: day.record.rounds,
    reflection: day.record.reflection ?? "",
    reading: day.reading.map((r) => ({
      book_title: r.book_title,
      section: r.section ?? undefined,
      minutes: r.minutes,
    })),
    hearing: day.hearing.map((h) => ({
      lecture_title: h.lecture_title,
      speaker: h.speaker ?? undefined,
      source: h.source ?? undefined,
      minutes: h.minutes,
    })),
  };
}

/** Upsert the day's record, then replace its sessions. Sessions are rewritten
 *  wholesale (delete + insert) because a day has only a handful of them and this
 *  keeps the client logic trivial. */
export async function saveDay(userId: string, date: string, draft: DayDraft): Promise<void> {
  const { data: rec, error } = await supabase
    .from("daily_records")
    .upsert(
      {
        user_id: userId,
        record_date: date,
        rounds: draft.rounds,
        reflection: draft.reflection.trim() || null,
        updated_at: new Date().toISOString(),
        synced_at: new Date().toISOString(),
      },
      { onConflict: "user_id,record_date" }
    )
    .select()
    .single();

  if (error || !rec) throw error ?? new Error("Failed to save record");
  const recordId = rec.id;

  await Promise.all([
    supabase.from("reading_sessions").delete().eq("record_id", recordId),
    supabase.from("hearing_sessions").delete().eq("record_id", recordId),
  ]);

  const reading = draft.reading
    .filter((r) => r.book_title.trim() && r.minutes > 0)
    .map((r) => ({
      record_id: recordId,
      user_id: userId,
      book_title: r.book_title.trim(),
      section: r.section?.trim() || null,
      minutes: r.minutes,
    }));
  const hearing = draft.hearing
    .filter((h) => h.lecture_title.trim() && h.minutes > 0)
    .map((h) => ({
      record_id: recordId,
      user_id: userId,
      lecture_title: h.lecture_title.trim(),
      speaker: h.speaker?.trim() || null,
      source: h.source?.trim() || null,
      minutes: h.minutes,
    }));

  if (reading.length) await supabase.from("reading_sessions").insert(reading);
  if (hearing.length) await supabase.from("hearing_sessions").insert(hearing);
}

export const readingMinutes = (d: DayDraft) => d.reading.reduce((s, r) => s + (r.minutes || 0), 0);
export const hearingMinutes = (d: DayDraft) => d.hearing.reduce((s, h) => s + (h.minutes || 0), 0);
