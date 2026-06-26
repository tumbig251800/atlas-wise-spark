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
