/*
  # Grant explicit table privileges

  1. Background
  - Newer Supabase projects no longer automatically grant SELECT/INSERT/
    UPDATE/DELETE on public tables to anon/authenticated/service_role the
    way older projects did — that became opt-in.
  - Our RLS policies were already correct, but without the underlying GRANT,
    PostgREST returns "permission denied for table X" (42501) before RLS
    even gets evaluated — this affects the sync script's secret key too,
    since GRANT and RLS are two separate layers (GRANT = can you reach the
    table at all, RLS = which rows can you see/touch).

  2. Changes
  - Explicitly grant SELECT on players to anon and authenticated (matches
    the existing public read-only RLS policy).
  - Explicitly grant SELECT, INSERT, UPDATE, DELETE on players, profiles,
    and game_history to service_role, so the secret key used by the sync
    script (and any admin/server-side operation) can actually reach these
    tables. RLS remains bypassed for service_role as before — this just
    restores the table-level reachability that RLS depends on.
  - Owner-scoped access for authenticated on profiles/game_history is
    already covered by existing RLS policies; grant matching table-level
    access so those policies can actually take effect.
*/

GRANT SELECT ON public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO service_role;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO service_role;

GRANT SELECT, INSERT ON public.game_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_history TO service_role;
