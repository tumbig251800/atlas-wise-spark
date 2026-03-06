-- Phase 1.2: RLS Migration Verification
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/sql
-- Verifies Row Level Security is enabled and policies exist on all ATLAS tables

-- 1. Tables that SHOULD have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'user_roles', 'teaching_logs',
    'diagnostic_events', 'strike_counter', 'remedial_tracking',
    'pivot_events', 'unit_assessments', 'topic_aliases'
  )
ORDER BY tablename;

-- 2. All RLS policies per table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text AS using_expr,
  with_check::text
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
