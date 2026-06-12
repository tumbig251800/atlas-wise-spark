import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type {
  ClassroomResearchSuggestion,
  UpdateResearchPayload,
} from "@/types/classroomResearch";

const QUERY_KEY = ["classroom-research-suggestions"];

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
