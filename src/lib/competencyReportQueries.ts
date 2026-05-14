/**
 * Phase D Stage 3 + 2026: Competency Report data
 * Fetch student list and aggregated competency + academic for spider chart
 * Uses 8 capabilities (2026 Curriculum) with Latest Score aggregation
 */
import { supabase } from "@/lib/atlasSupabase";
import { sortClassrooms } from "@/lib/utils";
import type { SmartReportFilter } from "@/types/smartReport";
import type { SmartReportFilterOptions } from "@/lib/smartReportQueries";
import type { UnitAssessmentRaw } from "@/types/smartReport";
import {
  CAPABILITY_KEYS_2026,
  type CapabilityKey2026,
} from "@/lib/capabilityConstants2026";

const db = supabase as unknown as {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const CAP_COLS =
  "reading_score,writing_score,calculating_score,sci_tech_score,social_civic_score,economy_finance_score,health_score,art_culture_score";
const ASSESSMENT_COLS =
  "id,student_id,student_name,unit_name,score,total_score,subject,grade_level,classroom,academic_term,assessed_date,competency_assessed_date," +
  CAP_COLS;

export interface StudentOption {
  student_id: string;
  student_name: string;
  grade_level: string;
  classroom: string;
}

export interface StudentCompetencyData {
  avgCompetency: Record<CapabilityKey2026, number>;
  academicSummary: {
    avgScorePct: number;
    totalUnits: number;
    sumScore: number;
    sumTotal: number;
  };
  units: { unit_name: string | null; score: number; total_score: number }[];
}

function buildQuery(filter: SmartReportFilter, teacherId: string) {
  let q = db
    .from("unit_assessments")
    .select(ASSESSMENT_COLS)
    .not("reading_score", "is", null);

  if (teacherId) q = q.eq("teacher_id", teacherId);
  if (filter.subject) q = q.eq("subject", filter.subject);
  if (filter.gradeLevel) q = q.eq("grade_level", filter.gradeLevel);
  if (filter.classroom) q = q.eq("classroom", filter.classroom);
  if (filter.academicTerm) q = q.eq("academic_term", filter.academicTerm);

  return q.order("assessed_date", { ascending: false }).order("competency_assessed_date", { ascending: false });
}

/**
 * Fetch filter options from unit_assessments with competency data only.
 * ใช้เฉพาะข้อมูลสมรรถนะ เพื่อไม่ให้วิชาจาก teaching_logs ปนกัน
 */
export async function fetchCompetencyFilterOptions(
  teacherId: string
): Promise<SmartReportFilterOptions> {
  const { data, error } = await db
    .from("unit_assessments")
    .select("subject,grade_level,classroom,academic_term")
    .eq("teacher_id", teacherId)
    .not("reading_score", "is", null);

  if (error) throw error;

  const s = new Set<string>();
  const g = new Set<string>();
  const c = new Set<string>();
  const t = new Set<string>();

  for (const r of data ?? []) {
    if (r.subject) s.add(r.subject);
    if (r.grade_level) g.add(r.grade_level);
    if (r.classroom) c.add(String(r.classroom));
    if (r.academic_term) t.add(r.academic_term);
  }

  return {
    subjects: [...s].sort(),
    gradeLevels: [...g].sort(),
    classrooms: sortClassrooms([...c]),
    academicTerms: [...t].sort(),
  };
}

/**
 * Fetch distinct students who have 2026 capability data (reading_score filled).
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

  result.sort((a, b) =>
    (a.student_name || a.student_id).localeCompare(b.student_name || b.student_id)
  );
  return result;
}

/**
 * Fetch and aggregate competency + academic for a student.
 * Uses Latest Score per capability (most recent assessment date).
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

  const latestCompetency: Record<CapabilityKey2026, number> = {
    reading: 0,
    writing: 0,
    calculating: 0,
    sci_tech: 0,
    social_civic: 0,
    economy_finance: 0,
    health: 0,
    art_culture: 0,
  };

  for (const k of CAPABILITY_KEYS_2026) {
    const col = `${k}_score` as keyof UnitAssessmentRaw;
    for (const r of rows) {
      const v = r[col];
      if (typeof v === "number" && v >= 1 && v <= 4) {
        latestCompetency[k] = Math.round(v * 10) / 10;
        break;
      }
    }
  }

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
  }

  const avgScorePct =
    sumTotal > 0 ? Math.round((sumScore / sumTotal) * 1000) / 10 : 0;

  return {
    avgCompetency: latestCompetency,
    academicSummary: {
      avgScorePct,
      totalUnits: rows.length,
      sumScore,
      sumTotal,
    },
    units,
  };
}
