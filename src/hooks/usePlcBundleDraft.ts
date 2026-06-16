import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import type { ActionItem } from "./useActionItems";
import type { PlcSession } from "@/types/plc";

export interface PlcBundleDraftInput {
  items: ActionItem[];
  subject: string;
  gradeBand: string;
}

export interface PlcBundleDraftResult {
  topic: string;
  problem_statement: string;
  root_cause: string;
  approach: string;
  action_steps_per_teacher: Array<{
    teacher_id: string;
    teacher_name: string;
    action_steps: string;
  }>;
}

export function usePlcBundleDraft() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: PlcBundleDraftInput): Promise<PlcBundleDraftResult> => {
      // Call edge function to generate draft using Gemini
      const { data, error } = await supabase.functions.invoke("plc-bundle-draft", {
        body: {
          items: input.items.map((item) => ({
            id: item.id,
            teacher_id: item.teacher_id,
            teacher_name: item.teacher_name,
            subject: item.subject,
            grade_level: item.grade_level,
            classroom: item.classroom,
            issue_type: item.issue_type,
            severity: item.severity,
            detail: item.detail,
            metric_label: item.metric_label,
            metric_value: item.metric_value,
          })),
          subject: input.subject,
          gradeBand: input.gradeBand,
        },
      });

      if (error) throw error;

      if (!data || !data.draft) {
        throw new Error("AI returned invalid response");
      }

      return data.draft as PlcBundleDraftResult;
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาดในการสร้าง Draft",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper to convert draft result to prefilled PlcSession data
export function draftToPrefilledPlc(
  draft: PlcBundleDraftResult,
  items: ActionItem[]
): Partial<PlcSession> {
  // Extract unique teachers
  const teacherMap = new Map<string, string>();
  items.forEach((item) => {
    if (item.teacher_id && item.teacher_name) {
      teacherMap.set(item.teacher_id, item.teacher_name);
    }
  });

  const members = Array.from(teacherMap.entries()).map(([teacher_id, teacher_name]) => ({
    teacher_id,
    teacher_name,
  }));

  // Combine action steps
  const actionStepsText = draft.action_steps_per_teacher
    .map(
      (t) =>
        `**${t.teacher_name}**\n${t.action_steps}`
    )
    .join("\n\n");

  // Determine PLC type based on items
  const subjects = [...new Set(items.map((i) => i.subject).filter(Boolean))];
  const plcType = subjects.length === 1 ? "subject" : "grade_band";

  return {
    topic: draft.topic,
    problem_statement: draft.problem_statement,
    root_cause: draft.root_cause,
    approach: draft.approach,
    action_steps: actionStepsText,
    plc_type: plcType,
    subject: subjects.length === 1 ? subjects[0] : null,
    members,
    linked_action_item_ids: items.map((i) => i.id),
  };
}
