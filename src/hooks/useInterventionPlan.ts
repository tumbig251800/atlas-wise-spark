import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type { Tables } from "@/integrations/supabase/types";
import type { ActionItem } from "@/hooks/useActionItems";

export type InterventionPlan = Tables<"intervention_plans">;

export function useInterventionPlanForItem(actionItemId: number | null) {
  return useQuery({
    queryKey: ["intervention-plan", actionItemId],
    enabled: !!actionItemId,
    queryFn: async (): Promise<InterventionPlan | null> => {
      const { data, error } = await supabase
        .from("intervention_plans")
        .select("*")
        .eq("action_item_id", actionItemId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Minimal, auto-created plan — reuses the case's existing PLC/AI data instead
 * of a separate planning wizard. Get-or-create for idempotency (e.g. a
 * double-click on "เริ่มติดตามผล" must not create two plans).
 */
export function useGetOrCreateInterventionPlan() {
  return useMutation({
    mutationFn: async ({ item, userId }: { item: ActionItem; userId: string }): Promise<InterventionPlan> => {
      const { data: existing, error: findErr } = await supabase
        .from("intervention_plans")
        .select("*")
        .eq("action_item_id", item.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing) return existing;

      const { data: sessions, error: sessErr } = await supabase
        .from("plc_sessions")
        .select("id, session_date, problem_statement, approach")
        .contains("linked_action_item_ids", [item.id])
        .order("session_date", { ascending: false })
        .limit(1);
      if (sessErr) throw sessErr;
      const session = sessions?.[0] ?? null;

      const objectiveBase = item.ai_summary || item.detail || `ติดตามผลเคส: ${item.issue_type}`;
      const objective = session?.problem_statement
        ? `ประเด็น: ${session.problem_statement}${session.approach ? ` — แนวทาง: ${session.approach}` : ""}`
        : objectiveBase;

      const { data, error } = await supabase
        .from("intervention_plans")
        .insert({
          action_item_id: item.id,
          plc_session_id: session?.id ?? null,
          objective,
          intervention_method: session?.approach ?? null,
          responsible_user_id: userId,
          start_date: session?.session_date ?? new Date().toISOString().slice(0, 10),
          status: "active",
          created_by: userId,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });
}
