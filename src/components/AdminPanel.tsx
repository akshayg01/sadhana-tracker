import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Plus, Shield } from "lucide-react";
import { localDateKey } from "../lib/date";
import { supabase } from "../lib/supabase";
import { resolveTarget } from "../lib/stats";
import type { Profile, Role, Target } from "../lib/types";

interface Group {
  id: string;
  name: string;
}
interface AuditEntry {
  id: string;
  action: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

type Tab = "users" | "groups" | "targets" | "audit";

export default function AdminPanel({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [coordGroups, setCoordGroups] = useState<Set<string>>(new Set()); // `${coordId}:${groupId}`
  const [targets, setTargets] = useState<Target[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [u, g, cg, t, a] = await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("groups").select("id, name").order("name"),
      supabase.from("coordinator_groups").select("coordinator_id, group_id"),
      supabase.from("targets").select("*").is("user_id", null),
      supabase.from("audit_log").select("id, action, detail, created_at").order("created_at", { ascending: false }).limit(50),
    ]);
    setUsers((u.data ?? []) as Profile[]);
    setGroups((g.data ?? []) as Group[]);
    setCoordGroups(new Set((cg.data ?? []).map((r) => `${r.coordinator_id}:${r.group_id}`)));
    setTargets((t.data ?? []) as Target[]);
    setAudit((a.data ?? []) as AuditEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logAudit(action: string, targetUserId: string | null, detail: Record<string, unknown>) {
    await supabase.from("audit_log").insert({ actor_id: userId, action, target_user_id: targetUserId, detail });
  }

  if (loading) return <div className="py-20 text-center text-stone-400">Loading admin…</div>;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-24 pt-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-stone-900">
        <Shield size={20} className="text-orange-600" /> Administration
      </h2>

      <div className="flex gap-2 overflow-x-auto">
        {(["users", "groups", "targets", "audit"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-orange-600 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <UsersTab users={users} groups={groups} coordGroups={coordGroups} logAudit={logAudit} reload={load} />
      )}
      {tab === "groups" && <GroupsTab groups={groups} logAudit={logAudit} reload={load} />}
      {tab === "targets" && <TargetsTab targets={targets} logAudit={logAudit} reload={load} />}
      {tab === "audit" && <AuditTab audit={audit} />}
    </div>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────
function UsersTab({
  users,
  groups,
  coordGroups,
  logAudit,
  reload,
}: {
  users: Profile[];
  groups: Group[];
  coordGroups: Set<string>;
  logAudit: (action: string, target: string | null, detail: Record<string, unknown>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filtered = users.filter((u) =>
    `${u.full_name ?? ""} ${u.email ?? ""} ${u.devotee_id ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  async function setRole(u: Profile, role: Role) {
    await supabase.from("profiles").update({ role }).eq("user_id", u.user_id);
    await logAudit("set_role", u.user_id, { role, name: u.full_name });
    await reload();
  }
  async function toggleActive(u: Profile) {
    await supabase.from("profiles").update({ active: !u.active }).eq("user_id", u.user_id);
    await logAudit(u.active ? "deactivate" : "activate", u.user_id, { name: u.full_name });
    await reload();
  }
  async function setGroup(u: Profile, groupId: string | null) {
    await supabase.from("profiles").update({ group_id: groupId }).eq("user_id", u.user_id);
    await logAudit("set_group", u.user_id, { group_id: groupId, name: u.full_name });
    await reload();
  }
  async function toggleCoordGroup(coordId: string, groupId: string, on: boolean) {
    if (on) await supabase.from("coordinator_groups").insert({ coordinator_id: coordId, group_id: groupId });
    else await supabase.from("coordinator_groups").delete().eq("coordinator_id", coordId).eq("group_id", groupId);
    await logAudit("coordinator_group", coordId, { group_id: groupId, authorized: on });
    await reload();
  }

  return (
    <div className="space-y-2">
      <input
        className="field"
        placeholder="Search by name, email, or devotee ID…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {filtered.map((u) => (
        <div key={u.user_id} className="card !p-0 overflow-hidden">
          <button
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
            onClick={() => setOpen(open === u.user_id ? null : u.user_id)}
          >
            <div className="min-w-0">
              <div className="truncate font-semibold text-stone-800">{u.full_name ?? u.email ?? "Devotee"}</div>
              <div className="truncate text-xs text-stone-400">
                {u.email} {!u.active && <span className="font-semibold text-red-500">· inactive</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold capitalize text-stone-600">
                {u.role}
              </span>
              <ChevronDown size={16} className={`text-stone-400 transition ${open === u.user_id ? "rotate-180" : ""}`} />
            </div>
          </button>

          {open === u.user_id && (
            <div className="space-y-3 border-t border-stone-100 bg-stone-50 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Role</label>
                  <select className="field" value={u.role} onChange={(e) => setRole(u, e.target.value as Role)}>
                    <option value="devotee">Devotee</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Group</label>
                  <select
                    className="field"
                    value={u.group_id ?? ""}
                    onChange={(e) => setGroup(u, e.target.value || null)}
                  >
                    <option value="">— none —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button className={`btn-ghost w-full text-sm ${u.active ? "!text-red-600" : "!text-emerald-600"}`} onClick={() => toggleActive(u)}>
                {u.active ? "Deactivate account" : "Reactivate account"}
              </button>

              {(u.role === "coordinator" || u.role === "admin") && groups.length > 0 && (
                <div>
                  <label className="label">Authorized groups (coordinator can view)</label>
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const on = coordGroups.has(`${u.user_id}:${g.id}`);
                      return (
                        <button
                          key={g.id}
                          onClick={() => toggleCoordGroup(u.user_id, g.id, !on)}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                            on ? "bg-orange-600 text-white" : "bg-white text-stone-500 ring-1 ring-stone-200"
                          }`}
                        >
                          {g.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Groups ─────────────────────────────────────────────────────────────────
function GroupsTab({
  groups,
  logAudit,
  reload,
}: {
  groups: Group[];
  logAudit: (action: string, target: string | null, detail: Record<string, unknown>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const { error } = await supabase.from("groups").insert({ name: trimmed });
    if (error) alert(error.message);
    else {
      await logAudit("create_group", null, { name: trimmed });
      setName("");
      await reload();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="field"
          placeholder="New group name (e.g. Bengaluru North)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button className="btn-primary" onClick={add} disabled={saving}>
          <Plus size={18} />
        </button>
      </div>
      {groups.length === 0 ? (
        <div className="card text-sm text-stone-500">No groups yet.</div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="card !py-3 font-medium text-stone-700">
              {g.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Targets ────────────────────────────────────────────────────────────────
function TargetsTab({
  targets,
  logAudit,
  reload,
}: {
  targets: Target[];
  logAudit: (action: string, target: string | null, detail: Record<string, unknown>) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const current = resolveTarget(localDateKey(), targets);
  const [japa, setJapa] = useState(current.japa_rounds);
  const [reading, setReading] = useState(current.reading_minutes);
  const [hearing, setHearing] = useState(current.hearing_minutes);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("targets").insert({
      user_id: null,
      japa_rounds: japa,
      reading_minutes: reading,
      hearing_minutes: hearing,
      effective_from: localDateKey(),
    });
    if (error) alert(error.message);
    else {
      await logAudit("set_recommended_target", null, { japa, reading, hearing });
      await reload();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="card text-sm text-stone-500">
        Currently recommended: <b className="text-stone-800">{current.japa_rounds} rounds</b>,{" "}
        {current.reading_minutes}m reading, {current.hearing_minutes}m hearing. A new target takes effect today;
        past reports keep the target that was active then.
      </div>
      <div className="card space-y-3">
        <Num label="Japa rounds" value={japa} onChange={setJapa} />
        <Num label="Reading minutes" value={reading} onChange={setReading} />
        <Num label="Hearing minutes" value={hearing} onChange={setHearing} />
        <button className="btn-primary w-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Set recommended target"}
        </button>
      </div>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="field"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      />
    </div>
  );
}

// ── Audit ──────────────────────────────────────────────────────────────────
function AuditTab({ audit }: { audit: AuditEntry[] }) {
  if (audit.length === 0) return <div className="card text-sm text-stone-500">No audit entries yet.</div>;
  return (
    <div className="space-y-2">
      {audit.map((e) => (
        <div key={e.id} className="card !py-3">
          <div className="flex items-center justify-between">
            <span className="font-medium capitalize text-stone-800">{e.action.replace(/_/g, " ")}</span>
            <span className="text-xs text-stone-400">{new Date(e.created_at).toLocaleString("en-IN")}</span>
          </div>
          {e.detail && <div className="mt-1 text-xs text-stone-500">{JSON.stringify(e.detail)}</div>}
        </div>
      ))}
    </div>
  );
}
