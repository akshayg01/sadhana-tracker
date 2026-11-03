import { supabase } from "./supabase";

/**
 * Permanently deletes the current user's account and all associated data, then
 * signs them out. Backed by the `delete_my_account()` database function, which
 * removes the auth user and cascades every app table (profile, daily records,
 * reading/hearing sessions, personal targets). Irreversible.
 */
export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  await supabase.auth.signOut();
}
