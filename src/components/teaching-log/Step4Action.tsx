import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Users, AlertTriangle } from "lucide-react";
import { RemedialStatusSelector } from "./RemedialStatusSelector";

interface Step4Props {
  data: {
    remedialIds: string;
    nextStrategy: string;
    reflection: string;
    remedialStatuses: Record<string, "pass" | "stay">;
  };
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  masteryScore?: number | null;
  totalStudents?: number | null;
}

function useInterventionBadge(remedialIds: string, totalStudents: number | null | undefined) {
  return useMemo(() => {
    const ids = remedialIds.split(",").map(id => id.trim()).filter(Boolean);
    const count = ids.length;
    if (!count || !totalStudents || totalStudents < 1) return null;
    const pct = Math.round((count / totalStudents) * 100);
    if (pct <= 20) return { label: "Individual Support", pct, color: "bg-[hsl(var(--atlas-info))]/20 text-[hsl(var(--atlas-info))] border-[hsl(var(--atlas-info))]/30" };
    if (pct <= 40) return { label: "Small Group", pct, color: "bg-[hsl(var(--atlas-warning))]/20 text-[hsl(var(--atlas-warning))] border-[hsl(var(--atlas-warning))]/30" };
    return { label: "🚨 PIVOT MODE", pct, color: "bg-destructive/20 text-destructive border-destructive/30 animate-pulse" };
  }, [remedialIds, totalStudents]);
}

const QUICK_FILL_TEXT = "นักเรียนทุกคนเข้าใจเนื้อหาทะลุปรุโปร่ง ไม่พบจุดเข้าใจผิดในคาบนี้";

const STRATEGIES = [
  "Scaffolding (ย่อยเนื้อหาใหม่ / ให้ตัวช่วย)",
  "Gamification/Role-play (เหมาะกับ: ภาษา, สังคม)",
  "Peer Tutor (จับคู่เพื่อนช่วยเพื่อน)",
  "Active Practice/Drill (เหมาะกับ: คณิต, พละ)",
  "Demonstration/Visual Aids (เหมาะกับ: วิทย์, ศิลปะ)",
  "Challenge (ยกระดับเด็กเก่ง)",
];

export function Step4Action({ data, onChange, errors, masteryScore, totalStudents }: Step4Props) {
  const intervention = useInterventionBadge(data.remedialIds, totalStudents);

  return (
    <div className="space-y-5">
      {/* Remedial IDs */}
      <div className="space-y-2" data-error={errors.remedialIds ? true : undefined}>
        <div className="flex items-center justify-between">
          <Label>รหัสนักเรียนซ่อมเสริม <span className="text-destructive">*</span></Label>
          {intervention && (
            <Badge variant="outline" className={cn("gap-1.5 text-xs font-semibold border", intervention.color)}>
              {intervention.label === "🚨 PIVOT MODE" && <AlertTriangle className="h-3 w-3" />}
              <Users className="h-3 w-3" />
              {intervention.pct}% — {intervention.label}
            </Badge>
          )}
        </div>
        <Input
          placeholder="ระบุเลขประจำตัว (ใช้ , คั่นหากมีหลายคน)"
          value={data.remedialIds}
          onChange={(e) => onChange("remedialIds", e.target.value)}
          className={cn(errors.remedialIds && "border-destructive")}
          maxLength={200}
        />
        {errors.remedialIds && <p className="text-xs text-destructive">{errors.remedialIds}</p>}
      </div>

      {/* Remedial Status Selector */}
      {data.remedialIds.trim() && (
        <RemedialStatusSelector
          remedialIds={data.remedialIds}
          statuses={data.remedialStatuses}
          onChange={(statuses) => onChange("remedialStatuses", statuses)}
          error={errors.remedialStatuses}
        />
      )}

      {/* Next Strategy */}
      <div className="space-y-2" data-error={errors.nextStrategy ? true : undefined}>
        <Label>กลยุทธ์ครั้งถัดไป <span className="text-destructive">*</span></Label>
        <Select value={data.nextStrategy} onValueChange={(v) => onChange("nextStrategy", v)}>
          <SelectTrigger className={cn(errors.nextStrategy && "border-destructive")}>
            <SelectValue placeholder="เลือกกลยุทธ์" />
          </SelectTrigger>
          <SelectContent>
            {STRATEGIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.nextStrategy && <p className="text-xs text-destructive">{errors.nextStrategy}</p>}
      </div>

      {/* Reflection */}
      <div className="space-y-2" data-error={errors.reflection ? true : undefined}>
        <Label>สะท้อนคิดของครู <span className="text-destructive">*</span></Label>
        <Textarea
          placeholder="บันทึกสิ่งที่เรียนรู้จากการสอนครั้งนี้"
          value={data.reflection}
          onChange={(e) => onChange("reflection", e.target.value)}
          className={cn(errors.reflection && "border-destructive")}
          rows={4}
          maxLength={1000}
        />
        {masteryScore === 5 && !data.reflection.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-[hsl(var(--atlas-warning))]/50 text-[hsl(var(--atlas-warning))] hover:bg-[hsl(var(--atlas-warning))]/10"
            onClick={() => onChange("reflection", QUICK_FILL_TEXT)}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Quick Fill: สอนได้ตามเป้าหมาย
          </Button>
        )}
        {errors.reflection && <p className="text-xs text-destructive">{errors.reflection}</p>}
      </div>
    </div>
  );
}
