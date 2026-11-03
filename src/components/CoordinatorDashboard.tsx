import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Users } from "lucide-react";
import { addDays, localDateKey } from "../lib/date";
import { supabase } from "../lib/supabase";
import { type DayTotals, metJapaTarget, resolveTarget, summarizeDays, weekDays, weekStart } from "../lib/stats";
import type { Profile, Target } from "../lib/types";

interface Group {
  id: string;
  name: string;
}

interface Row {
  profile: Profile;
  byDate: Map<string, DayTotals>;
  targets: Target[];
  summary: ReturnType<typeof summarizeDays>;
}

export default function CoordinatorDashboard({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(localDateKey());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const week = useMemo(() => weekDays(anchor), [anchor]);
  const start = week[0];
  const end = week[6];

  // Load authorized groups once.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: allGroups } = await supabase.from("groups").select("id, name").order("name");
      let visible = (allGroups ?? []) as Group[];
      if (!isAdmin) {
        const { data: cg } = await supabase
          .from("coordinator_groups")
          .select("group_id")
          .eq("coordinator_id", userId);
        const ids = new Set((cg ?? []).map((r) => r.group_id));
        visible = visible.filter((g) => ids.has(g.id));
      }
      if (active) {
        setGroups(visible);
        setGroupId((prev) => prev ?? visible[0]?.id ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId, isAdmin]);

  const load = useCallback(async () => {
    if (!groupId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: people } = await supabase
      .from("profiles")
      .select("*")
      .eq("group_id", groupId)
      .order("full_name");
    const profiles = (people ?? []) as Profile[];
    const ids = profiles.map((p) => p.user_id);

    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [{ data: totals }, { data: tgts }] = await Promise.all([
      supabase
        .from("daily_totals")
        .select("user_id, record_date, rounds, reading_minutes, hearing_minutes")
        .in("user_id", ids)
        .gte("record_date", start)
        .lte("record_date", end),
      supabase.from("targets").select("*").or(`user_id.in.(${ids.join(",")}),user_id.is.null`),
    ]);

    const recommended = ((tgts ?? []) as Target[]).filter((t) => t.user_id === null);
    const personalByUser = new Map<string, Target[]>();
    for (const t of (tgts ?? []) as Target[]) {
      if (t.user_id) personalByUser.set(t.user_id, [...(personalByUser.get(t.user_id) ?? []), t]);
    }
    const totalsByUser = new Map<string, Map<string, DayTotals>>();
    for (const r of (totals ?? []) as (DayTotals & { user_id: string })[]) {
      if (!totalsByUser.has(r.user_id)) totalsByUser.set(r.user_id, new Map());
      totalsByUser.get(r.user_id)!.set(r.record_date, r);
    }

    const built: Row[] = profiles.map((p) => {
      const byDate = totalsByUser.get(p.user_id) ?? new Map();
      const targets = [...recommended, ...(personalByUser.get(p.user_id) ?? [])];
      return { profile: p, byDate, targets, summary: summarizeDays(week, byDate, targets) };
    });

    setRows(built);
    setLoading(false);
  }, [groupId, start, end, week]);

  useEffect(() => {
    load();
  }, [load]);

  function exportCsv() {
    const header = ["Devotee", "Devotee ID", "Days recorded", "Days met", "Total rounds", "Reading min", "Hearing min"];
    const lines = rows.map((r) =>
      [
        r.profile.full_name ?? "",
        r.profile.devotee_id ?? "",
        r.summary.daysRecorded,
        r.summary.daysMet,
        r.summary.rounds,
        r.summary.readingMinutes,
        r.summary.hearingMinutes,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const groupName = groups.find((g) => g.id === groupId)?.name ?? "group";
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `sadhana-${groupName}-${start}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const weekLabel = `${start} → ${end}`;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
        <Users size={20} className="text-orange-600" /> Congregation report
      </h2>

      {groups.length === 0 ? (
        <div className="card text-sm text-stone-500">
          You aren't assigned to any groups yet. Ask an administrator to authorize you.
        </div>
      ) : (
        <>
          {/* Group selector */}
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setGroupId(g.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  groupId === g.id ? "bg-orange-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Week nav + export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="btn-ghost !px-3 !py-2" onClick={() => setAnchor(addDays(weekStart(anchor), -7))}>
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-stone-600">{weekLabel}</span>
              <button
                className="btn-ghost !px-3 !py-2 disabled:opacity-30"
                onClick={() => setAnchor(addDays(weekStart(anchor), 7))}
                disabled={weekStart(anchor) >= weekStart(localDateKey())}
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button className="btn-ghost !py-2 text-sm" onClick={exportCsv} disabled={rows.length === 0}>
              <Download size={16} /> Export
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-stone-400">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="card text-sm text-stone-500">No devotees in this group yet.</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.profile.user_id} className="card !p-0 overflow-hidden">
                  <button
                    className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    onClick={() => setExpanded(expanded === r.profile.user_id ? null : r.profile.user_id)}
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-stone-800">
                        {r.profile.full_name ?? r.profile.email ?? "Devotee"}
                      </div>
                      <div className="text-xs text-stone-400">
                        {r.summary.rounds} rounds · {r.summary.readingMinutes}m read · {r.summary.hearingMinutes}m heard
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          r.summary.daysMet >= 5
                            ? "bg-emerald-50 text-emerald-700"
                            : r.summary.daysMet > 0
                            ? "bg-amber-50 text-amber-700"
                            : "bg-stone-100 text-stone-400"
                        }`}
                      >
                        {r.summary.daysMet}/7
                      </span>
                      <ChevronDown
                        size={16}
                        className={`text-stone-400 transition ${expanded === r.profile.user_id ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  {expanded === r.profile.user_id && (
                    <div className="border-t border-stone-100 bg-stone-50 p-4">
                      <div className="grid grid-cols-7 gap-1.5">
                        {week.map((d) => {
                          const t = r.byDate.get(d);
                          const met = t && metJapaTarget(t.rounds, resolveTarget(d, r.targets).japa_rounds);
                          return (
                            <div key={d} className="flex flex-col items-center gap-1">
                              <div
                                className={`flex aspect-square w-full items-center justify-center rounded-lg text-xs font-semibold ${
                                  !t ? "bg-stone-100 text-stone-300" : met ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700"
                                }`}
                              >
                                {t?.rounds ?? "—"}
                              </div>
                              <span className="text-[10px] text-stone-400">{d.slice(8)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
