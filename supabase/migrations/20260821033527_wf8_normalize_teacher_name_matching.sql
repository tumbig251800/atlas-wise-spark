-- WF-8: กันการเสนอหัวข้อวิจัยซ้ำให้ครูที่ "เลือกหัวข้อไปแล้ว"
--
-- ปัญหา: v_research_candidates_n8n กันครูที่มี status='selected' ด้วยการเทียบ
--   teacher_name แบบตรงตัวอักษร แต่ชื่อครูในระบบมีหลายรูปแบบ เช่น
--   "วรกานต์ ศรีไชยวาล" (classroom_research_suggestions) กับ
--   "นางสาววรกานต์ ศรีไชยวาล" (pbl_projects) → เทียบไม่ตรง ครูจึงหลุดออกมา
--   เป็น candidate ทั้งที่ทำวิจัยอยู่แล้ว
--   ณ 21 ส.ค. 2569 มีหลุด 3 รายการ: ครูปวีณา, ครูรินทราย, ครูวรกานต์ (สาขา PBL ทั้งหมด)
--   พบครูที่มีชื่อหลายรูปแบบทั้งหมด 9 คน
--
-- แก้: เพิ่มฟังก์ชัน norm_teacher_name() ตัดคำนำหน้า (ครู/นางสาว/นาง/น.ส./นาย)
--   และช่องว่างทั้งหมด แล้วใช้เทียบแทนชื่อดิบทุกสาขาของ view
--   (สาขา PBL ใช้ logic เดียวกันนี้อยู่แล้วตอน lookup teacher_id)
--
-- แก้เพิ่ม: สาขา AbandonedRepropose เดิม DISTINCT ON (teacher_name, classroom, subject)
--   ไม่มี grade_level → ห้องเลขเดียวกันคนละชั้น (เช่น ป.2/2 กับ ป.3/2) ยุบรวมกัน
--   เพิ่ม grade_level เข้าไปใน DISTINCT ON
--
-- ⚠️ migration นี้ apply เข้า production แล้วเมื่อ 2026-08-21 ผ่าน Supabase MCP
--    (version 20260821033527 อยู่ใน schema_migrations แล้ว)
--    ชื่อไฟล์ต้องเป็น 20260821033527 เป๊ะ ๆ

