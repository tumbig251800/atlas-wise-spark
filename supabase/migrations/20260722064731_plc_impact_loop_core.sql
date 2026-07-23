-- =====================================================================
-- WP1A  plc_impact_loop_core
-- PLC Impact Loop DB foundation (forward-only, current Production schema).
-- Chain: Action Board -> PLC -> Intervention -> (Supervision) -> Monitoring
--        -> close | continue.
-- Companion of 20260722054256_action_item_students.sql (Action Item <-> student).
--
-- Evidence (read-only Production metadata):
--   action_plan_items.id : bigint | plc_sessions.id : uuid | students.id : uuid
--   role helpers: has_role(uid,'director'|'lead'::app_role) [SECURITY DEFINER], is_admin()
--   app_role enum (prod) = (teacher, director, lead)
--
-- Design decisions (locked with product owner):
--   1. Monitoring verification is restricted to lead OR admin (a teacher can
--      never verify their own monitoring) -> enforced in monitoring_results RLS.
--   2. PLC is optional before an intervention (intervention_plans.plc_session_id
--      is nullable).
--   3. The owning teacher confirms their own case (case_confirmed_by).
--   4. 'continued' closes the current cycle but re-opens a new one (not final).
--   5. Supervision is never required for closure (requested only when needed).
--   6. Whole-class monitoring is allowed (monitoring_results.student_id nullable).
--
-- Safety: forward-only, no row-data/seed/PII, no HTTP/webhook/n8n trigger, does
-- not alter legacy semantics (action_plan_items.status untouched; new impact_loop_
-- status is a separate column). FK audit rule: created_by/recorded_by/requested_by
-- use RESTRICT (preserve Action/PLC history); reassignable/optional user refs use
-- SET NULL (project convention, e.g. action_plan_items.teacher_id).
-- =====================================================================

-- =====================================================================
-- 1. plc_session_action_items  (relational PLC <-> Action Item link;
--    legacy plc_sessions.linked_action_item_ids array is left intact)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.plc_session_action_items (
  plc_session_id uuid   NOT NULL,
  action_item_id bigint NOT NULL,
  linked_by      uuid   NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plc_session_action_items_pkey PRIMARY KEY (plc_session_id, action_item_id),
  CONSTRAINT plc_session_action_items_plc_session_id_fkey
    FOREIGN KEY (plc_session_id) REFERENCES public.plc_sessions (id) ON DELETE CASCADE,
  CONSTRAINT plc_session_action_items_action_item_id_fkey
    FOREIGN KEY (action_item_id) REFERENCES public.action_plan_items (id) ON DELETE CASCADE,
  CONSTRAINT plc_session_action_items_linked_by_fkey
    FOREIGN KEY (linked_by) REFERENCES auth.users (id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_plc_session_action_items_action_item_id
  ON public.plc_session_action_items (action_item_id);
CREATE INDEX IF NOT EXISTS idx_plc_session_action_items_linked_by
  ON public.plc_session_action_items (linked_by);

ALTER TABLE public.plc_session_action_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plc_session_action_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plc_session_action_items TO authenticated;

-- Linking model (product decision, WP1A design): PLC is orchestrated TOP-DOWN by
-- leadership (admin/lead bundle Action Items into PLC sessions). Teachers may only
-- SEE which PLC their own Action Item was linked to (read-only); they do not create
-- or change links. Ownership of the *Action Item* is the read boundary for teachers.
CREATE POLICY plc_session_action_items_teacher_select
  ON public.plc_session_action_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.action_plan_items a
            WHERE a.id = action_item_id AND a.teacher_id = (select auth.uid()))
  );
-- lead / admin oversight: read + manage links (create/unlink)
CREATE POLICY plc_session_action_items_lead_all
  ON public.plc_session_action_items
  FOR ALL TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin())
  WITH CHECK (
    linked_by = (select auth.uid())
    AND (has_role((select auth.uid()), 'lead'::app_role) OR is_admin())
  );
-- director oversight read
CREATE POLICY plc_session_action_items_director_select
  ON public.plc_session_action_items FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'director'::app_role));

