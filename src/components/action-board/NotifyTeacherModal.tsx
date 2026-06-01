import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/atlasSupabase";

interface NotifyTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  actionItem: {
    id: string | number;
    teacher_name?: string;
    issue_type?: string;
    detail?: string;
  };
}

// IntegrityFlag (FLAG1-4, FLAG6) is a data-entry problem — these are simply the
// ways a director records that the teacher was told to go fix their record.
const NOTIFY_CHANNELS = [
  "Line/โทรศัพท์",
  "ปากเปล่า/ประชุม",
  "เอกสารแจ้งเตือน",
];

function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function NotifyTeacherModal({
  open,
  onClose,
  onSaved,
  actionItem,
}: NotifyTeacherModalProps) {
  const [notifyDate, setNotifyDate] = useState(todayISO());
  const [channel, setChannel] = useState(NOTIFY_CHANNELS[0]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setNotifyDate(todayISO());
    setChannel(NOTIFY_CHANNELS[0]);
    setNote("");
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({
          notify_channel: channel,
          notify_date: notifyDate || todayISO(),
          notify_note: note.trim() || null,
          // 'watching' = รอติดตาม ยังไม่ปิด (ปิดจริงเมื่อกด "ยืนยันครูแก้แล้ว").
          status: "watching",
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionItem.id)
        .in("status", ["open", "resolved", "watching"])
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("รายการนี้ถูกปิดไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");
      }
      toast.success("บันทึกการแจ้งครูเรียบร้อยแล้ว");
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>แจ้งครูให้แก้ไขข้อมูล</DialogTitle>
        </DialogHeader>

        {/* Context header */}
        <div className="bg-muted/50 rounded-md p-2 text-sm space-y-0.5">
          <div className="font-medium">{actionItem.teacher_name ?? "—"}</div>
          {actionItem.detail && (
            <div className="text-xs text-muted-foreground">{actionItem.detail}</div>
          )}
        </div>

        <div className="space-y-4 py-1">
          <div className="space-y-1">
            <Label htmlFor="notify-date">วันที่แจ้ง</Label>
            <Input
              id="notify-date"
              type="date"
              value={notifyDate}
              onChange={(e) => setNotifyDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>ช่องทางที่แจ้ง</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFY_CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notify-note">หมายเหตุ</Label>
            <Textarea
              id="notify-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="เช่น แจ้งให้กลับไปแก้ไขบันทึกหลังสอน คาบที่..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
