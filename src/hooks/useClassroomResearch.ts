import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { cleanClassroomData } from "@/lib/utils";
import type {
  ClassroomResearchSuggestion,
  UpdateResearchPayload,
} from "@/types/classroomResearch";

const QUERY_KEY = ["classroom-research-suggestions"];

export interface ActiveResearchMatch {
  id: string;
  research_title: string;
  subject: string;
  grade_level: string;
  classroom: string;
  status: string;
}

/**
 * Detect the teacher's ACTIVE classroom research (status selected/in_progress)
 * that matches the lesson currently being logged (subject + grade + classroom).
 * RLS (teacher_own_rows) scopes to the current teacher automatically — so a
 * teacher only ever matches their own research. Used to auto-prompt linking a
 * post-lesson log to its research, so teachers don't have to remember.
 */
export function useActiveResearchForLesson(params: {
  subject: string;
  gradeLevel: string;
  classroom: string;
}) {
  const subject = (params.subject ?? "").trim();
  const gradeLevel = (params.gradeLevel ?? "").trim();
  const classroom = cleanClassroomData((params.classroom ?? "").trim());
  const enabled = !!subject && !!gradeLevel && !!classroom;

  const q = useQuery({
    queryKey: ["active-research-for-lesson", subject, gradeLevel, classroom],
    enabled,
    queryFn: async (): Promise<ActiveResearchMatch | null> => {
      const { data, error } = await supabase
        .from("classroom_research_suggestions")
        .select("id, research_title, subject, grade_level, classroom, status")
        .eq("subject", subject)
        .eq("grade_level", gradeLevel)
        .eq("classroom", classroom)
        .in("status", ["selected", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as ActiveResearchMatch | null) ?? null;
    },
  });

  return { research: q.data ?? null, isLoading: q.isLoading };
}

/**
 * Fetch classroom research suggestions for academic term 2569-1.
 * RLS policy handles teacher-specific filtering automatically.
 */
export function useClassroomResearch() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<ClassroomResearchSuggestion[]> => {
      const { data, error } = await supabase
        .from("classroom_research_suggestions")
        .select("*")
        .eq("academic_term", "2569-1")
        .order("status", { ascending: true }) // suggested first
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Batch-count teaching_logs linked (via research_id) to each given research id.
 * One query for the whole list — avoids an N+1 query per card.
 */
export function useResearchLogCounts(researchIds: string[]) {
  return useQuery({
    queryKey: ["research-log-counts", researchIds],
    enabled: researchIds.length > 0,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("research_id")
        .in("research_id", researchIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach((row) => {
        if (row.research_id) {
          counts[row.research_id] = (counts[row.research_id] ?? 0) + 1;
        }
      });
      return counts;
    },
  });
}

export type ComputeResult =
  | { kind: "ok"; label: string; value: number }
  | { kind: "unavailable"; reason: string };

function thaiMonth(yearMonth: string): string {
  return new Date(`${yearMonth}-01`).toLocaleDateString("th-TH", {
    month: "short",
    year: "numeric",
  });
}

const PBL_COMPETENCY_COLUMNS = [
  "com_score",
  "think_score",
  "problem_score",
  "life_score",
  "tech_score",
] as const;

async function computePblMetric(
  research: ClassroomResearchSuggestion
): Promise<ComputeResult> {
  // classroom_research_suggestions doesn't store a project_id — only recompute
  // when exactly one pbl_projects row matches, otherwise we'd be guessing which
  // project the original baseline came from.
  const { data: projects, error: projectsError } = await supabase
    .from("pbl_projects")
    .select("id")
    .eq("teacher_name", research.teacher_name)
    .eq("classroom", research.classroom)
    .eq("academic_term", research.academic_term);

  if (projectsError) throw projectsError;
  if (!projects || projects.length !== 1) {
    return {
      kind: "unavailable",
      reason: "ระบุโปรเจกต์ PBL ให้อัตโนมัติไม่ได้ (ไม่พบ หรือพบหลายโปรเจกต์) — กรอกข้อมูลเอง",
    };
  }

  const { data: assessments, error: assessmentsError } = await supabase
    .from("pbl_assessments")
    .select("com_score, think_score, problem_score, life_score, tech_score, overall_result")
    .eq("project_id", projects[0].id);

  if (assessmentsError) throw assessmentsError;
  if (!assessments || assessments.length === 0) {
    return { kind: "unavailable", reason: "ยังไม่มีผลประเมิน PBL ของโปรเจกต์นี้ในระบบ" };
  }

  const dimensionAverages = PBL_COMPETENCY_COLUMNS.map(
    (col) =>
      assessments.reduce((sum, row) => sum + (row[col] ?? 0), 0) / assessments.length
  );
  const minAverage = Math.round(Math.min(...dimensionAverages) * 100) / 100;
  const failingCount = assessments.filter(
    (row) => row.overall_result === "fail" || row.overall_result === "ไม่ผ่าน"
  ).length;

  if (research.issue_type === "PBLStudentFailing") {
    return { kind: "ok", label: "จำนวนนักเรียนไม่ผ่าน PBL (ปัจจุบัน)", value: failingCount };
  }
  return {
    kind: "ok",
    label: "คะแนนสมรรถนะ PBL ต่ำสุด (5 ด้าน เฉลี่ย, ปัจจุบัน)",
    value: minAverage,
  };
}

/**
 * UnitBlindSpot endline: re-measure from unit_assessments — actual per-student
 * unit test scores — using the school-standard "< 50%" criterion (same as
 * atlas-mcp's unit crosscheck). Returns the latest month's count alongside the
 * same-definition count for the baseline month, so before/after in the research
 * write-up compare identical measures (one-group pretest-posttest).
 */
async function computeUnitBlindSpotMetric(
  research: ClassroomResearchSuggestion
): Promise<ComputeResult> {
  let query = supabase
    .from("unit_assessments")
    .select("score, total_score, assessed_date")
    .eq("teacher_id", research.teacher_id)
    .eq("academic_term", research.academic_term);
  if (research.grade_level) query = query.eq("grade_level", research.grade_level);
  if (research.classroom) query = query.eq("classroom", research.classroom);
  if (research.subject) query = query.eq("subject", research.subject);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) {
    return { kind: "unavailable", reason: "ยังไม่มีคะแนนหลังหน่วยของวิชา/ห้องนี้ในระบบ" };
  }

  const byMonth: Record<string, { total: number; below: number }> = {};
  data.forEach((row) => {
    if (!row.assessed_date || !row.total_score) return;
    const month = String(row.assessed_date).slice(0, 7);
    byMonth[month] ??= { total: 0, below: 0 };
    byMonth[month].total++;
    if (Number(row.score) / Number(row.total_score) < 0.5) byMonth[month].below++;
  });

  const months = Object.keys(byMonth).sort();
  if (months.length === 0) {
    return { kind: "unavailable", reason: "ยังไม่มีคะแนนหลังหน่วยของวิชา/ห้องนี้ในระบบ" };
  }

  const latestMonth = months[months.length - 1];
  const baselineCapturedMonth = research.before_data?.captured_at?.slice(0, 7);
  const baselineMonth =
    baselineCapturedMonth && byMonth[baselineCapturedMonth]
      ? baselineCapturedMonth
      : months[0];

  if (latestMonth === baselineMonth) {
    return {
      kind: "unavailable",
      reason:
        "ยังไม่มีคะแนนหลังหน่วยรอบใหม่หลังช่วง baseline — ต้องกรอกคะแนนหลังหน่วยรอบใหม่ก่อน จึงจะคำนวณผลได้",
    };
  }

  return {
    kind: "ok",
    value: byMonth[latestMonth].below,
    label: `นักเรียนได้คะแนนหลังหน่วยต่ำกว่า 50% เดือน ${thaiMonth(latestMonth)} (นิยามเดียวกัน เดือน ${thaiMonth(baselineMonth)} = ${byMonth[baselineMonth].below} คน จากผู้เข้าสอบ ${byMonth[latestMonth].total} คน)`,
  };
}

/**
 * StayLong endline: remedial_tracking stores each student's LATEST real
 * remedial outcome (pass/stay, one row per student/subject/term by unique
 * constraint). Counting current 'stay' rows answers "how many still haven't
 * passed" — a valid same-direction endline. The baseline's "≥2 รอบ" round
 * count is not recoverable from this table; the label states the measure
 * honestly so the research write-up can disclose the definition difference.
 */
async function computeStayLongMetric(
  research: ClassroomResearchSuggestion
): Promise<ComputeResult> {
  let query = supabase
    .from("remedial_tracking")
    .select("status")
    .eq("teacher_id", research.teacher_id)
    .eq("academic_term", research.academic_term);
  if (research.grade_level) query = query.eq("grade_level", research.grade_level);
  if (research.classroom) query = query.eq("classroom", research.classroom);
  if (research.subject) query = query.eq("subject", research.subject);

  const { data, error } = await query;
  if (error) throw error;
  if (!data || data.length === 0) {
    return { kind: "unavailable", reason: "ยังไม่มีข้อมูลซ่อมเสริมของวิชา/ห้องนี้ในระบบ" };
  }

  const stillStay = data.filter((row) => row.status === "stay").length;
  return {
    kind: "ok",
    value: stillStay,
    label: "นักเรียนที่สถานะซ่อมเสริมล่าสุดยังเป็น STAY (ยังไม่ผ่าน)",
  };
}

/**
 * Compute a live "current" value for the Endline form from REAL child
 * assessment records — never from workflow/ticket state. PLC closing a case
 * is a problem-solving process, not a re-measurement of students; research
 * endline must come from tables that record actual per-student results:
 *  - UnitBlindSpot → unit_assessments (unit test scores, < 50% criterion)
 *  - StayLong → remedial_tracking (latest real remedial outcome per student)
 *  - PBL → pbl_assessments (5-competency scores)
 *  - GapRepeat/RedZone excluded: their detection logic lives in the external
 *    n8n workflow (strike_counter looks promising for GapRepeat later, but
 *    its update semantics are n8n-owned and unverified — manual entry only).
 * NOTE: action_plan_items.status was evaluated and rejected as a source —
 * it's a workflow state closed via PLC sign-off, which would fake a
 * "0 remaining" endline without any student being re-tested.
 */
export function useComputeCurrentMetric() {
  return useMutation({
    mutationFn: async (
      research: ClassroomResearchSuggestion
    ): Promise<ComputeResult> => {
      switch (research.issue_type) {
        case "UnitBlindSpot":
          return computeUnitBlindSpotMetric(research);
        case "StayLong":
          return computeStayLongMetric(research);
        case "PBLWeakCompetency":
        case "PBLStudentFailing":
          return computePblMetric(research);
        default:
          return {
            kind: "unavailable",
            reason: "หัวข้อประเภทนี้ยังไม่รองรับการคำนวณอัตโนมัติ",
          }; // GapRepeat, RedZone, AbandonedRepropose — manual entry only
      }
    },
  });
}

/**
 * Update a research suggestion.
 * Always sets updated_at = now() automatically via database trigger or explicit update.
 */
export function useUpdateResearch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateResearchPayload;
    }) => {
      const { data, error } = await supabase
        .from("classroom_research_suggestions")
        .update({
          ...payload,
          updated_at: new Date().toISOString(), // Explicit update
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Update research status (e.g., selected, abandoned).
 */
export function useUpdateResearchStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ClassroomResearchSuggestion["status"];
    }) => {
      const { data, error } = await supabase
        .from("classroom_research_suggestions")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
