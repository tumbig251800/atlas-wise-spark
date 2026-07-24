import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import { ACTION_ITEMS_KEY, type ActionItem } from "@/hooks/useActionItems";

export interface TeacherPlcInput {
  problem: string; // the issue the teacher wants to bring into PLC
  gradeLevel: string;
  classroom: string;
  subject: string;
  severity: "critical" | "high" | "medium";
  teacherId: string;
  teacherName: string | null;
}

/**
 * Teacher-proposed PLC (bottom-up). The teacher opens a case on their own
 * problem — it is NOT a system-detected issue. It enters the Impact Loop at
 * `awaiting_confirmation` so the AI can help analyse the root cause and the
 * admin co-considers before the case is confirmed. Only then does the AI draft
 * a context-specific solution.
 *
 * The DB RLS policy (`action_plan_items_teacher_propose_insert`) guarantees a
 * teacher can only create `TeacherProposed` cases owned by themselves.
 */
export function useCreateTeacherPlc() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: TeacherPlcInput): Promise<ActionItem> => {
      const issueKey = `TP-${input.teacherId}-${Date.now()}`;
      const { data, error } = await supabase
        .from("action_plan_items")
        .insert({
          issue_key: issueKey,
          issue_type: "TeacherProposed",
          teacher_id: input.teacherId,
          teacher_name: input.teacherName,
          detail: input.problem.trim(),
          grade_level: input.gradeLevel,
          classroom: input.classroom,
          subject: input.subject,
          severity: input.severity,
          status: "open",
          impact_loop_status: "awaiting_confirmation",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as ActionItem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
      toast({ title: "เปิดเคส PLC แล้ว", description: "รอผู้บริหารร่วมพิจารณา แล้วยืนยันเป็นเคสจริง" });
    },
    onError: (e: Error) =>
      toast({ title: "เปิดเคสไม่สำเร็จ", description: e.message, variant: "destructive" }),
  });
}
