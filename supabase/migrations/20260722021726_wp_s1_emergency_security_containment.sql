-- WP-S1: Emergency Security Containment
--
-- Closes two P0 findings from Codex review of production metadata + Supabase
-- Security Advisor:
--   1. public.exec_sql(text) and public.promote_to_director_by_email(text) are
--      SECURITY DEFINER (run as postgres) yet EXECUTE was granted to
--      PUBLIC/anon/authenticated/service_role -> anonymous arbitrary-SQL and
--      privilege escalation.
--   2. Backup tables zz_subject_fix_backup_20260715 / zz_remedial_dedup_backup_20260715
--      have RLS disabled and full DML grants to anon/authenticated -> exposed via
--      the Data API (the remedial backup carries a student identifier column).
--
-- Least privilege: no proven consumer exists for either function (0 references in
-- frontend, edge functions, migrations, DB functions/cron/views, or readable n8n
-- workflows), so EXECUTE is revoked from service_role as well. The function owner
-- (postgres) retains EXECUTE implicitly. If a real consumer is later proven, a
-- separate reviewed+approved migration must grant only the specific internal role.
--
-- Idempotent / replay-safe: every action is guarded by object existence, so a
-- fresh replay (where these dashboard-created objects do not yet exist) is a no-op
-- and never errors. Does NOT drop objects, delete data, change function bodies,
-- alter the role model, create user-facing policies, touch default privileges, or
-- touch students / plc_sessions / nidet_visits.

DO $$
BEGIN
  IF to_regprocedure('public.exec_sql(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.exec_sql(text)
             FROM PUBLIC, anon, authenticated, service_role';
  END IF;

  IF to_regprocedure('public.promote_to_director_by_email(text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.promote_to_director_by_email(text)
             FROM PUBLIC, anon, authenticated, service_role';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.zz_subject_fix_backup_20260715') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.zz_subject_fix_backup_20260715 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.zz_subject_fix_backup_20260715 FROM PUBLIC, anon, authenticated';
  END IF;

  IF to_regclass('public.zz_remedial_dedup_backup_20260715') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.zz_remedial_dedup_backup_20260715 ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public.zz_remedial_dedup_backup_20260715 FROM PUBLIC, anon, authenticated';
  END IF;
END
$$;
