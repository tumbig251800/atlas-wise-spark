import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import type { EvidenceResult, MonitoringResultStatus } from "@/domain/monitoringEvidence";
import { toEvidenceJsonb } from "@/domain/monitoringEvidence";

export type MonitoringResult = Tables<"monitoring_results">;

export const monitoringResultsKey = (planId: string | null) => ["monitoring-results", planId] as const;

export function useMonitoringResultsForPlan(planId: string | null) {
  return useQuery({
    queryKey: monitoringResultsKey(planId),
    enabled: !!planId,
    queryFn: async (): Promise<MonitoringResult[]> => {
      const { data, error } = await supabase
        .from("monitoring_results")
        .select("*")
        .eq("intervention_plan_id", planId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Insert-or-update per (plan, student) — not an upsert, since there's no
 * unique constraint on (intervention_plan_id, student_id), only a surrogate
 * id PK. Blocks editing an already-verified row (RLS would reject it anyway;
 * this gives a clearer message before the round trip).
 */
export function useSaveMonitoringResult(planId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      userId: string;
      before: EvidenceResult;
      after: EvidenceResult;
      resultStatus: MonitoringResultStatus;
      notes: string | null;
    }) => {
      if (!planId) throw new Error("ยังไม่มีแผนแทรกแซงสำหรับเคสนี้");

      const { data: existing, error: findErr } = await supabase
        .from("monitoring_results")
        .select("id, verified_by")
        .eq("intervention_plan_id", planId)
        .eq("student_id", input.studentId)
        .maybeSingle();
      if (findErr) throw findErr;
      if (existing?.verified_by) throw new Error("ผลนี้ได้รับการยืนยันแล้ว แก้ไขไม่ได้");

      const payload = {
        intervention_plan_id: planId,
        student_id: input.studentId,
        before_evidence: toEvidenceJsonb(input.before),
        after_evidence: toEvidenceJsonb(input.after),
        result_status: input.resultStatus,
        notes: input.notes,
        recorded_by: input.userId,
      };

      const { error } = existing
        ? await supabase.from("monitoring_results").update(payload).eq("id", existing.id)
        : await supabase.from("monitoring_results").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monitoringResultsKey(planId) });
      toast({ title: "บันทึกผลติดตามแล้ว" });
    },
    onError: (e: Error) => toast({ title: "บันทึกไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });
}

/** Lead/admin only — RLS enforces this; the guard here is just a cleaner error message. */
export function useVerifyMonitoringResult(planId: string | null) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { data, error } = await supabase
        .from("monitoring_results")
        .update({ verified_by: userId, verified_at: new Date().toISOString() })
        .eq("id", id)
        .is("verified_by", null)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("ยืนยันไม่ได้ — ผลนี้ถูกยืนยันไปแล้ว");
      return data[0];
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: monitoringResultsKey(planId) });
      toast({ title: "ยืนยันผลติดตามแล้ว" });
    },
    onError: (e: Error) => toast({ title: "ยืนยันไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });
}
