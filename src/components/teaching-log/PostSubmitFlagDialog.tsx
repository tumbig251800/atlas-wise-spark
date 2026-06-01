import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlagResult } from "@/hooks/useTeachingLogValidation";

interface Props {
  open: boolean;
  onClose: () => void;
  flags: FlagResult[];
  /** Optional — "แก้ไขบันทึก" reopens the form for editing. Falls back to onClose. */
  onEdit?: () => void;
}

export function PostSubmitFlagDialog({ open, onClose, flags, onEdit }: Props) {
  const hasFlags = flags.length > 0;

  // No flags → celebrate briefly and auto-dismiss.
  useEffect(() => {
    if (!open || hasFlags) return;
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [open, hasFlags, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            บันทึกสำเร็จ ✓
          </DialogTitle>
        </DialogHeader>

        {!hasFlags ? (
          <div className="py-2 text-sm text-muted-foreground">
            ข้อมูลการสอนถูกบันทึกเรียบร้อยแล้ว
          </div>
        ) : (
          <div className="space-y-2 py-1">
            <div className="text-sm font-medium">
              พบ {flags.length} ข้อที่ควรตรวจสอบ:
            </div>
            <ul className="space-y-2">
              {flags.map((f) => {
                const isError = f.severity === "error";
                const isFlag5 = f.code === "FLAG5";
                return (
                  <li
                    key={f.code}
                    className={cn(
                      "rounded-md border p-2.5 text-sm flex items-start gap-2",
                      isError
                        ? "border-red-300 bg-red-50 text-red-900"
                        : "border-amber-300 bg-amber-50 text-amber-900"
                    )}
                  >
                    {isError ? (
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold opacity-70">
                          {f.code}
                        </span>
                        <span>{f.description}</span>
                      </div>
                      {isFlag5 && (
                        <div className="mt-1 font-semibold text-red-700">
                          ต้องส่งต่อภายนอก — แจ้งผู้บริหารทันที
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hasFlags && (
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => (onEdit ? onEdit() : onClose())}
            >
              แก้ไขบันทึก
            </Button>
            <Button onClick={onClose}>รับทราบ</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