CREATE OR REPLACE FUNCTION public.norm_teacher_name(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $fn$
  SELECT regexp_replace(
           regexp_replace(COALESCE(p, ''), '^\s*(ครู|นางสาว|นาง|น\.ส\.|นาย)\s*', ''),
           '\s+', '', 'g');
$fn$;

COMMENT ON FUNCTION public.norm_teacher_name(text) IS
  'ตัดคำนำหน้าชื่อครู (ครู/นางสาว/นาง/น.ส./นาย) และช่องว่างทั้งหมด เพื่อเทียบชื่อครูข้ามตารางที่บันทึกไม่เหมือนกัน';

CREATE OR REPLACE VIEW public.v_research_candidates_n8n AS
WITH selected_teachers AS (
  SELECT DISTINCT public.norm_teacher_name(crs.teacher_name) AS nkey
  FROM classroom_research_suggestions crs
  WHERE crs.status = 'selected' AND crs.academic_term = '2569-1'
), gap_repeat AS (
  SELECT tl.grade_level, tl.classroom, tl.subject, tl.teacher_name,
         max(tl.teacher_id::text) AS teacher_id,
         tl.major_gap::text AS gap_focus,
         count(*) AS n_logs,
         round(avg(tl.mastery_score), 2) AS avg_mastery
  FROM teaching_logs tl
  WHERE tl.academic_term = '2569-1'
    AND tl.health_care_status = false
    AND tl.teaching_date >= (CURRENT_DATE - '28 days'::interval)
    AND (tl.major_gap::text = ANY (ARRAY['k-gap','p-gap','a-gap']))
    AND public.norm_teacher_name(tl.teacher_name) NOT IN (SELECT nkey FROM selected_teachers)
  GROUP BY tl.grade_level, tl.classroom, tl.subject, tl.teacher_name, (tl.major_gap::text)
  HAVING count(*) >= 4 AND avg(tl.mastery_score) <= 3.0
), blind_spot AS (
  SELECT api.grade_level, api.classroom, api.subject,
         COALESCE(api.teacher_name, '-') AS teacher_name,
         max(api.teacher_id::text) AS teacher_id,
         count(*) AS n_items
  FROM action_plan_items api
  WHERE api.issue_type = 'UnitBlindSpot'
    AND (api.status = ANY (ARRAY['open','watching']))
    AND public.norm_teacher_name(COALESCE(api.teacher_name, '-')) NOT IN (SELECT nkey FROM selected_teachers)
  GROUP BY api.grade_level, api.classroom, api.subject, api.teacher_name
), stay_long AS (
  SELECT rt.grade_level, rt.classroom, rt.subject,
         max(rt.teacher_id) AS teacher_id,
         count(DISTINCT rt.student_id) AS n_students
  FROM (
    SELECT remedial_tracking.student_id, remedial_tracking.grade_level,
           remedial_tracking.classroom, remedial_tracking.subject,
           max(remedial_tracking.teacher_id::text) AS teacher_id,
           count(*) AS stay_rounds
    FROM remedial_tracking
    WHERE remedial_tracking.status = 'stay' AND remedial_tracking.academic_term = '2569-1'
    GROUP BY remedial_tracking.student_id, remedial_tracking.grade_level,
             remedial_tracking.classroom, remedial_tracking.subject
    HAVING count(*) >= 2
  ) rt
  GROUP BY rt.grade_level, rt.classroom, rt.subject
), red_repeat AS (
  SELECT api.grade_level, api.classroom, api.subject,
         COALESCE(api.teacher_name, '-') AS teacher_name,
         max(api.teacher_id::text) AS teacher_id,
         count(*) AS n_items
  FROM action_plan_items api
  WHERE api.issue_type = 'RedZone'
    AND (api.status = ANY (ARRAY['open','watching']))
    AND public.norm_teacher_name(COALESCE(api.teacher_name, '-')) NOT IN (SELECT nkey FROM selected_teachers)
  GROUP BY api.grade_level, api.classroom, api.subject, api.teacher_name
  HAVING count(*) >= 2
), pbl_stats AS (
  SELECT pp.grade_level, pp.classroom, pp.teacher_name, pp.academic_term,
         round(LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score),
                     avg(pa.life_score), avg(pa.tech_score)), 2) AS min_avg,
         CASE
           WHEN avg(pa.com_score)     = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) THEN 'การสื่อสาร'
           WHEN avg(pa.think_score)   = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) THEN 'การคิด'
           WHEN avg(pa.problem_score) = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) THEN 'การแก้ปัญหา'
           WHEN avg(pa.life_score)    = LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) THEN 'ทักษะชีวิต'
           ELSE 'เทคโนโลยี'
         END AS weakest_competency,
         sum(CASE WHEN pa.overall_result = ANY (ARRAY['fail','ไม่ผ่าน']) THEN 1 ELSE 0 END)::integer AS failing_count
  FROM pbl_projects pp
  JOIN pbl_assessments pa ON pa.project_id = pp.id
  WHERE pp.academic_term = '2569-1'
    AND public.norm_teacher_name(pp.teacher_name) NOT IN (SELECT nkey FROM selected_teachers)
  GROUP BY pp.grade_level, pp.classroom, pp.teacher_name, pp.academic_term
  HAVING LEAST(avg(pa.com_score), avg(pa.think_score), avg(pa.problem_score), avg(pa.life_score), avg(pa.tech_score)) < 2.5
      OR sum(CASE WHEN pa.overall_result = ANY (ARRAY['fail','ไม่ผ่าน']) THEN 1 ELSE 0 END) > 0
)
SELECT 'GapRepeat'::text AS issue_type,
       'medium'::text AS severity,
       gap_repeat.grade_level, gap_repeat.classroom, gap_repeat.subject,
       gap_repeat.teacher_name, gap_repeat.teacher_id,
       gap_repeat.n_logs::numeric AS metric_value,
       gap_repeat.gap_focus,
       'พบ ' || gap_repeat.gap_focus || ' ซ้ำ ' || gap_repeat.n_logs || ' ครั้งใน 4 สัปดาห์ mastery เฉลี่ย ' || gap_repeat.avg_mastery AS detected_problem,
       'teaching_logs ' || gap_repeat.n_logs || ' รายการ ช่วง 28 วัน, mastery เฉลี่ย ' || gap_repeat.avg_mastery AS evidence_summary
FROM gap_repeat
UNION ALL
SELECT 'UnitBlindSpot'::text, 'high'::text,
       bs.grade_level, bs.classroom, bs.subject, bs.teacher_name, bs.teacher_id,
       bs.n_items::numeric, NULL::text,
       'นักเรียนไม่ผ่านคะแนนหลังหน่วยโดยไม่เคยถูกระบุในแผนช่วยเหลือ ' || bs.n_items || ' รายการ',
       'action_plan_items (WF-6) ค้าง ' || bs.n_items || ' รายการ'
FROM blind_spot bs
UNION ALL
SELECT 'StayLong'::text, 'high'::text,
       sl.grade_level, sl.classroom, sl.subject,
       COALESCE(pr.full_name, '-') AS teacher_name, sl.teacher_id,
       sl.n_students::numeric, NULL::text,
       'นักเรียน ' || sl.n_students || ' คน ยังไม่ผ่านการซ่อมเสริม (stay >= 2 รอบ)',
       'remedial_tracking: stay >= 2 รอบ จำนวน ' || sl.n_students || ' คน'
