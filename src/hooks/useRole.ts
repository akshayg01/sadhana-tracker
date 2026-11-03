import type { Role } from "../lib/types";
import { useProfile } from "./useProfile";

/** Derives role flags from the user's profile. No row → least-privilege devotee. */
export function useRole(userId: string | undefined) {
  const { profile, loading } = useProfile(userId);
  const role: Role = profile?.role ?? "devotee";
  return {
    role,
    isAdmin: role === "admin",
    isCoordinator: role === "coordinator" || role === "admin",
    loading,
  };
}
