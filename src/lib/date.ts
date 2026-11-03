/** Local-calendar date helpers. We always store the devotee's LOCAL date (YYYY-MM-DD),
 *  never a UTC-shifted one, so "today" means today where the devotee is. */

export function localDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return localDateKey(dt);
}

/** Human label: "Today", "Yesterday", or "Mon, 3 Nov". */
export function dayLabel(key: string): string {
  const today = localDateKey();
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