FROM stay_long sl
LEFT JOIN profiles pr ON pr.id = NULLIF(sl.teacher_id, '')::uuid
WHERE public.norm_teacher_name(COALESCE(pr.full_name, '-')) NOT IN (SELECT nkey FROM selected_teachers)
UNION ALL
SELECT 'RedZone'::text, 'medium'::text,
       rr.grade_level, rr.classroom, rr.subject, rr.teacher_name, rr.teacher_id,
       rr.n_items::numeric, NULL::text,
       'Red Zone ค้างซ้ำ ' || rr.n_items || ' รายการ',
       'action_plan_items RedZone open/watching ' || rr.n_items || ' รายการ'
FROM red_repeat rr
UNION ALL
SELECT CASE WHEN ps.failing_count > 0 THEN 'PBLStudentFailing' ELSE 'PBLWeakCompetency' END,
       CASE WHEN ps.failing_count > 0 OR ps.min_avg < 2.3 THEN 'high' ELSE 'medium' END,
       ps.grade_level, ps.classroom, 'PBL'::text AS subject, ps.teacher_name,
       (SELECT p.user_id::text FROM profiles p
         WHERE p.full_name <> ''
           AND public.norm_teacher_name(p.full_name) = public.norm_teacher_name(ps.teacher_name)
         LIMIT 1) AS teacher_id,
       CASE WHEN ps.failing_count > 0 THEN ps.failing_count::numeric ELSE ps.min_avg END,
       ps.weakest_competency AS gap_focus,
       CASE WHEN ps.failing_count > 0
            THEN 'นักเรียนไม่ผ่าน PBL ' || ps.failing_count || ' คน สมรรถนะอ่อนที่สุด: ' || ps.weakest_competency
            ELSE 'PBL สมรรถนะ ' || ps.weakest_competency || ' เฉลี่ย ' || ps.min_avg || ' (ต่ำกว่าเกณฑ์ 2.5)'
       END,
       'pbl_assessments เทอม ' || ps.academic_term || ' | ' || ps.weakest_competency || ' avg=' || ps.min_avg || ' | ไม่ผ่าน ' || ps.failing_count || ' คน'
FROM pbl_stats ps
UNION ALL
SELECT ab.issue_type, ab.severity, ab.grade_level, ab.classroom, ab.subject,
       ab.teacher_name, ab.teacher_id, ab.metric_value, ab.gap_focus,
       ab.detected_problem, ab.evidence_summary
FROM (
  SELECT DISTINCT ON (crs.teacher_name, crs.grade_level, crs.classroom, crs.subject)
         'AbandonedRepropose'::text AS issue_type,
         'medium'::text AS severity,
         crs.grade_level, crs.classroom, crs.subject, crs.teacher_name,
         crs.teacher_id::text AS teacher_id,
         (CURRENT_DATE - crs.updated_at::date)::numeric AS metric_value,
         crs.issue_type AS gap_focus,
         'ครูปฏิเสธหัวข้อ "' || crs.research_title || '" เมื่อ ' || (CURRENT_DATE - crs.updated_at::date) || ' วันที่แล้ว' AS detected_problem,
         'classroom_research_suggestions abandoned ' || crs.updated_at::date || ' | เดิม: ' || crs.research_title AS evidence_summary
  FROM classroom_research_suggestions crs
  WHERE crs.status = 'abandoned'
    AND crs.academic_term = '2569-1'
    AND (CURRENT_DATE - crs.updated_at::date) >= 30
    AND public.norm_teacher_name(crs.teacher_name) NOT IN (SELECT nkey FROM selected_teachers)
  ORDER BY crs.teacher_name, crs.grade_level, crs.classroom, crs.subject, crs.updated_at DESC
) ab
UNION ALL
(
  SELECT DISTINCT ON (ap.teacher_name, ap.classroom, ap.subject, ap.issue_type)
         ap.issue_type, ap.severity, ap.grade_level, ap.classroom, ap.subject,
         COALESCE(ap.teacher_name, '-') AS teacher_name,
         ap.teacher_id::text AS teacher_id,
         COALESCE(ap.metric_value, 0::numeric) AS metric_value,
         NULL::text AS gap_focus,
         COALESCE(ap.metric_label, ap.detail, ap.issue_type) AS detected_problem,
         'action_plan_items #' || ap.id || ' (' || ap.issue_type || ') เปิดค้าง ' || (CURRENT_DATE - ap.run_date) || ' วัน' || COALESCE(' | ' || ap.detail, '') AS evidence_summary
  FROM action_plan_items ap
  WHERE (ap.issue_type = ANY (ARRAY['FlatScore','MasteryDrop']))
    AND (ap.status = ANY (ARRAY['open','watching']))
    AND (CURRENT_DATE - ap.run_date) >= 7
    AND public.norm_teacher_name(COALESCE(ap.teacher_name, '-')) NOT IN (SELECT nkey FROM selected_teachers)
  ORDER BY ap.teacher_name, ap.classroom, ap.subject, ap.issue_type, ap.run_date DESC
)
ORDER BY 1, 3, 4;
