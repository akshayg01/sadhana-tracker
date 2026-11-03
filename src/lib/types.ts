export type Role = "devotee" | "coordinator" | "admin";

export interface Profile {
  user_id: string;
  devotee_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  group_name: string | null;
  group_id: string | null;
  role: Role;
  active: boolean;
}

export interface DailyRecord {
  id: string;
  user_id: string;
  record_date: string; // YYYY-MM-DD (local)
  rounds: number;
  reflection: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  record_id: string;
  user_id: string;
  book_title: string;
  section: string | null;
  minutes: number;
}

export interface HearingSession {
  id: string;
  record_id: string;
  user_id: string;
  lecture_title: string;
  speaker: string | null;
  source: string | null;
  minutes: number;
}

export interface Target {
  id: string;
  user_id: string | null; // null = congregation-recommended
  japa_rounds: number;
  reading_minutes: number;
  hearing_minutes: number;
  effective_from: string;
}
