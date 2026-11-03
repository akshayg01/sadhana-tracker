-- 003_account_deletion.sql — user-initiated account & data deletion
-- Required by Google Play (and good privacy practice): let a signed-in user
-- permanently delete their own account and all associated data from within the
-- app.
--
-- Every app table references auth.users with ON DELETE CASCADE (profiles,
-- daily_records, reading_sessions, hearing_sessions, targets), so deleting the
-- auth user removes all of their rows in one shot.
--
-- SECURITY DEFINER is needed to reach auth.users, but the function only ever
-- targets auth.uid(), so a caller can delete *only themselves*.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only authenticated users may call it; never anon/public.
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
