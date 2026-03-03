/**
 * Phase C: Smart Report queries
 * Fetches teaching_logs and unit_assessments with filter
 */
import { supabase } from "@/lib/atlasSupabase";
import type {
  SmartReportFilter,
  TeachingLogRaw,
  UnitAssessmentRaw,
} from "@/types/smartReport";

// unit_assessments exists on atlas_prod but not in Lovable Cloud auto-generated types
const db = supabase as any;

const TEACHING_LOG_COLS =
  "id,learning_unit,next_strategy,major_gap,mastery_score,remedial_ids,teaching_date,subject,grade_level,classroom,academic_term,topic,key_issue,total_students,teacher_id";

const ASSESSMENT_COLS =
  "id,student_id,student_name,unit_name,score,total_score,subject,grade_level,classroom,academic_term,assessed_date";

/**
 * Fetch teaching logs filtered by SmartReportFilter.
 * Applies .eq() only when filter value is non-empty.
 */
export async function fetchTeachingLogs(
  filter: SmartReportFilter
): Promise<TeachingLogRaw[]> {
  let q = supabase
    .from("teaching_logs")
    .select(TEACHING_LOG_COLS)
    .order("teaching_date", { ascending: true });

  if (filter.subject) q = q.eq("subject", filter.subject);
  if (filter.gradeLevel) q = q.eq("grade_level", filter.gradeLevel);
  if (filter.classroom) q = q.eq("classroom", filter.classroom);
  if (filter.academicTerm) q = q.eq("academic_term", filter.academicTerm);
  if (filter.teacherId) q = q.eq("teacher_id", filter.teacherId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as TeachingLogRaw[];
}

/**
 * Fetch unit assessments filtered by SmartReportFilter.
 * Applies .eq() only when filter value is non-empty.
 */
export async function fetchUnitAssessments(
  filter: SmartReportFilter
): Promise<UnitAssessmentRaw[]> {
  let q = db
    .from("unit_assessments")
    .select(ASSESSMENT_COLS)
    .order("assessed_date", { ascending: true });

  if (filter.subject) q = q.eq("subject", filter.subject);
  if (filter.gradeLevel) q = q.eq("grade_level", filter.gradeLevel);
  if (filter.classroom) q = q.eq("classroom", filter.classroom);
  if (filter.academicTerm) q = q.eq("academic_term", filter.academicTerm);
  if (filter.teacherId) q = q.eq("teacher_id", filter.teacherId);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as UnitAssessmentRaw[];
}

export interface SmartReportFilterOptions {
  subjects: string[];
  gradeLevels: string[];
  classrooms: string[];
  academicTerms: string[];
}

/**
 * Fetch distinct filter options from teaching_logs and unit_assessments.
 */
export async function fetchFilterOptions(): Promise<SmartReportFilterOptions> {
  const [logsRes, assessRes] = await Promise.all([
    supabase.from("teaching_logs").select("subject,grade_level,classroom,academic_term"),
    db.from("unit_assessments").select("subject,grade_level,classroom,academic_term"),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (assessRes.error) throw assessRes.error;

  const collect = (
    rows: { subject?: string; grade_level?: string; classroom?: string; academic_term?: string | null }[]
  ) => {
    const s = new Set<string>();
    const g = new Set<string>();
    const c = new Set<string>();
    const t = new Set<string>();
    for (const r of rows ?? []) {
      if (r.subject) s.add(r.subject);
      if (r.grade_level) g.add(r.grade_level);
      if (r.classroom) c.add(String(r.classroom));
      if (r.academic_term) t.add(r.academic_term);
    }
    return { s, g, c, t };
  };

  const fromLogs = collect(logsRes.data ?? []);
  const fromAssess = collect(assessRes.data ?? []);

  return {
    subjects: [...new Set([...fromLogs.s, ...fromAssess.s])].sort(),
    gradeLevels: [...new Set([...fromLogs.g, ...fromAssess.g])].sort(),
    classrooms: [...new Set([...fromLogs.c, ...fromAssess.c])].sort(),
    academicTerms: [...new Set([...fromLogs.t, ...fromAssess.t])].sort(),
  };
}
