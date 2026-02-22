CREATE OR REPLACE FUNCTION public.update_class_strike(p_teacher_id uuid, p_scope_id text, p_normalized_topic text, p_subject text, p_gap_type text, p_topic text, p_session_id uuid, p_gap_rate numeric, p_is_system_gap boolean, p_is_a2_gap boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing RECORD;
  v_new_count integer;
  v_prev_session_id uuid;
  v_pivot_id uuid;
  v_action text;
BEGIN
  IF p_is_a2_gap THEN
    RETURN jsonb_build_object('action', 'skip_a2', 'strike_count', 0);
  END IF;

  IF p_is_system_gap THEN
    SELECT strike_count, last_session_id INTO v_existing
    FROM strike_counter
    WHERE teacher_id = p_teacher_id
      AND scope = 'class'
      AND scope_id = p_scope_id
      AND normalized_topic = p_normalized_topic
      AND subject = p_subject;

    RETURN jsonb_build_object(
      'action', 'skip_system_gap',
      'strike_count', COALESCE(v_existing.strike_count, 0)
    );
  END IF;

  SELECT id, strike_count, last_session_id
  INTO v_existing
  FROM strike_counter
  WHERE teacher_id = p_teacher_id
    AND scope = 'class'
    AND scope_id = p_scope_id
    AND normalized_topic = p_normalized_topic
    AND subject = p_subject
  FOR UPDATE;

  v_prev_session_id := v_existing.last_session_id;

  IF p_gap_rate > 40 THEN
    IF v_existing.id IS NOT NULL THEN
      v_new_count := v_existing.strike_count + 1;
    ELSE
      v_new_count := 1;
    END IF;

    IF v_new_count >= 2 THEN
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
      IF v_existing.id IS NOT NULL THEN
        UPDATE strike_counter
        SET strike_count = v_new_count, last_session_id = p_session_id, last_updated = now()
        WHERE id = v_existing.id;
      ELSE
        INSERT INTO strike_counter (teacher_id, scope, scope_id, normalized_topic, subject, gap_type, topic, strike_count, last_session_id, first_strike_at, status)
        VALUES (p_teacher_id, 'class', p_scope_id, p_normalized_topic, p_subject, p_gap_type, p_topic, 1, p_session_id, now(), 'active');
      END IF;

      RETURN jsonb_build_object(
        'action', 'plan_fail',
        'strike_count', v_new_count
      );
    END IF;
  ELSE
    IF v_existing.id IS NOT NULL THEN
      UPDATE strike_counter
      SET strike_count = 0, last_session_id = NULL, last_updated = now()
      WHERE id = v_existing.id;
    END IF;

    RETURN jsonb_build_object('action', 'reset', 'strike_count', 0);
  END IF;
END;
$function$;