import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Users, AlertTriangle, UserX } from "lucide-react";
import { RemedialStatusSelector } from "./RemedialStatusSelector";
import type { GapValue } from "@/lib/gapOptions";

interface Step4Props {
  data: {
    remedialIds: string;
    nextStrategy: string;
    reflection: string;
    remedialStatuses: Record<string, "pass" | "stay">;
  };
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  masteryScore?: number | null;
  totalStudents?: number | null;
  majorGap?: GapValue | null;
}

const REMEDIAL_NONE_SENTINEL = "[None]";

function useInterventionBadge(remedialIds: string, totalStudents: number | null | undefined) {
  return useMemo(() => {
    if (remedialIds === REMEDIAL_NONE_SENTINEL) return null;
    const ids = remedialIds.split(/[\s,]+/).map(id => id.trim()).filter(Boolean);
    const count = ids.length;
    if (!count || !totalStudents || totalStudents < 1) return null;
    const pct = Math.round((count / totalStudents) * 100);
    if (pct <= 20) return { label: "Individual Support", pct, color: "bg-[hsl(var(--atlas-info))]/20 text-[hsl(var(--atlas-info))] border-[hsl(var(--atlas-info))]/30" };
    if (pct <= 40) return { label: "Small Group", pct, color: "bg-[hsl(var(--atlas-warning))]/20 text-[hsl(var(--atlas-warning))] border-[hsl(var(--atlas-warning))]/30" };
    return { label: "🚨 PIVOT MODE", pct, color: "bg-destructive/20 text-destructive border-destructive/30 animate-pulse" };
  }, [remedialIds, totalStudents]);
}

const QUICK_FILL_TEXT = "นักเรียนทุกคนเข้าใจเนื้อหาทะลุปรุโปร่ง ไม่พบจุดเข้าใจผิดในคาบนี้";

const STRATEGIES = {
  scaffolding: "Scaffolding (ย่อยเนื้อหาใหม่ / ให้ตัวช่วย)",
  gamification: "Gamification/Role-play (เหมาะกับ: ภาษา, สังคม)",
  peerTutor: "Peer Tutor (จับคู่เพื่อนช่วยเพื่อน)",
  activePractice: "Active Practice/Drill (เหมาะกับ: คณิต, พละ)",
  demonstration: "Demonstration/Visual Aids (เหมาะกับ: วิทย์, ศิลปะ)",
  challenge: "Challenge (ยกระดับเด็กเก่ง)",
  immediateReferral: "🚨 Immediate Referral (ส่งต่อผู้บริหารทันที — A2 Safety)",
} as const;

// Strategies ranked by relevance to each Gap (most relevant first)
const STRATEGY_BY_GAP: Record<string, string[]> = {
  "k-gap":      [STRATEGIES.scaffolding, STRATEGIES.demonstration, STRATEGIES.peerTutor, STRATEGIES.activePractice, STRATEGIES.gamification],
  "p-gap":      [STRATEGIES.activePractice, STRATEGIES.demonstration, STRATEGIES.scaffolding, STRATEGIES.peerTutor, STRATEGIES.gamification],
  "a-gap":      [STRATEGIES.gamification, STRATEGIES.peerTutor, STRATEGIES.scaffolding, STRATEGIES.demonstration, STRATEGIES.activePractice],
  "a2-gap":     [STRATEGIES.immediateReferral],
  "system-gap": [STRATEGIES.scaffolding, STRATEGIES.demonstration, STRATEGIES.activePractice, STRATEGIES.peerTutor, STRATEGIES.gamification],
  "success":    [STRATEGIES.challenge, STRATEGIES.peerTutor, STRATEGIES.gamification],
};

const ALL_STRATEGIES = Object.values(STRATEGIES);

