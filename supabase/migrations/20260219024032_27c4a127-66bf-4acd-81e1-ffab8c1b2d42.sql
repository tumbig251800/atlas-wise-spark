CREATE UNIQUE INDEX IF NOT EXISTS ux_diag_session_row
ON public.diagnostic_events (teaching_log_id)
WHERE student_id IS NULL;