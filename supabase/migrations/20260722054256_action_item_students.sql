-- =====================================================================
-- WP1A-1  action_item_students
-- Links an Action Board item (action_plan_items) to individual students.
-- Forward-only against the current Production schema (app live since May 2569).
-- =====================================================================
--
-- Evidence (read-only Production metadata):
--   action_plan_items.id : bigint  (FK target -> action_item_id bigint)
--   students.id          : uuid    (PK; FK target -> student_id uuid)
--   students.student_id   : text, NOT unique -> deliberately NOT used as an FK
--   owner field on the Action Board = action_plan_items.teacher_id (uuid -> auth.users)
--   roster owner field = students.teacher_id (uuid -> auth.users)
--   role helpers (real): has_role(uid,'director'::app_role), has_role(uid,'lead'::app_role)
--   RLS mirrored on the parent table's own pattern (Teachers own / Lead all / Directors all).
--
-- Teacher RLS enforces DUAL ownership: the teacher must own BOTH the parent Action
-- Item (action_plan_items.teacher_id) AND the linked student's roster
-- (students.teacher_id) = auth.uid(). This stops a teacher linking an arbitrary
-- student uuid that is outside their own roster. (Note: students.teacher_id is the
-- roster owner; if co-teaching is ever introduced this predicate is intentionally
-- strict and can be relaxed then. system_detected rows are written server-side via
-- service_role, which bypasses RLS.)
--
-- FK delete rules: action_item_id CASCADEs (a link is meaningless without its parent
-- Action Item), but student_id and created_by use RESTRICT so deleting a student or a
-- user account cannot silently erase Action/PLC link history. (Project convention for
-- user-audit FKs is ON DELETE SET NULL — e.g. action_plan_items.teacher_id/verified_by
-- — but created_by is NOT NULL here, so RESTRICT preserves the audit trail instead.)
--
-- No student names / PII: only the students.id FK is stored, never first_name/
-- last_name/student_name. No DML, no seed data, no triggers.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.action_item_students (
  action_item_id   bigint       NOT NULL,
  student_id       uuid         NOT NULL,
  selection_source text         NOT NULL,
  created_by       uuid         NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT action_item_students_pkey
    PRIMARY KEY (action_item_id, student_id),
  CONSTRAINT action_item_students_action_item_id_fkey
    FOREIGN KEY (action_item_id) REFERENCES public.action_plan_items (id) ON DELETE CASCADE,
  CONSTRAINT action_item_students_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE RESTRICT,
  CONSTRAINT action_item_students_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT action_item_students_selection_source_check
    CHECK (selection_source = ANY (ARRAY['individual'::text, 'group'::text, 'whole_class'::text, 'system_detected'::text]))
);

-- FK indexes (the PK already covers the leading action_item_id column).
CREATE INDEX IF NOT EXISTS idx_action_item_students_student_id
  ON public.action_item_students (student_id);
CREATE INDEX IF NOT EXISTS idx_action_item_students_created_by
  ON public.action_item_students (created_by);

-- ---------------------------------------------------------------------
-- RLS: enable, strip PUBLIC/anon, grant only what authenticated needs.
-- ---------------------------------------------------------------------
ALTER TABLE public.action_item_students ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.action_item_students FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_item_students TO authenticated;

-- Teachers: manage links only when they own BOTH the parent Action Item
-- (action_plan_items.teacher_id) AND the linked student's roster
-- (students.teacher_id) = current user.
CREATE POLICY action_item_students_teacher_select
  ON public.action_item_students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = action_item_id
        AND a.teacher_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = action_item_students.student_id
        AND s.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY action_item_students_teacher_insert
  ON public.action_item_students
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = action_item_id
        AND a.teacher_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = action_item_students.student_id
        AND s.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY action_item_students_teacher_update
  ON public.action_item_students
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = action_item_id
        AND a.teacher_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = action_item_students.student_id
        AND s.teacher_id = (select auth.uid())
    )
  )
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = action_item_id
        AND a.teacher_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = action_item_students.student_id
        AND s.teacher_id = (select auth.uid())
    )
  );

CREATE POLICY action_item_students_teacher_delete
  ON public.action_item_students
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plan_items a
      WHERE a.id = action_item_id
        AND a.teacher_id = (select auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = action_item_students.student_id
        AND s.teacher_id = (select auth.uid())
    )
  );

-- Academic lead: read-all for oversight.
CREATE POLICY action_item_students_lead_select
  ON public.action_item_students
  FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role));

-- Director: read-all for oversight.
CREATE POLICY action_item_students_director_select
  ON public.action_item_students
  FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'director'::app_role));