export function Step4Action({ data, onChange, errors, masteryScore, totalStudents, majorGap }: Step4Props) {
  const intervention = useInterventionBadge(data.remedialIds, totalStudents);
  const isSuccess = majorGap === "success";
  const isA2 = majorGap === "a2-gap";
  const isHighMastery = masteryScore != null && masteryScore >= 4;
  const remedialOptional = isSuccess && isHighMastery;
  const remedialIsNone = data.remedialIds === REMEDIAL_NONE_SENTINEL;

  // Strategy list: gap-relevant first, then the rest (de-duplicated)
  const sortedStrategies = useMemo(() => {
    const ranked = majorGap ? STRATEGY_BY_GAP[majorGap] ?? [] : [];
    const seen = new Set(ranked);
    const tail = ALL_STRATEGIES.filter((s) => !seen.has(s));
    return [...ranked, ...tail];
  }, [majorGap]);

  // Remedial field label changes by Gap
  const remedialLabel = isA2
    ? "นักเรียนที่ต้อง refer ทันที"
    : "นักเรียนที่กำลังติดตามซ่อมเสริม";
  const remedialHelp = isA2
    ? "ระบุเลขประจำตัวนักเรียนที่ต้องส่งต่อให้ผู้บริหารทันที"
    : "ระบุเฉพาะนักเรียนที่อยู่ในการซ่อมเสริมต่อเนื่อง — เลือก PASS หากครั้งนี้ผ่านเกณฑ์ / STAY หากยังต้องซ่อมต่อ";

  const setNoRemedial = () => {
    onChange("remedialIds", REMEDIAL_NONE_SENTINEL);
    onChange("remedialStatuses", {});
  };

  const clearNoRemedial = () => {
    onChange("remedialIds", "");
    onChange("remedialStatuses", {});
  };

  return (
    <div className="space-y-5">
      {/* Remedial IDs */}
      <div className="space-y-2" data-error={errors.remedialIds ? true : undefined}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Label>
            {remedialLabel}
            {!remedialOptional && <span className="text-destructive"> *</span>}
            {remedialOptional && <span className="text-xs text-muted-foreground font-normal"> (ไม่บังคับ)</span>}
          </Label>
          {intervention && (
            <Badge variant="outline" className={cn("gap-1.5 text-xs font-semibold border", intervention.color)}>
              {intervention.label === "🚨 PIVOT MODE" && <AlertTriangle className="h-3 w-3" />}
              <Users className="h-3 w-3" />
              {intervention.pct}% — {intervention.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{remedialHelp}</p>

        {remedialIsNone ? (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-[hsl(var(--atlas-success))]/30 bg-[hsl(var(--atlas-success))]/10">
            <UserX className="h-4 w-4 text-[hsl(var(--atlas-success))]" />
            <span className="text-sm flex-1">ไม่มีนักเรียนต้องซ่อมเสริมในคาบนี้</span>
            <Button type="button" variant="ghost" size="sm" onClick={clearNoRemedial}>
              เปลี่ยน
            </Button>
          </div>
        ) : (
          <Input
            placeholder="ระบุเลขประจำตัว (ใช้ , คั่นหากมีหลายคน)"
            value={data.remedialIds}
            onChange={(e) => onChange("remedialIds", e.target.value)}
            className={cn(errors.remedialIds && "border-destructive")}
            maxLength={200}
          />
        )}

        {/* Quick "no remedial" button — only when remedial is optional */}
        {remedialOptional && !remedialIsNone && !data.remedialIds.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 border-[hsl(var(--atlas-success))]/50 text-[hsl(var(--atlas-success))] hover:bg-[hsl(var(--atlas-success))]/10"
            onClick={setNoRemedial}
          >
            <UserX className="h-3.5 w-3.5" />
            ไม่มีนักเรียนต้องซ่อมเสริม
          </Button>
        )}
        {errors.remedialIds && <p className="text-xs text-destructive">{errors.remedialIds}</p>}
      </div>

      {/* Remedial Status Selector — hidden when [None] sentinel is set */}
      {data.remedialIds.trim() && !remedialIsNone && (
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
        {majorGap && (
          <p className="text-xs text-muted-foreground">
            แสดงกลยุทธ์ที่เหมาะกับ Gap ที่เลือกก่อน
          </p>
        )}
        <Select value={data.nextStrategy} onValueChange={(v) => onChange("nextStrategy", v)}>
          <SelectTrigger className={cn(errors.nextStrategy && "border-destructive")}>
            <SelectValue placeholder="เลือกกลยุทธ์" />
          </SelectTrigger>
          <SelectContent>
            {sortedStrategies.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
        {isHighMastery && isSuccess && !data.reflection.trim() && (
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
