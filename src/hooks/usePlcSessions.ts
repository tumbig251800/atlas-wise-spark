import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type { PlcSession } from "@/types/plc";
import { useToast } from "@/hooks/use-toast";

export const PLC_SESSIONS_KEY = ["plc_sessions"];

export function usePlcSessions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const savePlcSession = useMutation({
    mutationFn: async (data: Partial<PlcSession> & { id?: string }) => {
      const payload = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = data.id
        ? await supabase.from("plc_sessions").update(payload).eq("id", data.id).select().single()
        : await supabase.from("plc_sessions").insert(payload).select().single();

      if (error) throw error;
      return result as PlcSession;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PLC_SESSIONS_KEY });
      toast({
        title: "บันทึก PLC สำเร็จ",
        description: "ข้อมูล PLC ถูกบันทึกเรียบร้อยแล้ว",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return { savePlcSession };
}

export function useFetchPlcSessionsForItem(actionItemId: number) {
  return useQuery({
    queryKey: [...PLC_SESSIONS_KEY, "item", actionItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plc_sessions")
        .select("*")
        .contains("linked_action_item_ids", [actionItemId])
        .order("session_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as PlcSession[];
    },
  });
}

export function useTeacherList() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "teacher")
        .order("full_name");

      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string; role: string }[];
    },
  });
}
