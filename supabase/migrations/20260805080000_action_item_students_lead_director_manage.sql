-- action_item_students currently lets lead/director SELECT (see
-- action_item_students_lead_select / action_item_students_director_select in
-- 20260722054256_action_item_students.sql) but not INSERT or DELETE — only the
-- exact owning teacher can add/remove students on a case (dual-ownership check:
-- teacher must own both the action item and the student's roster). This means
-- an admin/lead account cannot add students to a case that belongs to a
-- different teacher, which blocks the MonitoringResultsPanel before/after
-- evidence step for any case they're overseeing but don't personally teach.
--
-- Mirrors the existing lead/director SELECT policies: same has_role() check
-- against user_roles (confirmed working for the current admin account, which
-- holds 'director' there). No roster-ownership check here, unlike the teacher
-- policies — lead/director are meant to manage cases across the whole school,
-- not just their own classroom.
CREATE POLICY action_item_students_lead_director_insert
  ON public.action_item_students
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND (
      has_role((select auth.uid()), 'lead'::app_role)
      OR has_role((select auth.uid()), 'director'::app_role)
    )
  );

CREATE POLICY action_item_students_lead_director_delete
  ON public.action_item_students
  FOR DELETE TO authenticated
  USING (
    has_role((select auth.uid()), 'lead'::app_role)
    OR has_role((select auth.uid()), 'director'::app_role)
  );
