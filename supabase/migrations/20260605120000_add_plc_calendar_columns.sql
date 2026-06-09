-- WF-4 PLC Follow-up support
-- Adds the columns the n8n workflow needs to record the Google Calendar event it
-- creates for each PLC session whose outcome_type = 'continue_plc'.
-- Without these columns the "Update PLC Session with Event ID" node has nowhere to
-- write the event id and the daily follow-up dedup (calendar_event_id IS NULL) cannot work.

ALTER TABLE public.plc_sessions
  ADD COLUMN IF NOT EXISTS calendar_event_id  text,
  ADD COLUMN IF NOT EXISTS calendar_html_link text;

-- Speeds up the daily follow-up query: sessions that still need a calendar event.
CREATE INDEX IF NOT EXISTS plc_sessions_followup_idx
  ON public.plc_sessions (next_plc_date)
  WHERE calendar_event_id IS NULL;
