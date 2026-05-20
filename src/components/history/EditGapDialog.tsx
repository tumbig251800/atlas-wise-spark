import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { GAPS, SUCCESS_OPTION, getAllowedGaps, getDefaultGap, type GapValue } from "@/lib/gapOptions";
import type { Tables } from "@/integrations/supabase/types";

type TeachingLog = Tables<"teaching_logs">;

interface EditGapDialogProps {
  log: TeachingLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (logId: string, newGap: GapValue) => void;
}

function formatDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function EditGapDialog({ log, open, onOpenChange, onSuccess }: EditGapDialogProps) {
  const [selected, setSelected] = useState<GapValue | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (log && open) {
      const current = log.major_gap as GapValue;
      const allowedNow = getAllowedGaps(log.mastery_score);
      // If the saved gap is no longer allowed under the new mastery rule (legacy data),
      // fall back to the default for that mastery (e.g. success for mastery>=4).
      setSelected(allowedNow.includes(current) ? current : getDefaultGap(log.mastery_score));
    }
  }, [log?.id, open]);

  if (!log) return null;

  const isHighMastery = log.mastery_score >= 4;
  const isLowMastery = log.mastery_score <= 3;
  const allowed = getAllowedGaps(log.mastery_score);
  const gridGaps = isHighMastery ? [] : GAPS.filter((g) => allowed.includes(g.value));

  const handleSave = async () => {
    if (!selected) return;
    if (selected === log.major_gap) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("teaching_logs")
        .update({ major_gap: selected })
        .eq("id", log.id);
      if (error) throw error;
      onSuccess(log.id, selected);
      toast({ title: "บันทึกแล้ว", description: `อัพเดต Gap เป็น ${selected}` });
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถบันทึกได้";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>แก้ไข Gap</DialogTitle>
          <DialogDescription>
            เปลี่ยนได้เฉพาะ Major Gap — ข้อมูลอื่นถูกล็อกไว้
            <br />
            <span className="text-xs">
              หากต้องการแก้ key_issue หรือข้อมูลอื่น กรุณาลบบันทึกแล้วกรอกใหม่
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Read-only metadata */}
        <div className="space-y-2 text-sm">
          <ReadOnlyRow label="วันที่สอน" value={formatDate(log.teaching_date)} />
          <ReadOnlyRow label="ระดับชั้น / ห้อง" value={`${log.grade_level} / ${log.classroom}`} />
          <ReadOnlyRow label="วิชา" value={log.subject} />
          <ReadOnlyRow label="Mastery Score" value={String(log.mastery_score)} />
        </div>

        <Separator />

        {/* Editable gap selector */}
        <div className="space-y-3">
          <div className="text-sm font-medium">เลือก Major Gap ใหม่</div>

          {isLowMastery && !selected && (
            <p className="text-sm text-muted-foreground italic">กรุณาเลือกประเภท Gap</p>
          )}

          {isHighMastery ? (
            <>
              <button
                type="button"
                onClick={() => setSelected(SUCCESS_OPTION.value)}
                className={cn(
                  "w-full flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  selected === SUCCESS_OPTION.value
                    ? cn(SUCCESS_OPTION.color, "ring-2 ring-primary/30 scale-[1.02]")
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl">{SUCCESS_OPTION.icon}</span>
                <span className="font-semibold text-sm">{SUCCESS_OPTION.label}</span>
                <span className="text-xs text-muted-foreground">{SUCCESS_OPTION.desc}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelected("a2-gap")}
                className={cn(
                  "w-full flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all",
                  selected === "a2-gap"
                    ? "border-destructive bg-destructive/15 text-destructive font-semibold"
                    : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                )}
              >
                <span>🚨</span>
                <span>หากมีเหตุการณ์ safety ให้เลือก A2-Gap แทน</span>
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {gridGaps.map((gap) => (
                <button
                  key={gap.value}
                  type="button"
                  onClick={() => setSelected(gap.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    selected === gap.value
                      ? cn(gap.color, "ring-2 ring-primary/30 scale-[1.02]")
                      : "border-transparent bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <span className="text-2xl">{gap.icon}</span>
                  <span className="font-semibold text-sm">{gap.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{gap.desc}</span>
                </button>
              ))}
            </div>
          )}

          {isHighMastery && (
            <p className="text-xs text-muted-foreground">Mastery 4–5 = Success อัตโนมัติ</p>
          )}
          {isLowMastery && (
            <p className="text-xs text-muted-foreground">Mastery 1–3 ต้องระบุประเภท Gap เสมอ</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving || !selected}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
