import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flame, Headphones, Target as TargetIcon, Trophy } from "lucide-react";
import { addDays, dayLabel, localDateKey } from "../lib/date";
import { fetchTargets, fetchTotals } from "../lib/progress";
import {
  computeStreaks,
  type DayTotals,
  metJapaTarget,
  resolveTarget,
  summarizeDays,
  weekDays,
} from "../lib/stats";
import type { Target } from "../lib/types";
import MonthCalendar from "./MonthCalendar";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Progress({ userId }: { userId: string }) {
  const today = localDateKey();
  const [totals, setTotals] = useState<Map<string, DayTotals>>(new Map());
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const from = addDays(today, -400);
    Promise.all([fetchTotals(userId, from, today), fetchTargets(userId)])
      .then(([t, tg]) => {
        if (active) {
          setTotals(t);
          setTargets(tg);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [userId, today]);

  const streaks = useMemo(() => computeStreaks(totals, targets, today), [totals, targets, today]);
  const week = useMemo(() => weekDays(today), [today]);
  const weekSummary = useMemo(() => summarizeDays(week, totals, targets), [week, totals, targets]);
  const weekTarget = resolveTarget(today, targets);

  if (loading) {
    return <div className="py-20 text-center text-stone-400">Loading your progress…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-24 pt-4">
      {/* Streak stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Flame size={18} className="text-orange-600" />} value={streaks.current} label="Day streak" />
        <Stat icon={<Trophy size={18} className="text-amber-600" />} value={streaks.longest} label="Best streak" />
        <Stat icon={<TargetIcon size={18} className="text-emerald-600" />} value={`${weekSummary.daysMet}/7`} label="This week" />
      </div>

      {/* Weekly summary */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-stone-800">This week</span>
          <span className="text-xs text-stone-400">Target {weekTarget.japa_rounds} rounds/day</span>
        </div>

        <div className="mb-4 grid grid-cols-7 gap-1.5">
          {week.map((d, i) => {
            const t = totals.get(d);
            const met = t && metJapaTarget(t.rounds, resolveTarget(d, targets).japa_rounds);
            const pct = Math.min(100, t ? (t.rounds / Math.max(1, weekTarget.japa_rounds)) * 100 : 0);
            const isFuture = d > today;
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end overflow-hidden rounded-lg bg-stone-100">
                  {!isFuture && (
                    <div
                      className={`w-full rounded-lg transition-all ${met ? "bg-orange-500" : "bg-orange-200"}`}
                      style={{ height: `${pct}%` }}
                    />
                  )}
                </div>
                <span className={`text-xs ${d === today ? "font-bold text-orange-600" : "text-stone-400"}`}>
                  {WEEKDAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 border-t border-stone-100 pt-3 text-center">
          <Mini icon={<Flame size={14} />} value={weekSummary.rounds} label="rounds" />
          <Mini icon={<BookOpen size={14} />} value={`${weekSummary.readingMinutes}m`} label="reading" />
          <Mini icon={<Headphones size={14} />} value={`${weekSummary.hearingMinutes}m`} label="hearing" />
        </div>
      </div>

      {/* Calendar history */}
      <MonthCalendar
        totalsByDate={totals}
        targets={targets}
        selectedDate={selected}
        onSelectDay={setSelected}
      />

      {/* Selected-day detail */}
      {selected && (
        <div className="card">
          <div className="mb-2 font-semibold text-stone-800">{dayLabel(selected)}</div>
          {totals.get(selected) ? (
            <DayDetail day={totals.get(selected)!} target={resolveTarget(selected, targets)} />
          ) : (
            <p className="text-sm text-stone-400">No entry recorded this day.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="card flex flex-col items-center gap-1 !p-3 text-center">
      {icon}
      <span className="text-2xl font-bold tabular-nums text-stone-900">{value}</span>
      <span className="text-xs text-stone-400">{label}</span>
    </div>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="flex items-center gap-1 text-base font-bold text-stone-800">
        <span className="text-stone-400">{icon}</span>
        {value}
      </span>
      <span className="text-xs text-stone-400">{label}</span>
    </div>
  );
}

function DayDetail({ day, target }: { day: DayTotals; target: ReturnType<typeof resolveTarget> }) {
  const met = metJapaTarget(day.rounds, target.japa_rounds);
  return (
    <div className="grid grid-cols-3 gap-3 text-center">
      <div>
        <div className="text-xl font-bold text-orange-700">{day.rounds}</div>
        <div className={`text-xs ${met ? "text-emerald-600" : "text-stone-400"}`}>
          rounds {met ? "✓" : `/ ${target.japa_rounds}`}
        </div>
      </div>
      <div>
        <div className="text-xl font-bold text-stone-800">{day.reading_minutes}m</div>
        <div className="text-xs text-stone-400">reading</div>
      </div>
      <div>
        <div className="text-xl font-bold text-stone-800">{day.hearing_minutes}m</div>
        <div className="text-xs text-stone-400">hearing</div>
      </div>
    </div>
  );
}