-- =====================================================================
-- 2. intervention_plans
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.intervention_plans (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id      bigint NOT NULL,
  plc_session_id      uuid,                         -- optional (decision 2)
  objective           text   NOT NULL,
  intervention_method text,
  baseline_summary    jsonb,
  target_outcome      jsonb,
  responsible_user_id uuid,                         -- current owner (reassignable)
  start_date          date,
  target_date         date,
  status              text NOT NULL DEFAULT 'draft',
  created_by          uuid NOT NULL,                -- immutable audit
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervention_plans_action_item_id_fkey
    FOREIGN KEY (action_item_id) REFERENCES public.action_plan_items (id) ON DELETE CASCADE,
  CONSTRAINT intervention_plans_plc_session_id_fkey
    FOREIGN KEY (plc_session_id) REFERENCES public.plc_sessions (id) ON DELETE SET NULL,
  CONSTRAINT intervention_plans_responsible_user_id_fkey
    FOREIGN KEY (responsible_user_id) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT intervention_plans_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT intervention_plans_status_check
    CHECK (status = ANY (ARRAY['draft'::text,'active'::text,'monitoring'::text,'completed'::text,'cancelled'::text]))
);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_action_item_id ON public.intervention_plans (action_item_id);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_plc_session_id ON public.intervention_plans (plc_session_id);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_responsible    ON public.intervention_plans (responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_created_by      ON public.intervention_plans (created_by);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_status          ON public.intervention_plans (status);

ALTER TABLE public.intervention_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervention_plans FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervention_plans TO authenticated;

-- owner = responsible teacher or original creator
CREATE POLICY intervention_plans_owner_select
  ON public.intervention_plans FOR SELECT TO authenticated
  USING (responsible_user_id = (select auth.uid()) OR created_by = (select auth.uid()));
CREATE POLICY intervention_plans_owner_insert
  ON public.intervention_plans FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.action_plan_items a
                WHERE a.id = action_item_id AND a.teacher_id = (select auth.uid()))
  );
CREATE POLICY intervention_plans_owner_update
  ON public.intervention_plans FOR UPDATE TO authenticated
  USING (responsible_user_id = (select auth.uid()) OR created_by = (select auth.uid()))
  WITH CHECK (responsible_user_id = (select auth.uid()) OR created_by = (select auth.uid()));
CREATE POLICY intervention_plans_owner_delete
  ON public.intervention_plans FOR DELETE TO authenticated
  USING (created_by = (select auth.uid()));
-- lead / admin oversight (read all + reassign)
CREATE POLICY intervention_plans_lead_select
  ON public.intervention_plans FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin());
CREATE POLICY intervention_plans_lead_update
  ON public.intervention_plans FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin())
  WITH CHECK (has_role((select auth.uid()), 'lead'::app_role) OR is_admin());
-- director read
CREATE POLICY intervention_plans_director_select
  ON public.intervention_plans FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'director'::app_role));

-- =====================================================================
-- 3. intervention_plan_students
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.intervention_plan_students (
  intervention_plan_id uuid NOT NULL,
  student_id           uuid NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervention_plan_students_pkey PRIMARY KEY (intervention_plan_id, student_id),
  CONSTRAINT intervention_plan_students_plan_fkey
    FOREIGN KEY (intervention_plan_id) REFERENCES public.intervention_plans (id) ON DELETE CASCADE,
  CONSTRAINT intervention_plan_students_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_intervention_plan_students_student_id
  ON public.intervention_plan_students (student_id);

ALTER TABLE public.intervention_plan_students ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.intervention_plan_students FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intervention_plan_students TO authenticated;

-- teacher: owns the plan AND the student's roster (dual-ownership, mirrors action_item_students)
CREATE POLICY intervention_plan_students_teacher_all
  ON public.intervention_plan_students FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.intervention_plans ip
            WHERE ip.id = intervention_plan_id
              AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid())))
    AND EXISTS (SELECT 1 FROM public.students s
                WHERE s.id = student_id AND s.teacher_id = (select auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.intervention_plans ip
            WHERE ip.id = intervention_plan_id
              AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid())))
    AND EXISTS (SELECT 1 FROM public.students s
                WHERE s.id = student_id AND s.teacher_id = (select auth.uid()))
  );
CREATE POLICY intervention_plan_students_lead_select
  ON public.intervention_plan_students FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin());
CREATE POLICY intervention_plan_students_director_select
  ON public.intervention_plan_students FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'director'::app_role));

-- =====================================================================
-- 4. (supervision) — intentionally NO new table here.
--    Product decision (WP1A design Q1): supervision is TOP-DOWN — teachers do
--    not request supervision; leadership (admin/lead) arranges and records it.
--    The Impact Loop therefore reuses the existing `nidet_visits` table
--    (leadership-driven observation + 8-dimension rubric, full UI already built)
--    as the supervision record. A per-intervention_plan "request/assignment"
--    workflow (the earlier supervision_requests table) was removed as it did not
--    match how the school actually works.
-- =====================================================================

