CREATE OR REPLACE VIEW public.v_research_candidates_n8n AS
 WITH selected_teachers AS (
         SELECT DISTINCT classroom_research_suggestions.teacher_name
           FROM classroom_research_suggestions
          WHERE ((classroom_research_suggestions.status = 'selected'::text) AND (classroom_research_suggestions.academic_term = '2569-1'::text))
        ), gap_repeat AS (
         SELECT tl.grade_level,
            tl.classroom,
            tl.subject,
            tl.teacher_name,
            max((tl.teacher_id)::text) AS teacher_id,
            (tl.major_gap)::text AS gap_focus,
            count(*) AS n_logs,
            round(avg(tl.mastery_score), 2) AS avg_mastery
           FROM teaching_logs tl
          WHERE ((tl.academic_term = '2569-1'::text) AND (tl.health_care_status = false) AND (tl.teaching_date >= (CURRENT_DATE - '28 days'::interval)) AND ((tl.major_gap)::text = ANY (ARRAY['k-gap'::text, 'p-gap'::text, 'a-gap'::text])) AND (NOT (tl.teacher_name IN ( SELECT selected_teachers.teacher_name
                   FROM selected_teachers))))
          GROUP BY tl.grade_level, tl.classroom, tl.subject, tl.teacher_name, (tl.major_gap)::text
         HAVING ((count(*) >= 4) AND (avg(tl.mastery_score) <= 3.0))
        ), blind_spot AS (
         SELECT api.grade_level,
            api.classroom,
            api.subject,
            COALESCE(api.teacher_name, '-'::text) AS teacher_name,
            max((api.teacher_id)::text) AS teacher_id,
            count(*) AS n_items
           FROM action_plan_items api
          WHERE ((api.issue_type = 'UnitBlindSpot'::text) AND (api.status = ANY (ARRAY['open'::text, 'watching'::text])) AND (NOT (COALESCE(api.teacher_name, '-'::text) IN ( SELECT selected_teachers.teacher_name
                   FROM selected_teachers))))
          GROUP BY api.grade_level, api.classroom, api.subject, api.teacher_name
        ), stay_long AS (
         SELECT rt.grade_level,
            rt.classroom,
            rt.subject,
            max(rt.teacher_id) AS teacher_id,
            count(DISTINCT rt.student_id) AS n_students
           FROM ( SELECT remedial_tracking.student_id,
                    remedial_tracking.grade_level,
                    remedial_tracking.classroom,
                    remedial_tracking.subject,
                    max((remedial_tracking.teacher_id)::text) AS teacher_id,
                    count(*) AS stay_rounds
                   FROM remedial_tracking
                  WHERE ((remedial_tracking.status = 'stay'::text) AND (remedial_tracking.academic_term = '2569-1'::text))
                  GROUP BY remedial_tracking.student_id, remedial_tracking.grade_level, remedial_tracking.classroom, remedial_tracking.subject
                 HAVING (count(*) >= 2)) rt
          GROUP BY rt.grade_level, rt.classroom, rt.subject
        ), red_repeat AS (
         SELECT api.grade_level,
            api.classroom,
            api.subject,
            COALESCE(api.teacher_name, '-'::text) AS teacher_name,
            max((api.teacher_id)::text) AS teacher_id,
            count(*) AS n_items
           FROM action_plan_items api
          WHERE ((api.issue_type = 'RedZone'::text) AND (api.status = ANY (ARRAY['open'::text, 'watching'::text])) AND (NOT (COALESCE(api.teacher_name, '-'::text) IN ( SELECT selected_teachers.teacher_name
                   FROM selected_teachers))))
          GROUP BY api.grade_level, api.classroom, api.subject, api.teacher_name
         HAVING (count(*) >= 2)
        ), pbl_stats AS (
         SELECT pp.grade_level,
            pp.classroom,
            pp.teacher_name,
            pp.academic_term,
            round(LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)), 2) AS min_avg,
                CASE
                    WHEN (avg(pa.com_score) = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score))) THEN 'การสื่อสาร'::text
                    WHEN (avg(pa.think_score) = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score))) THEN 'การคิด'::text
                    WHEN (avg(pa.problem_score) = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score))) THEN 'การแก้ปัญหา'::text
                    WHEN (avg(pa.life_score) = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score))) THEN 'ทักษะชีวิต'::text
                    ELSE 'เทคโนโลยี'::text
                END AS weakest_competency,
            (sum(
                CASE
                    WHEN (pa.overall_result = ANY (ARRAY['fail'::text, 'ไม่ผ่าน'::text])) THEN 1
                    ELSE 0
                END))::integer AS failing_count
           FROM (pbl_projects pp
             JOIN pbl_assessments pa ON ((pa.project_id = pp.id)))
          WHERE ((pp.academic_term = '2569-1'::text) AND (NOT (pp.teacher_name IN ( SELECT selected_teachers.teacher_name
                   FROM selected_teachers))))
          GROUP BY pp.grade_level, pp.classroom, pp.teacher_name, pp.academic_term
         HAVING ((LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) < 2.5) OR (sum(
                CASE
                    WHEN (pa.overall_result = ANY (ARRAY['fail'::text, 'ไม่ผ่าน'::text])) THEN 1
                    ELSE 0
                END) > 0))
        )
 SELECT 'GapRepeat'::text AS issue_type,
    'medium'::text AS severity,
    gap_repeat.grade_level,
    gap_repeat.classroom,
    gap_repeat.subject,
    gap_repeat.teacher_name,
    gap_repeat.teacher_id,
    (gap_repeat.n_logs)::numeric AS metric_value,
    gap_repeat.gap_focus,
    ((((('พบ '::text || gap_repeat.gap_focus) || ' ซ้ำ '::text) || gap_repeat.n_logs) || ' ครั้งใน 4 สัปดาห์ mastery เฉลี่ย '::text) || gap_repeat.avg_mastery) AS detected_problem,
    ((('teaching_logs '::text || gap_repeat.n_logs) || ' รายการ ช่วง 28 วัน, mastery เฉลี่ย '::text) || gap_repeat.avg_mastery) AS evidence_summary
   FROM gap_repeat
