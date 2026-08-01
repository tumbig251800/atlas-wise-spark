-- Corrective follow-up to WP-S1 (20260722021726_wp_s1_emergency_security_containment.sql).
--
-- That migration revoked EXECUTE on public.exec_sql(text) from
-- PUBLIC/anon/authenticated/service_role, reasoning that "no proven consumer
-- exists" — a conclusion scoped only to this repo (atlas-wise-spark). A real,
-- separate consumer exists: ~/kindergarten-mcp (a local stdio MCP server for
-- the school's kindergarten development-tracking data), whose own setup
-- script (sql/setup.sql) originally granted EXECUTE to service_role only —
-- the correct, narrow, intended design (a trusted server-side credential,
-- not public/anon/authenticated, which was the actual P0 vulnerability).
--
-- This restores that original grant. PUBLIC/anon/authenticated remain
-- revoked — the vulnerability WP-S1 closed is still closed.

DO $$
BEGIN
  IF to_regprocedure('public.exec_sql(text)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role';
  END IF;
END
$$;