-- =====================================================================
-- 5. monitoring_results  (before/after evidence; verify = lead|admin only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.monitoring_results (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_plan_id uuid NOT NULL,
  student_id           uuid,                          -- null = whole-class (decision 6)
  monitoring_date      date NOT NULL DEFAULT CURRENT_DATE,
  before_evidence      jsonb NOT NULL,
  after_evidence       jsonb NOT NULL,
  result_status        text NOT NULL,
  notes                text,
  recorded_by          uuid NOT NULL,
  verified_by          uuid,
  verified_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_results_plan_fkey
    FOREIGN KEY (intervention_plan_id) REFERENCES public.intervention_plans (id) ON DELETE CASCADE,
  CONSTRAINT monitoring_results_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students (id) ON DELETE RESTRICT,
  CONSTRAINT monitoring_results_recorded_by_fkey
    FOREIGN KEY (recorded_by) REFERENCES auth.users (id) ON DELETE RESTRICT,
  CONSTRAINT monitoring_results_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT monitoring_results_result_status_check
    CHECK (result_status = ANY (ARRAY['improved'::text,'no_change'::text,'declined'::text,'inconclusive'::text])),
  -- evidence must be a JSON object (not null/array/scalar)
  CONSTRAINT monitoring_results_before_evidence_object_check
    CHECK (jsonb_typeof(before_evidence) = 'object'),
  CONSTRAINT monitoring_results_after_evidence_object_check
    CHECK (jsonb_typeof(after_evidence) = 'object'),
  -- verified_at present iff verified_by present
  CONSTRAINT monitoring_results_verified_pairing_check
    CHECK ((verified_by IS NULL) = (verified_at IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_plan        ON public.monitoring_results (intervention_plan_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_student_id  ON public.monitoring_results (student_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_recorded_by ON public.monitoring_results (recorded_by);
CREATE INDEX IF NOT EXISTS idx_monitoring_results_verified_by ON public.monitoring_results (verified_by);

ALTER TABLE public.monitoring_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monitoring_results FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_results TO authenticated;

-- teacher (owns the plan): read + record; may edit ONLY while unverified and may
-- NEVER set verification fields (decision 1).
CREATE POLICY monitoring_results_owner_select
  ON public.monitoring_results FOR SELECT TO authenticated
  USING (
    -- a per-student result is only visible if the student is in the teacher's
    -- OWN roster (roster scoping — same rule as INSERT/UPDATE; a whole-class
    -- result [student_id IS NULL] stays visible to the plan owner)
    (student_id IS NULL
     OR EXISTS (SELECT 1 FROM public.students s
                WHERE s.id = student_id AND s.teacher_id = (select auth.uid())))
    AND (recorded_by = (select auth.uid())
         OR EXISTS (SELECT 1 FROM public.intervention_plans ip
                    WHERE ip.id = intervention_plan_id
                      AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid()))))
  );
CREATE POLICY monitoring_results_owner_insert
  ON public.monitoring_results FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = (select auth.uid())
    AND verified_by IS NULL AND verified_at IS NULL
    -- a per-student result must reference the teacher's OWN roster (roster scoping)
    AND (student_id IS NULL
         OR EXISTS (SELECT 1 FROM public.students s
                    WHERE s.id = student_id AND s.teacher_id = (select auth.uid())))
    AND EXISTS (SELECT 1 FROM public.intervention_plans ip
                WHERE ip.id = intervention_plan_id
                  AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid())))
  );
CREATE POLICY monitoring_results_owner_update
  ON public.monitoring_results FOR UPDATE TO authenticated
  USING (
    verified_by IS NULL
    AND (recorded_by = (select auth.uid())
         OR EXISTS (SELECT 1 FROM public.intervention_plans ip
                    WHERE ip.id = intervention_plan_id
                      AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid()))))
  )
  WITH CHECK (
    verified_by IS NULL AND verified_at IS NULL          -- teacher edits stay unverified
    AND (student_id IS NULL
         OR EXISTS (SELECT 1 FROM public.students s
                    WHERE s.id = student_id AND s.teacher_id = (select auth.uid())))
    AND (recorded_by = (select auth.uid())
         OR EXISTS (SELECT 1 FROM public.intervention_plans ip
                    WHERE ip.id = intervention_plan_id
                      AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid()))))
  );

