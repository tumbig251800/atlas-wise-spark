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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/atlasSupabase";

interface ReferralModalProps {
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

function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

// FLAG5 ("a2-gap ต้องส่งต่อภายนอก") — referring the case to an outside agency
// closes the item, so this modal resolves it on save.
export function ReferralModal({
  open,
  onClose,
  onSaved,
  actionItem,
}: ReferralModalProps) {
  const [referralDate, setReferralDate] = useState(todayISO());
  const [agency, setAgency] = useState("");
  const [owner, setOwner] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setReferralDate(todayISO());
    setAgency("");
    setOwner("");
    setNote("");
  }, [open]);

  const handleSave = async () => {
    if (!agency.trim()) {
      toast.error("กรุณาระบุหน่วยงานที่ส่งต่อ");
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("action_plan_items")
        .update({
          referral_agency: agency.trim(),
          referral_date: referralDate || todayISO(),
          referral_owner: owner.trim() || null,
          referral_note: note.trim() || null,
          status: "resolved",
          resolved_at: now,
          updated_at: now,
        })
        .eq("id", actionItem.id)
        .in("status", ["open", "resolved", "watching"])
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("รายการนี้ถูกปิดไปแล้วโดยผู้อื่น กรุณารีเฟรชหน้า");
      }
      toast.success("บันทึกการส่งต่อเรียบร้อยแล้ว");
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
          <DialogTitle>บันทึกการส่งต่อภายนอก (FLAG5)</DialogTitle>
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
            <Label htmlFor="referral-date">วันที่ส่งต่อ</Label>
            <Input
              id="referral-date"
              type="date"
              value={referralDate}
              onChange={(e) => setReferralDate(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="referral-agency">หน่วยงานที่ส่งต่อ</Label>
            <Input
              id="referral-agency"
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              placeholder="เช่น โรงพยาบาลกำแพงเพชร"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="referral-owner">ผู้รับผิดชอบติดตาม</Label>
            <Input
              id="referral-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="ชื่อผู้รับผิดชอบติดตาม"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="referral-note">หมายเหตุ</Label>
            <Textarea
              id="referral-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
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
