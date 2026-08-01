import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import { ACTION_ITEMS_KEY, type ActionItem } from "@/hooks/useActionItems";
import { useGetOrCreateInterventionPlan } from "@/hooks/useInterventionPlan";
import type { ImpactLoopStatus } from "@/domain/impactLoop";

/**
 * PLC Impact Loop status transitions on action_plan_items.
 * The authoritative rules live in the DB (state-machine CHECK + closure guard);
 * this hook only performs the transitions the teacher drives from the UI.
 */
export function useImpactLoop() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const getOrCreateInterventionPlan = useGetOrCreateInterventionPlan();

  const invalidate = () => qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });

  /** Begin the loop for a case that has none yet (null → awaiting_confirmation). */
  const startImpactLoop = useMutation({
    mutationFn: async (actionItemId: number) => {
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({ impact_loop_status: "awaiting_confirmation" satisfies ImpactLoopStatus })
        .eq("id", actionItemId)
        .is("impact_loop_status", null) // guard: only if not already started
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("เคสนี้เริ่ม Impact Loop ไปแล้ว");
      return data[0];
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "เริ่ม Impact Loop แล้ว", description: "ตรวจร่างเคสแล้วกดยืนยันเป็นเคสจริง" });
    },
    onError: (e: Error) => toast({ title: "เริ่มไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  /**
   * Confirm the AI-drafted case into a real case (decision 3: the owning teacher
   * confirms). Sets case_confirmed_by/at — required by the DB CHECK from
   * `confirmed` onward.
   */
  const confirmCase = useMutation({
    mutationFn: async ({ actionItemId, userId }: { actionItemId: number; userId: string }) => {
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({
          impact_loop_status: "confirmed" satisfies ImpactLoopStatus,
          case_confirmed_by: userId,
          case_confirmed_at: new Date().toISOString(),
        })
        .eq("id", actionItemId)
        .in("impact_loop_status", ["awaiting_confirmation", "draft"]) // guard against double/late confirm
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("ยืนยันไม่ได้ — เคสอาจถูกยืนยันหรือปิดไปแล้ว");
      return data[0];
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "ยืนยันเคสแล้ว", description: "เลือกนักเรียนและวางแผนแทรกแซงต่อได้" });
    },
    onError: (e: Error) => toast({ title: "ยืนยันไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  /**
   * confirmed -> monitoring, skipping plc_planned/intervention_active as
   * dedicated screens — no DB trigger requires passing through them
   * sequentially (only the closure guard fires, and only on 'closed'). Also
   * get-or-creates the minimal intervention_plans row monitoring needs.
   */
  const startMonitoring = useMutation({
    mutationFn: async ({ item, userId }: { item: ActionItem; userId: string }) => {
      const plan = await getOrCreateInterventionPlan.mutateAsync({ item, userId });
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({ impact_loop_status: "monitoring" satisfies ImpactLoopStatus })
        .eq("id", item.id)
        .eq("impact_loop_status", "confirmed")
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("เริ่มติดตามผลไม่ได้ — สถานะเคสเปลี่ยนไปแล้ว");
      return plan;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "เริ่มติดตามผลแล้ว", description: "บันทึกผลก่อน/หลังรายนักเรียนได้เลย" });
    },
    onError: (e: Error) => toast({ title: "เริ่มติดตามผลไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  /**
   * monitoring -> closed. The DB closure guard is the real gate (requires a
   * lead/admin-verified monitoring_results row with real before/after
   * evidence) — this mutation just attempts the transition and surfaces the
   * trigger's rejection message verbatim on failure.
   */
  const closeCase = useMutation({
    mutationFn: async (actionItemId: number) => {
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({
          impact_loop_status: "closed" satisfies ImpactLoopStatus,
          closed_after_monitoring_at: new Date().toISOString(),
        })
        .eq("id", actionItemId)
        .eq("impact_loop_status", "monitoring")
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("ปิดเคสไม่ได้ — สถานะเคสเปลี่ยนไปแล้ว");
      return data[0];
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "ปิดเคสแล้ว", description: "พิสูจน์ผลก่อน/หลังเรียบร้อย" });
    },
    onError: (e: Error) => toast({ title: "ปิดเคสไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });

  return { startImpactLoop, confirmCase, startMonitoring, closeCase };
}
