
-- 1. Create pivot_events table
CREATE TABLE public.pivot_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id text NOT NULL,
  subject text NOT NULL,
  normalized_topic text NOT NULL,
  trigger_session_id uuid NOT NULL REFERENCES public.teaching_logs(id),
  evidence_refs text[] NOT NULL DEFAULT '{}',
  reason_code text NOT NULL DEFAULT 'FORCE_CLASS_PIVOT',
  teacher_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pivot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own pivot events"
  ON public.pivot_events FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can insert own pivot events"
  ON public.pivot_events FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "Directors can view all pivot events"
  ON public.pivot_events FOR SELECT
  USING (has_role(auth.uid(), 'director'::app_role));

-- 2. Add last_session_id to strike_counter
ALTER TABLE public.strike_counter
  ADD COLUMN IF NOT EXISTS last_session_id uuid;

-- 3. Create transaction-safe RPC function
CREATE OR REPLACE FUNCTION public.update_class_strike(
  p_teacher_id uuid,
  p_scope_id text,
  p_normalized_topic text,
  p_subject text,
  p_gap_type text,
  p_topic text,
  p_session_id uuid,
  p_gap_rate numeric,
  p_is_system_gap boolean,
  p_is_a2_gap boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_new_count integer;
  v_prev_session_id uuid;
  v_pivot_id uuid;
  v_action text;
BEGIN
  -- 1. A2-Gap: skip entirely
  IF p_is_a2_gap THEN
    RETURN jsonb_build_object('action', 'skip_a2', 'strike_count', 0);
  END IF;

  -- 2. System-Gap: no change (freeze state)
  IF p_is_system_gap THEN
    -- Return current state without changing anything
    SELECT strike_count, last_session_id INTO v_existing
    FROM strike_counter
    WHERE teacher_id = p_teacher_id
      AND scope = 'classroom'
      AND scope_id = p_scope_id
      AND normalized_topic = p_normalized_topic
      AND subject = p_subject;

    RETURN jsonb_build_object(
      'action', 'skip_system_gap',
      'strike_count', COALESCE(v_existing.strike_count, 0)
    );
  END IF;

  -- 3. Lock row for update (prevent race condition)
  SELECT id, strike_count, last_session_id
  INTO v_existing
  FROM strike_counter
  WHERE teacher_id = p_teacher_id
    AND scope = 'classroom'
    AND scope_id = p_scope_id
    AND normalized_topic = p_normalized_topic
    AND subject = p_subject
  FOR UPDATE;

  -- 4. Capture prev_session_id BEFORE any update
  v_prev_session_id := v_existing.last_session_id;

  IF p_gap_rate > 40 THEN
    IF v_existing.id IS NOT NULL THEN
      v_new_count := v_existing.strike_count + 1;
    ELSE
      v_new_count := 1;
    END IF;

    IF v_new_count >= 2 THEN
      -- INSERT pivot_event with correct evidence chain
      v_pivot_id := gen_random_uuid();
      INSERT INTO pivot_events (id, class_id, subject, normalized_topic, trigger_session_id, evidence_refs, reason_code, teacher_id)
      VALUES (
        v_pivot_id,
        p_scope_id,
        p_subject,
        p_normalized_topic,
        p_session_id,
        ARRAY[COALESCE(v_prev_session_id::text, ''), p_session_id::text],
        'FORCE_CLASS_PIVOT',
        p_teacher_id
      );

      -- Reset strike AFTER logging pivot
      IF v_existing.id IS NOT NULL THEN
        UPDATE strike_counter
        SET strike_count = 0, last_session_id = NULL, last_updated = now(), status = 'active'
        WHERE id = v_existing.id;
      END IF;

      RETURN jsonb_build_object(
        'action', 'force_pivot',
        'strike_count', 0,
        'pivot_event_id', v_pivot_id::text,
        'evidence_refs', jsonb_build_array(COALESCE(v_prev_session_id::text, ''), p_session_id::text)
      );
    ELSE
      -- Strike 1: plan-fail
      IF v_existing.id IS NOT NULL THEN
        UPDATE strike_counter
        SET strike_count = v_new_count, last_session_id = p_session_id, last_updated = now()
        WHERE id = v_existing.id;
      ELSE
        INSERT INTO strike_counter (teacher_id, scope, scope_id, normalized_topic, subject, gap_type, topic, strike_count, last_session_id, first_strike_at, status)
        VALUES (p_teacher_id, 'classroom', p_scope_id, p_normalized_topic, p_subject, p_gap_type, p_topic, 1, p_session_id, now(), 'active');
      END IF;

      RETURN jsonb_build_object(
        'action', 'plan_fail',
        'strike_count', v_new_count
      );
    END IF;
  ELSE
    -- gap_rate <= 40: reset
    IF v_existing.id IS NOT NULL THEN
      UPDATE strike_counter
      SET strike_count = 0, last_session_id = NULL, last_updated = now()
      WHERE id = v_existing.id;
    END IF;

    RETURN jsonb_build_object('action', 'reset', 'strike_count', 0);
  END IF;
END;
$$;
