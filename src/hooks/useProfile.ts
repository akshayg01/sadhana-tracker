import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

/** Loads the current user's profile row. The DB trigger creates one on signup,
 *  but we tolerate a brief gap right after first sign-in. */
export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active) {
          setProfile(data as Profile | null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [userId]);

  return { profile, loading };
}
