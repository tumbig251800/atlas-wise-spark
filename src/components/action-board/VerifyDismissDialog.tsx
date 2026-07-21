import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useResolveActionItem, requiresMonitoringBeforeVerify, type ActionItem } from "@/hooks/useActionItems";

interface Props {
  open: boolean;
  mode: "verify" | "dismiss" | "resolve";
  item: ActionItem | null;
  onClose: () => void;
}

export function VerifyDismissDialog({ open, mode, item, onClose }: Props) {
  const [note, setNote] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const resolve = useResolveActionItem();

  useEffect(() => {
    if (open) { setNote(""); setNextDueDate(""); }
  }, [open]);

  if (!item) return null;

  const isDismiss = mode === "dismiss";
  const isResolve = mode === "resolve";
  const title = isDismiss
    ? "ปิดรายการ (Dismiss)"
    : isResolve
    ? "ครูแก้ไขแล้ว (Resolved)"
    : "ยืนยันรายการ (Verify)";
  const description = isDismiss
    ? "รายการนี้จะถูกปิดและไม่ปรากฏในรายการค้างอีก กรุณาระบุเหตุผล"
    : isResolve
    ? "บันทึกว่าครูได้ดำเนินการแก้ไขแล้ว เคสจะยังเปิดอยู่และรอผลการติดตาม (monitoring) ก่อนจึงปิดเคสได้"
    : "ยืนยันว่าปัญหานี้ได้รับการแก้ไขแล้ว";
  const buttonLabel = isDismiss ? "Dismiss" : isResolve ? "บันทึกว่าแก้แล้ว" : "Verify";

  const handleConfirm = async () => {
    if (!user) return;
    if (isDismiss && !note.trim()) {
      toast({ title: "กรุณาระบุเหตุผล", variant: "destructive" });
      return;
    }
    // WP-S0.1 interim guard: block closing a PLC Impact Loop case to "verified"
    // until WP6 adds a monitoring-result gate. Dismiss/resolve are unaffected, and
    // IntegrityFlag (data-quality) verify is intentionally still allowed.
    if (!isDismiss && !isResolve && requiresMonitoringBeforeVerify(item)) {
      toast({
        title: "ยังปิดเคสไม่ได้ — รอการติดตามผล",
        description:
          "เคสนี้จะปิด (Verify) ได้ก็ต่อเมื่อมีผลการติดตาม (monitoring) ที่ยืนยันแล้ว ซึ่งจะเปิดใช้งานใน WP6",
        variant: "destructive",
      });
      return;
    }
    try {
      await resolve.mutateAsync({
        id: item.id,
        status: isDismiss ? "dismissed" : isResolve ? "resolved" : "verified",
        note: note.trim() || null,
        userId: user.id,
        dueDate: isResolve && nextDueDate ? nextDueDate : undefined,
      });
      toast({
        title: isDismiss ? "Dismissed เรียบร้อย" : isResolve ? "บันทึกว่าแก้แล้ว" : "Verified เรียบร้อย",
        description: `${item.teacher_name ?? "—"} • ${item.metric_label ?? ""}`,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถบันทึกได้";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm bg-muted/40 rounded-md p-3 space-y-1">
            <div><span className="text-muted-foreground">ครู:</span> {item.teacher_name ?? "—"}</div>
            <div><span className="text-muted-foreground">ชั้น/วิชา:</span> {item.grade_level ?? "—"} {item.classroom ?? ""} · {item.subject ?? "—"}</div>
            <div><span className="text-muted-foreground">ตัวชี้วัด:</span> {item.metric_label ?? "—"} {item.metric_value != null ? `(${item.metric_value})` : ""}</div>
          </div>

          {isResolve && (
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="next-due-date">
                วันนัดติดตามครั้งต่อไป <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="next-due-date"
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="resolution-note">
              หมายเหตุ {isDismiss ? <span className="text-destructive">*</span> : <span className="text-muted-foreground">(optional)</span>}
            </label>
            <textarea
              id="resolution-note"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={isDismiss ? "เหตุผลที่ปิดรายการ..." : "หมายเหตุเพิ่มเติม..."}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={resolve.isPending}>
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={resolve.isPending}
            variant={isDismiss ? "outline" : "default"}
            className={isResolve ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            {resolve.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
