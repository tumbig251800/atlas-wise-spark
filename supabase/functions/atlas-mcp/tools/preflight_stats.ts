import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isRedZone, computeGapDistribution } from "../metrics.ts";
import type { ClassFilter, PreflightStats } from "../contract.ts";

export async function preflightStats(
  supabase: ReturnType<typeof createClient>,
  filters: ClassFilter
): Promise<PreflightStats> {
  let query = supabase
    .from("teaching_logs")
    .select("id, teacher_id, mastery_score, major_gap, teaching_date, academic_term, subject, grade_level");

  if (filters.dateFrom) query = query.gte("teaching_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("teaching_date", filters.dateTo);
  if (filters.term) query = query.eq("academic_term", filters.term);
  if (filters.teacherIds?.length) query = query.in("teacher_id", filters.teacherIds);
  if (filters.gradeLevel) query = query.eq("grade_level", filters.gradeLevel);
  if (filters.classroom) query = query.eq("classroom", filters.classroom);
  if (filters.subject) query = query.eq("subject", filters.subject);

  const { data, error } = await query;
  if (error) throw new Error(`preflight_stats: ${error.message}`);

  const rows = data || [];
  const redZoneRows = rows.filter((r) => isRedZone(r.mastery_score));
  const dates = rows.map((r) => r.teaching_date).filter(Boolean).sort();

  return {
    log_count: rows.length,
    teacher_count: new Set(rows.map((r) => r.teacher_id)).size,
    date_range: {
      min: dates[0] ?? null,
      max: dates[dates.length - 1] ?? null,
    },
    terms: [...new Set(rows.map((r) => r.academic_term).filter(Boolean))] as string[],
    subjects: [...new Set(rows.map((r) => r.subject).filter(Boolean))] as string[],
    grade_levels: [...new Set(rows.map((r) => r.grade_level).filter(Boolean))] as string[],
    red_zone_count: redZoneRows.length,
    red_zone_pct:
      rows.length > 0 ? Math.round((redZoneRows.length / rows.length) * 100) : 0,
    system_gap_count: rows.filter((r) => r.major_gap === "system-gap").length,
    gap_distribution: computeGapDistribution(rows),
    filters_applied: filters,
  };
}
