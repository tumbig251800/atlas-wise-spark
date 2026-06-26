import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, Users, AlertTriangle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeachingLogForm } from "@/pages/TeachingLog";

interface PreSubmitSummaryProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  form: TeachingLogForm;
  submitting: boolean;
  /** Set when this lesson is linked to the teacher's active research. */
  researchTitle?: string | null;
}

const GAP_LABELS: Record<string, string> = {
  "k-gap": "K-Gap (ความรู้)",
  "p-gap": "P-Gap (ทักษะ)",
  "a-gap": "A1-Gap (Engagement)",
  "a2-gap": "A2-Gap (High Risk) 🚨",
  "system-gap": "System-Gap (ระบบ)",
  "success": "Success ✅",
};

const MODE_LABELS: Record<string, string> = {
  passive: "Level 1 — Passive",
  active: "Level 2 — Active",
  constructive: "Level 3 — Constructive",
};

function useGapPercent(remedialIds: string, totalStudents: number | null) {
  return useMemo(() => {
    const ids = remedialIds.split(/[\s,]+/).map(id => id.trim()).filter(Boolean);
    if (!ids.length || !totalStudents || totalStudents < 1) return null;
    const pct = Math.round((ids.length / totalStudents) * 100);
    if (pct <= 20) return { label: "Individual Support", pct, count: ids.length, color: "bg-[hsl(var(--atlas-info))]/20 text-[hsl(var(--atlas-info))] border-[hsl(var(--atlas-info))]/30" };
    if (pct <= 40) return { label: "Small Group", pct, count: ids.length, color: "bg-[hsl(var(--atlas-warning))]/20 text-[hsl(var(--atlas-warning))] border-[hsl(var(--atlas-warning))]/30" };
    return { label: "🚨 PIVOT MODE", pct, count: ids.length, color: "bg-destructive/20 text-destructive border-destructive/30 animate-pulse" };
  }, [remedialIds, totalStudents]);
}

export function PreSubmitSummary({ open, onClose, onConfirm, form, submitting, researchTitle }: PreSubmitSummaryProps) {
  const gap = useGapPercent(form.remedialIds, form.totalStudents);

  const items = [
    { label: "วันที่สอน", value: form.teachingDate },
    { label: "ระดับชั้น", value: form.gradeLevel },
    { label: "ห้องเรียน", value: form.classroom },
    { label: "จำนวนนักเรียน", value: form.totalStudents ? `${form.totalStudents} คน` : "" },
    { label: "วิชา", value: form.subject },
    { label: "หน่วยการเรียนรู้", value: form.learningUnit },
    { label: "เรื่องที่สอน", value: form.topic },
    { label: "Mastery Score", value: form.masteryScore ? `${form.masteryScore}/5` : "" },
    { label: "Activity Mode", value: form.activityMode ? MODE_LABELS[form.activityMode] : "" },
    { label: "ปัญหาหลัก", value: form.keyIssue },
    { label: "Major Gap", value: form.majorGap ? GAP_LABELS[form.majorGap] || form.majorGap : "" },
    { label: "นักเรียนไม่สบาย", value: form.healthCareStatus === "none" ? "ไม่มี" : form.healthCareStatus === "has" ? "มี" : "" },
    { label: "Health Care IDs", value: form.healthCareStatus === "none" ? "[None]" : form.healthCareIds },
    { label: "รหัสนักเรียนซ่อมเสริม", value: form.remedialIds },
    { label: "กลยุทธ์ครั้งถัดไป", value: form.nextStrategy },
    { label: "สะท้อนคิด", value: form.reflection },
  ];

  const filledCount = items.filter((i) => i.value && String(i.value).trim()).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[hsl(var(--atlas-success))]" />
            สรุปข้อมูลก่อนบันทึก
          </DialogTitle>
        </DialogHeader>

        {researchTitle && (
          <div className="flex items-start gap-2 rounded-lg border border-violet-300 bg-violet-50 p-3 mb-1">
            <FlaskConical className="h-4 w-4 text-violet-700 mt-0.5 shrink-0" />
            <div className="text-sm text-violet-900">
              <span className="font-medium">บันทึกนี้จะถูกนับเป็นข้อมูลงานวิจัย</span>
              <div className="text-xs text-violet-700">{researchTitle}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge className="bg-[hsl(var(--atlas-success))] hover:bg-[hsl(var(--atlas-success))]">ครบทุกข้อ</Badge>
          <span className="text-sm text-muted-foreground">
            {filledCount}/{items.length} หัวข้อ
          </span>
          {gap && (
            <Badge variant="outline" className={cn("gap-1.5 text-xs font-semibold border", gap.color)}>
              {gap.label === "🚨 PIVOT MODE" && <AlertTriangle className="h-3 w-3" />}
              <Users className="h-3 w-3" />
              {gap.count}/{form.totalStudents} ({gap.pct}%) — {gap.label}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground min-w-[140px] shrink-0">{i + 1}. {item.label}</span>
              <span className="text-foreground break-all">
                {String(item.value || "").length > 80
                  ? String(item.value).slice(0, 80) + "..."
                  : item.value || "-"}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            กลับแก้ไข
          </Button>
          <Button
            onClick={onConfirm}
            disabled={submitting}
            className="bg-[hsl(var(--atlas-success))] hover:bg-[hsl(var(--atlas-success))]/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            ยืนยันบันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}