-- teacher may DELETE their own monitoring ONLY while unverified (correct a
-- data-entry mistake). Once verified the row is locked evidence — nobody deletes
-- it via RLS (product decision: evidence integrity).
CREATE POLICY monitoring_results_owner_delete
  ON public.monitoring_results FOR DELETE TO authenticated
  USING (
    verified_by IS NULL
    -- roster scoping: cannot delete a per-student result outside own roster
    AND (student_id IS NULL
         OR EXISTS (SELECT 1 FROM public.students s
                    WHERE s.id = student_id AND s.teacher_id = (select auth.uid())))
    AND (recorded_by = (select auth.uid())
         OR EXISTS (SELECT 1 FROM public.intervention_plans ip
                    WHERE ip.id = intervention_plan_id
                      AND (ip.responsible_user_id = (select auth.uid()) OR ip.created_by = (select auth.uid()))))
  );

-- lead / admin: read all + VERIFY (may set verified_by only to themselves).
CREATE POLICY monitoring_results_verifier_select
  ON public.monitoring_results FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin());
CREATE POLICY monitoring_results_verifier_update
  ON public.monitoring_results FOR UPDATE TO authenticated
  USING (has_role((select auth.uid()), 'lead'::app_role) OR is_admin())
  WITH CHECK (
    (has_role((select auth.uid()), 'lead'::app_role) OR is_admin())
    AND (verified_by IS NULL OR verified_by = (select auth.uid()))   -- verifier attests as self
  );
-- director read
CREATE POLICY monitoring_results_director_select
  ON public.monitoring_results FOR SELECT TO authenticated
  USING (has_role((select auth.uid()), 'director'::app_role));

-- =====================================================================
-- 6. action_plan_items — backward-compatible Impact Loop fields
--    (legacy `status` semantics untouched; impact_loop_status is separate)
-- =====================================================================
ALTER TABLE public.action_plan_items
  ADD COLUMN IF NOT EXISTS impact_loop_status        text,
  ADD COLUMN IF NOT EXISTS evidence_context          jsonb,
  ADD COLUMN IF NOT EXISTS student_scope_type        text,
  ADD COLUMN IF NOT EXISTS ai_draft                  jsonb,
  ADD COLUMN IF NOT EXISTS case_confirmed_by         uuid,
  ADD COLUMN IF NOT EXISTS case_confirmed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS closed_after_monitoring_at timestamptz;

-- constraints via guarded DO blocks (ADD CONSTRAINT has no IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='action_plan_items_case_confirmed_by_fkey') THEN
    ALTER TABLE public.action_plan_items
      ADD CONSTRAINT action_plan_items_case_confirmed_by_fkey
      FOREIGN KEY (case_confirmed_by) REFERENCES auth.users (id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='action_plan_items_impact_loop_status_check') THEN
    ALTER TABLE public.action_plan_items
      ADD CONSTRAINT action_plan_items_impact_loop_status_check
      CHECK (impact_loop_status IS NULL OR impact_loop_status = ANY (ARRAY[
        'draft'::text,'awaiting_confirmation'::text,'confirmed'::text,'plc_planned'::text,
        'intervention_active'::text,'monitoring'::text,'closed'::text,'continued'::text]));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='action_plan_items_student_scope_type_check') THEN
    ALTER TABLE public.action_plan_items
      ADD CONSTRAINT action_plan_items_student_scope_type_check
      CHECK (student_scope_type IS NULL OR student_scope_type = ANY (ARRAY[
        'individual'::text,'group'::text,'whole_class'::text,'system_detected'::text]));
  END IF;
  -- from 'confirmed' onward a human confirmer is required (decision 3)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='action_plan_items_impact_confirmed_requires_confirmer_check') THEN
    ALTER TABLE public.action_plan_items
      ADD CONSTRAINT action_plan_items_impact_confirmed_requires_confirmer_check
      CHECK (
        impact_loop_status IS NULL
        OR impact_loop_status = ANY (ARRAY['draft'::text,'awaiting_confirmation'::text])
        OR (case_confirmed_by IS NOT NULL AND case_confirmed_at IS NOT NULL)
      );
  END IF;
END$$;

