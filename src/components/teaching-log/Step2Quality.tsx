import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  getKeyIssueRules,
  validateKeyIssue,
} from "@/lib/keyIssueValidation";
import { getExamplesForGap } from "@/lib/keyIssueExamples";
import type { GapValue } from "@/lib/gapOptions";

interface Step2Props {
  data: {
    masteryScore: number | null;
    activityMode: "active" | "passive" | "constructive" | null;
    keyIssue: string;
  };
  /** Selected gap from Step 3, used to tailor the example bucket. May be
   *  null on first visit to Step 2 — fallback handled in getExamplesForGap. */
  majorGap?: GapValue | null;
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const MASTERY = [
  { score: 1, label: "วิกฤต", emoji: "🔴", bg: "bg-red-900/30 border-red-500/50" },
  { score: 2, label: "ต้องปรับปรุง", emoji: "🟠", bg: "bg-orange-900/30 border-orange-500/50" },
  { score: 3, label: "พอใช้", emoji: "🟡", bg: "bg-yellow-900/30 border-yellow-500/50" },
  { score: 4, label: "ดี", emoji: "🟢", bg: "bg-green-900/30 border-green-500/50" },
  { score: 5, label: "ยอดเยี่ยม", emoji: "🏆", bg: "bg-amber-400/20 border-amber-400/50" },
];

const ACTIVITY_MODES = [
  { value: "passive" as const, label: "Level 1", desc: "เน้นรับสาร (Passive) — ฟังบรรยาย/ดูวิดีโอ", icon: "📖" },
  { value: "active" as const, label: "Level 2", desc: "เน้นลงมือทำ (Active) — ปฏิบัติจริง/ทดลอง", icon: "⚡" },
  { value: "constructive" as const, label: "Level 3", desc: "เน้นคิดวิเคราะห์ (Constructive) — สร้างสรรค์ผลงาน", icon: "🧩" },
];

export function Step2Quality({ data, majorGap, onChange, errors }: Step2Props) {
  const activeMastery = MASTERY.find((m) => m.score === data.masteryScore);
  const cardBg = activeMastery?.bg ?? "";

  const { minLength, helperText, placeholder } = getKeyIssueRules(data.masteryScore);
  const examples = getExamplesForGap(majorGap);
  const trimmedLen = data.keyIssue.trim().length;

  // Validate on blur only (per spec) — don't fight the user on every keystroke.
  // Parent errors object still wins (e.g. from validateAll on Next/Submit).
  const [blurError, setBlurError] = useState<string | undefined>();
  const displayError = errors.keyIssue || blurError;

  const handleKeyIssueBlur = () => {
    const result = validateKeyIssue(data.keyIssue, data.masteryScore);
    setBlurError(result.isValid ? undefined : result.error);
  };

  return (
    <div className={cn("glass-card p-5 transition-all duration-500", cardBg)}>
      <div className="space-y-5">
        {/* Mastery Score */}
        <div className="space-y-2" data-error={errors.masteryScore ? true : undefined}>
          <Label>Mastery Score <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-5 gap-2">
            {MASTERY.map((m) => (
              <button
                key={m.score}
                type="button"
                onClick={() => onChange("masteryScore", m.score)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  data.masteryScore === m.score
                    ? "border-primary ring-2 ring-primary/30 scale-105"
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-lg font-bold">{m.score}</span>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
              </button>
            ))}
          </div>
          {errors.masteryScore && <p className="text-xs text-destructive">{errors.masteryScore}</p>}
        </div>

        {/* Activity Mode */}
        <div className="space-y-2" data-error={errors.activityMode ? true : undefined}>
          <Label>Activity Mode <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-3 gap-2">
            {ACTIVITY_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => onChange("activityMode", mode.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                  data.activityMode === mode.value
                    ? "border-primary bg-primary/10"
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-xl">{mode.icon}</span>
                <span className="text-sm font-semibold">{mode.label}</span>
                <span className="text-[10px] text-muted-foreground">{mode.desc}</span>
              </button>
            ))}
          </div>
          {errors.activityMode && <p className="text-xs text-destructive">{errors.activityMode}</p>}
        </div>

        {/* Key Issue */}
        <div className="space-y-2" data-error={displayError ? true : undefined}>
          <Label>ปัญหาหลักที่พบ <span className="text-destructive">*</span></Label>
          <Textarea
            placeholder={placeholder}
            value={data.keyIssue}
            onChange={(e) => {
              onChange("keyIssue", e.target.value);
              if (blurError) setBlurError(undefined);
            }}
            onBlur={handleKeyIssueBlur}
            className={cn(displayError && "border-destructive")}
            maxLength={500}
          />

          {/* Helper text — switches narrative depending on mastery */}
          <p className="text-xs text-muted-foreground">{helperText}</p>

          {/* Character counter — only show while below minimum */}
          {trimmedLen > 0 && trimmedLen < minLength && (
            <p className="text-xs text-muted-foreground">
              {trimmedLen}/{minLength} ตัวอักษร
            </p>
          )}

          {displayError && <p className="text-xs text-destructive">{displayError}</p>}

          {/* Examples — Collapsible, default closed, content tailored to chosen gap */}
          <Collapsible className="border rounded-lg">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium hover:bg-secondary/50 transition-colors [&[data-state=open]>svg]:rotate-180"
              >
                <span>📋 ดูตัวอย่างการกรอก</span>
                <ChevronDown className="h-4 w-4 transition-transform" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3 space-y-2 border-t pt-3">
              {examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded border bg-secondary/30"
                >
                  <p className="text-xs flex-1 whitespace-pre-wrap leading-relaxed">{ex.text}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs h-7"
                    onClick={() => {
                      onChange("keyIssue", ex.text);
                      setBlurError(undefined);
                    }}
                  >
                    📋 ใช้เป็นแบบ
                  </Button>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground italic pt-1">
                💡 ตัวอย่างเป็นเพียงแนวทาง — กรุณาปรับให้ตรงกับสถานการณ์ในห้องเรียนของท่าน
                ไม่ควรกรอกตามตัวอย่างทุกตัวอักษร
              </p>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
