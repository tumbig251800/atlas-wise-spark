import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { RED_ZONE_THRESHOLD, avgMastery } from "../metrics.ts";
import type { ClassFilter, RedZoneSummary, RedZoneTeacher } from "../contract.ts";

export async function getRedZoneSummary(
  supabase: ReturnType<typeof createClient>,
  filters: ClassFilter
): Promise<RedZoneSummary> {
  let query = supabase
    .from("teaching_logs")
    .select(
      "teacher_id, teacher_name, subject, grade_level, classroom, mastery_score, teaching_date"
    )
    .lte("mastery_score", RED_ZONE_THRESHOLD);

  if (filters.dateFrom) query = query.gte("teaching_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("teaching_date", filters.dateTo);
  if (filters.term) query = query.eq("academic_term", filters.term);
  if (filters.teacherIds?.length) query = query.in("teacher_id", filters.teacherIds);
  if (filters.gradeLevel) query = query.eq("grade_level", filters.gradeLevel);
  if (filters.classroom) query = query.eq("classroom", filters.classroom);
  if (filters.subject) query = query.eq("subject", filters.subject);

  const { data, error } = await query;
  if (error) throw new Error(`get_red_zone_summary: ${error.message}`);

  const rows = data || [];

  // Group by teacher
  const teacherMap = new Map<
    string,
    { teacher_name: string | null; scores: number[]; subjects: Set<string>; recent_date: string }
  >();

  const by_grade: Record<string, number> = {};
  const by_subject: Record<string, number> = {};

  for (const row of rows) {
    if (!teacherMap.has(row.teacher_id)) {
      teacherMap.set(row.teacher_id, {
        teacher_name: row.teacher_name,
        scores: [],
        subjects: new Set(),
        recent_date: row.teaching_date,
      });
    }
    const t = teacherMap.get(row.teacher_id)!;
    t.scores.push(row.mastery_score);
    t.subjects.add(row.subject);
    if (row.teaching_date > t.recent_date) t.recent_date = row.teaching_date;

    by_grade[row.grade_level] = (by_grade[row.grade_level] || 0) + 1;
    by_subject[row.subject] = (by_subject[row.subject] || 0) + 1;
  }

  const affected_teachers: RedZoneTeacher[] = [...teacherMap.entries()]
    .map(([teacher_id, t]) => ({
      teacher_id,
      teacher_name: t.teacher_name,
      red_zone_count: t.scores.length,
      subjects: [...t.subjects],
      avg_mastery: avgMastery(t.scores),
      recent_date: t.recent_date,
    }))
    .sort((a, b) => b.red_zone_count - a.red_zone_count);

  return {
    total_red_zone_logs: rows.length,
    affected_teachers,
    by_grade,
    by_subject,
    filters_applied: filters,
  };
}
