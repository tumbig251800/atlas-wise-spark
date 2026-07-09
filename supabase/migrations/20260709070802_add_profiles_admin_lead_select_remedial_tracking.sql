-- Extend remedial_tracking SELECT access to profiles.role admin/lead, matching the
-- fix already applied to teaching_logs. Additive only — does not touch the existing
-- "Lead can view all remedial tracking" / "Teachers can view own remedial tracking" /
-- "Admins can view all remedial tracking" (legacy teachers-table check) policies.
CREATE POLICY "profiles_admin_lead_can_view_all_remedial_tracking"
  ON public.remedial_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin', 'lead'])
    )
  );
