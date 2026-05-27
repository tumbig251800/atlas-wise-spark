-- Add minor_gaps column to teaching_logs
-- Stores secondary/contributing gaps alongside the primary major_gap.
-- Does not alter major_gap (analytics, WF-3, atlas-mcp are unchanged).
ALTER TABLE public.teaching_logs
  ADD COLUMN IF NOT EXISTS minor_gaps public.major_gap[] NOT NULL DEFAULT '{}';
