export type GapValue = "k-gap" | "p-gap" | "a-gap" | "a2-gap" | "system-gap" | "success";

export interface GapOption {
  value: GapValue;
  label: string;
  desc: string;
  icon: string;
  color: string;
}

export const GAPS: GapOption[] = [
  { value: "k-gap", label: "K-Gap", desc: "ความรู้: เนื้อหายากไป / พื้นฐานไม่แน่น / จำสูตรไม่ได้", icon: "📚", color: "border-destructive/50 bg-destructive/10" },
  { value: "p-gap", label: "P-Gap", desc: "ทักษะ: ทำไม่เป็น / อ่านไม่คล่อง / คำนวณไม่คล่อง", icon: "🔧", color: "border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10" },
  { value: "a-gap", label: "A1-Gap", desc: "A1: ขาดแรงจูงใจ/ทัศนคติ/ความพยายาม หรือ คิดวิเคราะห์ไม่ได้", icon: "💔", color: "border-[hsl(var(--atlas-purple))]/50 bg-[hsl(var(--atlas-purple))]/10" },
  { value: "a2-gap", label: "A2-Gap", desc: "High Risk: พฤติกรรมก้าวร้าว / ทำร้ายตัวเอง-ผู้อื่น", icon: "🚨", color: "border-destructive bg-destructive/20" },
  { value: "system-gap", label: "System-Gap", desc: "ระบบ: เวลาไม่พอ / สื่อไม่มี / เน็ตหลุด", icon: "⚙️", color: "border-[hsl(var(--atlas-info))]/50 bg-[hsl(var(--atlas-info))]/10" },
];

export const SUCCESS_OPTION: GapOption = {
  value: "success",
  label: "Success",
  desc: "สอนได้ตามเป้าหมาย (คะแนน 4-5)",
  icon: "✅",
  color: "border-[hsl(var(--atlas-success))]/50 bg-[hsl(var(--atlas-success))]/10",
};

// Mastery → allowed gaps:
//   >=4  → "success" (default) + "a2-gap" (safety override always available)
//   <=3  → all problem gaps incl. "a2-gap"; NO "success"
//   null → allow everything (initial state before mastery is set)
export function getAllowedGaps(masteryScore: number | null | undefined): GapValue[] {
  if (masteryScore == null) {
    return [...GAPS.map((g) => g.value), SUCCESS_OPTION.value];
  }
  if (masteryScore >= 4) {
    return ["success", "a2-gap"];
  }
  return GAPS.map((g) => g.value);
}

// Default selection given a mastery score.
//   >=4  → "success" (auto-select; A2 still available as override)
//   <=3  → null (force teacher to pick a real gap type)
//   null → null
export function getDefaultGap(masteryScore: number | null | undefined): GapValue | null {
  if (masteryScore == null) return null;
  if (masteryScore >= 4) return "success";
  return null;
}
