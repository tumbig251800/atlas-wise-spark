import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isRedZone } from "../metrics.ts";
import type { ClassFilter, FetchLogsResult } from "../contract.ts";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export async function fetchTeachingLogs(
  supabase: ReturnType<typeof createClient>,
  filters: ClassFilter & { limit?: number; offset?: number }
): Promise<FetchLogsResult> {
  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = filters.offset ?? 0;

  let query = supabase
    .from("teaching_logs")
    .select(
      "id, teacher_id, teacher_name, subject, grade_level, classroom, topic, mastery_score, major_gap, remedial_ids, total_students, teaching_date, academic_term, key_issue, reflection, next_strategy, health_care_status, health_care_ids, activity_mode, learning_unit",
      { count: "exact" }
    )
    .order("teaching_date", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters.dateFrom) query = query.gte("teaching_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("teaching_date", filters.dateTo);
  if (filters.term) query = query.eq("academic_term", filters.term);
  if (filters.teacherIds?.length) query = query.in("teacher_id", filters.teacherIds);
  if (filters.gradeLevel) query = query.eq("grade_level", filters.gradeLevel);
  if (filters.classroom) query = query.eq("classroom", filters.classroom);
  if (filters.subject) query = query.eq("subject", filters.subject);

  const { data, count, error } = await query;
  if (error) throw new Error(`fetch_teaching_logs: ${error.message}`);

  const logs = (data || []).map((row) => ({
    ...row,
    is_red_zone: isRedZone(row.mastery_score),
  }));

  return {
    logs,
    total: count ?? logs.length,
    limit,
    offset,
    filters_applied: filters,
  };
}
