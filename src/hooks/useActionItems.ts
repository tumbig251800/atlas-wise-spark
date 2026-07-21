import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type { Tables } from "@/integrations/supabase/types";

export type ActionItem = Tables<"action_plan_items">;

export const ACTION_ITEMS_KEY = ["action-items"] as const;

/**
 * WP-S0.1 interim UI guard.
 *
 * A PLC Impact Loop case (a classroom/student-outcome issue) must NOT be closed
 * to `verified` until WP6 adds a DB-enforced monitoring-result gate. Until then
 * the Verify path is blocked client-side for these cases.
 *
 * `IntegrityFlag` is a data-entry/data-quality fix — not a student-outcome case —
 * so it keeps its own "ยืนยันครูแก้แล้ว" verify flow and is intentionally allowed.
 *
 * NOTE: this is a temporary UI-only guard. The authoritative closure invariant
 * (verified requires a passed, verified monitoring result for the same case) is
 * enforced at the database level in WP6.
 */
export function requiresMonitoringBeforeVerify(item: Pick<ActionItem, "issue_type">): boolean {
  return item.issue_type !== "IntegrityFlag";
}

export function useActionItems() {
  return useQuery({
    queryKey: ACTION_ITEMS_KEY,
    queryFn: async (): Promise<ActionItem[]> => {
      const { data, error } = await supabase
        .from("action_plan_items")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

interface ResolveInput {
  id: number;
  status: "verified" | "dismissed" | "resolved";
  note: string | null;
  userId: string;
  dueDate?: string;
}

export function useResolveActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, note, userId, dueDate }: ResolveInput) => {
      const now = new Date().toISOString();
      const payload =
        status === "verified"
          ? { status, resolution_note: note, verified_by: userId, verified_at: now, updated_at: now }
          : status === "resolved"
          ? { status, resolution_note: note, resolved_at: now, updated_at: now, ...(dueDate ? { due_date: dueDate } : {}) }
          : { status, resolution_note: note, updated_at: now };

      const { data, error } = await supabase
        .from("action_plan_items")
        .update(payload)
        .eq("id", id)
        .in("status", ["open", "resolved", "watching"])
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("รายการนี้ถูกปิดไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    },
  });
}

// Manually "pass" a Watch item: director judges mastery recovered → resolve it.
export function usePassActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({
          status: "resolved",
          resolved_at: now,
          resolution_note: "คะแนนฟื้นตัว / ผู้บริหารพิจารณาผ่าน",
          watch_started_at: null,
          updated_at: now,
        })
        .eq("id", id)
        .in("status", ["watching", "open", "resolved"])
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("รายการนี้ถูกปิดไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    },
  });
}

export function useBulkDismissActionItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, note }: { ids: number[]; note: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("action_plan_items")
        .update({ status: "dismissed", resolution_note: note, updated_at: now })
        .in("id", ids)
        .in("status", ["open", "resolved", "watching"]);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    },
  });
}

export function daysRemaining(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = due.getTime() - today.getTime();
  return Math.round(ms / 86400000);
}
