ALTER TABLE plc_sessions
DROP CONSTRAINT plc_sessions_plc_type_check;

ALTER TABLE plc_sessions
ADD CONSTRAINT plc_sessions_plc_type_check
CHECK (plc_type = ANY (ARRAY['subject', 'grade_band', 'cross']));
