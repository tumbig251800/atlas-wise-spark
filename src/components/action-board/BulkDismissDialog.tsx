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
import { useBulkDismissActionItems, type ActionItem } from "@/hooks/useActionItems";

interface Props {
  open: boolean;
  items: ActionItem[];
  groupLabel: string;
  onClose: () => void;
}

export function BulkDismissDialog({ open, items, groupLabel, onClose }: Props) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const bulkDismiss = useBulkDismissActionItems();

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  const handleConfirm = async () => {
    if (!note.trim()) {
      toast({ title: "กรุณาระบุเหตุผล", variant: "destructive" });
      return;
    }
    try {
      await bulkDismiss.mutateAsync({ ids: items.map((i) => i.id), note: note.trim() });
      toast({
        title: `Dismissed ${items.length} รายการ`,
        description: groupLabel,
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
          <DialogTitle>ปิดทั้งกลุ่ม (Bulk Dismiss)</DialogTitle>
          <DialogDescription>
            ปิด <strong>{items.length} รายการ</strong> ของ {groupLabel} พร้อมกัน
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm bg-muted/40 rounded-md p-3 space-y-1">
            {items.slice(0, 5).map((item) => (
              <div key={item.id} className="text-muted-foreground">
                • {item.metric_label} ({item.metric_value}%)
              </div>
            ))}
            {items.length > 5 && (
              <div className="text-muted-foreground">...และอีก {items.length - 5} รายการ</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="bulk-note">
              เหตุผลที่ปิด <span className="text-destructive">*</span>
            </label>
            <textarea
              id="bulk-note"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="เช่น ปรับวิธีประเมินใหม่หลัง PLC..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={bulkDismiss.isPending}>
            ยกเลิก
          </Button>
          <Button onClick={handleConfirm} disabled={bulkDismiss.isPending} variant="outline">
            {bulkDismiss.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Dismiss ทั้งกลุ่ม
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