-- =====================================================================
-- 7. Closure guard: block impact_loop_status='closed' unless the loop is
--    genuinely complete. SECURITY INVOKER (the closer reads their own rows
--    under RLS); no dynamic SQL, no HTTP/webhook. There is NO trigger that
--    closes an Action Item from a PLC status change (decision / rule).
-- =====================================================================
CREATE OR REPLACE FUNCTION public.plc_enforce_closure_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.impact_loop_status IS DISTINCT FROM 'closed' THEN
    RETURN NEW;
  END IF;

  IF NEW.closed_after_monitoring_at IS NULL THEN
    RAISE EXCEPTION 'closure blocked: closed_after_monitoring_at must be set for action item %', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.intervention_plans ip WHERE ip.action_item_id = NEW.id) THEN
    RAISE EXCEPTION 'closure blocked: action item % has no intervention plan', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.monitoring_results m
    JOIN public.intervention_plans ip ON ip.id = m.intervention_plan_id
    WHERE ip.action_item_id = NEW.id
      AND m.verified_by IS NOT NULL
      AND m.verified_at IS NOT NULL
      AND jsonb_typeof(m.before_evidence) = 'object'
      AND jsonb_typeof(m.after_evidence)  = 'object'
  ) THEN
    RAISE EXCEPTION 'closure blocked: action item % needs a verified before/after monitoring result', NEW.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_plan_items_closure_guard ON public.action_plan_items;
CREATE TRIGGER trg_action_plan_items_closure_guard
  BEFORE INSERT OR UPDATE OF impact_loop_status ON public.action_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.plc_enforce_closure_guard();

-- =====================================================================
-- 8. Immutability guards. RLS cannot express OLD<>NEW, so minimal
--    BEFORE UPDATE OF <col> triggers enforce that structural / audit columns
--    never change after creation. No dynamic SQL (to_jsonb read only), no
--    HTTP/webhook, SECURITY INVOKER. Two classes:
--    (a) parent-FK re-parenting (a plan belongs to one Action Item; a
--        monitoring row to one plan) — blocks attaching evidence to another
--        teacher's case / feeding the closure guard from the wrong tree.
--    (b) audit authorship (created_by / recorded_by) — cannot be rewritten by
--        ANYONE (incl. lead/admin), so history cannot be falsified.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.plc_forbid_column_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  col text := TG_ARGV[0];
BEGIN
  IF (to_jsonb(NEW) ->> col) IS DISTINCT FROM (to_jsonb(OLD) ->> col) THEN
    RAISE EXCEPTION '%.% is immutable and cannot be changed', TG_TABLE_NAME, col
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- (a) parent-FK immutability
DROP TRIGGER IF EXISTS trg_intervention_plans_no_reparent ON public.intervention_plans;
CREATE TRIGGER trg_intervention_plans_no_reparent
  BEFORE UPDATE OF action_item_id ON public.intervention_plans
  FOR EACH ROW EXECUTE FUNCTION public.plc_forbid_column_change('action_item_id');

DROP TRIGGER IF EXISTS trg_monitoring_results_no_reparent ON public.monitoring_results;
CREATE TRIGGER trg_monitoring_results_no_reparent
  BEFORE UPDATE OF intervention_plan_id ON public.monitoring_results
  FOR EACH ROW EXECUTE FUNCTION public.plc_forbid_column_change('intervention_plan_id');

-- (b) audit-authorship immutability (universal — even lead/admin cannot rewrite)
DROP TRIGGER IF EXISTS trg_intervention_plans_created_by_immutable ON public.intervention_plans;
CREATE TRIGGER trg_intervention_plans_created_by_immutable
  BEFORE UPDATE OF created_by ON public.intervention_plans
  FOR EACH ROW EXECUTE FUNCTION public.plc_forbid_column_change('created_by');

DROP TRIGGER IF EXISTS trg_monitoring_results_recorded_by_immutable ON public.monitoring_results;
CREATE TRIGGER trg_monitoring_results_recorded_by_immutable
  BEFORE UPDATE OF recorded_by ON public.monitoring_results
  FOR EACH ROW EXECUTE FUNCTION public.plc_forbid_column_change('recorded_by');

-- =====================================================================
-- 9. Reassigning intervention_plans.responsible_user_id is an OVERSIGHT action:
--    only lead/admin may change it (a teacher must not be able to hand their
--    plan — and the student data it exposes — to an arbitrary colleague). A
--    non-JWT context (service_role backend, auth.uid() IS NULL) is exempt.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.plc_guard_responsible_reassign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.responsible_user_id IS DISTINCT FROM OLD.responsible_user_id
     AND (SELECT auth.uid()) IS NOT NULL
     AND NOT (has_role((SELECT auth.uid()), 'lead'::app_role) OR is_admin()) THEN
    RAISE EXCEPTION 'reassigning responsible_user_id requires lead or admin'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intervention_plans_reassign_guard ON public.intervention_plans;
CREATE TRIGGER trg_intervention_plans_reassign_guard
  BEFORE UPDATE OF responsible_user_id ON public.intervention_plans
  FOR EACH ROW EXECUTE FUNCTION public.plc_guard_responsible_reassign();
