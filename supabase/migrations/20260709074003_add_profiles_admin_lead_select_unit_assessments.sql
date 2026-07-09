-- Extend unit_assessments SELECT access to profiles.role admin/lead, matching the
-- fixes already applied to teaching_logs and remedial_tracking. Additive only —
-- does not touch the existing director/lead/teacher policies.
CREATE POLICY "profiles_admin_lead_can_view_all_unit_assessments"
  ON public.unit_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin', 'lead'])
    )
  );
