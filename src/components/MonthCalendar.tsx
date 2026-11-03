import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { localDateKey } from "../lib/date";
import { metJapaTarget, resolveTarget, type DayTotals } from "../lib/stats";
import type { Target } from "../lib/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DayState = "met" | "partial" | "empty" | "future" | "blank";

function cellClasses(state: DayState, selected: boolean): string {
  const base = "flex aspect-square flex-col items-center justify-center rounded-xl text-sm transition";
  const ring = selected ? " ring-2 ring-orange-500 ring-offset-1" : "";
  switch (state) {
    case "met":
      return `${base}${ring} bg-orange-500 font-bold text-white`;
    case "partial":
      return `${base}${ring} bg-orange-100 font-semibold text-orange-700`;
    case "empty":
      return `${base}${ring} bg-stone-100 text-stone-300`;
    case "future":
      return `${base} bg-transparent text-stone-200`;
    default:
      return base; // blank
  }
}

export default function MonthCalendar({
  totalsByDate,
  targets,
  selectedDate,
  onSelectDay,
}: {
  totalsByDate: Map<string, DayTotals>;
  targets: Target[];
  selectedDate: string | null;
  onSelectDay: (date: string | null) => void;
}) {
  const todayKey = localDateKey();
  const [y0, m0] = todayKey.split("-").map(Number);
  const [anchor, setAnchor] = useState({ year: y0, month: m0 }); // month: 1-12

  const { year, month } = anchor;
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadBlanks = (first.getDay() + 6) % 7; // Mon-first offset

  const monthLabel = first.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const atCurrentMonth = year === y0 && month === m0;

  function shift(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setAnchor({ year: d.getFullYear(), month: d.getMonth() + 1 });
    onSelectDay(null);
  }

  const cells: { key: string; label: number; state: DayState }[] = [];
  for (let i = 0; i < leadBlanks; i++) cells.push({ key: `b${i}`, label: 0, state: "blank" });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    let state: DayState;
    if (key > todayKey) state = "future";
    else {
      const t = totalsByDate.get(key);
      if (!t) state = "empty";
      else state = metJapaTarget(t.rounds, resolveTarget(key, targets).japa_rounds) ? "met" : "partial";
    }
    cells.push({ key, label: d, state });
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <button className="btn-ghost !px-3 !py-2" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-stone-800">{monthLabel}</span>
        <button
          className="btn-ghost !px-3 !py-2 disabled:opacity-30"
          onClick={() => shift(1)}
          disabled={atCurrentMonth}
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-stone-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) =>
          c.state === "blank" ? (
            <div key={c.key} />
          ) : (
            <button
              key={c.key}
              className={cellClasses(c.state, selectedDate === c.key)}
              disabled={c.state === "future"}
              onClick={() => onSelectDay(selectedDate === c.key ? null : c.key)}
            >
              <span>{c.label}</span>
              {totalsByDate.get(c.key) && (
                <span className="text-[10px] font-normal opacity-80">
                  {totalsByDate.get(c.key)!.rounds}
                </span>
              )}
            </button>
          )
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-orange-500" /> Target met
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-orange-100" /> Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-stone-100" /> Missed
        </span>
      </div>
    </div>
  );
}
