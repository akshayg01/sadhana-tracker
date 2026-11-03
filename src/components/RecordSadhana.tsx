import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronLeft, ChevronRight, Headphones, Minus, Plus, Trash2 } from "lucide-react";
import { addDays, dayLabel, localDateKey } from "../lib/date";
import {
  type DayDraft,
  draftFromDay,
  emptyDraft,
  hearingMinutes,
  loadDay,
  readingMinutes,
  saveDay,
} from "../lib/records";

export default function RecordSadhana({ userId }: { userId: string }) {
  const [date, setDate] = useState(localDateKey());
  const [draft, setDraft] = useState<DayDraft>(emptyDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSavedAt(null);
    loadDay(userId, date).then((day) => {
      if (active) {
        setDraft(draftFromDay(day));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [userId, date]);

  const isToday = date === localDateKey();

  async function save() {
    setSaving(true);
    try {
      await saveDay(userId, date, draft);
      setSavedAt(Date.now());
    } catch (e) {
      alert("Could not save. Please check your connection and try again.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function setRounds(n: number) {
    setDraft((d) => ({ ...d, rounds: Math.max(0, n) }));
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-44 pt-4">
      {/* Date nav */}
      <div className="mb-4 flex items-center justify-between">
        <button className="btn-ghost !px-3" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="text-lg font-bold text-stone-900">{dayLabel(date)}</div>
          <div className="text-xs text-stone-400">{date}</div>
        </div>
        <button
          className="btn-ghost !px-3 disabled:opacity-30"
          onClick={() => setDate(addDays(date, 1))}
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-stone-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {/* Japa */}
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-stone-800">🪷 Japa rounds</span>
              <span className="text-2xl font-bold tabular-nums text-saffron-700">{draft.rounds}</span>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-ghost h-14 flex-1" onClick={() => setRounds(draft.rounds - 1)}>
                <Minus size={22} />
              </button>
              <button className="btn-primary h-14 flex-1" onClick={() => setRounds(draft.rounds + 1)}>
                <Plus size={22} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {[16, 25, 32, 64].map((n) => (
                <button key={n} className="btn-ghost flex-1 !py-2 text-sm" onClick={() => setRounds(n)}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Reading */}
          <SessionList
            icon={<BookOpen size={18} className="text-saffron-600" />}
            title="Reading"
            totalLabel={`${readingMinutes(draft)} min`}
            rows={draft.reading.map((r) => ({ name: r.book_title, minutes: r.minutes }))}
            placeholder="Book title"
            onChange={(rows) =>
              setDraft((d) => ({
                ...d,
                reading: rows.map((x) => ({ book_title: x.name, minutes: x.minutes })),
              }))
            }
          />

          {/* Hearing */}
          <SessionList
            icon={<Headphones size={18} className="text-saffron-600" />}
            title="Hearing"
            totalLabel={`${hearingMinutes(draft)} min`}
            rows={draft.hearing.map((h) => ({ name: h.lecture_title, minutes: h.minutes }))}
            placeholder="Lecture title"
            onChange={(rows) =>
              setDraft((d) => ({
                ...d,
                hearing: rows.map((x) => ({ lecture_title: x.name, minutes: x.minutes })),
              }))
            }
          />

          {/* Reflection */}
          <div className="card">
            <label className="label">Reflection (optional)</label>
            <textarea
              className="field min-h-[72px] resize-y"
              placeholder="A thought from today's practice…"
              value={draft.reflection}
              onChange={(e) => setDraft((d) => ({ ...d, reflection: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      {!loading && (
        <div className="fixed inset-x-0 bottom-[3.75rem] z-10 border-t border-stone-200 bg-white/90 p-3 backdrop-blur">
          <div className="mx-auto max-w-md">
            <button className="btn-primary w-full text-lg" onClick={save} disabled={saving}>
              {saving ? "Saving…" : savedAt ? (
                <>
                  <Check size={20} /> Saved
                </>
              ) : (
                "Save sadhana"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface Row {
  name: string;
  minutes: number;
}

function SessionList({
  icon,
  title,
  totalLabel,
  rows,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  totalLabel: string;
  rows: Row[];
  placeholder: string;
  onChange: (rows: Row[]) => void;
}) {
  function update(i: number, patch: Partial<Row>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-stone-800">
          {icon} {title}
        </span>
        <span className="text-sm text-stone-400">{totalLabel}</span>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="field flex-1"
              placeholder={placeholder}
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <input
              className="field w-20 text-center"
              inputMode="numeric"
              placeholder="min"
              value={r.minutes || ""}
              onChange={(e) => update(i, { minutes: parseInt(e.target.value) || 0 })}
            />
            <button
              className="btn-ghost !px-3"
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              aria-label="Remove"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      <button
        className="btn-ghost mt-2 w-full !py-2 text-sm"
        onClick={() => onChange([...rows, { name: "", minutes: 0 }])}
      >
        <Plus size={16} /> Add {title.toLowerCase()}
      </button>
    </div>
  );
}
