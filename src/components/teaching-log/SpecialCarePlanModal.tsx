import { useState } from "react";
import { supabase } from "@/lib/atlasSupabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SpecialCarePlanModalProps {
  open: boolean;
  studentIds: string[];
  sourceLogId: string;
  teacherId: string;
  onClose: () => void;
  onSaved: (planIds: number[]) => void;
}

function defaultFollowUpDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export function SpecialCarePlanModal({
  open,
  studentIds,
  sourceLogId,
  teacherId,
  onClose,
  onSaved,
}: SpecialCarePlanModalProps) {
  const [concern, setConcern] = useState("");
  const [carePlan, setCarePlan] = useState("");
  const [followUpDate, setFollowUpDate] = useState(defaultFollowUpDate);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!concern.trim() && !carePlan.trim()) {
      toast({ title: "กรุณากรอกข้อมูลอย่างน้อย 1 ช่อง", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const rows = studentIds.map((sid) => ({
        student_id: sid,
        teacher_id: teacherId,
        source_log_id: sourceLogId,
        gap_type: "a-gap" as const,
        concern: concern.trim() || null,
        care_plan: carePlan.trim() || null,
        follow_up_date: followUpDate || null,
      }));

      const { data, error } = await supabase
        .from("student_support_plans")
        .insert(rows)
        .select("id");

      if (error) throw error;

      const ids = (data ?? []).map((r) => r.id as number);
      toast({ title: "✅ บันทึกแผนดูแลสำเร็จ", description: `สร้างแผนสำหรับ ${ids.length} คน` });
      onSaved(ids);
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถบันทึกแผนดูแลได้";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setConcern("");
    setCarePlan("");
    setFollowUpDate(defaultFollowUpDate());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>เปิดแผนดูแลนักเรียน (A-Gap)</DialogTitle>
          <DialogDescription>
            บันทึกพบปัญหาด้านทัศนคติ/พฤติกรรม — กรอกแผนดูแลสำหรับนักเรียนด้านล่าง
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student ID badges */}
          <div>
            <p className="text-sm font-medium mb-2">นักเรียนที่เกี่ยวข้อง</p>
            <div className="flex flex-wrap gap-2">
              {studentIds.map((sid) => (
                <span
                  key={sid}
                  className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-1 rounded-full border border-amber-300"
                >
                  {sid}
                </span>
              ))}
            </div>
          </div>

          {/* Concern */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="sc-concern">
              ปัญหาที่พบ
            </label>
            <textarea
              id="sc-concern"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="เช่น นักเรียนไม่ร่วมกิจกรรม แสดงพฤติกรรมปฏิเสธการเรียน..."
              value={concern}
              onChange={(e) => setConcern(e.target.value)}
            />
          </div>

          {/* Care plan */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="sc-careplan">
              แผนดูแล
            </label>
            <textarea
              id="sc-careplan"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="เช่น พูดคุยส่วนตัวหลังเลิกเรียน ประสานผู้ปกครอง นัดแนะแนว..."
              value={carePlan}
              onChange={(e) => setCarePlan(e.target.value)}
            />
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="sc-followup">
              วันนัดติดตาม
            </label>
            <input
              id="sc-followup"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            ข้ามไปก่อน
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึกแผนดูแล
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
