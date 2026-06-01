import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { cleanClassroomData } from "@/lib/utils";

export interface PreviousMastery {
  mastery_score: number | null;
  teaching_date: string | null;
  loading: boolean;
}

interface Params {
  subject: string;
  classroom: string;
  gradeLevel: string;
  /** Current log id when editing — excluded so we compare against the prior period. */
  currentLogId?: string | null;
}

/**
 * Fetches the most recent PREVIOUS mastery score for the same
 * teacher × subject × classroom × grade_level combination. Used by FLAG7
 * (anti-gaming) to detect a suspicious one-period jump.
 *
 * Re-fetches automatically when subject / classroom / grade_level change.
 */
export function usePreviousMastery({
  subject,
  classroom,
  gradeLevel,
  currentLogId,
}: Params): PreviousMastery {
  const { user } = useAuth();

  // Stored rows use the cleaned classroom form, so normalize before matching.
  const cleanedClassroom = classroom ? cleanClassroomData(classroom.trim()) : "";
  const subj = subject.trim();
  const grade = gradeLevel.trim();

  const enabled = !!user?.id && !!subj && !!cleanedClassroom && !!grade;

  const { data, isLoading } = useQuery({
    queryKey: [
      "previous-mastery",
      user?.id,
      subj,
      cleanedClassroom,
      grade,
      currentLogId ?? null,
    ],
    enabled,
    queryFn: async (): Promise<{ mastery_score: number | null; teaching_date: string | null }> => {
      let query = supabase
        .from("teaching_logs")
        .select("mastery_score, teaching_date")
        .eq("teacher_id", user!.id)
        .eq("subject", subj)
        .eq("classroom", cleanedClassroom)
        .eq("grade_level", grade);

      if (currentLogId) {
        query = query.neq("id", currentLogId);
      }

      const { data, error } = await query
        .order("teaching_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return {
        mastery_score: data?.mastery_score ?? null,
        teaching_date: data?.teaching_date ?? null,
      };
    },
  });

  return {
    mastery_score: data?.mastery_score ?? null,
    teaching_date: data?.teaching_date ?? null,
    loading: enabled && isLoading,
  };
}
