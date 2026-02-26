import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type TeachingLog = Tables<"teaching_logs">;

interface TeacherOption {
  user_id: string;
  full_name: string;
}

interface ReassignTeacherDialogProps {
  log: TeachingLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (logId: string, newTeacherId: string, newTeacherName: string) => void;
}

export function ReassignTeacherDialog({ log, open, onOpenChange, onSuccess }: ReassignTeacherDialogProps) {
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const fetchTeachers = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "teacher");
      if (!roles?.length) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", roles.map((r) => r.user_id));

      if (profiles) setTeachers(profiles);
    };
    fetchTeachers();
  }, [open]);

  const handleConfirm = async () => {
    if (!log || !selectedTeacherId) return;
    setSaving(true);

    const teacher = teachers.find((t) => t.user_id === selectedTeacherId);
    const newName = teacher?.full_name || "";

    try {
      // Update teaching_logs
      const { error: logErr } = await supabase
        .from("teaching_logs")
        .update({ teacher_id: selectedTeacherId, teacher_name: newName })
        .eq("id", log.id);
      if (logErr) throw logErr;

      // Cascade update related tables
      await Promise.all([
        supabase.from("diagnostic_events").update({ teacher_id: selectedTeacherId }).eq("teaching_log_id", log.id),
        supabase.from("remedial_tracking").update({ teacher_id: selectedTeacherId }).eq("teaching_log_id", log.id),
        supabase.from("strike_counter").update({ teacher_id: selectedTeacherId }).eq("last_session_id", log.id),
        supabase.from("pivot_events").update({ teacher_id: selectedTeacherId }).eq("trigger_session_id", log.id),
      ]);

      onSuccess(log.id, selectedTeacherId, newName);
      toast({ title: "เปลี่ยนครูสำเร็จ", description: `เปลี่ยนเป็น ${newName} แล้ว` });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
      setSelectedTeacherId("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>เปลี่ยนครูผู้สอน</DialogTitle>
          <DialogDescription>
            เลือกครูที่ต้องการผูกกับบันทึกนี้
          </DialogDescription>
        </DialogHeader>
        <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
          <SelectTrigger>
            <SelectValue placeholder="เลือกครู..." />
          </SelectTrigger>
          <SelectContent>
            {teachers.map((t) => (
              <SelectItem key={t.user_id} value={t.user_id}>
                {t.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleConfirm} disabled={!selectedTeacherId || saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          ยืนยัน
        </Button>
      </DialogContent>
    </Dialog>
  );
}
