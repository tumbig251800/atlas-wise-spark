-- Standardize the P.1-3 English subject name (competency-based curriculum) to one canonical form.
--
-- Two variants were entered interchangeably, so unit_assessments and teaching_logs
-- were not matching cleanly. This merges the shorter variant into the canonical one.
--
--   SOURCE (rename FROM): 'การอ่านและการเขียนภาษาอังกฤษ'                 (char_length 28)
--   TARGET (rename TO)  : 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ'  (char_length 43)
--
-- Exact-string match only (WHERE subject = SOURCE), so it is safe:
--   * does NOT touch 'ภาษาอังกฤษ' (P.4-6)
--   * does NOT touch the KBW variants ('ภาษาอังกฤษ KBW', 'ภาษาอังกฤษเสริม (KBW)')
--   * does NOT touch 'ภาษาอังกฤษเพื่อการสื่อสาร' (a different subject)
--
-- Covers every BASE TABLE in schema public that has a `subject` column.
-- Excludes: views (v_research_candidates*, derive automatically) and the dated
-- snapshot table zz_remedial_dedup_backup_20260715 (historical, 0 SOURCE rows).
--
-- remedial_tracking has UNIQUE(student_id, subject, grade_level, academic_term).
-- 5 students already have BOTH a SOURCE-named and a (newer) TARGET-named remediation
-- row for the same term. Per decision: keep the newer TARGET row and drop the stale
-- SOURCE duplicate first, then rename the remaining 15 non-conflicting SOURCE rows.

BEGIN;

-- 1) De-duplicate remedial_tracking: drop stale SOURCE rows that would collide
--    with an already-existing (newer) TARGET row for the same student/grade/term.
DELETE FROM public.remedial_tracking s
WHERE s.subject = 'การอ่านและการเขียนภาษาอังกฤษ'
  AND EXISTS (
    SELECT 1 FROM public.remedial_tracking t
    WHERE t.subject       = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ'
      AND t.student_id     = s.student_id
      AND t.grade_level    = s.grade_level
      AND t.academic_term  = s.academic_term
  );

-- 2) Rename SOURCE -> TARGET in every base table with a `subject` column.
UPDATE public.action_plan_items              SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.classroom_research_suggestions SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.diagnostic_events              SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.lesson_plan_snapshots          SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.pivot_events                   SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.plc_sessions                   SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.remedial_tracking              SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.strike_counter                 SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.teaching_logs                  SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.topic_aliases                  SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.unit_assessment_setups         SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';
UPDATE public.unit_assessments               SET subject = 'การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ' WHERE subject = 'การอ่านและการเขียนภาษาอังกฤษ';

COMMIT;
