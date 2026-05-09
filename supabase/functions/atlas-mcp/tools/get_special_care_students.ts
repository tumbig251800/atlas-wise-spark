import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import type { ClassFilter, SpecialCareResult, SpecialCareEntry } from "../contract.ts";

export async function getSpecialCareStudents(
  supabase: ReturnType<typeof createClient>,
  filters: ClassFilter
): Promise<SpecialCareResult> {
  let query = supabase
    .from("teaching_logs")
    .select(
      "id, teacher_id, teacher_name, subject, grade_level, classroom, topic, major_gap, remedial_ids, health_care_ids, health_care_status, teaching_date"
    )
    .or("major_gap.eq.a2-gap,health_care_status.eq.true")
    .order("teaching_date", { ascending: false });

  if (filters.dateFrom) query = query.gte("teaching_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("teaching_date", filters.dateTo);
  if (filters.term) query = query.eq("academic_term", filters.term);
  if (filters.teacherIds?.length) query = query.in("teacher_id", filters.teacherIds);
  if (filters.gradeLevel) query = query.eq("grade_level", filters.gradeLevel);
  if (filters.classroom) query = query.eq("classroom", filters.classroom);
  if (filters.subject) query = query.eq("subject", filters.subject);

  const { data, error } = await query;
  if (error) throw new Error(`get_special_care_students: ${error.message}`);

  const rows = data || [];
  const entries: SpecialCareEntry[] = [];

  for (const log of rows) {
    const seen = new Set<string>();

    if (log.major_gap === "a2-gap" && log.remedial_ids) {
      for (const sid of log.remedial_ids.split(",").map((s: string) => s.trim()).filter(Boolean)) {
        if (!seen.has(sid)) {
          seen.add(sid);
          entries.push({
            student_id: sid,
            teacher_id: log.teacher_id,
            teacher_name: log.teacher_name,
            subject: log.subject,
            grade_level: log.grade_level,
            classroom: log.classroom,
            topic: log.topic,
            care_type: "a2-gap",
            teaching_date: log.teaching_date,
            log_id: log.id,
          });
        }
      }
    }

    if (log.health_care_status && log.health_care_ids) {
      for (const sid of log.health_care_ids.split(",").map((s: string) => s.trim()).filter(Boolean)) {
        if (!seen.has(sid)) {
          seen.add(sid);
          entries.push({
            student_id: sid,
            teacher_id: log.teacher_id,
            teacher_name: log.teacher_name,
            subject: log.subject,
            grade_level: log.grade_level,
            classroom: log.classroom,
            topic: log.topic,
            care_type: "health-care",
            teaching_date: log.teaching_date,
            log_id: log.id,
          });
        }
      }
    }
  }

  return {
    students: entries,
    count: entries.length,
    log_count: rows.length,
    filters_applied: filters,
  };
}
