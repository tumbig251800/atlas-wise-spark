-- AI-plan flow: let the AI pick the initial PLC meeting date and get it onto
-- the calendar automatically, without touching the existing follow-up sync
-- (calendar_event_id / calendar_html_link, scoped to next_plc_date).
--
-- ai_scheduled marks sessions whose session_date was auto-picked by the AI
-- planning flow (plc-bundle-draft), as opposed to a human-picked date from
-- the manual "เปิด PLC เอง" / "เปิด PLC ให้ครู" flow.

ALTER TABLE public.plc_sessions
  ADD COLUMN IF NOT EXISTS ai_scheduled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS session_calendar_event_id  text,
  ADD COLUMN IF NOT EXISTS session_calendar_html_link text;

-- Speeds up WF-4's daily query for AI-scheduled sessions that still need an
-- initial calendar event.
CREATE INDEX IF NOT EXISTS plc_sessions_initial_calendar_idx
  ON public.plc_sessions (session_date)
  WHERE ai_scheduled = true AND session_calendar_event_id IS NULL;
