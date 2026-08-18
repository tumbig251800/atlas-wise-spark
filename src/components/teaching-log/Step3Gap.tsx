import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Check } from "lucide-react";
import { GAPS, SUCCESS_OPTION, getAllowedGaps, getDefaultGap, type GapValue } from "@/lib/gapOptions";

const MAX_MINOR_GAPS = 2;

type ProblemGapValue = Exclude<GapValue, "success">;

interface Step3Props {
  data: {
    majorGap: GapValue | null;
    minorGaps: ProblemGapValue[];
    scPresent: boolean;
    healthCareStatus: "" | "none" | "has";
    healthCareIds: string;
  };
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  masteryScore: number | null;
}

export function Step3Gap({ data, onChange, errors, masteryScore }: Step3Props) {
  const allowed = getAllowedGaps(masteryScore);
  const isHighMastery = masteryScore != null && masteryScore >= 4;
  const isLowMastery = masteryScore != null && masteryScore <= 3;
  const gridGaps = isHighMastery ? [] : GAPS.filter((g) => allowed.includes(g.value));
  const showA2Alert = data.majorGap === "a2-gap";

  // Minor gaps: problem gaps available as secondary selections (mastery ≤ 3 only)
  // Excludes whatever is currently selected as majorGap to prevent duplication
  const minorGapOptions = isLowMastery
    ? GAPS.filter((g) => g.value !== data.majorGap)
    : [];

  const minorGapCount = (data.minorGaps ?? []).length;
  const atMinorGapLimit = minorGapCount >= MAX_MINOR_GAPS;

  const toggleMinorGap = (value: ProblemGapValue) => {
    const current = data.minorGaps ?? [];
    if (current.includes(value)) {
      onChange("minorGaps", current.filter((g) => g !== value));
      return;
    }
    if (current.length >= MAX_MINOR_GAPS) return;
    onChange("minorGaps", [...current, value]);
  };

  // Normalize selection whenever mastery changes:
  //   1. Clear stale major gap no longer allowed (e.g. mastery 5→2 leaves "success" invalid).
  //   2. Auto-select default for high mastery (success).
  //   3. Clear all minor gaps when switching to high mastery zone.
  useEffect(() => {
    if (data.majorGap && !allowed.includes(data.majorGap)) {
      onChange("majorGap", null);
      onChange("minorGaps", []);
      return;
    }
    const def = getDefaultGap(masteryScore);
    if (def && !data.majorGap) {
      onChange("majorGap", def);
    }
    if (isHighMastery && data.minorGaps && data.minorGaps.length > 0) {
      onChange("minorGaps", []);
    }
  }, [masteryScore, allowed, data.majorGap, onChange]);

  return (
    <div className="space-y-5">
      {/* Major Gap */}
      <div className="space-y-2" data-error={errors.majorGap ? true : undefined}>
        <Label>Major Learning Gap <span className="text-destructive">*</span></Label>

        {/* Placeholder when low mastery and no selection yet */}
        {isLowMastery && !data.majorGap && (
          <p className="text-sm text-muted-foreground italic">กรุณาเลือกประเภท Gap</p>
        )}

        {/* High mastery layout: Success big + A2 safety override */}
        {isHighMastery ? (
          <>
            <button
              type="button"
              onClick={() => onChange("majorGap", SUCCESS_OPTION.value)}
              className={cn(
                "w-full flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                data.majorGap === SUCCESS_OPTION.value
                  ? cn(SUCCESS_OPTION.color, "ring-2 ring-primary/30 scale-[1.02]")
                  : "border-transparent bg-secondary/50 hover:bg-secondary"
              )}
            >
              <span className="text-2xl">{SUCCESS_OPTION.icon}</span>
              <span className="font-semibold">{SUCCESS_OPTION.label}</span>
              <span className="text-xs text-muted-foreground">{SUCCESS_OPTION.desc}</span>
            </button>

            {/* A2 safety override */}
            <button
              type="button"
              onClick={() => onChange("majorGap", "a2-gap")}
              className={cn(
                "w-full flex items-center justify-center gap-2 p-2 rounded-lg border text-sm transition-all",
                data.majorGap === "a2-gap"
                  ? "border-destructive bg-destructive/15 text-destructive font-semibold"
                  : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-destructive/50 hover:text-destructive"
              )}
            >
              <span>🚨</span>
              <span>หากมีเหตุการณ์ safety ให้เลือก A2-Gap แทน</span>
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              {gridGaps.map((gap) => (
                <button
                  key={gap.value}
                  type="button"
                  onClick={() => onChange("majorGap", gap.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                    data.majorGap === gap.value
                      ? cn(gap.color, "ring-2 ring-primary/30 scale-[1.02]")
                      : "border-transparent bg-secondary/50 hover:bg-secondary"
                  )}
                >
                  <span className="text-2xl">{gap.icon}</span>
                  <span className="font-semibold">{gap.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{gap.desc}</span>
                </button>
              ))}
            </div>
            {/* Success card for mastery=null (initial state only) */}
            {allowed.includes("success") && (
              <button
                type="button"
                onClick={() => onChange("majorGap", SUCCESS_OPTION.value)}
                className={cn(
                  "w-full flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                  data.majorGap === SUCCESS_OPTION.value
                    ? cn(SUCCESS_OPTION.color, "ring-2 ring-primary/30 scale-[1.02]")
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl">{SUCCESS_OPTION.icon}</span>
                <span className="font-semibold">{SUCCESS_OPTION.label}</span>
                <span className="text-xs text-muted-foreground">{SUCCESS_OPTION.desc}</span>
              </button>
            )}
          </>
        )}

        {errors.majorGap && <p className="text-xs text-destructive">{errors.majorGap}</p>}
        {isHighMastery && (
          <p className="text-xs text-muted-foreground">Mastery 4–5 = Success อัตโนมัติ</p>
        )}
        {isLowMastery && (
          <p className="text-xs text-muted-foreground">Mastery 1–3 ต้องระบุประเภท Gap เสมอ</p>
        )}
      </div>


      {/* A2-Gap Red Alert Banner */}
      {showA2Alert && (
        <Alert className="border-destructive bg-destructive/15 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-destructive animate-bounce" />
          <AlertDescription className="text-destructive font-bold">
            ⚠️ กรณีความปลอดภัย: ระบบจะส่งต่อข้อมูลไปยังผู้บริหารทันที (Immediate Referral)
            นี่ไม่ใช่ปัญหาการเรียนปกติ — ต้องดำเนินการทันที
          </AlertDescription>
        </Alert>
      )}

      {/* Minor Gaps (problem gaps only, mastery ≤ 3) */}
      {isLowMastery && data.majorGap && data.majorGap !== "success" && minorGapOptions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <p className="text-sm font-medium text-muted-foreground">
              Gap รอง <span className="font-normal">(ถ้ามีปัญหาเพิ่มเติม — ไม่บังคับ)</span>
            </p>
            <span className={cn(
              "text-xs",
              atMinorGapLimit ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              {minorGapCount}/{MAX_MINOR_GAPS}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {minorGapOptions.map((gap) => {
              const checked = (data.minorGaps ?? []).includes(gap.value as ProblemGapValue);
              const disabled = !checked && atMinorGapLimit;
              return (
                <button
                  key={gap.value}
                  type="button"
                  onClick={() => toggleMinorGap(gap.value as ProblemGapValue)}
                  disabled={disabled}
                  aria-pressed={checked}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all",
                    checked
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 text-foreground"
                      : "border-dashed border-muted-foreground/30 bg-secondary/30 hover:bg-secondary",
                    disabled && "opacity-40 cursor-not-allowed hover:bg-secondary/30"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border shrink-0",
                      checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                    )}
                  >
                    {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className="text-base shrink-0">{gap.icon}</span>
                  <span className="font-medium">{gap.label}</span>
                </button>
              );
            })}
          </div>
          {atMinorGapLimit && (
            <p className="text-xs text-muted-foreground">
              เลือกได้สูงสุด {MAX_MINOR_GAPS} ตัว — หากปัญหาเยอะกว่านี้ ลองพิจารณาเลือก System-Gap แทน
            </p>
          )}
          {(data.minorGaps ?? []).includes("a2-gap") && (
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ พบเหตุการณ์ safety เพิ่มเติม — ระบบจะบันทึกไว้ในรายงาน
            </p>
          )}
        </div>
      )}

      {/* Special Care — two nested checkboxes.
          Box 1 (scPresent): a special-care student is merely present — no effect
          on reports or KPI. Box 2 (healthCareStatus): this session assessed them
          as the primary target — routed out of the class KPI by the Compassion
          Protocol. Box 2 is hidden until Box 1 is checked, and clearing Box 1
          resets Box 2 to prevent the contradictory "assessed a student who
          wasn't here" state. */}
      <div className="space-y-3" data-error={errors.healthCareStatus ? true : undefined}>
        <Label>นักเรียนกลุ่มดูแลพิเศษ</Label>

        {/* Box 1 — presence only */}
        <label className={cn(
          "flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
          data.scPresent
            ? "border-[hsl(var(--atlas-success))]/50 bg-[hsl(var(--atlas-success))]/10"
            : "border-transparent bg-secondary/50 hover:bg-secondary"
        )}>
          <Checkbox
            className="mt-0.5"
            checked={data.scPresent}
            onCheckedChange={(checked) => {
              const next = checked === true;
              onChange("scPresent", next);
              // Clearing presence must reset the "primary target" flag + IDs so we
              // never record an assessment of a student who wasn't in the room.
              if (!next) {
                onChange("healthCareStatus", "none");
                onChange("healthCareIds", "");
              }
            }}
          />
          <span>
            <span className="text-sm">มีนักเรียนกลุ่มดูแลพิเศษอยู่ในคาบนี้</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              ติ๊กได้ทุกคาบที่นักเรียนมาเรียน — ไม่มีผลต่อรายงานหรือคะแนนใดๆ
            </span>
          </span>
        </label>

        {/* Box 2 — primary-assessment flag (only when Box 1 is checked) */}
        {data.scPresent && (
          <label className={cn(
            "flex items-start gap-3 p-3 ml-6 rounded-lg border-2 cursor-pointer transition-all",
            data.healthCareStatus === "has"
              ? "border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10"
              : "border-transparent bg-secondary/50 hover:bg-secondary"
          )}>
            <Checkbox
              className="mt-0.5"
              checked={data.healthCareStatus === "has"}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  onChange("healthCareStatus", "has");
                } else {
                  onChange("healthCareStatus", "none");
                  onChange("healthCareIds", "");
                }
              }}
            />
            <span>
              <span className="text-sm">คาบนี้ประเมินนักเรียนกลุ่มดูแลพิเศษเป็นเป้าหมายหลัก</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                ติ๊กเฉพาะคาบที่ตั้งใจวัดผลเด็กกลุ่มนี้โดยตรง — บันทึกจะถูกแยกไปติดตามพัฒนาการรายบุคคล ไม่นำมารวมคะแนนห้อง
              </span>
            </span>
          </label>
        )}

        {/* Student IDs — required when this session targets special-care students */}
        {data.scPresent && data.healthCareStatus === "has" && (
          <Input
            placeholder="ระบุเลขประจำตัว (ใช้ , คั่นหากมีหลายคน)"
            value={data.healthCareIds}
            onChange={(e) => onChange("healthCareIds", e.target.value)}
            className={cn("ml-6 w-[calc(100%-1.5rem)]", errors.healthCareIds && "border-destructive")}
            maxLength={200}
          />
        )}
        {errors.healthCareStatus && <p className="text-xs text-destructive">{errors.healthCareStatus}</p>}
        {errors.healthCareIds && <p className="text-xs text-destructive">{errors.healthCareIds}</p>}
      </div>
    </div>
  );
}
