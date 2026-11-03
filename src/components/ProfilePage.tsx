import { useState } from "react";
import { AlertTriangle, Trash2, User } from "lucide-react";
import type { Profile } from "../lib/types";
import { deleteMyAccount } from "../lib/account";

export default function ProfilePage({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = profile?.full_name ?? email ?? "Devotee";

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteMyAccount();
      // signOut() inside deleteMyAccount ends the session; App re-renders to
      // the landing page and this component unmounts.
    } catch (e) {
      setError("Could not delete your account. Please try again, or contact support.");
      console.error(e);
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-24 pt-4">
      {/* Profile card */}
      <div className="card">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
            <User size={24} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-stone-900">{name}</div>
            <div className="truncate text-sm text-stone-400">{email}</div>
          </div>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Role" value={profile?.role ?? "devotee"} />
          {profile?.group_name && <Row label="Group" value={profile.group_name} />}
          {profile?.devotee_id && <Row label="Devotee ID" value={profile.devotee_id} />}
        </dl>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="mb-2 flex items-center gap-2 font-semibold text-red-700">
          <AlertTriangle size={18} /> Delete account
        </div>
        <p className="mb-3 text-sm text-red-700/80">
          Permanently delete your account and all your sadhana records. This
          cannot be undone.
        </p>
        <button
          className="btn w-full bg-red-600 text-white hover:bg-red-700"
          onClick={() => {
            setTyped("");
            setError(null);
            setConfirmOpen(true);
          }}
        >
          <Trash2 size={18} /> Delete my account
        </button>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-2 flex items-center gap-2 text-lg font-bold text-red-700">
              <AlertTriangle size={20} /> Delete account?
            </div>
            <p className="mb-4 text-sm text-stone-600">
              This permanently deletes your profile and every sadhana record you
              have saved. It cannot be undone. Type <strong>DELETE</strong> to
              confirm.
            </p>
            <input
              className="field mb-3"
              placeholder="Type DELETE"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                className="btn-ghost flex-1"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn flex-1 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                onClick={handleDelete}
                disabled={deleting || typed.trim().toUpperCase() !== "DELETE"}
              >
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-stone-400">{label}</dt>
      <dd className="font-medium capitalize text-stone-700">{value}</dd>
    </div>
  );
}
