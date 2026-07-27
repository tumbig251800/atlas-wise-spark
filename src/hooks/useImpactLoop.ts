import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import { ACTION_ITEMS_KEY } from "@/hooks/useActionItems";
import type { ImpactLoopStatus } from "@/domain/impactLoop";

/**
 * PLC Impact Loop status transitions on action_plan_items.
 * The authoritative rules live in the DB (state-machine CHECK + closure guard);
 * this hook only performs the transitions the teacher drives from the UI.
 */
export function useImpactLoop() {
  const qc = useQueryClient();
  const { toast } = useToast();

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

  return { startImpactLoop, confirmCase };
}
