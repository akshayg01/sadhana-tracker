import { BarChart3, BookOpen, LogOut, Shield, User, Users } from "lucide-react";
import { useSession } from "./hooks/useSession";
import { useProfile } from "./hooks/useProfile";
import { useHashSegments } from "./lib/hashRoute";
import { supabase } from "./lib/supabase";
import LandingPage from "./components/LandingPage";
import RecordSadhana from "./components/RecordSadhana";
import Progress from "./components/Progress";
import CoordinatorDashboard from "./components/CoordinatorDashboard";
import AdminPanel from "./components/AdminPanel";
import ProfilePage from "./components/ProfilePage";

export default function App() {
  const { session, loading } = useSession();
  const userId = session?.user.id;
  const { profile } = useProfile(userId);
  const [segments, navigate] = useHashSegments();

  const isAdmin = profile?.role === "admin";
  const isCoordinator = profile?.role === "coordinator" || isAdmin;

  if (loading) {
    return <div className="flex min-h-[100dvh] items-center justify-center text-stone-400">Loading…</div>;
  }
  if (!session || !userId) return <LandingPage />;

  const allowed = new Set([
    "record",
    "progress",
    "profile",
    ...(isCoordinator ? ["coordinator"] : []),
    ...(isAdmin ? ["admin"] : []),
  ]);
  const page = allowed.has(segments[0]) ? segments[0] : "record";

  const name = profile?.full_name ?? session.user.email ?? "Devotee";

  const navItems = [
    { id: "record", label: "Record", icon: BookOpen },
    { id: "progress", label: "Progress", icon: BarChart3 },
    ...(isCoordinator ? [{ id: "coordinator", label: "Group", icon: Users }] : []),
    ...(isAdmin ? [{ id: "admin", label: "Admin", icon: Shield }] : []),
  ];

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-saffron-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-stone-900">
              Hare Krishna, {name.split(" ")[0]} 🙏
            </div>
            <div className="text-xs text-stone-400">Sadhana Tracker</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost !px-3 !py-2"
              onClick={() => navigate(["profile"])}
              aria-label="Profile"
            >
              <User size={18} />
            </button>
            <button className="btn-ghost !px-3 !py-2" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {page === "record" && <RecordSadhana userId={userId} />}
        {page === "progress" && <Progress userId={userId} />}
        {page === "coordinator" && isCoordinator && <CoordinatorDashboard userId={userId} isAdmin={!!isAdmin} />}
        {page === "admin" && isAdmin && <AdminPanel userId={userId} />}
        {page === "profile" && <ProfilePage profile={profile} email={session.user.email ?? null} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate([item.id])}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                  active ? "text-orange-600" : "text-stone-400"
                }`}
              >
                <Icon size={22} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
