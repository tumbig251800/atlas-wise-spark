import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import type { PlcPlan } from "@/types/plc";
import { useToast } from "@/hooks/use-toast";

export function usePlcPlanner() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("atlas-plc-planner");

      if (error) throw error;

      if (!data || !data.plans || !Array.isArray(data.plans)) {
        throw new Error("AI returned invalid response format");
      }

      return data.plans as PlcPlan[];
    },
    onError: (error: Error) => {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
