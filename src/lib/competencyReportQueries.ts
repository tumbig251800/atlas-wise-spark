/**
 * Phase D Stage 3: Competency Report data
 * Fetch student list and aggregated competency + academic for spider chart
 */
import { supabase } from "@/lib/atlasSupabase";
import type { SmartReportFilter } from "@/types/smartReport";
import type { UnitAssessmentRaw } from "@/types/smartReport";
import type { CompetencyKey } from "@/lib/competencyConstants";

const db = supabase as any;

const ASSESSMENT_COLS =
  "id,student_id,student_name,unit_name,score,total_score,subject,grade_level,classroom,academic_term,assessed_date,a1_score,a2_score,a3_score,a4_score,a5_score,a6_score";

export interface StudentOption {
  student_id: string;
  student_name: string;
  grade_level: string;
  classroom: string;
}

export interface StudentCompetencyData {
  avgCompetency: Record<CompetencyKey, number>;
  academicSummary: {
    avgScorePct: number;
    totalUnits: number;
    sumScore: number;
    sumTotal: number;
  };
  units: { unit_name: string | null; score: number; total_score: number }[];
}

const COMP_KEYS: CompetencyKey[] = ["a1", "a2", "a3", "a4", "a5", "a6"];

function buildQuery(filter: SmartReportFilter, teacherId: string) {
  let q = db
    .from("unit_assessments")
    .select(ASSESSMENT_COLS)
    .not("a1_score", "is", null);

  if (teacherId) q = q.eq("teacher_id", teacherId);
  if (filter.subject) q = q.eq("subject", filter.subject);
  if (filter.gradeLevel) q = q.eq("grade_level", filter.gradeLevel);
  if (filter.classroom) q = q.eq("classroom", filter.classroom);
  if (filter.academicTerm) q = q.eq("academic_term", filter.academicTerm);

  return q.order("unit_name", { ascending: true });
}

/**
 * Fetch distinct students who have competency data (a1_score filled).
 */
export async function fetchStudentList(
  filter: SmartReportFilter,
  teacherId: string
): Promise<StudentOption[]> {
  const q = buildQuery(filter, teacherId);
  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as UnitAssessmentRaw[];
  const seen = new Set<string>();
  const result: StudentOption[] = [];

  for (const r of rows) {
    const key = r.student_id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      student_id: r.student_id,
      student_name: r.student_name ?? r.student_id,
      grade_level: r.grade_level,
      classroom: r.classroom,
    });
  }

  result.sort((a, b) => (a.student_name || a.student_id).localeCompare(b.student_name || b.student_id));
  return result;
}

/**
 * Fetch and aggregate competency + academic for a student.
 * Average A1-A6 across all units; academic = sum(score)/sum(total_score).
 */
export async function fetchStudentCompetency(
  studentId: string,
  filter: SmartReportFilter,
  teacherId: string
): Promise<StudentCompetencyData | null> {
  const q = buildQuery(filter, teacherId).eq("student_id", studentId);
  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as UnitAssessmentRaw[];
  if (rows.length === 0) return null;

  const sums: Record<CompetencyKey, number> = {
    a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0,
  };
  const counts: Record<CompetencyKey, number> = {
    a1: 0, a2: 0, a3: 0, a4: 0, a5: 0, a6: 0,
  };

  let sumScore = 0;
  let sumTotal = 0;
  const units: { unit_name: string | null; score: number; total_score: number }[] = [];

  for (const r of rows) {
    sumScore += r.score ?? 0;
    sumTotal += r.total_score ?? 10;
    units.push({
      unit_name: r.unit_name,
      score: r.score ?? 0,
      total_score: r.total_score ?? 10,
    });

    for (const k of COMP_KEYS) {
      const key = `${k}_score` as keyof UnitAssessmentRaw;
      const v = r[key];
      if (typeof v === "number" && v >= 1 && v <= 4) {
        sums[k] += v;
        counts[k]++;
      }
    }
  }

  const avgCompetency = {} as Record<CompetencyKey, number>;
  for (const k of COMP_KEYS) {
    avgCompetency[k] = counts[k] > 0
      ? Math.round((sums[k] / counts[k]) * 10) / 10
      : 0;
  }

  const avgScorePct = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 1000) / 10 : 0;

  return {
    avgCompetency,
    academicSummary: {
      avgScorePct,
      totalUnits: rows.length,
      sumScore,
      sumTotal,
    },
    units,
  };
}
