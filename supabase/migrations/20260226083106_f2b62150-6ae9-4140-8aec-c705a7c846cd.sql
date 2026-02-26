
-- Director INSERT policies for all relevant tables
CREATE POLICY "Directors can insert logs for any teacher"
  ON teaching_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can insert diagnostic events for any teacher"
  ON diagnostic_events FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can insert remedial tracking for any teacher"
  ON remedial_tracking FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can insert strikes for any teacher"
  ON strike_counter FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can insert pivot events for any teacher"
  ON pivot_events FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'director'::app_role));

-- Directors also need UPDATE on strike_counter (used by update_class_strike function indirectly)
CREATE POLICY "Directors can update strikes for any teacher"
  ON strike_counter FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'director'::app_role));

-- Directors need DELETE on teaching_logs too
CREATE POLICY "Directors can delete all logs"
  ON teaching_logs FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'director'::app_role));
