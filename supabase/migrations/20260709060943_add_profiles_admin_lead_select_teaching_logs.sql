-- Extend teaching_logs SELECT access to profiles.role admin/lead, matching the
-- policy already used on classroom_research_suggestions (admin_lead_all_rows).
-- Additive only — does not replace or touch the existing has_role('director')/'lead' policies.
CREATE POLICY "profiles_admin_lead_can_view_all_logs"
  ON public.teaching_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY['admin', 'lead'])
    )
  );