UNION ALL
 SELECT 'UnitBlindSpot'::text AS issue_type,
    'high'::text AS severity,
    bs.grade_level,
    bs.classroom,
    bs.subject,
    bs.teacher_name,
    bs.teacher_id,
    (bs.n_items)::numeric AS metric_value,
    NULL::text AS gap_focus,
    (('นักเรียนไม่ผ่านคะแนนหลังหน่วยโดยไม่เคยถูกระบุในแผนช่วยเหลือ '::text || bs.n_items) || ' รายการ'::text) AS detected_problem,
    (('action_plan_items (WF-6) ค้าง '::text || bs.n_items) || ' รายการ'::text) AS evidence_summary
   FROM blind_spot bs
UNION ALL
 SELECT 'StayLong'::text AS issue_type,
    'high'::text AS severity,
    sl.grade_level,
    sl.classroom,
    sl.subject,
    COALESCE(pr.full_name, '-'::text) AS teacher_name,
    sl.teacher_id,
    (sl.n_students)::numeric AS metric_value,
    NULL::text AS gap_focus,
    (('นักเรียน '::text || sl.n_students) || ' คน ยังไม่ผ่านการซ่อมเสริม (stay >= 2 รอบ)'::text) AS detected_problem,
    (('remedial_tracking: stay >= 2 รอบ จำนวน '::text || sl.n_students) || ' คน'::text) AS evidence_summary
   FROM (stay_long sl
     LEFT JOIN profiles pr ON ((pr.id = (NULLIF(sl.teacher_id, ''::text))::uuid)))
  WHERE (NOT (COALESCE(pr.full_name, '-'::text) IN ( SELECT selected_teachers.teacher_name
           FROM selected_teachers)))
UNION ALL
 SELECT 'RedZone'::text AS issue_type,
    'medium'::text AS severity,
    rr.grade_level,
    rr.classroom,
    rr.subject,
    rr.teacher_name,
    rr.teacher_id,
    (rr.n_items)::numeric AS metric_value,
    NULL::text AS gap_focus,
    (('Red Zone ค้างซ้ำ '::text || rr.n_items) || ' รายการ'::text) AS detected_problem,
    (('action_plan_items RedZone open/watching '::text || rr.n_items) || ' รายการ'::text) AS evidence_summary
   FROM red_repeat rr
