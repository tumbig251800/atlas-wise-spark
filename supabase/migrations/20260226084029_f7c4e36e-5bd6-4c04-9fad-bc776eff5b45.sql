
CREATE POLICY "Directors can update all logs"
  ON teaching_logs FOR UPDATE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can update all diagnostic events"
  ON diagnostic_events FOR UPDATE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can update all remedial tracking"
  ON remedial_tracking FOR UPDATE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can update all pivot events"
  ON pivot_events FOR UPDATE
  USING (has_role(auth.uid(), 'director'::app_role));
