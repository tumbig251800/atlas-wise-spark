import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface Step2Props {
  data: {
    masteryScore: number | null;
    activityMode: "active" | "passive" | "constructive" | null;
    keyIssue: string;
  };
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

const QUICK_FILL_TEXT = "นักเรียนทุกคนเข้าใจเนื้อหาทะลุปรุโปร่ง ไม่พบจุดเข้าใจผิดในคาบนี้";

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

export function Step2Quality({ data, onChange, errors }: Step2Props) {
  const activeMastery = MASTERY.find((m) => m.score === data.masteryScore);
  const cardBg = activeMastery?.bg ?? "";

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
        <div className="space-y-2" data-error={errors.keyIssue ? true : undefined}>
          <Label>ปัญหาหลักที่พบ <span className="text-destructive">*</span></Label>
          <Textarea
            placeholder="ระบุปัญหาหลักในการเรียนรู้ของนักเรียน"
            value={data.keyIssue}
            onChange={(e) => onChange("keyIssue", e.target.value)}
            className={cn(errors.keyIssue && "border-destructive")}
            maxLength={500}
          />
          {data.masteryScore === 5 && !data.keyIssue.trim() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
              onClick={() => onChange("keyIssue", QUICK_FILL_TEXT)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Quick Fill: สอนได้ตามเป้าหมาย
            </Button>
          )}
          {errors.keyIssue && <p className="text-xs text-destructive">{errors.keyIssue}</p>}
        </div>
      </div>
    </div>
  );
}