UNION ALL
 SELECT
        CASE
            WHEN (ps.failing_count > 0) THEN 'PBLStudentFailing'::text
            ELSE 'PBLWeakCompetency'::text
        END AS issue_type,
        CASE
            WHEN ((ps.failing_count > 0) OR (ps.min_avg < 2.3)) THEN 'high'::text
            ELSE 'medium'::text
        END AS severity,
    ps.grade_level,
    ps.classroom,
    'PBL'::text AS subject,
    ps.teacher_name,
    NULL::text AS teacher_id,
        CASE
            WHEN (ps.failing_count > 0) THEN (ps.failing_count)::numeric
            ELSE ps.min_avg
        END AS metric_value,
    ps.weakest_competency AS gap_focus,
        CASE
            WHEN (ps.failing_count > 0) THEN ((('นักเรียนไม่ผ่าน PBL '::text || ps.failing_count) || ' คน สมรรถนะอ่อนที่สุด: '::text) || ps.weakest_competency)
            ELSE (((('PBL สมรรถนะ '::text || ps.weakest_competency) || ' เฉลี่ย '::text) || ps.min_avg) || ' (ต่ำกว่าเกณฑ์ 2.5)'::text)
        END AS detected_problem,
    (((((((('pbl_assessments เทอม '::text || ps.academic_term) || ' | '::text) || ps.weakest_competency) || ' avg='::text) || ps.min_avg) || ' | ไม่ผ่าน '::text) || ps.failing_count) || ' คน'::text) AS evidence_summary
   FROM pbl_stats ps
UNION ALL
 SELECT ab.issue_type,
    ab.severity,
    ab.grade_level,
    ab.classroom,
    ab.subject,
    ab.teacher_name,
    ab.teacher_id,
    ab.metric_value,
    ab.gap_focus,
    ab.detected_problem,
    ab.evidence_summary
   FROM ( SELECT DISTINCT ON (crs.teacher_name, crs.classroom, crs.subject) 'AbandonedRepropose'::text AS issue_type,
            'medium'::text AS severity,
            crs.grade_level,
            crs.classroom,
            crs.subject,
            crs.teacher_name,
            (crs.teacher_id)::text AS teacher_id,
            ((CURRENT_DATE - (crs.updated_at)::date))::numeric AS metric_value,
            crs.issue_type AS gap_focus,
            (((('ครูปฏิเสธหัวข้อ "'::text || crs.research_title) || '" เมื่อ '::text) || (CURRENT_DATE - (crs.updated_at)::date)) || ' วันที่แล้ว'::text) AS detected_problem,
            ((('classroom_research_suggestions abandoned '::text || (crs.updated_at)::date) || ' | เดิม: '::text) || crs.research_title) AS evidence_summary
           FROM classroom_research_suggestions crs
          WHERE ((crs.status = 'abandoned'::text) AND (crs.academic_term = '2569-1'::text) AND ((CURRENT_DATE - (crs.updated_at)::date) >= 30) AND (NOT (crs.teacher_name IN ( SELECT selected_teachers.teacher_name
                   FROM selected_teachers))))
          ORDER BY crs.teacher_name, crs.classroom, crs.subject, crs.updated_at DESC) ab

UNION ALL
(SELECT DISTINCT ON (ap.teacher_name, ap.classroom, ap.subject, ap.issue_type)
  ap.issue_type,
  ap.severity,
  ap.grade_level,
  ap.classroom,
  ap.subject,
  COALESCE(ap.teacher_name, '-') AS teacher_name,
  (ap.teacher_id)::text AS teacher_id,
  COALESCE(ap.metric_value, 0)::numeric AS metric_value,
  NULL::text AS gap_focus,
  COALESCE(ap.metric_label, ap.detail, ap.issue_type) AS detected_problem,
  'action_plan_items #' || ap.id
    || ' (' || ap.issue_type || ') เปิดค้าง ' || (CURRENT_DATE - ap.run_date) || ' วัน'
    || COALESCE(' | ' || ap.detail, '') AS evidence_summary
FROM action_plan_items ap
WHERE ap.issue_type = ANY (ARRAY['FlatScore'::text, 'MasteryDrop'::text])
  AND ap.status = ANY (ARRAY['open'::text, 'watching'::text])
  AND (CURRENT_DATE - ap.run_date) >= 7
  AND NOT (COALESCE(ap.teacher_name, '-') IN (SELECT selected_teachers.teacher_name FROM selected_teachers))
ORDER BY ap.teacher_name, ap.classroom, ap.subject, ap.issue_type, ap.run_date DESC)
ORDER BY 1, 3, 4;
