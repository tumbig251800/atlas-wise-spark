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

export interface ComputedMetric {
  label: string;
  value: number;
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
): Promise<ComputedMetric | null> {
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
  if (!projects || projects.length !== 1) return null;

  const { data: assessments, error: assessmentsError } = await supabase
    .from("pbl_assessments")
    .select("com_score, think_score, problem_score, life_score, tech_score, overall_result")
    .eq("project_id", projects[0].id);

  if (assessmentsError) throw assessmentsError;
  if (!assessments || assessments.length === 0) return null;

  const dimensionAverages = PBL_COMPETENCY_COLUMNS.map(
    (col) =>
      assessments.reduce((sum, row) => sum + (row[col] ?? 0), 0) / assessments.length
  );
  const minAverage = Math.round(Math.min(...dimensionAverages) * 100) / 100;
  const failingCount = assessments.filter(
    (row) => row.overall_result === "fail" || row.overall_result === "ไม่ผ่าน"
  ).length;

  if (research.issue_type === "PBLStudentFailing") {
    return { label: "จำนวนนักเรียนไม่ผ่าน PBL (ปัจจุบัน)", value: failingCount };
  }
  return { label: "คะแนนสมรรถนะ PBL ต่ำสุด (5 ด้าน เฉลี่ย, ปัจจุบัน)", value: minAverage };
}

/**
 * Re-run the same kind of query that produced this research's before_data,
 * to get a live "current" value for the Endline form — so teachers don't have
 * to hand-count students. Deliberately narrow to PBL only after verifying
 * against live data:
 *  - UnitBlindSpot rejected: action_plan_items.status is a workflow/ticket
 *    state (open/verified/dismissed) closed via human PLC sign-off, not by a
 *    re-tested score — counting status='open' would report "0 remaining" the
 *    moment a case is administratively closed, even if nobody was re-tested.
 *  - StayLong rejected: remedial_tracking has a UNIQUE(student_id, subject,
 *    grade_level, academic_term) constraint — it's an upsert snapshot of each
 *    student's LATEST remedial result, not an append-only log of every round.
 *    The original baseline's "stay >= 2 รอบ" can't be recovered by counting
 *    rows here; that "รอบ" concept isn't represented in this table at all.
 *  - GapRepeat/RedZone excluded: their detection logic lives in the external
 *    n8n workflow. (A `strike_counter` table with a real strike_count column
 *    exists and looks promising for GapRepeat specifically, but needs its own
 *    verification pass before being trusted here — not done in this change.)
 * PBL assessment scores are a direct, unambiguous re-measurement with no
 * workflow-state or upsert-history traps, so they're the only supported path.
 * Returns null when unsupported or ambiguous — caller falls back to manual entry.
 */
export function useComputeCurrentMetric() {
  return useMutation({
    mutationFn: async (
      research: ClassroomResearchSuggestion
    ): Promise<ComputedMetric | null> => {
      switch (research.issue_type) {
        case "PBLWeakCompetency":
        case "PBLStudentFailing":
          return computePblMetric(research);
        default:
          return null; // UnitBlindSpot, StayLong, GapRepeat, RedZone, AbandonedRepropose — manual entry only
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
