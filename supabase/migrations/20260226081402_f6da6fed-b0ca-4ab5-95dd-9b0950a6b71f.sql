
CREATE POLICY "Teachers can delete own diagnostic events"
  ON diagnostic_events FOR DELETE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own remedial tracking"
  ON remedial_tracking FOR DELETE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own strikes"
  ON strike_counter FOR DELETE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own pivot events"
  ON pivot_events FOR DELETE
  USING (teacher_id = auth.uid());

CREATE POLICY "Directors can delete all diagnostic events"
  ON diagnostic_events FOR DELETE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can delete all remedial tracking"
  ON remedial_tracking FOR DELETE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can delete all strikes"
  ON strike_counter FOR DELETE
  USING (has_role(auth.uid(), 'director'::app_role));

CREATE POLICY "Directors can delete all pivot events"
  ON pivot_events FOR DELETE
  USING (has_role(auth.uid(), 'director'::app_role));
